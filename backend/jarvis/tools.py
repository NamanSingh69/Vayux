import logging
from typing import Dict, Any, List
import numpy as np

from ml_forecast import generate_hybrid_forecast, ForecastRequest
from physics import calculate_effective_pblh, compute_plume_dispersion
from policy import simulate_policy_impact
from live_data import fetch_live_weather, fetch_live_fires

logger = logging.getLogger("VayuX.JarvisTools")

JARVIS_TOOL_DECLARATIONS = [
    {
        "name": "get_72h_air_quality_forecast",
        "description": "Generate 72-hour rolling hourly PM2.5 and AQI forecasts using Chronos-Bolt and the atmospheric physics adapter.",
        "parameters": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number", "description": "Target latitude (default: 28.6139 for Delhi)", "default": 28.6139},
                "longitude": {"type": "number", "description": "Target longitude (default: 77.2090 for Delhi)", "default": 77.2090}
            }
        }
    },
    {
        "name": "get_atmospheric_physics_diagnostics",
        "description": "Calculates current boundary layer height compression ratio, solar extinction percentage, and active stubble fire smoke plumes.",
        "parameters": {
            "type": "object",
            "properties": {
                "current_pm25": {"type": "number", "description": "Current surface PM2.5 in ug/m3", "default": 220.0}
            }
        }
    },
    {
        "name": "simulate_grap_policy",
        "description": "Simulate counterfactual GRAP policy interventions (Odd-Even traffic curbs, stubble fire suppression, industrial pauses).",
        "parameters": {
            "type": "object",
            "properties": {
                "vehicular_scale": {"type": "number", "description": "0.0 (complete vehicle ban) to 1.0 (normal traffic)", "default": 0.5},
                "stubble_scale": {"type": "number", "description": "0.0 (complete fire suppression) to 1.0 (uncontrolled fires)", "default": 0.2},
                "industrial_scale": {"type": "number", "description": "0.0 (complete industrial halt) to 1.0 (normal operations)", "default": 0.5},
                "dust_scale": {"type": "number", "description": "0.0 (complete dust suppression) to 1.0 (normal dust)", "default": 0.4}
            }
        }
    }
]

async def execute_jarvis_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Routes and executes tool calls triggered by the Gemini Voice Agent."""
    logger.info(f"Executing Jarvis tool: {tool_name} with arguments: {arguments}")
    
    try:
        if tool_name == "get_72h_air_quality_forecast":
            lat = arguments.get("latitude", 28.6139)
            lon = arguments.get("longitude", 77.2090)
            synthetic_history = [160.0 + 30.0 * np.sin(i / 4.0) for i in range(168)]
            
            weather = await fetch_live_weather(lat, lon)
            fires = await fetch_live_fires()

            wind_spd = float(weather.get("wind_speed", 2.5))
            wind_deg = float(weather.get("wind_deg", 300.0))
            wind_rad = np.radians(wind_deg)
            # Meteorological wind direction: angle from which wind is blowing
            u_val = float(-wind_spd * np.sin(wind_rad))
            v_val = float(-wind_spd * np.cos(wind_rad))
            
            payload = ForecastRequest(
                latitude=lat,
                longitude=lon,
                history_pm25=synthetic_history,
                h_base=[weather["base_pblh"]] * 72,
                u_wind=[u_val] * 72,
                v_wind=[v_val] * 72,
                fire_hotspots=fires
            )
            res = await generate_hybrid_forecast(payload)
            
            max_aqi = max(res.aqi_p50)
            min_aqi = min(res.aqi_p50)
            avg_pm25 = float(np.mean(res.pm25_p50))
            
            return {
                "status": "SUCCESS",
                "summary": f"72-hour forecast indicates average PM2.5 of {avg_pm25:.1f} ug/m3 with AQI peaking at {max_aqi} and troughing at {min_aqi}.",
                "peak_aqi": max_aqi,
                "trough_aqi": min_aqi,
                "first_24h_pm25": res.pm25_p50[:24],
                "first_24h_aqi": res.aqi_p50[:24]
            }

        elif tool_name == "get_atmospheric_physics_diagnostics":
            pm25 = arguments.get("current_pm25", 220.0)
            weather = await fetch_live_weather()
            fires = await fetch_live_fires()
            
            pblh_diag = calculate_effective_pblh(weather["base_pblh"], pm25, weather["wind_speed"])
            plume_features = compute_plume_dispersion(fires, weather["wind_speed"], weather["wind_deg"])
            
            return {
                "base_pblh_meters": pblh_diag["base_pblh"],
                "effective_pblh_meters": pblh_diag["effective_pblh"],
                "compression_factor": pblh_diag["compression_factor"],
                "solar_attenuation_pct": pblh_diag["solar_attenuation_pct"],
                "wind_speed_ms": weather["wind_speed"],
                "wind_direction_deg": weather["wind_deg"],
                "active_upwind_fires_count": len(fires),
                "plumes_detected": len(plume_features)
            }

        elif tool_name == "simulate_grap_policy":
            res = simulate_policy_impact(
                baseline_aqi=380,
                baseline_pm25=290.0,
                vehicular_scale=arguments.get("vehicular_scale", 0.5),
                stubble_scale=arguments.get("stubble_scale", 0.2),
                industrial_scale=arguments.get("industrial_scale", 0.5),
                dust_scale=arguments.get("dust_scale", 0.4)
            )
            return res

        else:
            return {"error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        logger.error(f"Error executing {tool_name}: {e}")
        return {"error": str(e)}
