import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "20mb" }));

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const cache = new Map<string, { expires: number; value: any }>();
function cached<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit || hit.expires < Date.now()) return undefined;
  return hit.value as T;
}
function putCache(key: string, value: any, ttl = 120_000) {
  cache.set(key, { expires: Date.now() + ttl, value });
}

function degToDirection(deg: number) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

async function geocode(location: string) {
  const key = `geo:${location.toLowerCase().trim()}`;
  const hit = cached<any>(key);
  if (hit) return hit;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoding failed (${response.status})`);
  const data = await response.json();
  const result = data.results?.[0];
  if (!result) throw new Error(`Could not locate ${location}`);
  const value = {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country,
    countryCode: result.country_code,
    admin1: result.admin1,
    timezone: result.timezone,
  };
  putCache(key, value, 24 * 60 * 60 * 1000);
  return value;
}

async function openMeteoForecast(location: string) {
  const geo = await geocode(location);
  const key = `forecast:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
  const hit = cached<any>(key);
  if (hit) return hit;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(geo.latitude));
  url.searchParams.set("longitude", String(geo.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m");
  url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,uv_index");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Forecast provider failed (${response.status})`);
  const data = await response.json();
  const value = normalizeForecast(geo, data);
  putCache(key, value, 120_000);
  return value;
}

function weatherCode(code: number) {
  const map: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
  };
  return map[code] || "Variable conditions";
}

function normalizeForecast(geo: any, data: any) {
  const c = data.current;
  const d = data.daily;
  const alert = deriveAlert(c, d);
  return {
    location: geo.name,
    coordinates: { latitude: geo.latitude, longitude: geo.longitude },
    country: geo.country,
    state: geo.admin1,
    timezone: data.timezone,
    current: {
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      condition: weatherCode(c.weather_code),
      weatherCode: c.weather_code,
      humidity: c.relative_humidity_2m,
      precipitation: c.precipitation,
      pressure: c.surface_pressure,
      windSpeed: c.wind_speed_10m,
      windGusts: c.wind_gusts_10m,
      windDirection: degToDirection(c.wind_direction_10m),
      windDegrees: c.wind_direction_10m,
    },
    daily: d.time.map((date: string, i: number) => ({
      date,
      condition: weatherCode(d.weather_code[i]),
      weatherCode: d.weather_code[i],
      min: d.temperature_2m_min[i],
      max: d.temperature_2m_max[i],
      feelsLikeMax: d.apparent_temperature_max[i],
      precipitation: d.precipitation_sum[i],
      precipitationProbability: d.precipitation_probability_max[i],
      wind: d.wind_speed_10m_max[i],
      gusts: d.wind_gusts_10m_max[i],
      windDirection: degToDirection(d.wind_direction_10m_dominant[i]),
      uv: d.uv_index_max[i],
      sunrise: d.sunrise[i],
      sunset: d.sunset[i],
    })),
    alert,
    provider: {
      name: "Open-Meteo",
      model: "Best-match numerical weather model ensemble",
      live: true,
      updatedAt: new Date().toISOString(),
      note: "Operational fallback provider. Official IMD products can be connected through the IMD API adapter when credentials/access are available.",
    },
  };
}

function deriveAlert(current: any, daily: any) {
  const wind = Number(current.wind_gusts_10m || current.wind_speed_10m || 0);
  const precip = Number(daily.precipitation_probability_max?.[0] || 0);
  const code = Number(current.weather_code || 0);
  if (code >= 95 || wind >= 60) {
    return { active: true, severity: "WARNING", title: "Severe weather signal", description: "Thunderstorm or strong gust conditions are present in the model data.", actionAdvice: "Avoid exposed locations, secure loose objects and follow official local warnings." };
  }
  if (wind >= 40 || precip >= 80) {
    return { active: true, severity: "WATCH", title: "Elevated weather risk", description: "Strong winds or high precipitation probability are indicated.", actionAdvice: "Plan outdoor activity carefully and check the latest official bulletin before acting." };
  }
  return null;
}

async function historicalTrend(location: string) {
  const geo = await geocode(location);
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 10);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(geo.latitude));
  url.searchParams.set("longitude", String(geo.longitude));
  url.searchParams.set("start_date", fmt(start));
  url.searchParams.set("end_date", fmt(end));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum,wind_speed_10m_max");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Historical provider failed (${response.status})`);
  const data = await response.json();
  const byYear = new Map<number, { rain: number; tempSum: number; tempN: number; windMax: number }>();
  data.daily.time.forEach((date: string, i: number) => {
    const year = Number(date.slice(0, 4));
    const row = byYear.get(year) || { rain: 0, tempSum: 0, tempN: 0, windMax: 0 };
    row.rain += Number(data.daily.precipitation_sum?.[i] || 0);
    row.tempSum += Number(data.daily.temperature_2m_mean?.[i] || 0);
    row.tempN += 1;
    row.windMax = Math.max(row.windMax, Number(data.daily.wind_speed_10m_max?.[i] || 0));
    byYear.set(year, row);
  });
  return {
    location: geo.name,
    coordinates: { latitude: geo.latitude, longitude: geo.longitude },
    years: [...byYear.entries()].map(([year, row]) => ({ year, rainfall: Number(row.rain.toFixed(1)), meanTemperature: Number((row.tempSum / row.tempN).toFixed(1)), maxWind: Number(row.windMax.toFixed(1)) })),
    provider: "Open-Meteo historical archive",
    updatedAt: new Date().toISOString(),
  };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, hasApiKey: Boolean(ai), version: "2.0.0", weatherProvider: "Open-Meteo + optional IMD adapter" }));

app.get("/api/weather/forecast", async (req, res) => {
  try {
    const location = String(req.query.location || "Chennai");
    res.json(await openMeteoForecast(location));
  } catch (error: any) {
    res.status(502).json({ error: error.message || "Weather provider unavailable" });
  }
});

app.get("/api/climate/trend", async (req, res) => {
  try {
    res.json(await historicalTrend(String(req.query.location || "Chennai")));
  } catch (error: any) {
    res.status(502).json({ error: error.message || "Climate provider unavailable" });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const weather = await openMeteoForecast(String(req.query.location || "Chennai"));
    res.json({ location: weather.location, alert: weather.alert, source: weather.provider, official: false, disclaimer: "Model-derived signal. Always verify severe weather with official IMD/NDMA bulletins." });
  } catch (error: any) {
    res.status(502).json({ error: error.message || "Alert service unavailable" });
  }
});

app.post("/api/advisory/agri", async (req, res) => {
  try {
    const location = req.body?.location || "Thanjavur";
    const crop = req.body?.crop || "Paddy";
    const activity = req.body?.activity || "Pesticide spraying";
    const weather = await openMeteoForecast(location);
    const today = weather.daily[0];
    const safe = Number(today.wind || 0) <= 15 && Number(today.precipitationProbability || 0) < 40;
    res.json({ location, crop, activity, decision: safe ? "PROCEED_WITH_CAUTION" : "HALT_POSTPONE", rainfallProbability: today.precipitationProbability, windSpeedKmh: today.wind, temperatureC: today.max, humidityPct: weather.current.humidity, advice: safe ? `Conditions are comparatively suitable for ${activity}, but verify the latest local bulletin before proceeding.` : `Postpone ${activity}. Wind/rain risk is elevated and may cause drift or wash-off.`, source: weather.provider, official: false });
  } catch (error: any) {
    res.status(502).json({ error: error.message || "Advisory unavailable" });
  }
});

app.post("/api/gemini/chat", async (req, res) => {
  try {
    if (!ai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured." });
    const { message, history = [], language = "auto", location = "Chennai" } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });
    const weather = await openMeteoForecast(location);
    const recent = history.slice(-10).map((m: any) => `${m.role === "user" ? "User" : "VentusGPT"}: ${m.text}`).join("\n");
    const system = `You are VentusGPT, a weather intelligence assistant for SIH26068. You are conversational, concise, scientifically honest and action-oriented. NEVER invent live weather values. Use the supplied weather data as the factual weather context. Clearly distinguish model-derived information from official warnings. For severe weather, tell the user to verify official IMD/NDMA bulletins. Support Tamil, English and Tanglish naturally. If the user asks a general non-weather question, answer normally but do not pretend it is weather data. Location: ${weather.location}, ${weather.state || ""}. Current weather: ${JSON.stringify(weather.current)}. 7-day forecast: ${JSON.stringify(weather.daily)}. Alert signal: ${JSON.stringify(weather.alert)}. Data provider: ${JSON.stringify(weather.provider)}.`;
    const prompt = `${system}\n\nConversation:\n${recent}\n\nUser: ${message}\n\nRespond in ${language === "ta" ? "natural Tamil script" : language === "en" ? "English" : "the user's language"}. Keep the answer useful and readable. When giving weather facts, mention the source/model briefly. Do not call model-derived alerts official.`;
    const response = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt, config: { temperature: 0.25 } as any });
    res.json({ text: response.text || "I couldn't generate a response.", weather, sources: [{ title: "Open-Meteo forecast", uri: "https://open-meteo.com/" }, { title: "India Meteorological Department API portal", uri: "https://api.imd.gov.in/public/index.php" }] });
  } catch (error: any) {
    console.error("Chat error", error);
    res.status(500).json({ error: error.message || "Chat failed" });
  }
});

app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

http.createServer(app).listen(PORT, () => console.log(`VentusGPT v2 listening on http://localhost:${PORT}`));
