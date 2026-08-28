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
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDeg?: number;
  pressure?: number;
}

export interface StationProperties {
  station: string;
  aqi: number;
  category: AqiCategory;
  dominantPollutant: string;
  updatedAt: string;
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDeg?: number;
  pressure?: number;
}

export type MapLayerKey = "AQI" | "PM2.5" | "PM10" | "Temperature" | "Humidity";

export interface SurfaceProperties {
  aqi: number;
  pm25?: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
}

export type StationFeatureCollection = FeatureCollection<Point, StationProperties>;
export type SurfaceFeatureCollection = FeatureCollection<Point, SurfaceProperties>;

export interface AqiApiResponse {
  updatedAt: string;
  stations: StationFeatureCollection;
  surface: SurfaceFeatureCollection;
}
