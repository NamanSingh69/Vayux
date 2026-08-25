import type { FeatureCollection, Point } from "geojson";

export type PollutantKey = "pm25" | "pm10" | "no2" | "so2" | "co" | "o3" | "nh3";

export type AqiCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export interface StationReading {
  station: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  pollutants: Partial<Record<PollutantKey, number>>;
  aqi: number;
  category: AqiCategory;
  dominantPollutant: string;
}

export interface StationProperties {
  station: string;
  aqi: number;
  category: AqiCategory;
  dominantPollutant: string;
  updatedAt: string;
}

export type StationFeatureCollection = FeatureCollection<Point, StationProperties>;
export type SurfaceFeatureCollection = FeatureCollection<Point, { aqi: number }>;

export interface AqiApiResponse {
  updatedAt: string;
  stations: StationFeatureCollection;
  surface: SurfaceFeatureCollection;
}
