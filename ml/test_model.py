
import os
import joblib
import pandas as pd

# ==========================================
# LOAD SAVED MODEL
# ==========================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "churn_model.pkl"
)

bundle = joblib.load(MODEL_PATH)

model = bundle["model"]
threshold = bundle["threshold"]

print("Model loaded successfully!")
print("Model:", bundle["model_name"])
print("Threshold:", threshold)


# ==========================================
# SAMPLE CUSTOMER
# ==========================================

customer = {
    "gender": "Male",
    "SeniorCitizen": 0,
    "Partner": "Yes",
    "Dependents": "No",
    "tenure": 12,
    "PhoneService": "Yes",
    "MultipleLines": "No",
    "InternetService": "Fiber optic",
    "OnlineSecurity": "No",
    "OnlineBackup": "No",
    "DeviceProtection": "No",
    "TechSupport": "No",
    "StreamingTV": "Yes",
    "StreamingMovies": "Yes",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Electronic check",
    "MonthlyCharges": 85.50,
    "TotalCharges": 1026.00
}

input_df = pd.DataFrame([customer])


# ==========================================
# MAKE PREDICTION
# ==========================================

probability = model.predict_proba(input_df)[0][1]

prediction = int(probability >= threshold)

print("\n========== CUSTOMER CHURN PREDICTION ==========")

print(f"Churn Probability: {probability:.2%}")

if prediction == 1:
    print("Prediction: Customer is likely to churn.")
else:
    print("Prediction: Customer is unlikely to churn.")

print("\nModel inference test completed successfully!")
