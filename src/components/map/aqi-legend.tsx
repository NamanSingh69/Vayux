"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { getLayerScale, type MapLayerKey } from "@/lib/aqi/cpcb";
import styles from "./map.module.css";

interface AqiLegendProps {
  activeLayer?: MapLayerKey;
}

export function AqiLegend({ activeLayer = "AQI" }: AqiLegendProps) {
  const legendRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = legendRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanupHover = () => {};
    const context = gsap.context(() => {
      gsap.fromTo(element, { autoAlpha: 0, y: 14 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.65,
        delay: 0.14,
        ease: "power3.out",
        clearProps: "transform",
      });
      const enter = () => gsap.to(element, { y: -2, scale: 1.008, duration: 0.22, ease: "power2.out" });
      const leave = () => gsap.to(element, { y: 0, scale: 1, duration: 0.32, ease: "power3.out" });
      element.addEventListener("pointerenter", enter);
      element.addEventListener("pointerleave", leave);
      cleanupHover = () => {
        element.removeEventListener("pointerenter", enter);
        element.removeEventListener("pointerleave", leave);
      };
    }, legendRef);
    return () => {
      cleanupHover();
      context.revert();
    };
  }, []);

  const scale = getLayerScale(activeLayer);

  const getLegendLabels = () => {
    switch (activeLayer) {
      case "AQI":
        return { left: "Good", right: "Severe (AQI)", title: "National Air Quality Index Scale" };
      case "PM2.5":
        return { left: "0 µg/m³ (Good)", right: "350+ µg/m³ (Severe)", title: "PM2.5 Particulate Concentration" };
      case "PM10":
        return { left: "0 µg/m³ (Good)", right: "600+ µg/m³ (Severe)", title: "PM10 Coarse Particulate Concentration" };
      case "Temperature":
        return { left: "15°C (Cool)", right: "48°C+ (Extreme)", title: "Surface Ambient Temperature" };
      case "Humidity":
        return { left: "10% (Dry)", right: "100% (Saturated)", title: "Relative Humidity" };
    }
  };

  const getLegendTicks = () => {
    switch (activeLayer) {
      case "AQI":
        return ["0", "51", "101", "201", "301", "401", "500"];
      case "PM2.5":
        return ["0", "30", "60", "90", "120", "250", "350"];
      case "PM10":
        return ["0", "50", "100", "250", "350", "430", "600"];
      case "Temperature":
        return ["15°", "24°", "30°", "36°", "42°", "48°", "55°"];
      case "Humidity":
        return ["10%", "30%", "50%", "70%", "85%", "95%", "100%"];
    }
  };

  const labels = getLegendLabels();
  const ticks = getLegendTicks();

  return (
    <aside ref={legendRef} className={styles.legend} aria-label={`${activeLayer} scale`}>
      <div className={styles.legendLabels}>
        <span>{labels.left}</span>
        <span>{labels.right}</span>
      </div>
      <div className={styles.gradient}>
        {scale.map((item) => (
          <span
            key={item.label}
            style={{ backgroundColor: item.color }}
            title={`${item.label} (${item.min}-${item.max})`}
          />
        ))}
      </div>
      <div className={styles.legendTicks} aria-hidden="true">
        {ticks.map((tick, idx) => (
          <span key={`${tick}-${idx}`}>{tick}</span>
        ))}
      </div>
    </aside>
  );
}
