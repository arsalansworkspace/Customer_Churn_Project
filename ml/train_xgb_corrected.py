import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_predict
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    precision_recall_curve
)

from xgboost import XGBClassifier


# --------------------------------------------------
# 1. Paths and dataset
# --------------------------------------------------

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_PATH = os.path.join(PROJECT_ROOT, "Telco-Customer-Churn.csv")
MODEL_DIR = os.path.join(PROJECT_ROOT, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "churn_xgb_pipeline.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

if os.path.exists(MODEL_PATH):
    raise FileExistsError(
        f"{MODEL_PATH} already exists. "
        "Please preserve it and choose another output filename before retraining."
    )

print("=" * 65)
print("CHURNGUARD AI - CORRECTED XGBOOST TRAINING")
print("=" * 65)

df = pd.read_csv(DATA_PATH)

print("\nOriginal dataset shape:", df.shape)


# --------------------------------------------------
# 2. Data cleaning
# --------------------------------------------------

df = df.drop(columns=["customerID"])

df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"],
    errors="coerce"
)

X = df.drop(columns=["Churn"])
y = df["Churn"].map({"No": 0, "Yes": 1})

if y.isna().any():
    raise ValueError("Unexpected or missing target values found.")

print("Invalid TotalCharges values:", X["TotalCharges"].isna().sum())
print("Target distribution:")
print(y.value_counts())


# --------------------------------------------------
# 3. Feature definitions
# --------------------------------------------------

numerical_features = [
    "SeniorCitizen",
    "tenure",
    "MonthlyCharges",
    "TotalCharges"
]

categorical_features = [
    "gender",
    "Partner",
    "Dependents",
    "PhoneService",
    "MultipleLines",
    "InternetService",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "Contract",
    "PaperlessBilling",
    "PaymentMethod"
]

if len(numerical_features) + len(categorical_features) != 19:
    raise ValueError("Expected exactly 19 original input features.")


# --------------------------------------------------
# 4. Train-test split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining rows:", len(X_train))
print("Testing rows:", len(X_test))


# --------------------------------------------------
# 5. Preprocessing pipelines
# --------------------------------------------------

numeric_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median"))
    ]
)

categorical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore"))
    ]
)

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_pipeline, numerical_features),
        ("cat", categorical_pipeline, categorical_features)
    ]
)


# --------------------------------------------------
# 6. XGBoost model
# --------------------------------------------------

xgb_model = XGBClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=4,
    random_state=42,
    eval_metric="logloss",
    n_jobs=-1
)

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", xgb_model)
    ]
)


# --------------------------------------------------
# 7. Cross-validation and threshold selection
# --------------------------------------------------

print("\nRunning 5-fold cross-validation...")

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

oof_probabilities = cross_val_predict(
    pipeline,
    X_train,
    y_train,
    cv=cv,
    method="predict_proba",
    n_jobs=1
)[:, 1]

precision, recall, thresholds = precision_recall_curve(
    y_train,
    oof_probabilities
)

f1_values = (
    2 * precision[:-1] * recall[:-1]
    / (precision[:-1] + recall[:-1] + 1e-12)
)

best_index = int(np.argmax(f1_values))
best_threshold = float(thresholds[best_index])

print("Selected threshold:", round(best_threshold, 4))
print("Cross-validation OOF F1:", round(float(f1_values[best_index]), 4))


# --------------------------------------------------
# 8. Train final pipeline
# --------------------------------------------------

print("\nTraining final XGBoost pipeline...")

pipeline.fit(X_train, y_train)

test_probabilities = pipeline.predict_proba(X_test)[:, 1]

default_predictions = (test_probabilities >= 0.50).astype(int)
tuned_predictions = (test_probabilities >= best_threshold).astype(int)


# --------------------------------------------------
# 9. Evaluation
# --------------------------------------------------

def evaluate_model(name, actual, predicted, probabilities):
    print("\n" + "=" * 65)
    print(name)
    print("=" * 65)

    metrics = {
        "accuracy": float(accuracy_score(actual, predicted)),
        "precision": float(precision_score(actual, predicted, zero_division=0)),
        "recall": float(recall_score(actual, predicted, zero_division=0)),
        "f1": float(f1_score(actual, predicted, zero_division=0)),
        "roc_auc": float(roc_auc_score(actual, probabilities))
    }

    for metric, value in metrics.items():
        print(f"{metric.upper():12}: {value:.4f}")

    print("\nClassification report:")
    print(classification_report(actual, predicted, zero_division=0))

    print("Confusion matrix:")
    print(confusion_matrix(actual, predicted))

    return metrics


default_metrics = evaluate_model(
    "XGBOOST - DEFAULT THRESHOLD 0.50",
    y_test,
    default_predictions,
    test_probabilities
)

tuned_metrics = evaluate_model(
    f"XGBOOST - CROSS-VALIDATION THRESHOLD {best_threshold:.4f}",
    y_test,
    tuned_predictions,
    test_probabilities
)


# --------------------------------------------------
# 10. Save separate model bundle
# --------------------------------------------------

transformed_features = (
    pipeline.named_steps["preprocessor"]
    .get_feature_names_out()
    .tolist()
)

bundle = {
    "model": pipeline,
    "threshold": best_threshold,
    "model_name": "XGBoost",
    "original_features": numerical_features + categorical_features,
    "numerical_features": numerical_features,
    "categorical_features": categorical_features,
    "transformed_features": transformed_features,
    "default_metrics": default_metrics,
    "tuned_metrics": tuned_metrics,
    "random_state": 42
}

joblib.dump(bundle, MODEL_PATH)

print("\n" + "=" * 65)
print("TRAINING COMPLETED SUCCESSFULLY")
print("=" * 65)

print("Saved model:", MODEL_PATH)
print("Original input features:", len(bundle["original_features"]))
print("Encoded model features:", len(transformed_features))
print("Selected threshold:", round(best_threshold, 4))

print("\nExisting models were not modified.")
