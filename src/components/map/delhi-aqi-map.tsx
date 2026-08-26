"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import gsap from "gsap";
import type { AqiApiResponse, StationProperties } from "@/lib/aqi/types";
import { CPCB_AQI_SCALE, getAqiColor } from "@/lib/aqi/cpcb";
import { AqiLegend } from "./aqi-legend";
import { MapStatus } from "./map-status";
import { PolicySandbox } from "./policy-sandbox";
import styles from "./map.module.css";
import { ForecastTimeline } from "./forecast-timeline";

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
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<string>();

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
      paintAqiData(payload);
      setUpdatedAt(payload.updatedAt);
      setState("ready");
    } catch (error) {
      // The map remains usable when the hourly government feed is unavailable.
      console.warn("Unable to fetch Delhi NCR AQI map data", error);
      dataRef.current = null;
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
      style: "https://tiles.openfreemap.org/styles/positron",
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
      if (map.getSource(SURFACE_SOURCE)) return;
      const initialData = dataRef.current;
      map.addSource(SURFACE_SOURCE, { type: "geojson", data: initialData?.surface ?? EMPTY_GEOJSON });
      map.addSource(STATIONS_SOURCE, { type: "geojson", data: initialData?.stations ?? EMPTY_GEOJSON });

      const firstLabelLayer = map.getStyle().layers?.find((layer: { type: string; id: string }) => layer.type === "symbol")?.id;
      map.addLayer({
        id: SURFACE_LAYER,
        type: "heatmap",
        source: SURFACE_SOURCE,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "aqi"], 0, 0, 500, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.86, 10, 0.68, 12, 0.5],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(52,168,83,0)",
            0.04, CPCB_AQI_SCALE[0].color,
            0.18, CPCB_AQI_SCALE[1].color,
            0.34, CPCB_AQI_SCALE[2].color,
            0.52, CPCB_AQI_SCALE[3].color,
            0.72, CPCB_AQI_SCALE[4].color,
            1, CPCB_AQI_SCALE[5].color,
          ],
          "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, 26, 10, 84, 12, 280, 14, 500],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.2, 12, 0.18, 14, 0.16],
        },
      }, firstLabelLayer);

      map.addLayer({
        id: SURFACE_COLOR_LAYER,
        type: "circle",
        source: SURFACE_SOURCE,
        paint: {
          // Radius follows the screen-space size of the 4 km IDW grid. The
          // overlap and full blur make one continuous field rather than dots.
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, 22, 10, 82, 12, 310, 14, 980],
          "circle-color": ["interpolate", ["linear"], ["get", "aqi"], ...CIRCLE_COLOR_STOPS],
          "circle-blur": 1,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.46, 12, 0.43, 14, 0.4],
        },
      }, firstLabelLayer);

      map.addLayer({
        id: STATIONS_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 10, 4.2, 13, 6.5, 16, 9],
          "circle-color": ["interpolate", ["linear"], ["get", "aqi"], ...CIRCLE_COLOR_STOPS],
          "circle-stroke-width": 1.4,
          "circle-stroke-color": "rgba(255,255,255,0.92)",
          "circle-opacity": 0.98,
        },
      });

      map.addLayer({
        id: STATIONS_HIT_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 9, 10, 13, 14, 20],
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
        const accent = getAqiColor(props.aqi);
        const updated = props.updatedAt ? formatUpdate(props.updatedAt) : "Time unavailable";
        const html = `<p class="aqi-popup-title">${escapeHtml(props.station)}</p><div class="aqi-popup-value"><strong>AQI ${props.aqi}</strong><span>${escapeHtml(props.category)}</span></div><p class="aqi-popup-detail">${escapeHtml(props.dominantPollutant)} · ${escapeHtml(updated)} · CPCB</p>`;
        const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: "230px" })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(html)
          .addTo(map);
        const popupElement = popup.getElement();
        popupElement.style.setProperty("--aqi-accent", accent);
        if (!prefersReducedMotion) {
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
              content?.querySelectorAll(".aqi-popup-title, .aqi-popup-value, .aqi-popup-detail") ?? [],
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
      });

      paintAqiData(dataRef.current);

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
  }, [paintAqiData]);

  useEffect(() => {
    void loadAqi();
    const interval = window.setInterval(() => void loadAqi(), REFRESH_MS);
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
          },
        })),
      };

      const surfaceSource = mapRef.current.getSource(SURFACE_SOURCE) as GeoJSONSource | undefined;
      surfaceSource?.setData(modulatedSurface);
    },
    []
  );

  return (
    <main className={styles.mapPage}>
      <div ref={containerRef} className={styles.map} aria-label="Interactive Delhi NCR air quality map" />
      <PolicySandbox />
      <ForecastTimeline onHourChange={handleForecastChange} />
      <MapStatus state={state} updatedAt={updatedAt} />
      <AqiLegend />
    </main>
  );
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
