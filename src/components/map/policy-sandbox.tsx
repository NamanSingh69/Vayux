"use client";

import { type CSSProperties, useState } from "react";
import styles from "./map.module.css";

interface SimulationResult {
  baseline_aqi: number;
  simulated_aqi: number;
  aqi_reduction: number;
  percentage_improvement: number;
}

interface PolicySandboxProps {
  baselineAqi: number;
}

export function PolicySandbox({ baselineAqi }: PolicySandboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vehicular, setVehicular] = useState(1.0);
  const [stubble, setStubble] = useState(1.0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseline_aqi: baselineAqi,
          baseline_pm25: 260.0,
          vehicular: vehicular,
          stubble: stubble,
          industrial: 1.0,
          dust: 1.0
        }),
      });
      const data = await res.json() as SimulationResult | { error?: string };
      if (!res.ok || !("simulated_aqi" in data)) {
        throw new Error("error" in data ? data.error ?? "Simulation service is unavailable" : "Simulation service is unavailable");
      }
      setResult(data);
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : "Simulation service is unavailable");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className={styles.sandboxTriggerPill}
        onClick={() => setIsOpen(true)}
        aria-label="Open GRAP Policy Sandbox"
      >
        <span className={styles.sandboxIcon}>⚡</span>
        <span>GRAP Policy Simulator</span>
      </button>
    );
  }

  return (
    <aside className={styles.sandbox} aria-label="Policy mitigation sandbox">
      <div className={styles.sandboxHeader}>
        <div className={styles.sandboxTitleGroup}>
          <span className={styles.sandboxHeaderIcon}>⚡</span>
          <div>
            <h3 className={styles.sandboxTitle}>GRAP Policy Simulator</h3>
            <p className={styles.sandboxSubtitle}>Source-control & Inversion response</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.sandboxCloseBtn}
          onClick={() => setIsOpen(false)}
          aria-label="Close Policy Sandbox"
        >
          ✕
        </button>
      </div>

      <div
        className={styles.controlGroup}
        style={{ "--policy-progress": `${stubble * 100}%`, "--policy-accent": "#e66f3c" } as CSSProperties}
      >
        <label htmlFor="stubble-control">
          <span className={styles.controlLabel}>
            <small>Agricultural source</small>
            <strong>Stubble Burning</strong>
            <span>Punjab / Haryana</span>
          </span>
          <output htmlFor="stubble-control">{Math.round(stubble * 100)}%</output>
        </label>
        <input
          id="stubble-control"
          type="range" min="0" max="1" step="0.1" value={stubble}
          aria-valuetext={`${Math.round(stubble * 100)} percent of current emissions`}
          onChange={(event) => setStubble(Number.parseFloat(event.target.value))}
        />
        <div className={styles.controlScale} aria-hidden="true"><span>Reduced</span><span>Current</span></div>
      </div>

      <div
        className={styles.controlGroup}
        style={{ "--policy-progress": `${vehicular * 100}%`, "--policy-accent": "#5065d8" } as CSSProperties}
      >
        <label htmlFor="vehicular-control">
          <span className={styles.controlLabel}>
            <small>Urban source</small>
            <strong>Vehicular Emissions</strong>
            <span>Delhi NCR</span>
          </span>
          <output htmlFor="vehicular-control">{Math.round(vehicular * 100)}%</output>
        </label>
        <input
          id="vehicular-control"
          type="range" min="0" max="1" step="0.1" value={vehicular}
          aria-valuetext={`${Math.round(vehicular * 100)} percent of current emissions`}
          onChange={(event) => setVehicular(Number.parseFloat(event.target.value))}
        />
        <div className={styles.controlScale} aria-hidden="true"><span>Reduced</span><span>Current</span></div>
      </div>

      <button
        type="button"
        onClick={runSimulation}
        disabled={loading}
        className={styles.runButton}
        aria-busy={loading}
      >
        {loading && <span className={styles.buttonSpinner} aria-hidden="true" />}
        <span>{loading ? "Simulating scenario…" : "Run scenario"}</span>
        {!loading && <span className={styles.buttonArrow} aria-hidden="true">→</span>}
      </button>

      {result && (
        <div className={styles.simResult}>
          <div>
            <span>Scenario AQI</span>
            <strong>{result.simulated_aqi}</strong>
          </div>
          <p>
            AQI improved by {result.percentage_improvement}% due to secondary PBL expansion.
          </p>
        </div>
      )}
      {error && <p className={styles.panelError} role="alert">{error}</p>}
    </aside>
  );
}
