import { strict as assert } from "node:assert";
import { evaluateWeather } from "./decisionEngine.ts";

const normal = evaluateWeather({
  rainProbability: 20,
  precipitationMm: 0,
  windKmh: 8,
  gustKmh: 14,
  weatherCodes: [1],
  activity: "GENERAL",
});
assert.equal(normal.severity, "LOW");
assert.equal(normal.officialWarning, false);

const spray = evaluateWeather({
  rainProbability: 85,
  precipitationMm: 12,
  windKmh: 22,
  gustKmh: 38,
  weatherCodes: [63],
  activity: "SPRAYING",
});
assert.ok(spray.score >= 30);
assert.ok(spray.actions[0].toLowerCase().includes("avoid spraying"));

const storm = evaluateWeather({
  rainProbability: 90,
  precipitationMm: 25,
  windKmh: 45,
  gustKmh: 72,
  weatherCodes: [95],
  activity: "TRAVEL",
});
assert.equal(storm.severity, "HIGH");
assert.ok(storm.reasons.length >= 3);

const official = evaluateWeather({
  rainProbability: 10,
  windKmh: 5,
  gustKmh: 10,
  weatherCodes: [1],
  officialWarning: true,
  activity: "GENERAL",
});
assert.equal(official.severity, "CRITICAL");
assert.equal(official.officialWarning, true);
assert.equal(official.source, "COMBINED");

console.log("decision engine scenarios: PASS");
