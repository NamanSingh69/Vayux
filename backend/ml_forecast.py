import os
import pickle
import numpy as np
from typing import List, Dict

# naman bhai's trained model
MODEL_PATH = "model_weights.pkl"

def generate_72h_forecast(current_aqi: int, current_pm25: float) -> List[Dict[str, float]]:
    """
    Loads the trained ML model (e.g., LSTM / Random Forest).
    Returns an array of predictions for the next 72 hours.
    """
    forecast = []
    
    if not os.path.exists(MODEL_PATH):
        print(f"[ML Warning] {MODEL_PATH} not found. Using physics baseline for now.")
        for hour in range(73):
            # Diurnal oscillation: Night inversion traps pollution, daytime heating clears it
            diurnal_factor = 1.0 + 0.35 * np.sin(((hour - 9) * np.pi) / 12)
            predicted_pm25 = current_pm25 * diurnal_factor
            predicted_aqi = min(int(current_aqi * diurnal_factor), 500)
            
            forecast.append({
                "hour_offset": hour,
                "predicted_pm25": round(predicted_pm25, 1),
                "predicted_aqi": predicted_aqi,
                "multiplier": round(diurnal_factor, 3)
            })
        return forecast

    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        
        current_features = np.array([[current_pm25, current_aqi]]) 
        
        for hour in range(73):
            predicted_pm25 = float(model.predict(current_features)[0])
            predicted_aqi = min(int((predicted_pm25 / current_pm25) * current_aqi), 500)
            
            forecast.append({
                "hour_offset": hour,
                "predicted_pm25": round(predicted_pm25, 1),
                "predicted_aqi": predicted_aqi,
                "multiplier": round(predicted_pm25 / max(current_pm25, 1), 3)
            })
            
            current_features = np.array([[predicted_pm25, predicted_aqi]])
            
    except Exception as e:
        print(f"[ML Error] Inference failed: {e}")
        
    return forecast