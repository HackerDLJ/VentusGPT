import { evaluateWeather } from "../services/decisionEngine.ts";

export type NwpRisk = { level: "LOW" | "MODERATE" | "HIGH"; score: number; reasons: string[] };
export type NwpForecast = {
  provider: "GFS" | "WRF" | string; latitude: number; longitude: number; generatedAt: string; horizonHours: number;
  model: { name: string; source: "numerical-weather-model"; official: false };
  risk: NwpRisk;
  summary: { maxRainProbability: number; maxWindKmh: number; maxGustKmh: number; minPressureHpa: number | null; maxPrecipitationMm: number };
  variables: Record<string, unknown>;
};
export interface NwpProvider { forecast(latitude: number, longitude: number, hours?: number): Promise<NwpForecast>; }

/** GFS adapter. Risk interpretation is delegated to the shared decision engine. */
export class GfsProvider implements NwpProvider {
  async forecast(latitude: number, longitude: number, hours = 48): Promise<NwpForecast> {
    const horizon = Math.max(1, Math.min(hours, 72));
    const url = new URL("https://api.open-meteo.com/v1/gfs");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,surface_pressure,weather_code");
    url.searchParams.set("timezone", "auto");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GFS request failed (${response.status})`);
    const data = await response.json();
    const slice = (values: unknown[] | undefined) => (values || []).slice(0, horizon).map(Number);
    const time = (data.hourly?.time || []).slice(0, horizon);
    const temperature = slice(data.hourly?.temperature_2m);
    const humidity = slice(data.hourly?.relative_humidity_2m);
    const precipitation = slice(data.hourly?.precipitation);
    const precipitationProbability = slice(data.hourly?.precipitation_probability);
    const wind = slice(data.hourly?.wind_speed_10m);
    const gusts = slice(data.hourly?.wind_gusts_10m);
    const pressure = slice(data.hourly?.surface_pressure);
    const weatherCode = slice(data.hourly?.weather_code);
    const maxRainProbability = Math.max(0, ...precipitationProbability);
    const maxWindKmh = Math.max(0, ...wind);
    const maxGustKmh = Math.max(0, ...gusts);
    const maxPrecipitationMm = Math.max(0, ...precipitation);
    const minPressureHpa = pressure.length ? Math.min(...pressure) : null;
    const decision = evaluateWeather({ rainProbability: maxRainProbability, precipitationMm: maxPrecipitationMm, windKmh: maxWindKmh, gustKmh: maxGustKmh, weatherCodes: weatherCode, activity: "GENERAL" });
    return {
      provider: "GFS", latitude, longitude, generatedAt: new Date().toISOString(), horizonHours: horizon,
      model: { name: "Global Forecast System (GFS) via Open-Meteo", source: "numerical-weather-model", official: false },
      risk: { level: decision.severity === "HIGH" || decision.severity === "CRITICAL" ? "HIGH" : decision.severity, score: decision.score, reasons: decision.reasons },
      summary: { maxRainProbability, maxWindKmh, maxGustKmh, minPressureHpa, maxPrecipitationMm },
      variables: { timezone: data.timezone, time, temperature, humidity, precipitation, precipitationProbability, wind, gusts, pressure, weatherCode },
    };
  }
}
