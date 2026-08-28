import test from "node:test";
import assert from "node:assert/strict";
import { simulatePolicyImpact } from "../src/lib/aqi/policy";

test("Policy Simulation: Status quo baseline gives 0 reduction", () => {
  const result = simulatePolicyImpact({
    baseline_aqi: 340,
    baseline_pm25: 260.0,
    vehicular: 1.0,
    stubble: 1.0,
    industrial: 1.0,
    dust: 1.0,
  });

  assert.equal(result.baseline_aqi, 340);
  assert.equal(result.simulated_aqi, 340);
  assert.equal(result.aqi_reduction, 0);
  assert.equal(result.percentage_improvement, 0);
});

test("Policy Simulation: Odd-even vehicular mitigation reduces AQI monotonically", () => {
  const base = simulatePolicyImpact({ baseline_aqi: 300, vehicular: 1.0 });
  const halfVehicular = simulatePolicyImpact({ baseline_aqi: 300, vehicular: 0.5 });
  const zeroVehicular = simulatePolicyImpact({ baseline_aqi: 300, vehicular: 0.0 });

  assert.ok(halfVehicular.simulated_aqi < base.simulated_aqi, "50% vehicles must reduce AQI");
  assert.ok(zeroVehicular.simulated_aqi < halfVehicular.simulated_aqi, "100% vehicles ban must reduce AQI further");
  assert.ok(halfVehicular.percentage_improvement > 10, "50% vehicular reduction yields >10% improvement");
});

test("Policy Simulation: 100% Stubble fire ban in Punjab/Haryana produces major relief", () => {
  const result = simulatePolicyImpact({
    baseline_aqi: 400,
    baseline_pm25: 310.0,
    vehicular: 1.0,
    stubble: 0.0, // Full stubble ban
    industrial: 1.0,
    dust: 1.0,
  });

  // Stubble is 35% of total source profile, with secondary boundary layer feedback
  assert.ok(result.percentage_improvement >= 35, `Expected >=35% improvement, got ${result.percentage_improvement}%`);
  assert.ok(result.simulated_aqi <= 260, `Expected simulated AQI <= 260, got ${result.simulated_aqi}`);
});

test("Policy Simulation: GRAP Stage IV emergency full-scale lockdown", () => {
  const result = simulatePolicyImpact({
    baseline_aqi: 450,
    baseline_pm25: 350.0,
    vehicular: 0.3, // 70% reduction in transport
    stubble: 0.0,   // Zero stubble
    industrial: 0.3,// 70% industrial reduction
    dust: 0.2,      // 80% anti-smog dust suppression
  });

  assert.ok(result.percentage_improvement >= 65, "GRAP Stage IV must produce >65% improvement");
  assert.ok(result.simulated_aqi <= 160, `Simulated AQI must be <= 160, got ${result.simulated_aqi}`);
  assert.ok(result.simulated_pm25 >= 5.0, "PM2.5 must remain above physical minimum");
});
