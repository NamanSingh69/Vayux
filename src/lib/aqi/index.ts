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
      pm25: reading.pollutants.pm25,
      pm10: reading.pollutants.pm10,
      no2: reading.pollutants.no2,
      so2: reading.pollutants.so2,
      co: reading.pollutants.co,
      o3: reading.pollutants.o3,
      temperature: reading.temperature,
      humidity: reading.humidity,
      windSpeed: reading.windSpeed,
      windDeg: reading.windDeg,
      pressure: reading.pressure,
    },
  }));
  const stations: StationFeatureCollection = { type: "FeatureCollection", features };

  return {
    updatedAt: readings.map((reading) => reading.updatedAt).filter(Boolean).sort().at(-1) ?? new Date().toISOString(),
    stations,
    surface: createAqiSurface(stations),
  };
}
