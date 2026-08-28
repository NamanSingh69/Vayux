"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import gsap from "gsap";
import type { AqiApiResponse, StationProperties } from "@/lib/aqi/types";
import {
  CPCB_AQI_SCALE,
  getAqiColor,
  getLayerColor,
  getLayerColorStops,
  getLayerHeatmapConfig,
  formatStationLayerBadge,
  type MapLayerKey,
} from "@/lib/aqi/cpcb";
import { AqiLegend } from "./aqi-legend";
import { MapStatus } from "./map-status";
import { PolicySandbox } from "./policy-sandbox";
import styles from "./map.module.css";
import { ForecastTimeline } from "./forecast-timeline";
import { StationDetailDrawer } from "./station-detail-drawer";

const EMPTY_GEOJSON = { type: "FeatureCollection" as const, features: [] };
const REFRESH_MS = 12 * 60 * 1000;
const SURFACE_SOURCE = "aqi-surface";
const STATIONS_SOURCE = "aqi-stations";
const SURFACE_LAYER = "aqi-surface-heat";
const SURFACE_COLOR_LAYER = "aqi-surface-color";
const STATIONS_LAYER = "aqi-stations-circle";
const STATIONS_HIT_LAYER = "aqi-stations-hit";

const CIRCLE_COLOR_STOPS = CPCB_AQI_SCALE.flatMap((item) => [item.min, item.color]);

export function DelhiAqiMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const dataRef = useRef<AqiApiResponse | null>(null);
  const [aqiData, setAqiData] = useState<AqiApiResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [selectedStation, setSelectedStation] = useState<StationProperties | null>(null);
  const [stationQuery, setStationQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerKey>("AQI");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const updateLayerStyles = useCallback((layer: MapLayerKey) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const cfg = getLayerHeatmapConfig(layer);
    const colorStops = getLayerColorStops(layer);

    if (map.getLayer(SURFACE_LAYER)) {
      map.setPaintProperty(SURFACE_LAYER, "heatmap-weight", [
        "interpolate", ["linear"], ["coalesce", ["get", cfg.property], cfg.weightMin],
        cfg.weightMin, 0,
        cfg.weightMax, 1,
      ]);
      map.setPaintProperty(SURFACE_LAYER, "heatmap-color", [
        "interpolate", ["linear"], ["heatmap-density"],
        ...cfg.colorStops,
      ]);
    }

    if (map.getLayer(SURFACE_COLOR_LAYER)) {
      map.setPaintProperty(SURFACE_COLOR_LAYER, "circle-color", [
        "interpolate", ["linear"], ["coalesce", ["get", cfg.property], cfg.weightMin],
        ...colorStops,
      ]);
    }

    if (map.getLayer(STATIONS_LAYER)) {
      map.setPaintProperty(STATIONS_LAYER, "circle-color", [
        "interpolate", ["linear"], ["coalesce", ["get", cfg.property], cfg.weightMin],
        ...colorStops,
      ]);
    }

    map.triggerRepaint();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectStation = useCallback((targetName: string) => {
    const needle = targetName.trim().toLowerCase();
    const match = aqiData?.stations.features.find((feature) =>
      feature.properties.station.toLowerCase() === needle ||
      feature.properties.station.toLowerCase().includes(needle)
    );
    const map = mapRef.current;
    if (!match || !map) return;

    setStationQuery(match.properties.station);
    setShowDropdown(false);
    setSelectedStation(match.properties);

    const coordinates = match.geometry.coordinates as [number, number];
    map.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 12.5), duration: 750, essential: true });
  }, [aqiData]);

  const handleStationSearch = useCallback(() => {
    if (!stationQuery.trim()) return;
    selectStation(stationQuery);
  }, [selectStation, stationQuery]);

  const paintAqiData = useCallback((payload: AqiApiResponse | null) => {
    const map = mapRef.current;
    if (!map) return;

    const surface = map.getSource(SURFACE_SOURCE) as GeoJSONSource | undefined;
    const stations = map.getSource(STATIONS_SOURCE) as GeoJSONSource | undefined;
    surface?.setData(payload?.surface ?? EMPTY_GEOJSON);
    stations?.setData(payload?.stations ?? EMPTY_GEOJSON);
    if (surface && stations) map.triggerRepaint();
  }, []);

  const loadAqi = useCallback(async () => {
    try {
      const response = await fetch("/api/aqi", { headers: { Accept: "application/json" } });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? `AQI endpoint returned ${response.status}`);
      }
      const payload = (await response.json()) as AqiApiResponse;
      dataRef.current = payload;
      setAqiData(payload);
      paintAqiData(payload);
      setUpdatedAt(payload.updatedAt);
      setState("ready");
    } catch (error) {
      console.warn("Unable to fetch Delhi NCR AQI map data", error);
      dataRef.current = null;
      setAqiData(null);
      paintAqiData(null);
      setState("error");
    }
  }, [paintAqiData]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionCleanups: Array<() => void> = [];

    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [77.1, 28.5],
      zoom: 8,
      pitch: 0,
      bearing: 0,
      minZoom: 8,
      maxZoom: 14,
      maxBounds: [[75.8, 27], [78.4, 30]],
      renderWorldCopies: false,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const controlGroup = containerRef.current.querySelector<HTMLElement>(".maplibregl-ctrl-group");
    if (controlGroup && !prefersReducedMotion) {
      gsap.fromTo(controlGroup, { autoAlpha: 0, x: 10 }, {
        autoAlpha: 1,
        x: 0,
        duration: 0.5,
        delay: 0.08,
        ease: "power3.out",
      });
      controlGroup.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        const enter = () => gsap.to(button, { scale: 1.07, duration: 0.18, ease: "power2.out" });
        const leave = () => gsap.to(button, { scale: 1, duration: 0.25, ease: "power3.out" });
        const down = () => gsap.to(button, { scale: 0.92, duration: 0.1, ease: "power2.out" });
        const up = () => gsap.to(button, { scale: 1.07, duration: 0.16, ease: "power2.out" });
        button.addEventListener("pointerenter", enter);
        button.addEventListener("pointerleave", leave);
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        motionCleanups.push(() => {
          button.removeEventListener("pointerenter", enter);
          button.removeEventListener("pointerleave", leave);
          button.removeEventListener("pointerdown", down);
          button.removeEventListener("pointerup", up);
        });
      });
    }
    map.on("error", (event) => {
      console.warn("MapLibre basemap error", event.error);
    });

    const setupMapLayers = () => {
      if (map.getSource(SURFACE_SOURCE)) {
        if (dataRef.current) paintAqiData(dataRef.current);
        return;
      }
      const initialData = dataRef.current;
      map.addSource(SURFACE_SOURCE, { type: "geojson", data: initialData?.surface ?? EMPTY_GEOJSON });
      map.addSource(STATIONS_SOURCE, { type: "geojson", data: initialData?.stations ?? EMPTY_GEOJSON });

      const firstLabelLayer = map.getStyle()?.layers?.find((layer: { type: string; id: string }) => layer.type === "symbol")?.id;
      
      map.addLayer({
        id: SURFACE_LAYER,
        type: "heatmap",
        source: SURFACE_SOURCE,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "aqi"], 0, 0, 500, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 10, 0.55, 12, 0.4],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(52,168,83,0)",
            0.05, CPCB_AQI_SCALE[0].color,
            0.20, CPCB_AQI_SCALE[1].color,
            0.38, CPCB_AQI_SCALE[2].color,
            0.56, CPCB_AQI_SCALE[3].color,
            0.75, CPCB_AQI_SCALE[4].color,
            1, CPCB_AQI_SCALE[5].color,
          ],
          "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, 20, 10, 60, 12, 180, 14, 380],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.35, 12, 0.28, 14, 0.22],
        },
      }, firstLabelLayer);

      map.addLayer({
        id: SURFACE_COLOR_LAYER,
        type: "circle",
        source: SURFACE_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, 14, 10, 48, 12, 160, 14, 420],
          "circle-color": ["interpolate", ["linear"], ["get", "aqi"], ...CIRCLE_COLOR_STOPS],
          "circle-blur": 0.9,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.22, 12, 0.2, 14, 0.18],
        },
      }, firstLabelLayer);

      map.addLayer({
        id: STATIONS_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4.5, 10, 6, 13, 8.5, 16, 12],
          "circle-color": ["interpolate", ["linear"], ["get", "aqi"], ...CIRCLE_COLOR_STOPS],
          "circle-stroke-width": 1.6,
          "circle-stroke-color": "rgba(255,255,255,0.9)",
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: STATIONS_HIT_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 12, 10, 16, 14, 24],
          "circle-color": "rgba(0,0,0,0.01)",
          "circle-opacity": 0.01,
        },
      });
      map.on("mouseenter", STATIONS_HIT_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", STATIONS_HIT_LAYER, () => { map.getCanvas().style.cursor = ""; });
      map.on("click", STATIONS_HIT_LAYER, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const props = feature.properties as StationProperties;
        setSelectedStation(props);
        setStationQuery(props.station);
      });

      if (dataRef.current) {
        paintAqiData(dataRef.current);
      }
      updateLayerStyles(activeLayer);
    };
    map.on("style.load", setupMapLayers);
    map.once("load", setupMapLayers);
    if (map.isStyleLoaded()) setupMapLayers();

    return () => {
      motionCleanups.forEach((cleanup) => cleanup());
      const controls = containerRef.current?.querySelectorAll(".maplibregl-ctrl-group, .maplibregl-ctrl-group button");
      if (controls) gsap.killTweensOf(controls);
      map.remove();
      mapRef.current = null;
    };
  }, [paintAqiData, activeLayer, updateLayerStyles]);

  useEffect(() => {
    updateLayerStyles(activeLayer);
  }, [activeLayer, updateLayerStyles]);

  useEffect(() => {
    const fetchInitialData = async () => {
      await loadAqi();
    };

    void fetchInitialData();
    const interval = window.setInterval(() => {
      void loadAqi();
    }, REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [loadAqi]);

  const handleForecastChange = useCallback(
    (_hour: number, multiplier: number) => {
      if (!dataRef.current || !mapRef.current) return;
      const baseData = dataRef.current;

      const modulatedSurface = {
        ...baseData.surface,
        features: (baseData.surface?.features ?? []).map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            aqi: Math.min(Math.round((f.properties?.aqi ?? 200) * multiplier), 500),
            pm25: Number(((f.properties?.pm25 ?? 30) * multiplier).toFixed(1)),
            pm10: Number(((f.properties?.pm10 ?? 80) * multiplier).toFixed(1)),
          },
        })),
      };

      const surfaceSource = mapRef.current.getSource(SURFACE_SOURCE) as GeoJSONSource | undefined;
      surfaceSource?.setData(modulatedSurface);
    },
    []
  );

  const metrics = useMemo(() => deriveMetrics(aqiData), [aqiData]);
  const stationOptions = useMemo(
    () => aqiData?.stations.features
      .map((feature) => feature.properties.station)
      .sort((a, b) => a.localeCompare(b)) ?? [],
    [aqiData],
  );
  const matchingStationCount = useMemo(() => {
    const needle = stationQuery.trim().toLowerCase();
    if (!needle) return stationOptions.length;
    return stationOptions.filter((station) => station.toLowerCase().includes(needle)).length;
  }, [stationOptions, stationQuery]);

  const filteredStations = useMemo(() => {
    const needle = stationQuery.trim().toLowerCase();
    if (!needle) return aqiData?.stations.features ?? [];
    return (aqiData?.stations.features ?? []).filter((f) =>
      f.properties.station.toLowerCase().includes(needle)
    );
  }, [aqiData, stationQuery]);

  return (
    <main className={styles.mapPage}>
      <div ref={containerRef} className={styles.map} aria-label="Interactive Delhi NCR air quality map" />
      <div className={styles.mapVeil} aria-hidden="true" />
      <MapStatus state={state} updatedAt={updatedAt} metrics={metrics} />
      <section className={styles.commandPanel} aria-label="Delhi NCR command center">
        <div className={styles.layerSelectorWrap}>
          <button
            type="button"
            className={styles.layerSelectorBtn}
            onClick={() => setShowLayerMenu(!showLayerMenu)}
          >
            <span>Layer: <strong>{activeLayer}</strong></span>
            <span>▾</span>
          </button>
          {showLayerMenu && (
            <div className={styles.layerMenu}>
              {(["AQI", "PM2.5", "PM10", "Temperature", "Humidity"] as const).map((layer) => (
                <div
                  key={layer}
                  className={`${styles.layerMenuItem} ${activeLayer === layer ? styles.layerMenuActive : ""}`}
                  onClick={() => {
                    setActiveLayer(layer);
                    setShowLayerMenu(false);
                  }}
                >
                  {activeLayer === layer && <span className={styles.layerActivePip} />}
                  <span>{layer}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={searchContainerRef} className={styles.searchContainer}>
          <form
            className={styles.searchShell}
            onSubmit={(event) => {
              event.preventDefault();
              handleStationSearch();
            }}
          >
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search CPCB station..."
              aria-label="Search CPCB station"
              value={stationQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(event) => {
                setStationQuery(event.target.value);
                setShowDropdown(true);
              }}
            />
            <button type="submit" aria-label="Go to station">Go</button>
          </form>

          {showDropdown && filteredStations.length > 0 && (
            <div className={styles.searchDropdown} role="listbox">
              {filteredStations.slice(0, 30).map((f) => {
                const badgeInfo = formatStationLayerBadge(activeLayer, f.properties);
                const isLightText =
                  (activeLayer === "AQI" && f.properties.aqi > 200) ||
                  (activeLayer === "PM2.5" && (f.properties.pm25 ?? 0) > 120) ||
                  (activeLayer === "PM10" && (f.properties.pm10 ?? 0) > 250) ||
                  (activeLayer === "Temperature" && (f.properties.temperature ?? 0) > 36) ||
                  (activeLayer === "Humidity" && (f.properties.humidity ?? 0) > 80);

                return (
                  <div
                    key={f.properties.station}
                    className={styles.searchItem}
                    role="option"
                    aria-selected={stationQuery === f.properties.station}
                    onClick={() => selectStation(f.properties.station)}
                  >
                    <span>{f.properties.station}</span>
                    <span
                      className={styles.searchItemBadge}
                      style={{
                        backgroundColor: badgeInfo.color,
                        color: isLightText ? "#ffffff" : "#000000",
                      }}
                    >
                      {badgeInfo.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.regionCard}>
          <div>
            <span className={styles.eyebrow}>Target Sector</span>
            <h1>Delhi NCR</h1>
          </div>
          <span className={styles.livePill}>Live</span>
          <p>
            {metrics.stationCount
              ? `${matchingStationCount} of ${metrics.stationCount} CPCB stations available`
              : "Waiting for CPCB station feed"}
          </p>
        </div>

        <div className={styles.primaryMetric} style={{ "--metric-accent": metrics.color } as CSSProperties}>
          <div className={styles.metricTopline}>
            <span>Regional AQI</span>
            <span>{metrics.category}</span>
          </div>
          <div className={styles.metricValue}>
            <strong>{metrics.regionalAqi ?? "--"}</strong>
            <span>India AQI</span>
          </div>
          <div className={styles.metricBar} aria-hidden="true">
            <span style={{ width: `${metrics.regionalAqi ? Math.min((metrics.regionalAqi / 500) * 100, 100) : 0}%` }} />
          </div>
        </div>

        <div className={styles.metricGrid}>
          <div className={styles.compactMetric}>
            <span>Peak Station</span>
            <strong>{metrics.peakAqi ?? "--"}</strong>
            <small>{metrics.peakStation}</small>
          </div>
          <div className={styles.compactMetric}>
            <span>Driver</span>
            <strong>{metrics.dominantPollutant}</strong>
            <small>{metrics.dominantShare}</small>
          </div>
        </div>

        <div className={styles.physicsCard}>
          <div className={styles.physicsHeader}>
            <span>Atmospheric Inversion & Coupling</span>
            <span className={styles.inversionPill}>Inversion Active</span>
          </div>
          <div className={styles.physicsGrid}>
            <div>
              <span>Boundary Layer (PBLH)</span>
              <strong>353m (Trapped)</strong>
            </div>
            <div>
              <span>Solar Extinction</span>
              <strong>-66.7% Flux</strong>
            </div>
            <div>
              <span>Upwind NASA Fires</span>
              <strong>3 Hotspots</strong>
            </div>
            <div>
              <span>Wind Advection</span>
              <strong>2.4 m/s NW</strong>
            </div>
          </div>
        </div>
      </section>
      <StationDetailDrawer station={selectedStation} onClose={() => setSelectedStation(null)} />
      <PolicySandbox baselineAqi={metrics.regionalAqi ?? 235} />
      <ForecastTimeline onHourChange={handleForecastChange} baselineAqi={metrics.regionalAqi ?? 235} />
      <AqiLegend activeLayer={activeLayer} />
    </main>
  );
}

interface DashboardMetrics {
  regionalAqi: number | null;
  peakAqi: number | null;
  peakStation: string;
  category: string;
  color: string;
  stationCount: number;
  dominantPollutant: string;
  dominantShare: string;
}

function deriveMetrics(payload: AqiApiResponse | null): DashboardMetrics {
  const stations = payload?.stations.features ?? [];
  if (!stations.length) {
    return {
      regionalAqi: null,
      peakAqi: null,
      peakStation: "No live station",
      category: "Standby",
      color: "#a855f7",
      stationCount: 0,
      dominantPollutant: "AQI",
      dominantShare: "Feed offline",
    };
  }

  const readings = stations.map((feature) => feature.properties);
  const total = readings.reduce((sum, item) => sum + item.aqi, 0);
  const regionalAqi = Math.round(total / readings.length);
  const peak = readings.reduce((highest, item) => item.aqi > highest.aqi ? item : highest, readings[0]);
  const pollutantCounts = readings.reduce<Record<string, number>>((counts, item) => {
    counts[item.dominantPollutant] = (counts[item.dominantPollutant] ?? 0) + 1;
    return counts;
  }, {});
  const [dominantPollutant, count] = Object.entries(pollutantCounts)
    .sort((a, b) => b[1] - a[1])[0] ?? ["AQI", 0];

  return {
    regionalAqi,
    peakAqi: peak.aqi,
    peakStation: peak.station,
    category: peak.category,
    color: getAqiColor(regionalAqi),
    stationCount: readings.length,
    dominantPollutant,
    dominantShare: `${Math.round((count / readings.length) * 100)}% stations`,
  };
}

function openStationPopup(
  map: maplibregl.Map,
  coordinates: [number, number],
  props: StationProperties,
  prefersReducedMotion: boolean,
) {
  const accent = getAqiColor(props.aqi);
  const updated = props.updatedAt ? formatUpdate(props.updatedAt) : "Time unavailable";
  const html = `
    <p class="aqi-popup-kicker">${escapeHtml(props.dominantPollutant)} dominant</p>
    <p class="aqi-popup-title">${escapeHtml(props.station)}</p>
    <div class="aqi-popup-value">
      <strong>AQI ${props.aqi}</strong>
      <span>${escapeHtml(props.category)}</span>
    </div>
    <p class="aqi-popup-detail">${escapeHtml(updated)} · CPCB station feed</p>
  `;
  const popup = new maplibregl.Popup({ offset: 16, closeButton: true, maxWidth: "260px" })
    .setLngLat(coordinates)
    .setHTML(html)
    .addTo(map);
  const popupElement = popup.getElement();
  popupElement.style.setProperty("--aqi-accent", accent);
  if (prefersReducedMotion) return;

  const content = popupElement.querySelector<HTMLElement>(".maplibregl-popup-content");
  const timeline = gsap.timeline();
  timeline
    .fromTo(popupElement, { autoAlpha: 0, y: 9, scale: 0.93 }, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: "back.out(1.3)",
    })
    .fromTo(
      content?.querySelectorAll(".aqi-popup-kicker, .aqi-popup-title, .aqi-popup-value, .aqi-popup-detail") ?? [],
      { autoAlpha: 0, y: 5 },
      { autoAlpha: 1, y: 0, duration: 0.24, stagger: 0.035, ease: "power2.out" },
      "-=0.17",
    );

  const closeButton = popupElement.querySelector<HTMLButtonElement>(".maplibregl-popup-close-button");
  closeButton?.addEventListener("click", (closeEvent) => {
    closeEvent.preventDefault();
    closeEvent.stopImmediatePropagation();
    gsap.to(popupElement, {
      autoAlpha: 0,
      y: 5,
      scale: 0.96,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => popup.remove(),
    });
  }, { capture: true, once: true });
}

function formatUpdate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character] ?? character));
}
