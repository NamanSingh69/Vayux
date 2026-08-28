import httpx
import os
from typing import Dict, List, Any

async def fetch_live_weather(lat: float = 28.6139, lon: float = 77.2090) -> Dict[str, float]:
    """
    Fetches real-time boundary layer height and wind metrics from Open-Meteo.
    (100% Free, No API Key Required)
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=wind_speed_10m,wind_direction_10m,boundary_layer_height&wind_speed_unit=ms"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json().get("current", {})
                return {
                    "wind_speed": data.get("wind_speed_10m", 2.0),
                    "wind_deg": data.get("wind_direction_10m", 270.0),
                    "base_pblh": data.get("boundary_layer_height", 800.0)
                }
        except Exception as e:
            print(f"[Weather API Error] {e}")
            
    print("[Fallback] Using default weather conditions")
    return {"wind_speed": 2.5, "wind_deg": 300.0, "base_pblh": 850.0}


async def fetch_live_fires() -> List[Dict[str, float]]:
    """
    Fetches live stubble burning coordinates from NASA FIRMS.
    Requires a free API key from https://firms.modaps.eosdis.nasa.gov/api/
    """
    firms_key = os.getenv("NASA_FIRMS_KEY")
    
    fallback_fires = [
        {"lat": 30.7, "lon": 76.2, "frp": 65.0}, # Patiala cluster
        {"lat": 30.1, "lon": 75.8, "frp": 45.0}, # Sangrur cluster
        {"lat": 29.6, "lon": 76.5, "frp": 35.0}, # Karnal cluster
    ]
    
    if not firms_key:
        return fallback_fires
        
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{firms_key}/VIIRS_SNPP_NRT/74,28,78,32/1"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=8.0)
            if response.status_code == 200:
                fires = []
                lines = response.text.strip().split('\n')[1:]
                for line in lines:
                    parts = line.split(',')
                    if len(parts) >= 3:
                        try:
                            lat_val = float(parts[0])
                            lon_val = float(parts[1])
                            # Column 12 is FRP (MW) in standard NASA FIRMS VIIRS NRT CSV
                            frp_val = float(parts[12]) if len(parts) >= 13 else 35.0
                            fires.append({
                                "lat": lat_val,
                                "lon": lon_val,
                                "frp": max(5.0, frp_val)
                            })
                        except (ValueError, IndexError):
                            continue
                return fires if fires else fallback_fires
        except Exception as e:
            print(f"[FIRMS API Error] {e}")
            
    return fallback_fires