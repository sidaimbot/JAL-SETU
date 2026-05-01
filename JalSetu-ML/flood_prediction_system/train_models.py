# Training script for flood prediction models
#
# Goal: train compatible models and persist all preprocessing artifacts
# required by `utils/real_time_prediction.py`.

import os
import pickle
import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve,
)

import config
from visualization.visualizer import DataVisualizer


def _encode_categoricals(X_train, X_test, categorical_cols):
    if len(categorical_cols) == 0:
        feature_names = list(X_train.columns)
        return X_train, X_test, feature_names

    X_train_enc = pd.get_dummies(X_train, columns=categorical_cols, drop_first=True)
    X_test_enc = pd.get_dummies(X_test, columns=categorical_cols, drop_first=True)
    X_test_enc = X_test_enc.reindex(columns=X_train_enc.columns, fill_value=0)
    feature_names = list(X_train_enc.columns)
    return X_train_enc, X_test_enc, feature_names


def _evaluate_model(model, X_test_scaled, y_test):
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
    }
    cm = confusion_matrix(y_test, y_pred)
    fpr, tpr, _ = roc_curve(y_test, y_proba)
    return metrics, cm, fpr, tpr


def main():
    print("Loading data...")
    df = pd.read_csv(config.DATA_FILE)

    if config.TARGET_COLUMN not in df.columns:
        raise ValueError(
            f"Expected target column '{config.TARGET_COLUMN}' in CSV, "
            f"but found columns: {list(df.columns)}"
        )

    X = df.drop(config.TARGET_COLUMN, axis=1)
    y = df[config.TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=config.TEST_SIZE,
        random_state=config.RANDOM_STATE,
        stratify=y,
    )

    # Save raw feature metadata so inference can accept raw dict inputs
    # and apply one-hot encoding consistently.
    raw_feature_names = list(X_train.columns)
    categorical_cols = X_train.select_dtypes(include=["object", "category"]).columns.tolist()

    X_train_enc, X_test_enc, feature_names = _encode_categoricals(X_train, X_test, categorical_cols)

    print(f"Training with encoded feature count: {len(feature_names)}")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_enc)
    X_test_scaled = scaler.transform(X_test_enc)

    models = {
        "logistic_regression": LogisticRegression(**config.LOGISTIC_REGRESSION_PARAMS),
        "random_forest": RandomForestClassifier(**config.RANDOM_FOREST_PARAMS),
        "xgboost": XGBClassifier(**config.XGBOOST_PARAMS),
    }

    results = {}
    extras = {}

    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train_scaled, y_train)

        metrics, cm, fpr, tpr = _evaluate_model(model, X_test_scaled, y_test)
        results[name] = metrics
        extras[name] = {"confusion_matrix": cm, "fpr": fpr, "tpr": tpr}

        print(f"  Accuracy:  {metrics['accuracy']:.4f}")
        print(f"  Precision: {metrics['precision']:.4f}")
        print(f"  Recall:    {metrics['recall']:.4f}")
        print(f"  F1-Score:  {metrics['f1']:.4f}")
        print(f"  ROC-AUC:   {metrics['roc_auc']:.4f}")

    best_model_name = max(results.keys(), key=lambda k: results[k]["f1"])
    best_model = models[best_model_name]
    best_cm = extras[best_model_name]["confusion_matrix"]

    # Persist artifacts
    os.makedirs(config.SAVED_MODELS_DIR, exist_ok=True)
    os.makedirs(config.RESULTS_DIR, exist_ok=True)

    model_paths = {
        "logistic_regression": os.path.join(config.SAVED_MODELS_DIR, "logistic_regression_model.pkl"),
        "random_forest": os.path.join(config.SAVED_MODELS_DIR, "random_forest_model.pkl"),
        "xgboost": os.path.join(config.SAVED_MODELS_DIR, "xgboost_model.pkl"),
    }

    print("\nSaving models and preprocessing artifacts...")
    for name, model in models.items():
        with open(model_paths[name], "wb") as f:
            pickle.dump(model, f)

    with open(os.path.join(config.SAVED_MODELS_DIR, config.BEST_MODEL_FILENAME), "wb") as f:
        pickle.dump(best_model, f)

    with open(os.path.join(config.SAVED_MODELS_DIR, "preprocessor.pkl"), "wb") as f:
        pickle.dump(scaler, f)

    with open(os.path.join(config.SAVED_MODELS_DIR, "feature_names.pkl"), "wb") as f:
        pickle.dump(feature_names, f)

    with open(os.path.join(config.SAVED_MODELS_DIR, config.RAW_FEATURE_NAMES_FILENAME), "wb") as f:
        pickle.dump(raw_feature_names, f)

    with open(os.path.join(config.SAVED_MODELS_DIR, config.CATEGORICAL_COLS_FILENAME), "wb") as f:
        pickle.dump(categorical_cols, f)

    # Generate plots
    vis = DataVisualizer(dpi=config.DPI)
    class_dist_path = os.path.join(config.RESULTS_DIR, "class_distribution.png")
    vis.plot_class_distribution(
        y_train,
        title="Class Distribution (Train)",
        save_path=class_dist_path,
    )

    confusion_path = os.path.join(config.RESULTS_DIR, "confusion_matrix.png")
    vis.plot_confusion_matrix(
        best_cm,
        model_name=best_model_name,
        save_path=confusion_path,
    )

    model_comp_path = os.path.join(config.RESULTS_DIR, "model_comparison.png")
    vis.plot_model_comparison(results, save_path=model_comp_path)

    # Feature importance: prefer the best model if it exposes feature_importances_
    feature_importance_model = None
    feature_importance_model_name = None
    if hasattr(best_model, "feature_importances_"):
        feature_importance_model = best_model
        feature_importance_model_name = best_model_name
    elif hasattr(models["random_forest"], "feature_importances_"):
        feature_importance_model = models["random_forest"]
        feature_importance_model_name = "random_forest"
    elif hasattr(models["xgboost"], "feature_importances_"):
        feature_importance_model = models["xgboost"]
        feature_importance_model_name = "xgboost"

    fi_path = os.path.join(config.RESULTS_DIR, "feature_importance.png")
    top_features = []
    if feature_importance_model is not None:
        importances = feature_importance_model.feature_importances_
        vis.plot_feature_importance(
            importances,
            feature_names=feature_names,
            n_features=10,
            model_name=feature_importance_model_name,
            save_path=fi_path,
        )

        top_idx = np.argsort(importances)[::-1][:10]
        top_features = [(feature_names[i], float(importances[i])) for i in top_idx]

    # Write training report
    report_path = os.path.join(config.RESULTS_DIR, "training_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("FLOOD RISK PREDICTION - TRAINING REPORT\n")
        f.write("============================================================\n\n")

        f.write("Dataset Information:\n")
        f.write(f"- Total Samples: {len(df)}\n")
        f.write(f"- Train Set: {len(X_train)}\n")
        f.write(f"- Test Set: {len(X_test)}\n")
        f.write(f"- Encoded Features: {len(feature_names)}\n")
        f.write("\n")

        train_dist = y_train.value_counts()
        f.write("Class Distribution (Train):\n")
        if len(train_dist) == 2:
            f.write(f"  - No Flood: {int(train_dist.get(0, 0))} ({100.0 * train_dist.get(0, 0) / len(y_train):.1f}%)\n")
            f.write(f"  - Flood: {int(train_dist.get(1, 0))} ({100.0 * train_dist.get(1, 0) / len(y_train):.1f}%)\n")
        else:
            for cls, count in train_dist.items():
                f.write(f"  - Class {cls}: {int(count)}\n")

        f.write("\n")

        best_metrics = results[best_model_name]
        f.write(f"Best Model: {best_model_name.upper()}\n")
        f.write(f"F1-Score: {best_metrics['f1']:.4f}\n")
        f.write(f"Accuracy: {best_metrics['accuracy']:.4f}\n")
        f.write(f"Precision: {best_metrics['precision']:.4f}\n")
        f.write(f"Recall: {best_metrics['recall']:.4f}\n")
        f.write(f"ROC-AUC: {best_metrics['roc_auc']:.4f}\n\n")

        f.write("Model Comparison:\n")
        header = ["accuracy", "precision", "recall", "f1", "roc_auc"]
        f.write(f"{'':28}" + "".join([f"{h:>12}" for h in header]) + "\n")
        for model_name in ["logistic_regression", "random_forest", "xgboost"]:
            if model_name not in results:
                continue
            row = results[model_name]
            f.write(
                f"{model_name:28}"
                + "".join([f"{row[h]:>12.3f}" for h in header])
                + "\n"
            )

        f.write("\n")
        f.write("Top 10 Features:\n")
        if top_features:
            for name, score in top_features:
                f.write(f"- {name}: {score:.6f}\n")
        else:
            f.write("- N/A (feature importance not available for the selected model)\n")

        f.write("\nFiles Generated:\n")
        generated = [
            os.path.join("results", "class_distribution.png"),
            os.path.join("results", "confusion_matrix.png"),
            os.path.join("results", "model_comparison.png"),
            os.path.join("results", "training_report.txt"),
        ]
        if feature_importance_model is not None:
            generated.append(os.path.join("results", "feature_importance.png"))

        for path in generated:
            f.write(f"- {path}\n")

    print("\nDone.")
    print(f"Best model: {best_model_name}")
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    main()
