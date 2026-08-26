import math
import numpy as np
from typing import List, Dict, Any

ALPHA = 0.005  
GAMMA = 0.45   
U0 = 1.0       

def calculate_effective_pblh(
    base_pblh: float, 
    pm25: float, 
    wind_speed: float, 
    solar_irradiance: float = 450.0
) -> Dict[str, float]:
    """
    Computes Planetary Boundary Layer Height (PBLH) compression
    driven by aerosol-radiation feedback.
    """
    transmittance = math.exp(-ALPHA * pm25)
    effective_solar = solar_irradiance * transmittance

    wind_factor = math.sqrt(max(wind_speed, 0.1) / U0)
    pblh_effective = base_pblh * (transmittance ** GAMMA) * wind_factor
    pblh_clamped = max(float(pblh_effective), 60.0) 

    compression_ratio = base_pblh / pblh_clamped

    return {
        "base_pblh": round(base_pblh, 1),
        "effective_pblh": round(pblh_clamped, 1),
        "solar_attenuation_pct": round((1.0 - transmittance) * 100, 1),
        "compression_factor": round(compression_ratio, 2)
    }

def compute_plume_dispersion(
    fire_hotspots: List[Dict[str, float]], 
    wind_speed: float, 
    wind_deg: float,
    grid_size: int = 50
) -> List[Dict[str, Any]]:
    """
    Calculates 2D spatial PM2.5 dispersion from agricultural fires
    using the Pasquill-Gifford steady-state Gaussian plume formulation.
    """
    lons = np.linspace(75.5, 77.8, grid_size)
    lats = np.linspace(28.2, 31.0, grid_size)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    rad = math.radians((270 - wind_deg) % 360)
    u_x = wind_speed * math.cos(rad)
    u_y = wind_speed * math.sin(rad)
    u_eff = max(wind_speed, 0.8)

    concentration_grid = np.zeros((grid_size, grid_size))

    for fire in fire_hotspots:
        q_rate = fire.get("frp", 25.0) * 120.0  
        f_lat, f_lon = fire["lat"], fire["lon"]

        dx = (lon_grid - f_lon) * 111.0  
        dy = (lat_grid - f_lat) * 111.0

        x_down = dx * (u_x / u_eff) + dy * (u_y / u_eff)
        y_cross = -dx * (u_y / u_eff) + dy * (u_x / u_eff)

        mask = x_down > 0.1
        sigma_y = 0.32 * (x_down[mask] ** 0.88)
        sigma_z = 0.22 * (x_down[mask] ** 0.78)

        plume = (q_rate / (2 * math.pi * u_eff * sigma_y * sigma_z)) * np.exp(
            -(y_cross[mask] ** 2) / (2 * (sigma_y ** 2))
        )
        concentration_grid[mask] += plume

    features = []
    for i in range(grid_size):
        for j in range(grid_size):
            val = float(concentration_grid[i, j])
            if val > 1.0:
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [round(lons[j], 4), round(lats[i], 4)]},
                    "properties": {"plume_pm25": round(val, 2)}
                })

    return features