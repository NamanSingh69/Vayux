import interpolate from "@turf/interpolate";
import type { Feature, FeatureCollection, Point } from "geojson";
import { clampAqi } from "./cpcb";
import type { StationFeatureCollection, SurfaceFeatureCollection } from "./types";

// Keep the grid buffered beyond the camera bounds so its feathered edge is
// never visible as a rectangle while navigating Delhi NCR.
export const NCR_INTERPOLATION_BBOX: [number, number, number, number] = [74.9, 25.9, 79.3, 31.1];

export function createAqiSurface(stations: StationFeatureCollection): SurfaceFeatureCollection {
  if (stations.features.length < 2) return { type: "FeatureCollection", features: [] };

  const interpolated = interpolate(stations as FeatureCollection<Point>, 4, {
    gridType: "point",
    property: "aqi",
    units: "kilometers",
    weight: 2,
    bbox: NCR_INTERPOLATION_BBOX,
  }) as FeatureCollection<Point, { aqi?: number }>;

  return {
    type: "FeatureCollection",
    features: interpolated.features.flatMap((feature): Array<Feature<Point, { aqi: number }>> => {
      const aqi = feature.properties?.aqi;
      return typeof aqi === "number" && Number.isFinite(aqi)
        ? [{ ...feature, properties: { aqi: clampAqi(aqi) } }]
        : [];
    }),
  };
}
