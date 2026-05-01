# Configuration file for Flood Prediction System

import os

# Project paths
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')
RESULTS_DIR = os.path.join(PROJECT_ROOT, 'results')
SAVED_MODELS_DIR = os.path.join(MODELS_DIR, 'saved')

# Data configuration
DATA_FILE = os.path.join(DATA_DIR, 'flood_data.csv')
# Target column in `data/flood_data.csv`
# (This must match the CSV header used by `train_models.py`.)
TARGET_COLUMN = 'flood_label'
TEST_SIZE = 0.2
RANDOM_STATE = 42

# Model configuration
MODELS_TO_TRAIN = ['logistic_regression', 'random_forest', 'xgboost']
LOGISTIC_REGRESSION_PARAMS = {
    'max_iter': 1000,
    'random_state': RANDOM_STATE,
    'solver': 'lbfgs'
}

RANDOM_FOREST_PARAMS = {
    'n_estimators': 100,
    'random_state': RANDOM_STATE,
    'n_jobs': -1
}

XGBOOST_PARAMS = {
    'random_state': RANDOM_STATE,
    'n_estimators': 100,
    'learning_rate': 0.1
}

# Preprocessing
SCALER_TYPE = 'StandardScaler'
FEATURE_COUNT = 21

# Visualization
DPI = 100
FIGURE_SIZE = (12, 8)

# Model persistence filenames
BEST_MODEL_FILENAME = 'best_model.pkl'
RAW_FEATURE_NAMES_FILENAME = 'raw_feature_names.pkl'
CATEGORICAL_COLS_FILENAME = 'categorical_cols.pkl'
