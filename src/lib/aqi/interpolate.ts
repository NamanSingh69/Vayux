import interpolate from "@turf/interpolate";
import type { Feature, FeatureCollection, Point } from "geojson";
import { clampAqi } from "./cpcb";
import { NCR_INTERPOLATION_BBOX } from "./config";
import type { StationFeatureCollection, SurfaceFeatureCollection } from "./types";

// Keep the grid buffered beyond the camera bounds so its edge is never visible
// while navigating Delhi NCR. The client shades these samples continuously.
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
