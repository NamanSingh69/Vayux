"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import gsap from "gsap";
import { CPCB_AQI_SCALE } from "@/lib/aqi/cpcb";
import styles from "./map.module.css";

interface AqiLegendProps {
  activeAqi: number;
}

export function AqiLegend({ activeAqi }: AqiLegendProps) {
  const legendRef = useRef<HTMLElement>(null);
  const activeBand = CPCB_AQI_SCALE.find((item) => activeAqi <= item.max)
    ?? CPCB_AQI_SCALE[CPCB_AQI_SCALE.length - 1];
  const position = Math.max(1.5, Math.min((activeAqi / 500) * 100, 98.5));

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

  return (
    <aside
      ref={legendRef}
      className={styles.legend}
      aria-label={`Indian AQI scale. Current forecast ${activeAqi}, ${activeBand.label}`}
      style={{
        "--legend-position": `${position}%`,
        "--legend-accent": activeBand.color,
      } as CSSProperties}
    >
      <div className={styles.legendSummary}>
        <span>AQI scale</span>
        <strong>{activeBand.label}</strong>
      </div>
      <div className={styles.legendScale}>
        <div className={styles.gradient}>
          {CPCB_AQI_SCALE.map((item) => (
            <span key={item.label} title={`${item.label}: ${item.min}–${item.max}`} style={{ backgroundColor: item.color }} />
          ))}
        </div>
        <span className={styles.legendMarker} aria-hidden="true"><i /></span>
      </div>
      <div className={styles.legendTicks} aria-hidden="true">
        <span>0</span>
        <span>100</span>
        <span>200</span>
        <span>300</span>
        <span>400</span>
        <span>500</span>
      </div>
    </aside>
  );
}