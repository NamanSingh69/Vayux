import type { AqiCategory, PollutantKey } from "./types";

type Breakpoint = readonly [concentrationLow: number, concentrationHigh: number, aqiLow: number, aqiHigh: number];

export const CPCB_AQI_SCALE: ReadonlyArray<{
  min: number;
  max: number;
  label: AqiCategory;
  color: string;
}> = [
  { min: 0, max: 50, label: "Good", color: "#34a853" },
  { min: 51, max: 100, label: "Satisfactory", color: "#9acd4a" },
  { min: 101, max: 200, label: "Moderate", color: "#f6d447" },
  { min: 201, max: 300, label: "Poor", color: "#ef972e" },
  { min: 301, max: 400, label: "Very Poor", color: "#e44a3a" },
  { min: 401, max: 500, label: "Severe", color: "#8f273b" },
];

const POLLUTANT_LABELS: Record<PollutantKey, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO₂",
  so2: "SO₂",
  co: "CO",
  o3: "O₃",
  nh3: "NH₃",
};

// CPCB National AQI concentration breakpoints. CO is expressed in mg/m³;
// all other pollutants are expressed in μg/m³.
const CPCB_BREAKPOINTS: Record<PollutantKey, readonly Breakpoint[]> = {
  pm25: [
    [0, 30, 0, 50], [30, 60, 50, 100], [60, 90, 100, 200],
    [90, 120, 200, 300], [120, 250, 300, 400], [250, 350, 400, 500],
  ],
  pm10: [
    [0, 50, 0, 50], [50, 100, 50, 100], [100, 250, 100, 200],
    [250, 350, 200, 300], [350, 430, 300, 400], [430, 600, 400, 500],
  ],
  no2: [
    [0, 40, 0, 50], [40, 80, 50, 100], [80, 180, 100, 200],
    [180, 280, 200, 300], [280, 400, 300, 400], [400, 600, 400, 500],
  ],
  so2: [
    [0, 40, 0, 50], [40, 80, 50, 100], [80, 380, 100, 200],
    [380, 800, 200, 300], [800, 1600, 300, 400], [1600, 2500, 400, 500],
  ],
  co: [
    [0, 1, 0, 50], [1, 2, 50, 100], [2, 10, 100, 200],
    [10, 17, 200, 300], [17, 34, 300, 400], [34, 50, 400, 500],
  ],
  o3: [
    [0, 50, 0, 50], [50, 100, 50, 100], [100, 168, 100, 200],
    [168, 208, 200, 300], [208, 748, 300, 400], [748, 1000, 400, 500],
  ],
  nh3: [
    [0, 200, 0, 50], [200, 400, 50, 100], [400, 800, 100, 200],
    [800, 1200, 200, 300], [1200, 1800, 300, 400], [1800, 2500, 400, 500],
  ],
};

export function clampAqi(value: number): number {
  return Math.max(0, Math.min(500, Math.round(value)));
}

export function getAqiCategory(aqi: number): AqiCategory {
  const value = clampAqi(aqi);
  return CPCB_AQI_SCALE.find((item) => value <= item.max)?.label ?? "Severe";
}

export function getAqiColor(aqi: number): string {
  const value = clampAqi(aqi);
  return CPCB_AQI_SCALE.find((item) => value <= item.max)?.color ?? CPCB_AQI_SCALE[5].color;
}

export function calculateSubIndex(pollutant: PollutantKey, concentration: number): number | null {
  if (!Number.isFinite(concentration) || concentration < 0) return null;

  const ranges = CPCB_BREAKPOINTS[pollutant];
  const range = ranges.find((item) => concentration <= item[1]) ?? ranges[ranges.length - 1];
  const [cLow, cHigh, iLow, iHigh] = range;
  const capped = Math.min(Math.max(concentration, cLow), cHigh);

  return clampAqi(((iHigh - iLow) / (cHigh - cLow)) * (capped - cLow) + iLow);
}

export function calculateCpcbAqi(pollutants: Partial<Record<PollutantKey, number>>): {
  aqi: number;
  category: AqiCategory;
  dominantPollutant: string;
} | null {
  const readings = (Object.entries(pollutants) as Array<[PollutantKey, number]>)
    .map(([pollutant, concentration]) => ({
      pollutant,
      subIndex: calculateSubIndex(pollutant, concentration),
    }))
    .filter((reading): reading is { pollutant: PollutantKey; subIndex: number } => reading.subIndex !== null);

  if (!readings.length) return null;

  const dominant = readings.reduce((highest, reading) =>
    reading.subIndex > highest.subIndex ? reading : highest,
  );

  return {
    aqi: dominant.subIndex,
    category: getAqiCategory(dominant.subIndex),
    dominantPollutant: POLLUTANT_LABELS[dominant.pollutant],
  };
}

// -------------------------------------------------------------
// Multi-Layer Map Scales & Color Definitions
// -------------------------------------------------------------

export type MapLayerKey = "AQI" | "PM2.5" | "PM10" | "Temperature" | "Humidity";

export interface LayerScaleItem {
  min: number;
  max: number;
  label: string;
  color: string;
}

export const CPCB_PM25_SCALE: ReadonlyArray<LayerScaleItem> = [
  { min: 0, max: 30, label: "Good (0-30)", color: "#34a853" },
  { min: 31, max: 60, label: "Satisfactory (31-60)", color: "#9acd4a" },
  { min: 61, max: 90, label: "Moderate (61-90)", color: "#f6d447" },
  { min: 91, max: 120, label: "Poor (91-120)", color: "#ef972e" },
  { min: 121, max: 250, label: "Very Poor (121-250)", color: "#e44a3a" },
  { min: 251, max: 350, label: "Severe (251-350+)", color: "#8f273b" },
];

export const CPCB_PM10_SCALE: ReadonlyArray<LayerScaleItem> = [
  { min: 0, max: 50, label: "Good (0-50)", color: "#34a853" },
  { min: 51, max: 100, label: "Satisfactory (51-100)", color: "#9acd4a" },
  { min: 101, max: 250, label: "Moderate (101-250)", color: "#f6d447" },
  { min: 251, max: 350, label: "Poor (251-350)", color: "#ef972e" },
  { min: 351, max: 430, label: "Very Poor (351-430)", color: "#e44a3a" },
  { min: 431, max: 600, label: "Severe (431-600+)", color: "#8f273b" },
];

export const TEMPERATURE_SCALE: ReadonlyArray<LayerScaleItem> = [
  { min: 15, max: 24, label: "Cool (≤24°C)", color: "#38bdf8" },
  { min: 25, max: 30, label: "Mild (25-30°C)", color: "#4ade80" },
  { min: 31, max: 36, label: "Warm (31-36°C)", color: "#facc15" },
  { min: 37, max: 42, label: "Hot (37-42°C)", color: "#fb923c" },
  { min: 43, max: 48, label: "Very Hot (43-48°C)", color: "#f87171" },
  { min: 49, max: 55, label: "Extreme (>48°C)", color: "#c084fc" },
];

export const HUMIDITY_SCALE: ReadonlyArray<LayerScaleItem> = [
  { min: 10, max: 30, label: "Dry (≤30%)", color: "#fbbf24" },
  { min: 31, max: 50, label: "Moderate (31-50%)", color: "#a3e635" },
  { min: 51, max: 70, label: "Moist (51-70%)", color: "#2dd4bf" },
  { min: 71, max: 85, label: "Humid (71-85%)", color: "#38bdf8" },
  { min: 86, max: 95, label: "Very Humid (86-95%)", color: "#3b82f6" },
  { min: 96, max: 100, label: "Saturated (>95%)", color: "#6366f1" },
];

export function getLayerPropertyName(layer: MapLayerKey): "aqi" | "pm25" | "pm10" | "temperature" | "humidity" {
  switch (layer) {
    case "AQI": return "aqi";
    case "PM2.5": return "pm25";
    case "PM10": return "pm10";
    case "Temperature": return "temperature";
    case "Humidity": return "humidity";
  }
}

export function getLayerScale(layer: MapLayerKey): ReadonlyArray<LayerScaleItem> {
  switch (layer) {
    case "AQI":
      return CPCB_AQI_SCALE.map((s) => ({ ...s, label: s.label }));
    case "PM2.5":
      return CPCB_PM25_SCALE;
    case "PM10":
      return CPCB_PM10_SCALE;
    case "Temperature":
      return TEMPERATURE_SCALE;
    case "Humidity":
      return HUMIDITY_SCALE;
  }
}

export function getLayerColor(layer: MapLayerKey, value: number): string {
  const scale = getLayerScale(layer);
  const matched = scale.find((item) => value <= item.max);
  return matched?.color ?? scale[scale.length - 1].color;
}

export function getLayerColorStops(layer: MapLayerKey): Array<number | string> {
  const scale = getLayerScale(layer);
  return scale.flatMap((item) => [item.min, item.color]);
}

export function getLayerHeatmapConfig(layer: MapLayerKey): {
  weightMax: number;
  weightMin: number;
  property: "aqi" | "pm25" | "pm10" | "temperature" | "humidity";
  colorStops: Array<number | string>;
} {
  const property = getLayerPropertyName(layer);
  const scale = getLayerScale(layer);

  let weightMin = 0;
  let weightMax = 500;

  switch (layer) {
    case "AQI":
      weightMin = 0;
      weightMax = 500;
      break;
    case "PM2.5":
      weightMin = 0;
      weightMax = 350;
      break;
    case "PM10":
      weightMin = 0;
      weightMax = 600;
      break;
    case "Temperature":
      weightMin = 15;
      weightMax = 50;
      break;
    case "Humidity":
      weightMin = 20;
      weightMax = 100;
      break;
  }

  const colorStops: Array<number | string> = [
    0, "rgba(52,168,83,0)",
    0.05, scale[0].color,
    0.20, scale[1].color,
    0.38, scale[2].color,
    0.56, scale[3].color,
    0.75, scale[4].color,
    1.0, scale[5].color,
  ];

  return { property, weightMin, weightMax, colorStops };
}

export function formatStationLayerBadge(
  layer: MapLayerKey,
  props: {
    aqi: number;
    pm25?: number;
    pm10?: number;
    temperature?: number;
    humidity?: number;
  }
): { badge: string; color: string; numericVal: number } {
  switch (layer) {
    case "AQI": {
      const val = props.aqi;
      return { badge: `AQI ${val}`, color: getLayerColor("AQI", val), numericVal: val };
    }
    case "PM2.5": {
      const val = props.pm25 ?? Math.round(props.aqi * 0.65);
      return { badge: `${val} µg/m³`, color: getLayerColor("PM2.5", val), numericVal: val };
    }
    case "PM10": {
      const val = props.pm10 ?? Math.round(props.aqi * 1.6);
      return { badge: `${val} µg/m³`, color: getLayerColor("PM10", val), numericVal: val };
    }
    case "Temperature": {
      const val = props.temperature ?? 32.0;
      return { badge: `${val}°C`, color: getLayerColor("Temperature", val), numericVal: val };
    }
    case "Humidity": {
      const val = props.humidity ?? 65;
      return { badge: `${val}%`, color: getLayerColor("Humidity", val), numericVal: val };
    }
  }
}
