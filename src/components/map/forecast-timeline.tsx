"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CPCB_AQI_SCALE } from "@/lib/aqi/cpcb";
import styles from "./map.module.css";

interface ForecastTimelineProps {
  onHourChange?: (hourOffset: number, simulatedMultiplier: number) => void;
  baselineAqi: number;
}

export function ForecastTimeline({ onHourChange, baselineAqi }: ForecastTimelineProps) {
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
      const syntheticAqi = Math.round(baselineAqi * diurnalFactor);

      return {
        hour,
        label: `${dayStr} ${timeStr}`,
        aqi: Math.min(syntheticAqi, 480),
        multiplier: diurnalFactor,
      };
    });
  }, [baselineAqi]);

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
    <aside className={styles.forecast} aria-label="Forecast timeline" style={{ "--forecast-accent": aqiColor } as React.CSSProperties}>
      <div className={styles.forecastTop}>
        <div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? "Pause" : "Play 72h"}
          </button>
          <span>
            {selectedHour === 0 ? "Live Monitoring (Now)" : `+${selectedHour}h Forecast (${currentItem.label})`}
          </span>
        </div>

        <div>
          <span>Predicted AQI</span>
          <strong>{currentItem.aqi}</strong>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={72}
        step={1}
        value={selectedHour}
        onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
      />

      <div className={styles.forecastTicks}>
        <span>Now</span>
        <span>+24 Hours</span>
        <span>+48 Hours</span>
        <span>+72 Hours</span>
      </div>
    </aside>
  );
}
