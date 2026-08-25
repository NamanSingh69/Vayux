"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CPCB_AQI_SCALE } from "@/lib/aqi/cpcb";
import styles from "./map.module.css";

export function AqiLegend() {
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

  return (
    <aside ref={legendRef} className={styles.legend} aria-label="Indian AQI scale">
      <div className={styles.legendLabels}>
        <span>Good</span>
        <span>Severe</span>
      </div>
      <div className={styles.gradient}>
        {CPCB_AQI_SCALE.map((item) => <span key={item.label} style={{ backgroundColor: item.color }} />)}
      </div>
      <div className={styles.legendTicks} aria-hidden="true">
        {CPCB_AQI_SCALE.map((item) => <span key={item.min}>{item.min}</span>)}
        <span>500</span>
      </div>
    </aside>
  );
}
