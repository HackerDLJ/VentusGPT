import { WeatherData, SevereWeatherAlert } from "../types";
import { getLiveWeather } from "./realWeatherProvider";

export const WEATHER_THRESHOLDS = {
  WIND_SPEED_KMH: 40.0,
  WIND_GUSTS_KMH: 55.0,
  EXTREME_TEMP_HIGH_C: 42.0,
  EXTREME_TEMP_LOW_C: 2.0,
  SEVERE_PRECIP_PROB: 85,
};

export function checkWeatherThresholds(data: WeatherData): SevereWeatherAlert | null {
  if (!data) return null;

  if (data.windSpeed > WEATHER_THRESHOLDS.WIND_SPEED_KMH) {
    return {
      active: true,
      severity: "WARNING",
      title: `High wind signal (${data.windSpeed} km/h)`,
      description: `The forecast model reports sustained winds above the VentusGPT safety threshold for ${data.location}. This is a model-derived signal, not an official government warning.`,
      metric: "Wind Speed",
      currentValue: `${data.windSpeed} km/h`,
      threshold: `${WEATHER_THRESHOLDS.WIND_SPEED_KMH} km/h`,
      actionAdvice: "Secure loose objects and check official local advisories before safety-critical activity.",
    };
  }

  if ((data.windGusts ?? 0) > WEATHER_THRESHOLDS.WIND_GUSTS_KMH) {
    return {
      active: true,
      severity: "WATCH",
      title: `Strong gust signal (${data.windGusts} km/h)`,
      description: `The forecast model indicates elevated gust potential in ${data.location}.`,
      metric: "Wind Gust",
      currentValue: `${data.windGusts} km/h`,
      threshold: `${WEATHER_THRESHOLDS.WIND_GUSTS_KMH} km/h`,
      actionAdvice: "Use caution around exposed structures and verify official warnings.",
    };
  }

  if (data.temperature >= WEATHER_THRESHOLDS.EXTREME_TEMP_HIGH_C) {
    return {
      active: true,
      severity: "WATCH",
      title: `Extreme heat signal (${data.temperature}°C)`,
      description: `The forecast model reports very high temperatures in ${data.location}.`,
      metric: "Temperature",
      currentValue: `${data.temperature}°C`,
      threshold: `${WEATHER_THRESHOLDS.EXTREME_TEMP_HIGH_C}°C`,
      actionAdvice: "Limit heat exposure, hydrate, and check official heat advisories.",
    };
  }

  return null;
}

export function formatLiveCaptionAlert(alert: SevereWeatherAlert, location: string, isTamil = false): string {
  if (isTamil) {
    return `⚠️ ${location}-ல் வானிலை மாதிரி எச்சரிக்கை: ${alert.currentValue} (${alert.threshold} வரம்பு). இது அதிகாரப்பூர்வ அரசு எச்சரிக்கை அல்ல. உள்ளூர் அதிகாரப்பூர்வ அறிவிப்புகளை சரிபார்க்கவும்.`;
  }
  return `⚠️ MODEL WEATHER SIGNAL: ${location} has ${alert.currentValue}, crossing the ${alert.threshold} threshold. This is not an official government warning. ${alert.actionAdvice || "Check official advisories."}`;
}

export async function fetchWeatherAndCheckAlerts(location = "Chennai", isTamil = false): Promise<{
  weather: WeatherData;
  alert: SevereWeatherAlert | null;
  captionNotification: string | null;
}> {
  try {
    const live = await getLiveWeather(location);
    const current = live.current;
    const alert = checkWeatherThresholds({
      location: live.location,
      temperature: current.temperature,
      feelsLike: current.feelsLike,
      condition: current.condition,
      windSpeed: current.windSpeed,
      windGusts: current.windGusts,
      windDirection: `${current.windDirection}°`,
      humidity: current.humidity,
      barometricPressure: `${current.pressure} hPa`,
      precipitationProbability: current.precipitationProbability,
      uvIndex: live.daily[0]?.uv ?? 0,
      timestamp: live.provider.updatedAt,
    });

    const modelAlert = live.alert.active ? {
      ...alert,
      active: true,
      severity: alert?.severity ?? "WATCH",
      title: live.alert.title,
      description: live.alert.description,
      metric: "NWP model signal",
      currentValue: current.condition,
      threshold: "Model-derived risk",
      actionAdvice: live.alert.actionAdvice,
    } as SevereWeatherAlert : null;

    const finalAlert = modelAlert;
    return {
      weather: {
        location: live.location,
        temperature: current.temperature,
        feelsLike: current.feelsLike,
        condition: current.condition,
        windSpeed: current.windSpeed,
        windGusts: current.windGusts,
        windDirection: `${current.windDirection}°`,
        humidity: current.humidity,
        barometricPressure: `${current.pressure} hPa`,
        precipitationProbability: current.precipitationProbability,
        uvIndex: live.daily[0]?.uv ?? 0,
        timestamp: live.provider.updatedAt,
        alert: finalAlert,
        summary: `${live.provider.name} · ${live.provider.model}`,
      },
      alert: finalAlert,
      captionNotification: finalAlert?.active ? formatLiveCaptionAlert(finalAlert, live.location, isTamil) : null,
    };
  } catch (error) {
    console.error("fetchWeatherAndCheckAlerts error:", error);
    throw new Error("Live weather provider unavailable. VentusGPT will not invent conditions.");
  }
}
