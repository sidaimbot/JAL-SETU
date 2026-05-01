# Flood prediction model training and evaluation

import pickle
import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import matplotlib.pyplot as plt
import seaborn as sns


class FloodPredictionModel:
    """Main flood prediction model class."""
    
    def __init__(self, config=None):
        """
        Initialize flood prediction model.
        
        Parameters:
        -----------
        config : dict
            Configuration dictionary
        """
        self.config = config or {}
        self.models = {}
        self.results = {}
        self.best_model = None
        self.best_model_name = None
        self.preprocessor = None
        self.feature_names = None
    
    def train_logistic_regression(self, X_train, y_train, X_test=None, y_test=None):
        """Train logistic regression model."""
        model = LogisticRegression(max_iter=1000, random_state=42, solver='lbfgs')
        model.fit(X_train, y_train)
        self.models['logistic_regression'] = model
        
        if X_test is not None and y_test is not None:
            self.evaluate_model('logistic_regression', model, X_test, y_test)
        
        return model
    
    def train_random_forest(self, X_train, y_train, X_test=None, y_test=None):
        """Train random forest model."""
        model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        self.models['random_forest'] = model
        
        if X_test is not None and y_test is not None:
            self.evaluate_model('random_forest', model, X_test, y_test)
        
        return model
    
    def train_xgboost(self, X_train, y_train, X_test=None, y_test=None):
        """Train XGBoost model."""
        model = XGBClassifier(random_state=42, n_estimators=100, learning_rate=0.1)
        model.fit(X_train, y_train)
        self.models['xgboost'] = model
        
        if X_test is not None and y_test is not None:
            self.evaluate_model('xgboost', model, X_test, y_test)
        
        return model
    
    def evaluate_model(self, model_name, model, X_test, y_test):
        """Evaluate model on test set."""
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        self.results[model_name] = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'f1': f1_score(y_test, y_pred),
            'roc_auc': roc_auc_score(y_test, y_pred_proba),
            'confusion_matrix': confusion_matrix(y_test, y_pred),
            'y_pred': y_pred,
            'y_pred_proba': y_pred_proba
        }
    
    def get_best_model(self):
        """Get the best performing model."""
        best_score = -1
        best_name = None
        
        for name, metrics in self.results.items():
            if metrics['f1'] > best_score:
                best_score = metrics['f1']
                best_name = name
        
        self.best_model_name = best_name
        self.best_model = self.models[best_name]
        
        return self.best_model, best_name
    
    def save_model(self, model_name, filepath):
        """Save trained model to file."""
        if model_name in self.models:
            with open(filepath, 'wb') as f:
                pickle.dump(self.models[model_name], f)
            print(f"Model {model_name} saved to {filepath}")
    
    def save_best_model(self, save_dir='models/saved'):
        """Save best model and preprocessor."""
        os.makedirs(save_dir, exist_ok=True)
        
        # Save best model
        with open(os.path.join(save_dir, 'logistic_regression_model.pkl'), 'wb') as f:
            pickle.dump(self.best_model, f)
        
        # Save preprocessor
        if self.preprocessor:
            with open(os.path.join(save_dir, 'preprocessor.pkl'), 'wb') as f:
                pickle.dump(self.preprocessor, f)
        
        # Save feature names
        if self.feature_names is not None:
            with open(os.path.join(save_dir, 'feature_names.pkl'), 'wb') as f:
                pickle.dump(self.feature_names, f)
    
    def plot_confusion_matrix(self, model_name, save_path=None):
        """Plot confusion matrix."""
        if model_name not in self.results:
            print(f"No results for {model_name}")
            return
        
        cm = self.results[model_name]['confusion_matrix']
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title(f'Confusion Matrix - {model_name}')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        
        if save_path:
            plt.savefig(save_path, dpi=100, bbox_inches='tight')
        plt.close()
    
    def plot_model_comparison(self, save_path=None):
        """Plot model comparison."""
        df_results = pd.DataFrame(self.results).T
        metrics = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
        
        fig, ax = plt.subplots(figsize=(12, 6))
        df_results[metrics].plot(kind='bar', ax=ax)
        plt.title('Model Comparison')
        plt.ylabel('Score')
        plt.xticks(rotation=45)
        plt.legend(loc='lower right')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=100, bbox_inches='tight')
        plt.close()
    
    def get_feature_importance(self, model_name):
        """Get feature importance for tree-based models."""
        if model_name not in self.models:
            return None
        
        model = self.models[model_name]
        
        if hasattr(model, 'feature_importances_'):
            if self.feature_names:
                return dict(zip(self.feature_names, model.feature_importances_))
            else:
                return model.feature_importances_
        
        return None
