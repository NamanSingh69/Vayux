from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from physics import calculate_effective_pblh, compute_plume_dispersion
from policy import simulate_policy_impact
from live_data import fetch_live_weather, fetch_live_fires
from ml_forecast import generate_72h_forecast 

app = FastAPI(
    title="vayuX Coupled Atmospheric Engine",
    description="Physics-informed aerosol-meteorology modeling microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PblhRequest(BaseModel):
    base_pblh: float = Field(default=850.0, description="Base PBLH in meters")
    pm25: float = Field(default=220.0, description="PM2.5 concentration in ug/m3")
    wind_speed: float = Field(default=2.4, description="Surface wind speed in m/s")

class DispersionRequest(BaseModel):
    wind_speed: float = Field(default=3.5, description="Wind speed in m/s")
    wind_deg: float = Field(default=315.0, description="Wind direction in degrees (315 = NW to SE)")
    hotspots: Optional[List[Dict[str, float]]] = None

class PolicyRequest(BaseModel):
    baseline_aqi: int = Field(default=340)
    baseline_pm25: float = Field(default=260.0)
    vehicular: float = Field(default=1.0, ge=0.0, le=1.0)
    stubble: float = Field(default=1.0, ge=0.0, le=1.0)
    industrial: float = Field(default=1.0, ge=0.0, le=1.0)
    dust: float = Field(default=1.0, ge=0.0, le=1.0)

class ForecastRequest(BaseModel):
    current_aqi: int = Field(default=340)
    current_pm25: float = Field(default=260.0)

@app.post("/api/v1/forecast")
def get_72h_forecast(payload: ForecastRequest):
    predictions = generate_72h_forecast(payload.current_aqi, payload.current_pm25)
    return {"forecast": predictions}

@app.get("/health")
def health_check():
    return {"status": "operational", "engine": "vayuX-Atmospheric-Physics-v1"}

@app.post("/api/v1/physics/pblh-feedback")
async def get_pblh_feedback(payload: PblhRequest):
    live_weather = await fetch_live_weather()
    
    base_pblh = payload.base_pblh if payload.base_pblh != 850.0 else live_weather["base_pblh"]
    wind_speed = payload.wind_speed if payload.wind_speed != 2.4 else live_weather["wind_speed"]
    
    return calculate_effective_pblh(base_pblh, payload.pm25, wind_speed)

@app.post("/api/v1/physics/plume-dispersion")
async def get_plume_dispersion(payload: DispersionRequest):
    live_weather = await fetch_live_weather()
    live_fires = await fetch_live_fires()
    
    wind_speed = payload.wind_speed if payload.wind_speed != 3.5 else live_weather["wind_speed"]
    wind_deg = payload.wind_deg if payload.wind_deg != 315.0 else live_weather["wind_deg"]
    
    features = compute_plume_dispersion(live_fires, wind_speed, wind_deg)
    return {"type": "FeatureCollection", "features": features}

@app.post("/api/v1/policy/simulate")
def run_policy_simulation(payload: PolicyRequest):
    return simulate_policy_impact(
        baseline_aqi=payload.baseline_aqi,
        baseline_pm25=payload.baseline_pm25,
        vehicular_scale=payload.vehicular,
        stubble_scale=payload.stubble,
        industrial_scale=payload.industrial,
        dust_scale=payload.dust
    )