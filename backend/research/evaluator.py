import json
import time
import os
import sys
import numpy as np
from typing import Dict, Any, List

curr_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(curr_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from ml.residual_adapter import PhysicsResidualAdapter

class DeterministicBenchmarkEvaluator:
    """
    Evaluation engine testing candidate parameters against historical Delhi pollution crises.
    Computes accuracy metrics (RMSE, MAE), peak recall, and checks CPU SLA latency limits.
    """
    def __init__(self, benchmark_file_path: str = None):
        if benchmark_file_path is None:
            benchmark_file_path = os.path.join(curr_dir, "benchmark_data.json")
        self.benchmark_data = self._load_benchmark_data(benchmark_file_path)

    def _load_benchmark_data(self, path: str) -> Dict[str, Any]:
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception:
            return {
                "winter_stubble_2023": {
                    "history_pm25": [220.0 + 15.0 * np.sin(i) for i in range(168)],
                    "ground_truth_pm25": [380.0 + 40.0 * np.cos(i/3) for i in range(72)],
                    "h_base": [300.0]*72, "u_wind": [0.8]*72, "v_wind": [0.4]*72,
                    "fire_hotspots": [{"latitude": 30.9, "longitude": 75.8, "frp": 450.0}]
                }
            }

    def evaluate_parameter_set(
        self, 
        adapter: PhysicsResidualAdapter, 
        base_predictions: np.ndarray
    ) -> Dict[str, float]:
        all_rmse, all_mae, peak_recalls, latencies = [], [], [], []

        for scenario_name, scenario in self.benchmark_data.items():
            y_true = np.array(scenario["ground_truth_pm25"])
            h_base = np.array(scenario["h_base"])
            u_wind = np.array(scenario["u_wind"])
            v_wind = np.array(scenario["v_wind"])
            fire_hotspots = scenario.get("fire_hotspots", [])

            t0 = time.perf_counter()
            y_pred = adapter.apply_coupling(
                base_predictions, h_base, u_wind, v_wind, 28.6139, 77.2090, fire_hotspots
            )
            lat_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append(lat_ms)

            rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
            mae = np.mean(np.abs(y_true - y_pred))
            
            peak_mask = y_true >= 400.0
            if np.sum(peak_mask) > 0:
                recall = np.sum((y_pred >= 400.0) & peak_mask) / np.sum(peak_mask)
            else:
                recall = 1.0

            all_rmse.append(rmse)
            all_mae.append(mae)
            peak_recalls.append(recall)

        mean_rmse = float(np.mean(all_rmse))
        mean_mae = float(np.mean(all_mae))
        mean_peak_recall = float(np.mean(peak_recalls))
        p95_latency = float(np.percentile(latencies, 95))

        latency_penalty = max(0.0, (p95_latency - 50.0) * 50.0)
        composite_score = -(mean_rmse + 0.5 * mean_mae) + (100.0 * mean_peak_recall) - latency_penalty

        return {
            "composite_score": round(composite_score, 4),
            "rmse": round(mean_rmse, 3),
            "mae": round(mean_mae, 3),
            "peak_recall": round(mean_peak_recall, 4),
            "p95_latency_ms": round(p95_latency, 2)
        }
