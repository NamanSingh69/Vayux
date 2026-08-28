import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

from physics import calculate_effective_pblh, compute_plume_dispersion
from policy import simulate_policy_impact
from live_data import fetch_live_weather, fetch_live_fires
from ml_forecast import router as forecast_router
from jarvis.live_session import handle_jarvis_live_websocket

app = FastAPI(
    title="vayuX Coupled Atmospheric & Jarvis Intelligence Engine",
    description="Physics-informed aerosol-meteorology modeling with real-time voice Jarvis co-pilot for SIH 2026",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)

@app.websocket("/ws/jarvis-live")
async def jarvis_live_endpoint(websocket: WebSocket):
    """Real-time bi-directional voice WebSocket stream for Jarvis Co-Pilot."""
    await handle_jarvis_live_websocket(websocket)

@app.get("/health")
def health_check():
    return {
        "status": "operational",
        "engine": "vayuX-Atmospheric-Physics-v2",
        "jarvis_voice_engine": "Gemini-3.5-Transcribe-Live-Ready"
    }

@app.post("/api/v1/physics/pblh-feedback")
async def get_pblh_feedback(base_pblh: float = 850.0, pm25: float = 220.0, wind_speed: float = 2.4):
    live_weather = await fetch_live_weather()
    b_pblh = base_pblh if base_pblh != 850.0 else live_weather["base_pblh"]
    w_speed = wind_speed if wind_speed != 2.4 else live_weather["wind_speed"]
    return calculate_effective_pblh(b_pblh, pm25, w_speed)

@app.post("/api/v1/physics/plume-dispersion")
async def get_plume_dispersion(wind_speed: float = 3.5, wind_deg: float = 315.0):
    live_weather = await fetch_live_weather()
    live_fires = await fetch_live_fires()
    w_speed = wind_speed if wind_speed != 3.5 else live_weather["wind_speed"]
    w_deg = wind_deg if wind_deg != 315.0 else live_weather["wind_deg"]
    features = compute_plume_dispersion(live_fires, w_speed, w_deg)
    return {"type": "FeatureCollection", "features": features}

@app.post("/api/v1/policy/simulate")
def run_policy_simulation(baseline_aqi: int = 340, baseline_pm25: float = 260.0, vehicular: float = 1.0, stubble: float = 1.0, industrial: float = 1.0, dust: float = 1.0):
    return simulate_policy_impact(
        baseline_aqi=baseline_aqi,
        baseline_pm25=baseline_pm25,
        vehicular_scale=vehicular,
        stubble_scale=stubble,
        industrial_scale=industrial,
        dust_scale=dust
    )