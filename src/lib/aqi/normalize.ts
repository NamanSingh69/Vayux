import { calculateCpcbAqi } from "./cpcb";
import type { DataGovRecord } from "./data-gov";
import type { PollutantKey, StationReading } from "./types";

const NCR_BOUNDS = { west: 75.8, south: 27.0, east: 78.4, north: 30.0 };

function valueFor(record: DataGovRecord, ...names: string[]): unknown {
  const keys = Object.keys(record);
  for (const name of names) {
    const match = keys.find((key) => key.toLowerCase().replace(/[ _.-]/g, "") === name.toLowerCase().replace(/[ _.-]/g, ""));
    if (match) return record[match];
  }
  return undefined;
}

function numberFor(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function pollutantKey(value: unknown): PollutantKey | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, PollutantKey> = {
    pm25: "pm25", pm2: "pm25", pm10: "pm10", no2: "no2", so2: "so2",
    co: "co", ozone: "o3", o3: "o3", nh3: "nh3",
  };
  return aliases[normalized] ?? null;
}

function normalizeConcentration(pollutant: PollutantKey, value: number): number {
  // The data.gov.in CPCB feed publishes CO in hundredths of mg/m³
  // (for example, 78 represents 0.78 mg/m³). CPCB breakpoints use mg/m³.
  return pollutant === "co" ? value / 100 : value;
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value !== "string") return "";
  const timestamp = value.trim();
  // The current CPCB feed uses `DD-MM-YYYY HH:mm:ss` in Indian local time.
  const match = timestamp.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return timestamp;

  const [, day, month, year, hour, minute, second = "00"] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`).toISOString();
}

interface StationDraft {
  station: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  pollutants: Partial<Record<PollutantKey, number>>;
  pollutantUpdatedAt: Partial<Record<PollutantKey, string>>;
}

function isNewer(candidate: string, current: string): boolean {
  if (!current) return true;
  const candidateTime = Date.parse(candidate);
  const currentTime = Date.parse(current);
  if (!Number.isNaN(candidateTime) && !Number.isNaN(currentTime)) return candidateTime >= currentTime;
  return candidate >= current;
}

/** Collapses the government feed's one-row-per-pollutant format into stations. */
export function normalizeCpcbRecords(records: DataGovRecord[]): StationReading[] {
  const stations = new Map<string, StationDraft>();

  for (const record of records) {
    const stationValue = valueFor(record, "station", "station_name");
    const station = typeof stationValue === "string" ? stationValue.trim() : "";
    const latitude = numberFor(valueFor(record, "latitude", "lat"));
    const longitude = numberFor(valueFor(record, "longitude", "lon", "lng"));
    const pollutant = pollutantKey(valueFor(record, "pollutant_id", "pollutant"));
    const rawAverage = numberFor(valueFor(record, "pollutant_avg", "avg_value", "avg", "average"));

    if (
      !station || latitude === null || longitude === null || !pollutant || rawAverage === null ||
      latitude < NCR_BOUNDS.south || latitude > NCR_BOUNDS.north ||
      longitude < NCR_BOUNDS.west || longitude > NCR_BOUNDS.east
    ) continue;
    const average = normalizeConcentration(pollutant, rawAverage);

    const updatedValue = valueFor(record, "last_update", "last_updated", "updated_at");
    const updatedAt = normalizeTimestamp(updatedValue);
    const key = station.toLocaleLowerCase();
    const current = stations.get(key);

    if (!current) {
      stations.set(key, {
        station,
        latitude,
        longitude,
        updatedAt,
        pollutants: { [pollutant]: average },
        pollutantUpdatedAt: { [pollutant]: updatedAt },
      });
      continue;
    }

    // A station has rows from several pollutants, each with its own feed timestamp.
    // Only supersede a duplicate for the same pollutant; never discard PM10 because
    // a newer PM2.5 row happened to be seen first.
    if (isNewer(updatedAt, current.pollutantUpdatedAt[pollutant] ?? "")) {
      current.pollutants[pollutant] = average;
      current.pollutantUpdatedAt[pollutant] = updatedAt;
    }
    if (updatedAt && isNewer(updatedAt, current.updatedAt)) current.updatedAt = updatedAt;
  }

  return [...stations.values()].flatMap(({ pollutantUpdatedAt: _timestamps, ...station }) => {
    const summary = calculateCpcbAqi(station.pollutants);
    return summary ? [{ ...station, ...summary }] : [];
  });
}
