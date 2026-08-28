import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSubIndex,
  calculateCpcbAqi,
  getAqiCategory,
  getAqiColor,
  CPCB_AQI_SCALE,
} from "../src/lib/aqi/cpcb";
import type { PollutantKey } from "../src/lib/aqi/types";

test("CPCB AQI: Piecewise linear sub-index interpolation for PM2.5", () => {
  // Breakpoints for PM2.5:
  // [0, 30] -> [0, 50]
  // [30, 60] -> [50, 100]
  // [60, 90] -> [100, 200]
  // [90, 120] -> [200, 300]
  // [120, 250] -> [300, 400]
  // [250, 350] -> [400, 500]

  assert.equal(calculateSubIndex("pm25", 0), 0);
  assert.equal(calculateSubIndex("pm25", 15), 25);
  assert.equal(calculateSubIndex("pm25", 30), 50);
  assert.equal(calculateSubIndex("pm25", 45), 75);
  assert.equal(calculateSubIndex("pm25", 60), 100);
  assert.equal(calculateSubIndex("pm25", 75), 150);
  assert.equal(calculateSubIndex("pm25", 90), 200);
  assert.equal(calculateSubIndex("pm25", 105), 250);
  assert.equal(calculateSubIndex("pm25", 120), 300);
  assert.equal(calculateSubIndex("pm25", 185), 350);
  assert.equal(calculateSubIndex("pm25", 250), 400);
  assert.equal(calculateSubIndex("pm25", 300), 450);
  assert.equal(calculateSubIndex("pm25", 350), 500);
  assert.equal(calculateSubIndex("pm25", 450), 500); // capped at 500
});

test("CPCB AQI: Piecewise linear sub-index interpolation for PM10", () => {
  // Breakpoints for PM10:
  // [0, 50] -> [0, 50]
  // [50, 100] -> [50, 100]
  // [100, 250] -> [100, 200]
  // [250, 350] -> [200, 300]
  // [350, 430] -> [300, 400]
  // [430, 600] -> [400, 500]

  assert.equal(calculateSubIndex("pm10", 0), 0);
  assert.equal(calculateSubIndex("pm10", 50), 50);
  assert.equal(calculateSubIndex("pm10", 100), 100);
  assert.equal(calculateSubIndex("pm10", 175), 150);
  assert.equal(calculateSubIndex("pm10", 250), 200);
  assert.equal(calculateSubIndex("pm10", 300), 250);
  assert.equal(calculateSubIndex("pm10", 350), 300);
  assert.equal(calculateSubIndex("pm10", 390), 350);
  assert.equal(calculateSubIndex("pm10", 430), 400);
  assert.equal(calculateSubIndex("pm10", 515), 450);
  assert.equal(calculateSubIndex("pm10", 600), 500);
});

test("CPCB AQI: Sub-index interpolation for all other pollutants", () => {
  const pollutants: PollutantKey[] = ["no2", "so2", "co", "o3", "nh3"];
  for (const pol of pollutants) {
    const sub0 = calculateSubIndex(pol, 0);
    assert.equal(sub0, 0, `0 concentration for ${pol} should give 0 AQI`);
    
    // Negative or non-finite inputs should return null
    assert.equal(calculateSubIndex(pol, -10), null);
    assert.equal(calculateSubIndex(pol, Number.NaN), null);
  }
});

test("CPCB AQI: calculateCpcbAqi dominant pollutant resolution", () => {
  // Moderate PM2.5 with lower others
  const result1 = calculateCpcbAqi({
    pm25: 45, // subIndex 75
    pm10: 60, // subIndex 60
    no2: 20,  // subIndex 25
  });

  assert.ok(result1);
  assert.equal(result1.aqi, 75);
  assert.equal(result1.category, "Satisfactory");
  assert.equal(result1.dominantPollutant, "PM2.5");

  // Severe PM10 with lower PM2.5
  const result2 = calculateCpcbAqi({
    pm25: 45,  // subIndex 75
    pm10: 450, // subIndex > 400 (Severe)
  });

  assert.ok(result2);
  assert.ok(result2.aqi >= 400);
  assert.equal(result2.category, "Severe");
  assert.equal(result2.dominantPollutant, "PM10");

  // Empty pollutants return null
  assert.equal(calculateCpcbAqi({}), null);
});

test("CPCB AQI: Category and Color boundaries", () => {
  assert.equal(getAqiCategory(0), "Good");
  assert.equal(getAqiCategory(50), "Good");
  assert.equal(getAqiCategory(51), "Satisfactory");
  assert.equal(getAqiCategory(100), "Satisfactory");
  assert.equal(getAqiCategory(101), "Moderate");
  assert.equal(getAqiCategory(200), "Moderate");
  assert.equal(getAqiCategory(201), "Poor");
  assert.equal(getAqiCategory(300), "Poor");
  assert.equal(getAqiCategory(301), "Very Poor");
  assert.equal(getAqiCategory(400), "Very Poor");
  assert.equal(getAqiCategory(401), "Severe");
  assert.equal(getAqiCategory(500), "Severe");

  for (const item of CPCB_AQI_SCALE) {
    assert.equal(getAqiColor(item.min), item.color);
    assert.equal(getAqiColor(item.max), item.color);
  }
});
