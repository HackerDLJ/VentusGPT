import { evaluateWeather, type WeatherDecision } from "./decisionEngine.ts";

export type AgriActivity = "SPRAYING" | "IRRIGATION" | "FERTILIZER" | "HARVESTING";

export type AgriDecision = WeatherDecision & {
  crop: string;
  activity: AgriActivity;
  suitability: "FAVORABLE" | "CAUTION" | "POSTPONE";
  farmActions: string[];
  decision: "PROCEED" | "CAUTION" | "HALT_POSTPONE";
  advice: string;
  rainfallProbability: number;
  windSpeedKmh: number;
  gustSpeedKmh: number;
};

export function evaluateAgriculture(input: {
  crop: string;
  activity: AgriActivity;
  rainProbability?: number;
  precipitationMm?: number;
  windKmh?: number;
  gustKmh?: number;
  weatherCodes?: number[];
  officialWarning?: boolean;
}): AgriDecision {
  const decision = evaluateWeather({
    rainProbability: input.rainProbability,
    precipitationMm: input.precipitationMm,
    windKmh: input.windKmh,
    gustKmh: input.gustKmh,
    weatherCodes: input.weatherCodes,
    officialWarning: input.officialWarning,
    activity: input.activity,
  });

  let suitability: AgriDecision["suitability"] = "FAVORABLE";
  if (decision.severity === "HIGH" || decision.severity === "CRITICAL") suitability = "POSTPONE";
  else if (decision.severity === "MODERATE") suitability = "CAUTION";

  const farmActions = [...decision.actions];
  if (input.activity === "SPRAYING") {
    farmActions.push("Check the pesticide label, crop stage, and local agricultural advisory before application.");
  }
  if (input.activity === "IRRIGATION") {
    farmActions.push("Use field moisture and crop stage alongside the forecast before starting irrigation.");
  }
  if (input.activity === "FERTILIZER") {
    farmActions.push("Avoid runoff-sensitive application when significant rainfall is expected.");
  }
  if (input.activity === "HARVESTING") {
    farmActions.push("Confirm field access and crop dryness before harvesting operations.");
  }

  const decisionLabel = suitability === "POSTPONE" ? "HALT_POSTPONE" : suitability === "CAUTION" ? "CAUTION" : "PROCEED";
  const advice = suitability === "POSTPONE"
    ? farmActions[0] || "Postpone the activity and reassess when conditions improve."
    : suitability === "CAUTION"
      ? farmActions[0] || "Proceed cautiously and reassess the latest forecast before starting."
      : farmActions[0] || "Conditions are comparatively favorable. Continue to verify crop-specific guidance.";

  return {
    ...decision,
    crop: input.crop,
    activity: input.activity,
    suitability,
    farmActions,
    decision: decisionLabel,
    advice,
    rainfallProbability: Math.round(input.rainProbability ?? 0),
    windSpeedKmh: Math.round(input.windKmh ?? 0),
    gustSpeedKmh: Math.round(input.gustKmh ?? 0),
  };
}
