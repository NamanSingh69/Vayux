import type { Feature } from "geojson";
import { fetchNcrCpcbRecords } from "./data-gov";
import { createAqiSurface } from "./interpolate";
import { normalizeCpcbRecords } from "./normalize";
import type { AqiApiResponse, StationFeatureCollection, StationProperties } from "./types";

export async function getNcrAqi(): Promise<AqiApiResponse> {
  const records = await fetchNcrCpcbRecords();
  const readings = normalizeCpcbRecords(records);
  const features: Array<Feature<GeoJSON.Point, StationProperties>> = readings.map((reading) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [reading.longitude, reading.latitude] },
    properties: {
      station: reading.station,
      aqi: reading.aqi,
      category: reading.category,
      dominantPollutant: reading.dominantPollutant,
      updatedAt: reading.updatedAt,
    },
  }));
  const stations: StationFeatureCollection = { type: "FeatureCollection", features };

  return {
    updatedAt: readings.map((reading) => reading.updatedAt).filter(Boolean).sort().at(-1) ?? new Date().toISOString(),
    stations,
    surface: createAqiSurface(stations),
  };
}
