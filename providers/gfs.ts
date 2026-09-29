export type NwpRisk = {
  level: "LOW" | "MODERATE" | "HIGH";
  score: number;
  reasons: string[];
};

export type NwpForecast = {
  provider: "GFS" | "WRF" | string;
  latitude: number;
  longitude: number;
  generatedAt: string;
  horizonHours: number;
  model: {
    name: string;
    source: "numerical-weather-model";
    official: false;
  };
  risk: NwpRisk;
  summary: {
    maxRainProbability: number;
    maxWindKmh: number;
    maxGustKmh: number;
    minPressureHpa: number | null;
    maxPrecipitationMm: number;
  };
  variables: Record<string, unknown>;
};

export interface NwpProvider {
  forecast(latitude: number, longitude: number, hours?: number): Promise<NwpForecast>;
}

/**
 * GFS adapter using Open-Meteo's GFS routing as the transport layer.
 * The provider contract intentionally stays model-neutral so a direct NOAA
 * GRIB/OPeNDAP or WRF pipeline can replace this adapter later.
 */
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

    const reasons: string[] = [];
    if (maxRainProbability >= 80) reasons.push(`rain probability peaks at ${Math.round(maxRainProbability)}%`);
    if (maxPrecipitationMm >= 20) reasons.push(`precipitation peaks at ${maxPrecipitationMm.toFixed(1)} mm/h`);
    if (maxGustKmh >= 60) reasons.push(`gusts reach ${maxGustKmh.toFixed(0)} km/h`);
    if (weatherCode.some(code => code >= 95)) reasons.push("thunderstorm codes appear in the forecast window");

    const score = Math.min(100,
      (maxRainProbability >= 80 ? 30 : maxRainProbability >= 60 ? 18 : 0) +
      (maxPrecipitationMm >= 20 ? 30 : maxPrecipitationMm >= 10 ? 18 : 0) +
      (maxGustKmh >= 60 ? 30 : maxGustKmh >= 40 ? 18 : 0) +
      (weatherCode.some(code => code >= 95) ? 20 : 0)
    );

    return {
      provider: "GFS",
      latitude,
      longitude,
      generatedAt: new Date().toISOString(),
      horizonHours: horizon,
      model: {
        name: "Global Forecast System (GFS) via Open-Meteo",
        source: "numerical-weather-model",
        official: false,
      },
      risk: {
        level: score >= 60 ? "HIGH" : score >= 30 ? "MODERATE" : "LOW",
        score,
        reasons,
      },
      summary: {
        maxRainProbability,
        maxWindKmh,
        maxGustKmh,
        minPressureHpa,
        maxPrecipitationMm,
      },
      variables: {
        timezone: data.timezone,
        time,
        temperature,
        humidity,
        precipitation,
        precipitationProbability,
        wind,
        gusts,
        pressure,
        weatherCode,
      },
    };
  }
}
