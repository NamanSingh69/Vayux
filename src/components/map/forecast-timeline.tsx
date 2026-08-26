"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CPCB_AQI_SCALE } from "@/lib/aqi/cpcb";

interface ForecastTimelineProps {
  onHourChange?: (hourOffset: number, simulatedMultiplier: number) => void;
}

export function ForecastTimeline({ onHourChange }: ForecastTimelineProps) {
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const hourlyData = useMemo(() => {
    return Array.from({ length: 73 }, (_, hour) => {
      const now = new Date();
      now.setHours(now.getHours() + hour);
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
      const dayStr = now.toLocaleDateString("en-IN", { weekday: "short" });

      const hourOfDay = now.getHours();
      const diurnalFactor = 1.0 + 0.35 * Math.sin(((hourOfDay - 9) * Math.PI) / 12);
      const syntheticAqi = Math.round(260 * diurnalFactor);

      return {
        hour,
        label: `${dayStr} ${timeStr}`,
        aqi: Math.min(syntheticAqi, 480),
        multiplier: diurnalFactor,
      };
    });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedHour((prev) => {
        if (prev >= 72) {
          setIsPlaying(false);
          return 72;
        }
        return prev + 1;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const current = hourlyData[selectedHour];
    if (current && onHourChange) {
      onHourChange(selectedHour, current.multiplier);
    }
  }, [selectedHour, hourlyData, onHourChange]);

  const currentItem = hourlyData[selectedHour] ?? hourlyData[0];
  const aqiColor = CPCB_AQI_SCALE.find((s) => currentItem.aqi <= s.max)?.color ?? "#8f273b";

  return (
    <div
      style={{
        position: "absolute",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(680px, 90vw)",
        background: "rgba(9, 9, 9, 0.9)",
        backdropFilter: "blur(14px)",
        border: "1px solid #222",
        borderRadius: "14px",
        padding: "16px 20px",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        zIndex: 10,
        boxShadow: "0 14px 40px rgba(0,0,0,0.65)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? "#e44a3a" : "#fff",
              color: isPlaying ? "#fff" : "#000",
              border: "none",
              borderRadius: "6px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isPlaying ? "Pause" : "Play 72h"}
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#ccc" }}>
            {selectedHour === 0 ? "Live Monitoring (Now)" : `+${selectedHour}h Forecast (${currentItem.label})`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#888" }}>Predicted Regional AQI:</span>
          <span style={{ fontSize: "16px", fontWeight: 800, color: aqiColor }}>{currentItem.aqi}</span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={72}
        step={1}
        value={selectedHour}
        onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
        style={{
          width: "100%",
          accentColor: aqiColor,
          cursor: "pointer",
          marginBottom: "8px",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#666" }}>
        <span>Now</span>
        <span>+24 Hours</span>
        <span>+48 Hours</span>
        <span>+72 Hours</span>
      </div>
    </div>
  );
}