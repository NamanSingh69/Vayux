"use client";

import { useState } from "react";

interface SimulationResult {
  baseline_aqi: number;
  simulated_aqi: number;
  aqi_reduction: number;
  percentage_improvement: number;
}

export function PolicySandbox() {
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
          baseline_aqi: 340,
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
    <div style={{
      position: "absolute", top: "20px", right: "20px", width: "320px",
      background: "rgba(9, 9, 9, 0.85)", backdropFilter: "blur(12px)",
      border: "1px solid #222", borderRadius: "12px", padding: "20px",
      color: "#fff", fontFamily: "Inter, sans-serif", zIndex: 10,
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
    }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 600, fontFamily: "Mona Sans, sans-serif" }}>
        Policy Mitigation Sandbox
      </h3>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
          <span>Stubble Burning (Punjab/Haryana)</span>
          <span>{Math.round(stubble * 100)}%</span>
        </label>
        <input 
          type="range" min="0" max="1" step="0.1" value={stubble} 
          onChange={(e) => setStubble(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "#ef972e", cursor: "pointer" }} 
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
          <span>Vehicular Emissions (Delhi NCR)</span>
          <span>{Math.round(vehicular * 100)}%</span>
        </label>
        <input 
          type="range" min="0" max="1" step="0.1" value={vehicular} 
          onChange={(e) => setVehicular(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "#e44a3a", cursor: "pointer" }} 
        />
      </div>

      <button 
        onClick={runSimulation}
        disabled={loading}
        style={{
          width: "100%", padding: "10px", borderRadius: "6px", border: "none",
          background: loading ? "#333" : "#fff", color: loading ? "#888" : "#000",
          fontWeight: 600, cursor: loading ? "wait" : "pointer", transition: "all 0.2s"
        }}>
        {loading ? "Running Physics Engine..." : "Simulate Impact"}
      </button>

      {result && (
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>Simulated AQI</span>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#34a853" }}>{result.simulated_aqi}</span>
          </div>
          <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
            AQI improved by {result.percentage_improvement}% due to secondary PBL expansion.
          </div>
        </div>
      )}
    </div>
  );
}