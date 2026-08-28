"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import vayuxLogo from "@/vayux.png";
import styles from "./map.module.css";

interface MapStatusProps {
  state: "loading" | "ready" | "error";
  updatedAt?: string;
  metrics: {
    stationCount: number;
    category: string;
    color: string;
  };
}

function timeLabel(updatedAt?: string) {
  if (!updatedAt) return null;
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.valueOf())) return updatedAt;
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(parsed);
}

export function MapStatus({ state, updatedAt, metrics }: MapStatusProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const label = state === "loading"
    ? "Loading air quality…"
    : state === "error"
      ? "AQI data unavailable"
      : timeLabel(updatedAt) ? `Updated ${timeLabel(updatedAt)}` : "Live monitoring";

  useEffect(() => {
    if (!wrapRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = Array.from(wrapRef.current.children);
    const cleanups: Array<() => void> = [];
    const context = gsap.context(() => {
      gsap.fromTo(elements, { autoAlpha: 0, y: -10 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: "power3.out",
        clearProps: "transform",
      });

      elements.forEach((element) => {
        const enter = () => gsap.to(element, { y: -2, scale: 1.015, duration: 0.22, ease: "power2.out" });
        const leave = () => gsap.to(element, { y: 0, scale: 1, duration: 0.3, ease: "power3.out" });
        element.addEventListener("pointerenter", enter);
        element.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          element.removeEventListener("pointerenter", enter);
          element.removeEventListener("pointerleave", leave);
        });
      });
    }, wrapRef);
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!statusRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(statusRef.current, { autoAlpha: 0.45, y: -4 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.32,
      ease: "power2.out",
    });
  }, [label]);

  return (
    <div ref={wrapRef} className={styles.statusWrap} aria-live="polite">
      <div className={styles.brand}>
        <Image className={styles.logo} src={vayuxLogo} alt="VayuX" priority />
        <span>Command Center</span>
      </div>
      <div ref={statusRef} className={`${styles.status} ${state === "error" ? styles.statusError : ""}`}>{label}</div>
      <div
        className={styles.systemPill}
        style={{ "--status-accent": metrics.color } as CSSProperties}
      >
        <span />
        {state === "ready" ? `${metrics.category} · ${metrics.stationCount} stations` : "System nominal"}
      </div>
    </div>
  );
}
