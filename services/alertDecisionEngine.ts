import { evaluateWeather, type WeatherDecision } from "./decisionEngine.ts";

export type AlertDecision = WeatherDecision & {
  status: "CLEAR" | "WATCH" | "WARNING" | "OFFICIAL";
  title: string;
  publicAdvice: string[];
};

export function evaluateAlert(input: {
  rainProbability?: number;
  precipitationMm?: number;
  windKmh?: number;
  gustKmh?: number;
  weatherCodes?: number[];
  officialWarning?: boolean;
}): AlertDecision {
  const decision = evaluateWeather({ ...input, activity: "GENERAL" });
  const status: AlertDecision["status"] = input.officialWarning
    ? "OFFICIAL"
    : decision.severity === "HIGH" || decision.severity === "CRITICAL"
      ? "WARNING"
      : decision.severity === "MODERATE"
        ? "WATCH"
        : "CLEAR";

  const title = status === "OFFICIAL"
    ? "Official weather warning"
    : status === "WARNING"
      ? "Elevated weather hazard"
      : status === "WATCH"
        ? "Weather conditions need attention"
        : "No significant weather alert";

  const publicAdvice = input.officialWarning
    ? ["Follow the latest official bulletin and local authority instructions.", "Do not treat this application as a replacement for emergency services."]
    : status === "WARNING"
      ? ["Avoid unnecessary exposure to hazardous conditions.", "Check the latest official weather bulletin before safety-critical travel or outdoor activity."]
      : status === "WATCH"
        ? ["Plan around the higher-risk period where practical.", "Recheck the forecast as conditions can change."]
        : ["Continue normal planning.", "Keep checking official updates when conditions matter."];

  return { ...decision, status, title, publicAdvice };
}
