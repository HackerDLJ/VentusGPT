export type DecisionSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type WeatherDecision = {
  severity: DecisionSeverity;
  score: number;
  headline: string;
  reasons: string[];
  actions: string[];
  source: "NWP" | "FORECAST" | "OFFICIAL" | "COMBINED";
  officialWarning: boolean;
};

type Inputs = {
  rainProbability?: number;
  precipitationMm?: number;
  windKmh?: number;
  gustKmh?: number;
  weatherCodes?: number[];
  officialWarning?: boolean;
  activity?: "GENERAL" | "TRAVEL" | "SPRAYING" | "IRRIGATION" | "FERTILIZER" | "HARVESTING";
};

export function evaluateWeather(inputs: Inputs): WeatherDecision {
  const rain = inputs.rainProbability ?? 0;
  const precip = inputs.precipitationMm ?? 0;
  const wind = inputs.windKmh ?? 0;
  const gust = inputs.gustKmh ?? 0;
  const thunderstorm = (inputs.weatherCodes ?? []).some(code => code >= 95);

  let score = 0;
  const reasons: string[] = [];

  if (rain >= 80) { score += 30; reasons.push(`rain probability is ${Math.round(rain)}%`); }
  else if (rain >= 60) { score += 18; reasons.push(`rain probability is ${Math.round(rain)}%`); }
  if (precip >= 20) { score += 30; reasons.push(`precipitation may reach ${precip.toFixed(1)} mm/h`); }
  else if (precip >= 10) { score += 18; reasons.push(`precipitation may reach ${precip.toFixed(1)} mm/h`); }
  if (gust >= 60) { score += 30; reasons.push(`wind gusts may reach ${Math.round(gust)} km/h`); }
  else if (gust >= 40) { score += 18; reasons.push(`wind gusts may reach ${Math.round(gust)} km/h`); }
  if (wind >= 40) { score += 10; reasons.push(`sustained wind may reach ${Math.round(wind)} km/h`); }
  if (thunderstorm) { score += 20; reasons.push("thunderstorm signals appear in the forecast window"); }
  if (inputs.officialWarning) { score = Math.max(score, 85); reasons.unshift("an official warning is active"); }

  score = Math.min(100, score);
  const severity: DecisionSeverity = inputs.officialWarning && score >= 85 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MODERATE" : "LOW";

  const actions: string[] = [];
  switch (inputs.activity) {
    case "SPRAYING":
      if (rain >= 60 || wind >= 25 || gust >= 35) actions.push("Avoid spraying during this window; reassess when rain and wind risk falls.");
      else actions.push("Conditions are comparatively favorable, but verify the crop label and local advisory before spraying.");
      break;
    case "IRRIGATION":
      if (rain >= 60 || precip >= 5) actions.push("Consider delaying irrigation and recheck the forecast before operating pumps.");
      else actions.push("No strong rainfall signal is detected; use field moisture and crop stage to decide irrigation.");
      break;
    case "FERTILIZER":
      if (rain >= 60 || precip >= 10) actions.push("Consider delaying application because rainfall may cause runoff or wash-off.");
      else actions.push("Weather risk is lower, but follow crop-specific fertilizer guidance.");
      break;
    case "HARVESTING":
      if (rain >= 60 || gust >= 40) actions.push("Consider a safer dry and lower-wind window for harvesting operations.");
      else actions.push("Weather risk is comparatively lower; confirm field conditions before harvesting.");
      break;
    case "TRAVEL":
      if (gust >= 50 || thunderstorm || precip >= 20) actions.push("Consider postponing exposed travel and check official warnings before departure.");
      else actions.push("No major model-derived travel hazard is detected; continue checking official updates.");
      break;
    default:
      actions.push("Use the forecast as decision support and verify official warnings for safety-critical decisions.");
  }

  return {
    severity,
    score,
    headline: severity === "CRITICAL" ? "Official warning or severe conditions require immediate attention" : severity === "HIGH" ? "Elevated weather risk detected" : severity === "MODERATE" ? "Some weather-related caution is advised" : "No major model-derived hazard detected",
    reasons,
    actions,
    source: inputs.officialWarning ? (score > 0 ? "COMBINED" : "OFFICIAL") : "NWP",
    officialWarning: Boolean(inputs.officialWarning),
  };
}
