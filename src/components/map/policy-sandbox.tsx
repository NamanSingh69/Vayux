"use client";

import { useState } from "react";
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
  const [vehicular, setVehicular] = useState(1.0);
  const [stubble, setStubble] = useState(1.0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
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
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
    setLoading(false);
  };

  return (
    <aside className={styles.sandbox} aria-label="Policy mitigation sandbox">
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon}>∫</span>
        <div>
          <h2>Policy Sandbox</h2>
          <p>Run source-control scenarios against the current baseline.</p>
        </div>
      </div>

      <div className={styles.controlGroup}>
        <label>
          <span>Stubble Burning (Punjab/Haryana)</span>
          <span>{Math.round(stubble * 100)}%</span>
        </label>
        <input 
          type="range" min="0" max="1" step="0.1" value={stubble} 
          onChange={(e) => setStubble(parseFloat(e.target.value))}
        />
      </div>

      <div className={styles.controlGroup}>
        <label>
          <span>Vehicular Emissions (Delhi NCR)</span>
          <span>{Math.round(vehicular * 100)}%</span>
        </label>
        <input 
          type="range" min="0" max="1" step="0.1" value={vehicular} 
          onChange={(e) => setVehicular(parseFloat(e.target.value))}
        />
      </div>

      <button 
        onClick={runSimulation}
        disabled={loading}
        className={styles.runButton}>
        {loading ? "Running..." : "Run Simulation"}
      </button>

      {result && (
        <div className={styles.simResult}>
          <div>
            <span>Simulated AQI</span>
            <strong>{result.simulated_aqi}</strong>
          </div>
          <p>
            AQI improved by {result.percentage_improvement}% due to secondary PBL expansion.
          </p>
        </div>
      )}
    </aside>
  );
}
