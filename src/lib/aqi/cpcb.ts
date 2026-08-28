import type { AqiCategory, PollutantKey } from "./types";

type Breakpoint = readonly [concentrationLow: number, concentrationHigh: number, aqiLow: number, aqiHigh: number];

export const CPCB_AQI_SCALE: ReadonlyArray<{
  min: number;
  max: number;
  label: AqiCategory;
  color: string;
}> = [
  { min: 0, max: 50, label: "Good", color: "#18a64a" },
  { min: 51, max: 100, label: "Satisfactory", color: "#87c91b" },
  { min: 101, max: 200, label: "Moderate", color: "#f2ce22" },
  { min: 201, max: 300, label: "Poor", color: "#f19019" },
  { min: 301, max: 400, label: "Very Poor", color: "#e44331" },
  { min: 401, max: 500, label: "Severe", color: "#971f43" },
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
