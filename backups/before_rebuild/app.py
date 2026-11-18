import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# 1. Initialize FastAPI app FIRST
app = FastAPI(
    title='Customer Churn Prediction API',
    description='API for predicting customer churn and explaining risk factors.',
    version='1.0',
)

# 2. Mount the static frontend directory AFTER app is initialized
app.mount(
    '/static', StaticFiles(directory='static', html=True), name='static'
)

# 3. Load model, scaler, and feature list
model = joblib.load('models/churn_xgb_model.pkl')
scaler = joblib.load('models/feature_scaler.pkl')
feature_names = joblib.load('models/feature_names.pkl')


# 4. Define request body structure using Pydantic
class CustomerData(BaseModel):
  gender: int
  SeniorCitizen: int
  Partner: int
  Dependents: int
  tenure: float
  PhoneService: int
  MultipleLines: int
  InternetService: int
  OnlineSecurity: int
  OnlineBackup: int
  DeviceProtection: int
  TechSupport: int
  StreamingTV: int
  StreamingMovies: int
  Contract: int
  PaperlessBilling: int
  PaymentMethod: int
  MonthlyCharges: float
  TotalCharges: float


@app.get('/')
def home():
  return {
      'message': 'Welcome to the Customer Churn Prediction & Retention API!'
  }

@app.post('/predict')
def predict_churn(data: CustomerData):
  input_data = pd.DataFrame([data.dict()], columns=feature_names)

  prediction = int(model.predict(input_data)[0])
  probability = float(model.predict_proba(input_data)[0][1])

  # Risk tier assignment & Prescriptive Action Generation
  if probability > 0.7:
    risk_tier = 'High Risk'
    # Prescriptive logic based on input features
    if data.Contract == 0:  # Month-to-month
      recommended_action = (
          'Offer 20% discount on a 1-year contract upgrade to secure recurring'
          ' revenue.'
      )
    elif data.TechSupport == 0:
      recommended_action = (
          'Trigger a free 1-month trial of Premium Tech Support and guided onboarding.'
      )
    else:
      recommended_action = (
          'Assign to Senior Customer Success Manager for immediate phone'
          ' outreach.'
      )
  elif probability > 0.4:
    risk_tier = 'Medium Risk'
    recommended_action = (
        'Send automated email campaign highlighting underutilized product'
        ' features.'
    )
  else:
    risk_tier = 'Low Risk'
    recommended_action = (
        'No intervention needed. Account is stable and healthy.'
    )

  return {
      'churn_prediction': prediction,
      'churn_probability': round(probability, 4),
      'risk_tier': risk_tier,
      'recommended_action': recommended_action,
  }