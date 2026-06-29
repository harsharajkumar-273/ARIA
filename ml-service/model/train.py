import os
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb

def train_model():
    # Features per circuit segment
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

    # Generate synthetic training data seeded from Nashville outage scenarios
    np.random.seed(42)
    n_samples = 500

    X = pd.DataFrame({
        'ice_accumulation_mm': np.random.uniform(0, 50, n_samples),
        'canopy_density_pct': np.random.uniform(0, 1, n_samples),
        'circuit_age_years': np.random.uniform(1, 40, n_samples),
        'past_failure_count': np.random.randint(0, 10, n_samples),
        'elevation_m': np.random.uniform(100, 400, n_samples),
        'distance_to_water_m': np.random.uniform(0, 5000, n_samples),
        'months_since_trim': np.random.uniform(0, 60, n_samples),
        'temperature_c': np.random.uniform(-20, 5, n_samples),
        'wind_speed_kmh': np.random.uniform(0, 80, n_samples)
    })

    # Label: failed if ice + canopy + age combination exceeds threshold
    y = (
        (X['ice_accumulation_mm'] > 20) &
        (X['canopy_density_pct'] > 0.6) &
        (X['circuit_age_years'] > 15)
    ).astype(int)

    # Add random noise
    y = y ^ (np.random.random(n_samples) < 0.1)

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective='binary:logistic',
        eval_metric='logloss'
    )

    model.fit(X, y)

    # Ensure parent directory exists
    os.makedirs('model', exist_ok=True)

    with open('model/model.pkl', 'wb') as f:
        pickle.dump(model, f)

    print(f"✅ Model trained successfully. Features: {feature_cols}")
    return model

if __name__ == '__main__':
    train_model()
