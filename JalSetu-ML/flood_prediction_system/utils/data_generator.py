# Data generation and augmentation utilities

import numpy as np
import pandas as pd


def generate_synthetic_data(n_samples=100, n_features=21, random_state=42):
    """
    Generate synthetic flood prediction data.
    
    Parameters:
    -----------
    n_samples : int
        Number of samples to generate
    n_features : int
        Number of features
    random_state : int
        Random seed
    
    Returns:
    --------
    DataFrame : Generated synthetic data
    """
    np.random.seed(random_state)
    
    data = np.random.randn(n_samples, n_features)
    
    # Create target probability with some correlation to features.
    # We then binarize it into `flood_label` to match `data/flood_data.csv`.
    logits = data[:, 0] + data[:, 1] - data[:, 2]
    probs = 1.0 / (1.0 + np.exp(-logits))
    target = (probs > 0.5).astype(int)
    
    # Create DataFrame
    feature_names = [f'feature_{i}' for i in range(n_features)]
    df = pd.DataFrame(data, columns=feature_names)
    df['flood_probability'] = probs
    df['flood_label'] = target
    
    return df


def augment_data(df, n_augmented_samples=100, random_state=42):
    """
    Augment data by adding slightly perturbed copies.
    
    Parameters:
    -----------
    df : DataFrame
        Original data
    n_augmented_samples : int
        Number of augmented samples to add
    random_state : int
        Random seed
    
    Returns:
    --------
    DataFrame : Augmented data
    """
    np.random.seed(random_state)
    
    augmented_data = []
    # Keep target columns intact while augmenting only feature columns.
    feature_cols = [col for col in df.columns if col not in ['flood_probability', 'flood_label']]
    
    for _ in range(n_augmented_samples):
        # Randomly select a sample
        idx = np.random.randint(0, len(df))
        sample = df.iloc[idx].copy()
        
        # Add small random noise
        noise = np.random.normal(0, 0.1, len(feature_cols))
        sample[feature_cols] = sample[feature_cols] + noise
        
        augmented_data.append(sample)
    
    return pd.concat([df, pd.DataFrame(augmented_data)], ignore_index=True)


def balance_dataset(df, target_col='flood_label', method='oversample'):
    """
    Balance imbalanced dataset.
    
    Parameters:
    -----------
    df : DataFrame
        Input data
    target_col : str
        Target column name
    method : str
        'oversample' or 'undersample'
    
    Returns:
    --------
    DataFrame : Balanced data
    """
    class_counts = df[target_col].value_counts()
    
    if method == 'oversample':
        max_count = class_counts.max()
        balanced_data = []
        
        for class_label in df[target_col].unique():
            class_data = df[df[target_col] == class_label]
            balanced_data.append(
                class_data.sample(max_count, replace=True, random_state=42)
            )
        
        return pd.concat(balanced_data, ignore_index=True)
    
    elif method == 'undersample':
        min_count = class_counts.min()
        balanced_data = []
        
        for class_label in df[target_col].unique():
            class_data = df[df[target_col] == class_label]
            balanced_data.append(
                class_data.sample(min_count, random_state=42)
            )
        
        return pd.concat(balanced_data, ignore_index=True)
    
    return df
