# Data preprocessing utilities

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split


def load_data(filepath):
    """Load data from CSV file."""
    return pd.read_csv(filepath)


def split_data(X, y, test_size=0.2, random_state=42):
    """Split data into train and test sets."""
    return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)


def preprocess_features(X_train, X_test=None, fit_scaler=True):
    """
    Preprocess features using StandardScaler.
    
    Parameters:
    -----------
    X_train : array-like
        Training features
    X_test : array-like, optional
        Test features
    fit_scaler : bool
        Whether to fit a new scaler or use existing
    
    Returns:
    --------
    tuple : (X_train_scaled, X_test_scaled, scaler)
    """
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    if X_test is not None:
        X_test_scaled = scaler.transform(X_test)
        return X_train_scaled, X_test_scaled, scaler
    
    return X_train_scaled, scaler


def handle_missing_values(df, strategy='mean'):
    """Handle missing values in the dataframe."""
    if strategy == 'mean':
        return df.fillna(df.mean())
    elif strategy == 'median':
        return df.fillna(df.median())
    elif strategy == 'drop':
        return df.dropna()
    else:
        return df


def remove_outliers(df, columns=None, method='iqr', threshold=1.5):
    """
    Remove outliers using IQR method.
    
    Parameters:
    -----------
    df : DataFrame
        Input dataframe
    columns : list
        Columns to check for outliers
    method : str
        Method to use ('iqr' or 'zscore')
    threshold : float
        Threshold for IQR method
    
    Returns:
    --------
    DataFrame : Data without outliers
    """
    if columns is None:
        columns = df.select_dtypes(include=[np.number]).columns
    
    if method == 'iqr':
        Q1 = df[columns].quantile(0.25)
        Q3 = df[columns].quantile(0.75)
        IQR = Q3 - Q1
        mask = ~((df[columns] < (Q1 - threshold * IQR)) | (df[columns] > (Q3 + threshold * IQR))).any(axis=1)
        return df[mask]
    
    return df
