import { WeatherData, SevereWeatherAlert } from "../types";

export const WEATHER_THRESHOLDS = {
  WIND_SPEED_KMH: 40.0,
  WIND_GUSTS_KMH: 55.0,
  EXTREME_TEMP_HIGH_C: 42.0,
  EXTREME_TEMP_LOW_C: 2.0,
  SEVERE_PRECIP_PROB: 85,
};

/**
 * Checks weather data against safety thresholds and returns an alert if breached.
 */
export function checkWeatherThresholds(data: WeatherData): SevereWeatherAlert | null {
  if (!data) return null;

  // 1. Critical Wind Speed Threshold (> 40 km/h)
  if (data.windSpeed > WEATHER_THRESHOLDS.WIND_SPEED_KMH) {
    return {
      active: true,
      severity: "WARNING",
      title: `Severe Wind Warning (${data.windSpeed} km/h)`,
      description: `Sustained wind velocity in ${data.location} has reached ${data.windSpeed} km/h, exceeding the critical safety limit of ${WEATHER_THRESHOLDS.WIND_SPEED_KMH} km/h. High danger from airborne debris, sudden gale squalls, and falling tree branches.`,
      metric: "Wind Speed",
      currentValue: `${data.windSpeed} km/h`,
      threshold: `${WEATHER_THRESHOLDS.WIND_SPEED_KMH} km/h`,
      actionAdvice: "Secure loose outdoor gear, suspend elevated or marine operations, and seek safe shelter immediately.",
    };
  }

  // 2. Severe Convective Storms or Tropical Squalls
  const conditionLower = (data.condition || "").toLowerCase();
  if (
    conditionLower.includes("cyclone") ||
    conditionLower.includes("gale") ||
    conditionLower.includes("squall") ||
    conditionLower.includes("tornado")
  ) {
    return {
      active: true,
      severity: "WARNING",
      title: `Hazardous Storm Warning: ${data.condition}`,
      description: `Meteorological radar detected convective turbulence and severe storm circulation in ${data.location}. Barometric pressure: ${data.barometricPressure}.`,
      metric: "Atmospheric Condition",
      currentValue: data.condition,
      threshold: "Severe Storm Track",
      actionAdvice: "Stay away from windows and coastal zones; disconnect vulnerable electronics.",
    };
  }

  // 3. Extreme Heat Wave (> 42°C)
  if (data.temperature >= WEATHER_THRESHOLDS.EXTREME_TEMP_HIGH_C) {
    return {
      active: true,
      severity: "WATCH",
      title: `Extreme Heat Advisory (${data.temperature}°C)`,
      description: `Temperature in ${data.location} has climbed to ${data.temperature}°C with intense UV exposure.`,
      metric: "Temperature",
      currentValue: `${data.temperature}°C`,
      threshold: `${WEATHER_THRESHOLDS.EXTREME_TEMP_HIGH_C}°C`,
      actionAdvice: "Stay hydrated, limit sun exposure during peak hours, and check on vulnerable individuals.",
    };
  }

  return null;
}

/**
 * Format human-friendly live caption notification message
 */
export function formatLiveCaptionAlert(
  alert: SevereWeatherAlert,
  location: string,
  isTamil: boolean = false
): string {
  if (isTamil) {
    return `⚠️ தீவிர வானிலை எச்சரிக்கை: ${location}-ல் காற்றின் வேகம் ${alert.currentValue}-ஐ எட்டியுள்ளது (${alert.threshold} பாதுகாப்பு வரம்பை மீறியது)! பலத்த காற்று மற்றும் இடிமின்னல் squall அபாயம். பாதுகாப்பான இடத்தில் இருக்கவும்!`;
  }
  return `⚠️ SEVERE WEATHER ALERT: Wind speed in ${location} reached ${alert.currentValue} (exceeds ${alert.threshold} threshold)! ${alert.description} ${alert.actionAdvice || "Seek safe indoor shelter immediately."}`;
}

/**
 * Fetch weather from mock API and evaluate thresholds
 */
export async function fetchWeatherAndCheckAlerts(
  location: string = "Chennai",
  isTamil: boolean = false
): Promise<{
  weather: WeatherData;
  alert: SevereWeatherAlert | null;
  captionNotification: string | null;
}> {
  try {
    const res = await fetch(`/api/weather/forecast?location=${encodeURIComponent(location)}`);
    if (!res.ok) {
      throw new Error(`Weather service returned HTTP ${res.status}`);
    }
    const data: WeatherData = await res.json();
    const alert = checkWeatherThresholds(data) || data.alert || null;

    let captionNotification: string | null = null;
    if (alert && alert.active) {
      captionNotification = formatLiveCaptionAlert(alert, data.location, isTamil);
    }

    return { weather: data, alert, captionNotification };
  } catch (error) {
    console.error("fetchWeatherAndCheckAlerts error:", error);
    // Fallback static weather if offline
    const fallback: WeatherData = {
      location,
      temperature: 32,
      feelsLike: 36,
      condition: "Severe Wind Squall",
      windSpeed: 48.5,
      windGusts: 65.4,
      windDirection: "ENE (65°)",
      humidity: 84,
      barometricPressure: "1004 hPa",
      precipitationProbability: 80,
      uvIndex: 6,
      timestamp: new Date().toISOString(),
    };
    const alert = checkWeatherThresholds(fallback);
    const captionNotification = alert
      ? formatLiveCaptionAlert(alert, location, isTamil)
      : null;
    return { weather: fallback, alert, captionNotification };
  }
}
