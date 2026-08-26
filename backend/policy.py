from typing import Dict, Any

DEFAULT_SOURCE_PROFILES = {
    "vehicular": 0.28,
    "stubble": 0.35,
    "industrial": 0.18,
    "dust": 0.12,
    "secondary_background": 0.07
}

def simulate_policy_impact(
    baseline_aqi: int,
    baseline_pm25: float,
    vehicular_scale: float = 1.0,
    stubble_scale: float = 1.0,
    industrial_scale: float = 1.0,
    dust_scale: float = 1.0
) -> Dict[str, Any]:
    """
    Evaluates instant chemical mass balance reduction
    and secondary PBL relaxation.
    """
    mitigated_pm25 = baseline_pm25 * (
        DEFAULT_SOURCE_PROFILES["secondary_background"] +
        (DEFAULT_SOURCE_PROFILES["vehicular"] * vehicular_scale) +
        (DEFAULT_SOURCE_PROFILES["stubble"] * stubble_scale) +
        (DEFAULT_SOURCE_PROFILES["industrial"] * industrial_scale) +
        (DEFAULT_SOURCE_PROFILES["dust"] * dust_scale)
    )

    pm25_delta_ratio = mitigated_pm25 / max(baseline_pm25, 1.0)
    feedback_bonus = 1.0 - (0.08 * (1.0 - pm25_delta_ratio))
    final_pm25 = max(mitigated_pm25 * feedback_bonus, 5.0)

    aqi_delta = (final_pm25 / max(baseline_pm25, 1.0)) * baseline_aqi
    simulated_aqi = max(int(round(aqi_delta)), 15)

    return {
        "baseline_aqi": baseline_aqi,
        "simulated_aqi": simulated_aqi,
        "aqi_reduction": baseline_aqi - simulated_aqi,
        "baseline_pm25": round(baseline_pm25, 1),
        "simulated_pm25": round(final_pm25, 1),
        "percentage_improvement": round(((baseline_aqi - simulated_aqi) / baseline_aqi) * 100, 1)
    }