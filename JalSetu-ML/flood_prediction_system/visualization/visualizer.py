# Visualization utilities

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np


class DataVisualizer:
    """Utilities for visualizing flood prediction data and results."""
    
    def __init__(self, style='seaborn', dpi=100):
        """
        Initialize visualizer.
        
        Parameters:
        -----------
        style : str
            Matplotlib style
        dpi : int
            Resolution for saved figures
        """
        # Matplotlib style availability differs across versions.
        # `seaborn` may not be registered; fall back to the modern alias.
        try:
            plt.style.use(style)
        except OSError:
            if style == 'seaborn':
                plt.style.use('seaborn-v0_8')
            else:
                plt.style.use('default')
        self.dpi = dpi
        sns.set_palette("husl")
    
    def plot_class_distribution(self, y_data, title='Class Distribution', save_path=None):
        """
        Plot class distribution.
        
        Parameters:
        -----------
        y_data : array-like
            Target variable
        title : str
            Plot title
        save_path : str
            Path to save figure
        """
        plt.figure(figsize=(10, 6))
        
        class_counts = pd.Series(y_data).value_counts()
        labels = ['No Flood', 'Flood'] if len(class_counts) == 2 else [f'Class {i}' for i in range(len(class_counts))]
        
        plt.bar(labels, class_counts.values, color=['#3498db', '#e74c3c'])
        plt.title(title, fontsize=14, fontweight='bold')
        plt.ylabel('Count', fontsize=12)
        plt.xlabel('Class', fontsize=12)
        
        # Add value labels on bars
        for i, v in enumerate(class_counts.values):
            plt.text(i, v + 10, str(v), ha='center', fontweight='bold')
        
        if save_path:
            plt.savefig(save_path, dpi=self.dpi, bbox_inches='tight')
            print(f"Saved to {save_path}")
        
        plt.close()
    
    def plot_confusion_matrix(self, cm, model_name='Model', save_path=None):
        """
        Plot confusion matrix.
        
        Parameters:
        -----------
        cm : array-like
            Confusion matrix
        model_name : str
            Name of the model
        save_path : str
            Path to save figure
        """
        plt.figure(figsize=(8, 6))
        
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=['No Flood', 'Flood'],
                   yticklabels=['No Flood', 'Flood'])
        
        plt.title(f'Confusion Matrix - {model_name}', fontsize=14, fontweight='bold')
        plt.ylabel('True Label', fontsize=12)
        plt.xlabel('Predicted Label', fontsize=12)
        
        if save_path:
            plt.savefig(save_path, dpi=self.dpi, bbox_inches='tight')
            print(f"Saved to {save_path}")
        
        plt.close()
    
    def plot_roc_curve(self, fpr, tpr, roc_auc, model_name='Model', save_path=None):
        """
        Plot ROC curve.
        
        Parameters:
        -----------
        fpr : array-like
            False positive rate
        tpr : array-like
            True positive rate
        roc_auc : float
            ROC AUC score
        model_name : str
            Name of the model
        save_path : str
            Path to save figure
        """
        plt.figure(figsize=(8, 6))
        
        plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.2f})')
        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random Classifier')
        
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate', fontsize=12)
        plt.ylabel('True Positive Rate', fontsize=12)
        plt.title(f'ROC Curve - {model_name}', fontsize=14, fontweight='bold')
        plt.legend(loc="lower right")
        
        if save_path:
            plt.savefig(save_path, dpi=self.dpi, bbox_inches='tight')
            print(f"Saved to {save_path}")
        
        plt.close()
    
    def plot_feature_importance(self, importances, feature_names=None, n_features=10, 
                               model_name='Model', save_path=None):
        """
        Plot feature importance.
        
        Parameters:
        -----------
        importances : array-like
            Feature importance scores
        feature_names : list
            Names of features
        n_features : int
            Number of top features to plot
        model_name : str
            Name of the model
        save_path : str
            Path to save figure
        """
        if feature_names is None:
            feature_names = [f'Feature {i}' for i in range(len(importances))]
        
        # Sort by importance
        indices = np.argsort(importances)[::-1][:n_features]
        top_importances = importances[indices]
        top_names = [feature_names[i] for i in indices]
        
        plt.figure(figsize=(10, 6))
        plt.barh(range(len(top_importances)), top_importances)
        plt.yticks(range(len(top_importances)), top_names)
        plt.xlabel('Importance', fontsize=12)
        plt.title(f'Top {n_features} Feature Importance - {model_name}', 
                 fontsize=14, fontweight='bold')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=self.dpi, bbox_inches='tight')
            print(f"Saved to {save_path}")
        
        plt.close()
    
    def plot_model_comparison(self, results_dict, save_path=None):
        """
        Plot model comparison metrics.
        
        Parameters:
        -----------
        results_dict : dict
            Dictionary of model names to results
        save_path : str
            Path to save figure
        """
        df_results = pd.DataFrame(results_dict).T
        metrics = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
        
        # Select only available metrics
        available_metrics = [m for m in metrics if m in df_results.columns]
        
        fig, ax = plt.subplots(figsize=(12, 6))
        df_results[available_metrics].plot(kind='bar', ax=ax)
        
        plt.title('Model Comparison', fontsize=14, fontweight='bold')
        plt.ylabel('Score', fontsize=12)
        plt.xlabel('Model', fontsize=12)
        plt.xticks(rotation=45)
        plt.legend(loc='lower right')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=self.dpi, bbox_inches='tight')
            print(f"Saved to {save_path}")
        
        plt.close()
    
    def plot_feature_distribution(self, X_data, feature_names=None, target_variable=None, 
                                 save_path=None):
        """
        Plot feature distributions.
        
        Parameters:
        -----------
        X_data : DataFrame or array-like
            Feature data
        feature_names : list
            Names of features
        target_variable : array-like
            Target variable for coloring
        save_path : str
            Path to save figure
        """
        if isinstance(X_data, np.ndarray):
            X_data = pd.DataFrame(X_data)
        
        if feature_names:
            X_data.columns = feature_names
        
        n_features = min(9, len(X_data.columns))
        fig, axes = plt.subplots(3, 3, figsize=(15, 12))
        axes = axes.flatten()
        
        for idx, col in enumerate(X_data.columns[:n_features]):
            if target_variable is not None:
                for class_label in np.unique(target_variable):
                    axes[idx].hist(X_data[X_data.index[target_variable == class_label]][col], 
                                  alpha=0.5, label=f'Class {class_label}')
                axes[idx].legend()
            else:
                axes[idx].hist(X_data[col], alpha=0.7)
            
            axes[idx].set_title(f'Distribution of {col}')
            axes[idx].set_xlabel(col)
            axes[idx].set_ylabel('Frequency')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=self.dpi, bbox_inches='tight')
            print(f"Saved to {save_path}")
        
        plt.close()
