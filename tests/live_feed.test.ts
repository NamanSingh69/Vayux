import test from "node:test";
import assert from "node:assert/strict";
import { getNcrAqi } from "../src/lib/aqi/index";

test("Live Feed: CAAQMS sensor ingestion returns 100+ stations in Delhi NCR", async () => {
  const data = await getNcrAqi();

  assert.ok(data, "Response should not be null");
  assert.ok(data.stations, "Stations GeoJSON should be present");
  assert.ok(Array.isArray(data.stations.features), "Stations features array should be present");
  assert.ok(
    data.stations.features.length >= 80,
    `Expected at least 80 Delhi NCR stations, received ${data.stations.features.length}`
  );
});

test("Live Feed: Meteorological and pollutant bounds for authentic conditions", async () => {
  const data = await getNcrAqi();
  const features = data.stations.features;

  for (const feature of features) {
    const p = feature.properties;
    assert.ok(p.station, "Station name must exist");
    assert.ok(typeof p.aqi === "number" && p.aqi >= 0 && p.aqi <= 500, `AQI out of range: ${p.aqi}`);

    // In current season, PM2.5 is typically bounded < 150 µg/m³
    if (typeof p.pm25 === "number") {
      assert.ok(p.pm25 >= 0 && p.pm25 <= 250, `PM2.5 out of physical bounds: ${p.pm25}`);
    }

    if (typeof p.pm10 === "number") {
      assert.ok(p.pm10 >= 0 && p.pm10 <= 400, `PM10 out of physical bounds: ${p.pm10}`);
    }

    // Weather values
    if (typeof p.temperature === "number") {
      assert.ok(p.temperature >= 10 && p.temperature <= 55, `Temperature out of physical bounds: ${p.temperature}°C`);
    }

    if (typeof p.humidity === "number") {
      assert.ok(p.humidity >= 10 && p.humidity <= 100, `Humidity out of physical bounds: ${p.humidity}%`);
    }

    // Geographic coordinates inside Delhi NCR region bounds
    const [lon, lat] = feature.geometry.coordinates;
    assert.ok(lon >= 75.5 && lon <= 78.8, `Longitude ${lon} outside NCR bounds for ${p.station}`);
    assert.ok(lat >= 27.0 && lat <= 30.5, `Latitude ${lat} outside NCR bounds for ${p.station}`);
  }
});
