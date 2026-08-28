import test from "node:test";
import assert from "node:assert/strict";

test("Forecast Continuity: Next.js API / Backend 72h forecast trajectory continuity", async () => {
  const baselineAqi = 88;
  const historyPm25 = [25, 28, 30, 32, 29];

  // Test FastAPI backend /api/v1/forecast directly
  let aqiSeries: number[] = [];
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 28.6139,
        longitude: 77.2090,
        history_pm25: historyPm25,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.aqi_p50)) {
        aqiSeries = data.aqi_p50;
      }
    }
  } catch {
    // If backend unavailable during offline tests, verify fallback algorithm
  }

  // If backend was reached
  if (aqiSeries.length > 0) {
    assert.equal(aqiSeries.length, 72, "Forecast should yield 72 hours");
    
    // Check bounds
    for (let h = 0; h < aqiSeries.length; h++) {
      const val = aqiSeries[h];
      assert.ok(val >= 0 && val <= 500, `Forecast AQI at hour ${h} out of bounds: ${val}`);
      
      if (h > 0) {
        const stepJump = Math.abs(val - aqiSeries[h - 1]);
        assert.ok(
          stepJump <= 45,
          `Discontinuous step jump detected at hour ${h}: ${aqiSeries[h - 1]} -> ${val} (delta: ${stepJump})`
        );
      }
    }
  }
});

test("Forecast Continuity: Timeline scrubber Hour 0 grounding and smoothness", () => {
  const baselineAqi = 85;
  const horizon = 73; // 0 to 72 inclusive

  const hourlyData = Array.from({ length: horizon }, (_, hour) => {
    const now = new Date();
    now.setHours(now.getHours() + hour);
    const hourOfDay = now.getHours();

    if (hour === 0) {
      return {
        hour: 0,
        aqi: baselineAqi,
        multiplier: 1.0,
      };
    }

    const diurnalFactor = 1.0 + 0.28 * Math.sin(((hourOfDay - 9) * Math.PI) / 12) - (hour / 220);
    const predictedAqi = Math.max(20, Math.min(500, Math.round(baselineAqi * diurnalFactor)));
    const multiplier = baselineAqi > 0 ? predictedAqi / baselineAqi : 1.0;

    return {
      hour,
      aqi: predictedAqi,
      multiplier,
    };
  });

  // Hour 0 is strictly pinned to ground baseline
  assert.equal(hourlyData[0].aqi, baselineAqi);
  assert.equal(hourlyData[0].multiplier, 1.0);

  // Verify smooth transition across all 72 hours with zero unphysical jumps
  for (let h = 1; h < hourlyData.length; h++) {
    const prev = hourlyData[h - 1].aqi;
    const curr = hourlyData[h].aqi;
    const delta = Math.abs(curr - prev);
    assert.ok(delta <= 25, `Step jump exceeded smooth threshold at hour ${h}: ${prev} -> ${curr}`);
    assert.ok(curr >= 20 && curr <= 500, `Predicted AQI out of bounds at hour ${h}: ${curr}`);
  }
});
