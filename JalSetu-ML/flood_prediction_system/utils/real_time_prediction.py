# Real-time prediction utilities

import pickle
import numpy as np
import os
import json
from pathlib import Path
import pandas as pd

import config


class PredictionEngine:
    """Real-time prediction engine for flood risk assessment."""
    
    def __init__(self, model_dir=None):
        """
        Initialize prediction engine.
        
        Parameters:
        -----------
        model_dir : str
            Path to directory containing saved models
        """
        # Resolve paths relative to the project so inference works regardless
        # of the current working directory.
        project_root = Path(__file__).resolve().parents[1]
        self.model_dir = Path(model_dir) if model_dir else (project_root / 'models' / 'saved')
        self.model = None
        self.preprocessor = None
        self.feature_names = None
        self.raw_feature_names = None
        self.categorical_cols = None
        self.load_models()
    
    def load_models(self):
        """Load saved model, preprocessor, and feature names."""
        try:
            best_model_path = self.model_dir / 'best_model.pkl'
            logistic_model_path = self.model_dir / 'logistic_regression_model.pkl'

            if best_model_path.exists():
                with open(best_model_path, 'rb') as f:
                    self.model = pickle.load(f)
            else:
                # Backwards-compatible fallback (older training script).
                with open(logistic_model_path, 'rb') as f:
                    self.model = pickle.load(f)
            
            with open(self.model_dir / 'preprocessor.pkl', 'rb') as f:
                self.preprocessor = pickle.load(f)
            
            with open(self.model_dir / 'feature_names.pkl', 'rb') as f:
                self.feature_names = pickle.load(f)

            raw_feature_names_path = self.model_dir / config.RAW_FEATURE_NAMES_FILENAME
            categorical_cols_path = self.model_dir / config.CATEGORICAL_COLS_FILENAME
            if raw_feature_names_path.exists():
                with open(raw_feature_names_path, 'rb') as f:
                    self.raw_feature_names = pickle.load(f)
            if categorical_cols_path.exists():
                with open(categorical_cols_path, 'rb') as f:
                    self.categorical_cols = pickle.load(f)
            
            print(f"Models loaded successfully from: {self.model_dir}")
        except FileNotFoundError as e:
            print(f"Error loading models: {e}")
    
    def predict(self, features):
        """
        Make prediction for new data.
        
        Parameters:
        -----------
        features : array-like or dict
            Input features
        
        Returns:
        --------
        dict : Prediction result with class and probability
        """
        if self.model is None or self.preprocessor is None:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        # Allow JSON input (string/bytes) for convenience.
        if isinstance(features, (str, bytes, bytearray)):
            try:
                features = json.loads(features)
            except json.JSONDecodeError as e:
                raise ValueError("Invalid JSON provided to predict().") from e

        if isinstance(features, list):
            # For a JSON list of samples, predict only the first for parity with the single-sample API.
            if len(features) == 0:
                raise ValueError("Empty list provided to predict().")
            features = features[0]
        
        expected_feature_count = len(self.feature_names) if self.feature_names is not None else None

        # Convert to numeric numpy array
        if isinstance(features, dict):
            # Heuristic:
            # - If the dict contains any *encoded* feature keys, treat it as already-encoded.
            # - Otherwise, treat it as raw features and one-hot encode using saved metadata.
            encoded_key_intersection = set(features.keys()) & set(self.feature_names)

            if len(encoded_key_intersection) > 0 or self.raw_feature_names is None or self.categorical_cols is None:
                # Already-encoded dict (feature_names -> numeric values)
                values = []
                for name in self.feature_names:
                    raw_val = features.get(name, 0)
                    if raw_val is None:
                        raw_val = 0
                    try:
                        values.append(float(raw_val))
                    except (TypeError, ValueError):
                        raise ValueError(f"Feature '{name}' must be numeric; got {raw_val!r}") from None
                features = np.array(values, dtype=float).reshape(1, -1)
            else:
                # Raw dict (original columns -> values); apply the same one-hot encoding strategy.
                raw_row = {}
                for name in self.raw_feature_names:
                    raw_val = features.get(name, None)
                    if raw_val is None:
                        raw_val = "missing" if name in self.categorical_cols else 0.0
                    raw_row[name] = raw_val

                df_raw = pd.DataFrame([raw_row])
                if len(self.categorical_cols) > 0:
                    df_enc = pd.get_dummies(df_raw, columns=self.categorical_cols, drop_first=True)
                else:
                    df_enc = df_raw

                df_enc = df_enc.reindex(columns=self.feature_names, fill_value=0)
                features = df_enc.to_numpy(dtype=float).reshape(1, -1)
        else:
            features = np.asarray(features, dtype=float).reshape(1, -1)

        if expected_feature_count is not None and features.shape[1] != expected_feature_count:
            raise ValueError(
                f"Expected {expected_feature_count} features, but got {features.shape[1]}."
            )
        
        # Scale features
        features_scaled = self.preprocessor.transform(features)
        
        # Make prediction
        prediction = self.model.predict(features_scaled)[0]
        probability = self.model.predict_proba(features_scaled)[0]
        
        return {
            'prediction': int(prediction),
            'flood': 'Yes' if prediction == 1 else 'No',
            'no_flood_prob': float(probability[0]),
            'flood_prob': float(probability[1]),
            'confidence': float(max(probability))
        }
    
    def batch_predict(self, features_list):
        """
        Make predictions for multiple samples.
        
        Parameters:
        -----------
        features_list : list of arrays
            List of feature arrays
        
        Returns:
        --------
        list : List of predictions
        """
        return [self.predict(features) for features in features_list]
    
    def get_risk_level(self, features):
        """
        Get flood risk level (Low, Medium, High).
        
        Parameters:
        -----------
        features : array-like or dict
            Input features
        
        Returns:
        --------
        str : Risk level
        """
        result = self.predict(features)
        flood_prob = result['flood_prob']
        
        if flood_prob < 0.3:
            return 'Low'
        elif flood_prob < 0.7:
            return 'Medium'
        else:
            return 'High'
