"use client";

import { useState, type CSSProperties } from "react";
import styles from "./map.module.css";

interface SimulationResult {
  simulated_aqi: number;
  percentage_improvement: string;
}

interface PolicySandboxProps {
  baselineAqi: number;
}

export function PolicySandbox({ baselineAqi }: PolicySandboxProps) {
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
          vehicular_multiplier: vehicular,
          stubble_multiplier: stubble,
          industrial: 1.0,
          dust: 1.0
        }),
      });
      const data = await res.json() as SimulationResult | { error?: string };
      if (!res.ok || !("simulated_aqi" in data)) {
        throw new Error("error" in data ? data.error ?? "Failed" : "Failed");
      }
      setResult(data as SimulationResult);
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : "Service unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.policyContent}>
      <div className={styles.policyHeader} style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#1f2937" }}>GRAP Simulator</h3>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>Adjust emission sources to forecast regional impact.</p>
      </div>

      <div className={styles.controlGroup} style={{ "--policy-progress": `${stubble * 100}%`, "--policy-accent": "#e66f3c" } as CSSProperties}>
        <label htmlFor="stubble-control">
          <span className={styles.controlLabel}>
            <small>Agricultural source</small>
            <strong>Stubble Burning</strong>
          </span>
          <output>{Math.round(stubble * 100)}%</output>
        </label>
        <input
          id="stubble-control"
          type="range" min="0" max="1" step="0.1" value={stubble}
          onChange={(event) => setStubble(Number.parseFloat(event.target.value))}
        />
      </div>

      <div className={styles.controlGroup} style={{ "--policy-progress": `${vehicular * 100}%`, "--policy-accent": "#5065d8" } as CSSProperties}>
        <label htmlFor="vehicular-control">
          <span className={styles.controlLabel}>
            <small>Urban source</small>
            <strong>Vehicular Emissions</strong>
          </span>
          <output>{Math.round(vehicular * 100)}%</output>
        </label>
        <input
          id="vehicular-control"
          type="range" min="0" max="1" step="0.1" value={vehicular}
          onChange={(event) => setVehicular(Number.parseFloat(event.target.value))}
        />
      </div>

      <button type="button" onClick={runSimulation} disabled={loading} className={styles.runButton} aria-busy={loading}>
        {loading && <span className={styles.buttonSpinner} aria-hidden="true" />}
        <span>{loading ? "Simulating scenario…" : "Run scenario"}</span>
      </button>

      {result && (
        <div className={styles.simResult} style={{ marginTop: "24px", padding: "16px", background: "#f3f4f6", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Scenario AQI</span>
            <strong style={{ fontSize: "24px", color: "#111827" }}>{result.simulated_aqi}</strong>
          </div>
          <p style={{ fontSize: "13px", color: "#16a34a", marginTop: "8px", fontWeight: 500 }}>
            AQI improved by {result.percentage_improvement}%
          </p>
        </div>
      )}
      {error && <p className={styles.panelError} role="alert">{error}</p>}
    </div>
  );
}