import numpy as np
from typing import List, Dict, Any

class PhysicsResidualAdapter:
    """
    Vectorized Physics Residual Coupling Engine.
    Couples foundation baseline predictions with Beer-Lambert Planetary Boundary Layer Height (PBLH)
    extinction factors and Pasquill-Gifford Gaussian plume dispersion models.
    """
    def __init__(
        self,
        alpha: float = 0.00325,
        gamma: float = 0.837,
        pasquill_params: Dict[str, float] = None,
        u_0: float = 1.0,
        u_min: float = 0.1
    ):
        self.alpha = alpha
        self.gamma = gamma
        self.u_0 = u_0
        self.u_min = u_min
        
        self.pasquill = pasquill_params or {
            "a": 0.144, "b": 0.863,
            "c": 0.083, "d": 0.849
        }

    def compute_pblh_multiplier(
        self, 
        c_base: np.ndarray, 
        h_base: np.ndarray, 
        u_wind: np.ndarray
    ) -> np.ndarray:
        """
        Calculates the multiplicative Beer-Lambert boundary layer compression multiplier.
        Formula: M_pbl = (exp(alpha * C) * sqrt(u_0 / max(u, u_min))) ^ gamma
        """
        u_clamped = np.maximum(u_wind, self.u_min)
        wind_factor = np.sqrt(self.u_0 / u_clamped)
        optical_extinction = np.exp(self.alpha * c_base)
        
        h_ratio = optical_extinction * wind_factor
        multiplier = np.power(h_ratio, self.gamma)
        return np.clip(multiplier, 0.5, 3.5)

    def compute_gaussian_plumes(
        self, 
        receptor_lat: float, 
        receptor_lon: float, 
        fire_hotspots: List[Dict[str, Any]], 
        u_vec: np.ndarray, 
        v_vec: np.ndarray,
        horizon: int = 72
    ) -> np.ndarray:
        """
        Computes additive concentration increments from satellite fire hotspots via 
        Pasquill-Gifford plume dispersion formulations.
        """
        total_plume_additive = np.zeros(horizon, dtype=np.float64)
        if not fire_hotspots:
            return total_plume_additive

        DEG_TO_METERS = 111000.0

        for t in range(horizon):
            u_t = u_vec[t] if t < len(u_vec) else 1.0
            v_t = v_vec[t] if t < len(v_vec) else 0.5
            wind_speed = max(np.sqrt(u_t**2 + v_t**2), self.u_min)
            wind_angle = np.arctan2(v_t, u_t)

            t_plume = 0.0
            for fire in fire_hotspots:
                frp = fire.get("frp", 10.0)
                q_emission = frp * 1e5  # Emission rate ug/s scaled by FRP (MW)

                dx = (receptor_lon - fire.get("lon", fire.get("longitude", 77.0))) * DEG_TO_METERS * np.cos(np.radians(receptor_lat))
                dy = (receptor_lat - fire.get("lat", fire.get("latitude", 28.0))) * DEG_TO_METERS

                x_downwind = dx * np.cos(wind_angle) + dy * np.sin(wind_angle)
                y_crosswind = -dx * np.sin(wind_angle) + dy * np.cos(wind_angle)

                if x_downwind > 100.0:
                    x_km = x_downwind / 1000.0
                    sigma_y = self.pasquill["a"] * (x_km ** self.pasquill["b"]) * 1000.0
                    sigma_z = self.pasquill["c"] * (x_km ** self.pasquill["d"]) * 1000.0
                    h_effective = 100.0

                    c_plume = (q_emission / (np.pi * wind_speed * sigma_y * sigma_z)) * \
                              np.exp(-0.5 * (y_crosswind / sigma_y)**2) * \
                              np.exp(-0.5 * (h_effective / sigma_z)**2)

                    t_plume += c_plume

            total_plume_additive[t] = min(t_plume, 500.0)

        return total_plume_additive

    def apply_coupling(
        self,
        c_base: np.ndarray,
        h_base: np.ndarray,
        u_wind: np.ndarray,
        v_wind: np.ndarray,
        receptor_lat: float,
        receptor_lon: float,
        fire_hotspots: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Executes unified state equation: C_final = max(0, C_base * M_pbl + Plumes)
        """
        m_pbl = self.compute_pblh_multiplier(c_base, h_base, u_wind)
        plume_additive = self.compute_gaussian_plumes(
            receptor_lat, receptor_lon, fire_hotspots, u_wind, v_wind, horizon=len(c_base)
        )
        c_final = (c_base * m_pbl) + plume_additive
        return np.maximum(0.0, c_final)
