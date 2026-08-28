import json
import os
import sys
import random
import logging
import numpy as np
from typing import Dict, Any

curr_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(curr_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from ml.residual_adapter import PhysicsResidualAdapter
from research.evaluator import DeterministicBenchmarkEvaluator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VayuX.AutoResearch")

class AutoResearchHarness:
    """
    Automated trial execution harness for Antigravity agents.
    Mutates model parameters, runs benchmark evaluation, updates leaderboard state,
    and logs parameter updates.
    """
    def __init__(
        self, 
        leaderboard_path: str = None,
        benchmark_path: str = None
    ):
        if leaderboard_path is None:
            leaderboard_path = os.path.join(curr_dir, "leaderboard.json")
        if benchmark_path is None:
            benchmark_path = os.path.join(curr_dir, "benchmark_data.json")
        self.leaderboard_path = leaderboard_path
        self.evaluator = DeterministicBenchmarkEvaluator(benchmark_path)
        self.leaderboard = self._load_leaderboard()

    def _load_leaderboard(self) -> Dict[str, Any]:
        if os.path.exists(self.leaderboard_path):
            try:
                with open(self.leaderboard_path, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "best_score": -9999.0,
            "best_params": {},
            "trials_executed": 0,
            "history": []
        }

    def _save_leaderboard(self) -> None:
        os.makedirs(os.path.dirname(self.leaderboard_path), exist_ok=True)
        with open(self.leaderboard_path, "w") as f:
            json.dump(self.leaderboard, f, indent=2)

    def propose_mutation(self) -> Dict[str, float]:
        best = self.leaderboard.get("best_params", {})
        return {
            "alpha": max(0.0001, best.get("alpha", 0.0012) * random.uniform(0.8, 1.2)),
            "gamma": max(0.1, best.get("gamma", 0.65) * random.uniform(0.85, 1.15)),
            "pasquill_a": max(0.01, best.get("pasquill_a", 0.13) * random.uniform(0.9, 1.1)),
            "pasquill_b": max(0.1, best.get("pasquill_b", 0.90) * random.uniform(0.95, 1.05)),
            "pasquill_c": max(0.01, best.get("pasquill_c", 0.10) * random.uniform(0.9, 1.1)),
            "pasquill_d": max(0.1, best.get("pasquill_d", 0.85) * random.uniform(0.95, 1.05))
        }

    def run_trial(self, candidate_params: Dict[str, float] = None) -> Dict[str, Any]:
        if candidate_params is None:
            candidate_params = self.propose_mutation()

        pasquill_dict = {
            "a": candidate_params["pasquill_a"],
            "b": candidate_params["pasquill_b"],
            "c": candidate_params["pasquill_c"],
            "d": candidate_params["pasquill_d"]
        }
        
        adapter = PhysicsResidualAdapter(
            alpha=candidate_params["alpha"],
            gamma=candidate_params["gamma"],
            pasquill_params=pasquill_dict
        )

        synthetic_base = np.full(72, 210.0)
        metrics = self.evaluator.evaluate_parameter_set(adapter, synthetic_base)
        trial_score = metrics["composite_score"]
        
        self.leaderboard["trials_executed"] += 1
        is_improvement = trial_score > self.leaderboard["best_score"]

        if is_improvement:
            logger.info(f"New score improvement: {trial_score:.4f} (Previous: {self.leaderboard['best_score']:.4f})")
            self.leaderboard["best_score"] = trial_score
            self.leaderboard["best_params"] = candidate_params

        trial_record = {
            "trial_id": self.leaderboard["trials_executed"],
            "score": trial_score,
            "params": candidate_params,
            "metrics": metrics,
            "improved": is_improvement
        }
        self.leaderboard["history"].append(trial_record)
        self._save_leaderboard()

        return trial_record

if __name__ == "__main__":
    import sys
    # Ensure current directory and backend are on sys.path
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(curr_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    
    harness = AutoResearchHarness()
    logger.info("Executing Antigravity Autonomous Research Experiment Trial...")
    res = harness.run_trial()
    logger.info(f"Trial completed: {json.dumps(res, indent=2)}")
