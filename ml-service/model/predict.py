import os
import pickle
import pandas as pd

def predict_failures():
    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    if not os.path.exists(model_path):
        # Return fallback predictions if model is not trained yet
        return [
            {"circuit_name": "Circ 4A - Downtown", "latitude": 36.1627, "longitude": -86.7816, "probability": 0.88},
            {"circuit_name": "Circ 12 - Oak Hill", "latitude": 36.1138, "longitude": -86.7740, "probability": 0.65},
            {"circuit_name": "Circ 8 - East Nashville", "latitude": 36.1889, "longitude": -86.8142, "probability": 0.12}
        ]
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
        
    # Nashville Grid Circuits to evaluate
    circuits = [
        {
            "circuit_name": "Circ 4A - Downtown", 
            "ice_accumulation_mm": 28.5, 
            "canopy_density_pct": 0.85, 
            "circuit_age_years": 24.0, 
            "past_failure_count": 5, 
            "elevation_m": 125.0, 
            "distance_to_water_m": 450.0, 
            "months_since_trim": 14.0, 
            "temperature_c": -6.0, 
            "wind_speed_kmh": 48.0, 
            "latitude": 36.1627, 
            "longitude": -86.7816
        },
        {
            "circuit_name": "Circ 12 - Oak Hill", 
            "ice_accumulation_mm": 11.2, 
            "canopy_density_pct": 0.45, 
            "circuit_age_years": 12.0, 
            "past_failure_count": 1, 
            "elevation_m": 240.0, 
            "distance_to_water_m": 1200.0, 
            "months_since_trim": 24.0, 
            "temperature_c": -3.0, 
            "wind_speed_kmh": 22.0, 
            "latitude": 36.1138, 
            "longitude": -86.7740
        },
        {
            "circuit_name": "Circ 8 - East Nashville", 
            "ice_accumulation_mm": 4.5, 
            "canopy_density_pct": 0.28, 
            "circuit_age_years": 6.5, 
            "past_failure_count": 0, 
            "elevation_m": 112.0, 
            "distance_to_water_m": 85.0, 
            "months_since_trim": 6.0, 
            "temperature_c": -1.0, 
            "wind_speed_kmh": 12.0, 
            "latitude": 36.1889, 
            "longitude": -86.8142
        }
    ]
    
    df = pd.DataFrame(circuits)
    feature_cols = [
        'ice_accumulation_mm',
        'canopy_density_pct',
        'circuit_age_years',
        'past_failure_count',
        'elevation_m',
        'distance_to_water_m',
        'months_since_trim',
        'temperature_c',
        'wind_speed_kmh'
    ]
    
    X = df[feature_cols]
    preds = model.predict_proba(X)[:, 1]
    
    results = []
    for idx, row in df.iterrows():
        results.append({
            "circuit_name": row["circuit_name"],
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "probability": float(preds[idx])
        })
        
    return results
