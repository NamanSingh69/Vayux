import interpolate from "@turf/interpolate";
import type { Feature, FeatureCollection, Point } from "geojson";
import { clampAqi } from "./cpcb";
import type { StationFeatureCollection, SurfaceFeatureCollection, SurfaceProperties } from "./types";
export const NCR_INTERPOLATION_BBOX: [number, number, number, number] = [74.9, 25.9, 79.3, 31.1];

// Keep the grid buffered beyond the camera bounds so its edge is never visible
// while navigating Delhi NCR. The client shades these samples continuously.
export function createAqiSurface(stations: StationFeatureCollection): SurfaceFeatureCollection {
  if (stations.features.length < 2) return { type: "FeatureCollection", features: [] };

  const grid = interpolate(stations as FeatureCollection<Point>, 4, {
    gridType: "point",
    property: "aqi",
    units: "kilometers",
    weight: 2,
    bbox: NCR_INTERPOLATION_BBOX,
  }) as FeatureCollection<Point, { aqi?: number }>;

  const stationData = stations.features.map((f) => ({
    coords: f.geometry.coordinates as [number, number],
    aqi: f.properties.aqi,
    pm25: f.properties.pm25 ?? Math.max(20, f.properties.aqi * 0.65),
    pm10: f.properties.pm10 ?? Math.max(50, f.properties.aqi * 1.6),
    temperature: f.properties.temperature ?? 30.0,
    humidity: f.properties.humidity ?? 65,
  }));

  const features: Array<Feature<Point, SurfaceProperties>> = [];

  for (const gridPoint of grid.features) {
    const [gx, gy] = gridPoint.geometry.coordinates;
    let sumWeight = 0;
    let sumAqi = 0;
    let sumPm25 = 0;
    let sumPm10 = 0;
    let sumTemp = 0;
    let sumHum = 0;
    let exactMatch = false;

    for (let j = 0; j < stationData.length; j++) {
      const s = stationData[j];
      const dx = (gx - s.coords[0]) * 98.0; // km at ~28.5 deg N
      const dy = (gy - s.coords[1]) * 111.0; // km
      const distSq = dx * dx + dy * dy;

      if (distSq < 0.01) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [gx, gy] },
          properties: {
            aqi: clampAqi(s.aqi),
            pm25: Number(s.pm25.toFixed(1)),
            pm10: Number(s.pm10.toFixed(1)),
            temperature: Number(s.temperature.toFixed(1)),
            humidity: Math.round(s.humidity),
          },
        });
        exactMatch = true;
        break;
      }

      const w = 1 / distSq;
      sumWeight += w;
      sumAqi += s.aqi * w;
      sumPm25 += s.pm25 * w;
      sumPm10 += s.pm10 * w;
      sumTemp += s.temperature * w;
      sumHum += s.humidity * w;
    }

    if (!exactMatch && sumWeight > 0) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [gx, gy] },
        properties: {
          aqi: clampAqi(sumAqi / sumWeight),
          pm25: Number((sumPm25 / sumWeight).toFixed(1)),
          pm10: Number((sumPm10 / sumWeight).toFixed(1)),
          temperature: Number((sumTemp / sumWeight).toFixed(1)),
          humidity: Math.round(sumHum / sumWeight),
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
