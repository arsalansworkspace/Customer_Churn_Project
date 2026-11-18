import os
import joblib
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    PROJECT_ROOT, "models", "churn_xgb_pipeline.pkl"
)

DATA_PATH = os.path.join(
    PROJECT_ROOT, "Telco-Customer-Churn.csv"
)

print("=" * 60)
print("CHURNGUARD AI - XGBOOST INFERENCE TEST")
print("=" * 60)

# Load saved model
bundle = joblib.load(MODEL_PATH)

model = bundle["model"]
threshold = bundle["threshold"]
expected = bundle["original_features"]

print("\nModel:", bundle["model_name"])
print("Threshold:", threshold)
print("Expected features:", len(expected))

# Load a real customer record
df = pd.read_csv(DATA_PATH)

df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"], errors="coerce"
)

customer = df.drop(
    columns=["customerID", "Churn"]
).dropna(subset=["TotalCharges"]).iloc[[0]].copy()

# Verify feature names without requiring original order
if set(customer.columns) != set(expected):
    raise ValueError(
        "Feature mismatch.\n"
        f"Missing: {set(expected) - set(customer.columns)}\n"
        f"Unexpected: {set(customer.columns) - set(expected)}"
    )

# Reorder columns to match saved model metadata
customer = customer[expected]

print("\nFeature validation: PASSED")
print("Input feature count:", len(customer.columns))

# Predict directly from raw customer data
probability = float(model.predict_proba(customer)[0][1])

prediction = (
    "Churn" if probability >= threshold else "No Churn"
)

print("\nChurn probability:", round(probability * 100, 2), "%")
print("Decision threshold:", round(threshold * 100, 2), "%")
print("Prediction:", prediction)

assert 0 <= probability <= 1

print("\nSUCCESS: Saved XGBoost model passed inference test.")
