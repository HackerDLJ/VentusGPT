export type LiveWeather = {
  location: string;
  coordinates: { latitude: number; longitude: number };
  current: {
    temperature: number;
    feelsLike: number;
    condition: string;
    windSpeed: number;
    windGusts: number;
    windDirection: number;
    humidity: number;
    pressure: number;
    precipitationProbability: number;
  };
  daily: Array<{
    date: string;
    max: number;
    min: number;
    precipitationProbability: number;
    uv: number;
    condition: string;
  }>;
  provider: {
    name: "Open-Meteo";
    model: string;
    updatedAt: string;
    sourceType: "numerical-weather-model";
    official: false;
  };
  alert: {
    active: boolean;
    severity: "NORMAL" | "WATCH";
    official: false;
    source: "NWP model signal";
    title: string;
    description: string;
    actionAdvice: string;
  };
};

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

async function geocode(location: string) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoding failed (${response.status})`);
  const data = await response.json();
  const result = data.results?.[0];
  if (!result) throw new Error(`No location found for ${location}`);
  return result;
}

export async function getLiveWeather(location: string): Promise<LiveWeather> {
  const place = await geocode(location);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max"
  );

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Forecast provider failed (${response.status})`);
  const data = await response.json();
  const current = data.current;
  const daily = data.daily;

  const windSpeed = Number(current.wind_speed_10m ?? 0);
  const windGusts = Number(current.wind_gusts_10m ?? 0);
  const rainProbability = Number(daily.precipitation_probability_max?.[0] ?? 0);
  const thunderstorm = [95, 96, 99].includes(Number(current.weather_code));
  const elevated = windGusts >= 50 || rainProbability >= 80 || thunderstorm;

  return {
    location: place.name,
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    current: {
      temperature: Number(current.temperature_2m ?? 0),
      feelsLike: Number(current.apparent_temperature ?? 0),
      condition: WEATHER_CODES[Number(current.weather_code)] ?? "Unknown conditions",
      windSpeed,
      windGusts,
      windDirection: Number(current.wind_direction_10m ?? 0),
      humidity: Number(current.relative_humidity_2m ?? 0),
      pressure: Number(current.surface_pressure ?? 0),
      precipitationProbability: rainProbability,
    },
    daily: (daily.time ?? []).map((date: string, index: number) => ({
      date,
      max: Number(daily.temperature_2m_max?.[index] ?? 0),
      min: Number(daily.temperature_2m_min?.[index] ?? 0),
      precipitationProbability: Number(daily.precipitation_probability_max?.[index] ?? 0),
      uv: Number(daily.uv_index_max?.[index] ?? 0),
      condition: WEATHER_CODES[Number(daily.weather_code?.[index])] ?? "Unknown conditions",
    })),
    provider: {
      name: "Open-Meteo",
      model: String(data.generationtime_ms != null ? "Open-Meteo forecast / configured NWP model" : "Open-Meteo"),
      updatedAt: new Date().toISOString(),
      sourceType: "numerical-weather-model",
      official: false,
    },
    alert: {
      active: elevated,
      severity: elevated ? "WATCH" : "NORMAL",
      official: false,
      source: "NWP model signal",
      title: elevated ? "Elevated model signal" : "No elevated model signal",
      description: elevated
        ? "The forecast model indicates elevated weather risk. This is a model-derived signal, not an official government warning."
        : "No elevated signal was detected from the current forecast model inputs.",
      actionAdvice: elevated
        ? "Check official local warnings before making safety-critical decisions."
        : "Continue normal planning and verify official advisories when conditions matter.",
    },
  };
}
