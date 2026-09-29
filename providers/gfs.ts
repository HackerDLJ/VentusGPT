export type NwpForecast = {
  provider: "GFS" | "WRF" | string;
  latitude: number;
  longitude: number;
  generatedAt: string;
  variables: Record<string, unknown>;
};

export interface NwpProvider {
  forecast(latitude: number, longitude: number, hours?: number): Promise<NwpForecast>;
}

/**
 * GFS adapter using Open-Meteo's model routing as the transport layer.
 * The internal contract is deliberately provider-neutral so a direct NOAA
 * GRIB/OPeNDAP pipeline or WRF output can replace it later without touching
 * the conversational layer.
 */
export class GfsProvider implements NwpProvider {
  async forecast(latitude: number, longitude: number, hours = 48): Promise<NwpForecast> {
    const url = new URL("https://api.open-meteo.com/v1/gfs");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,surface_pressure,weather_code");
    url.searchParams.set("timezone", "auto");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GFS request failed (${response.status})`);
    const data = await response.json();
    return {
      provider: "GFS",
      latitude,
      longitude,
      generatedAt: new Date().toISOString(),
      variables: {
        timezone: data.timezone,
        time: data.hourly?.time?.slice(0, hours),
        temperature: data.hourly?.temperature_2m?.slice(0, hours),
        humidity: data.hourly?.relative_humidity_2m?.slice(0, hours),
        precipitation: data.hourly?.precipitation?.slice(0, hours),
        precipitationProbability: data.hourly?.precipitation_probability?.slice(0, hours),
        wind: data.hourly?.wind_speed_10m?.slice(0, hours),
        gusts: data.hourly?.wind_gusts_10m?.slice(0, hours),
        pressure: data.hourly?.surface_pressure?.slice(0, hours),
        weatherCode: data.hourly?.weather_code?.slice(0, hours),
      },
    };
  }
}
