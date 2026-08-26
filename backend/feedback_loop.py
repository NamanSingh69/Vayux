import math

def calculate_effective_pblh(
    base_pblh: float, 
    pm25_concentration: float, 
    wind_speed: float,
    s0_irradiance: float = 400.0
) -> float:
    """
    Calculates the Planetary Boundary Layer Height (PBLH) compression 
    due to aerosol solar extinction (Beer-Lambert Law).
    """
    alpha = 0.005  
    gamma = 0.45   
    u0 = 1.0

    effective_solar_radiation = s0_irradiance * math.exp(-alpha * pm25_concentration)
    
    radiation_ratio = effective_solar_radiation / s0_irradiance
    wind_ratio = math.sqrt(wind_speed / u0) if wind_speed > 0 else 0.1
    
    pblh_eff = base_pblh * (radiation_ratio ** gamma) * wind_ratio
    
    return max(pblh_eff, 50.0)