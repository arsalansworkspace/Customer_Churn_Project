from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.customer import Customer
from backend.app.models.model_version import ModelVersion
from backend.app.models.prediction import Prediction


@lru_cache(maxsize=4)
def load_model_bundle(artifact_path: str):
    path = Path(artifact_path)

    if not path.is_file():
        raise FileNotFoundError(
            f"Model artifact not found: {path}"
        )

    bundle = joblib.load(path)

    if not isinstance(bundle, dict) or "model" not in bundle:
        raise ValueError("Invalid model bundle format.")

    return bundle


def get_customer_features(customer: Customer) -> dict:
    return {
        "gender": customer.gender,
        "SeniorCitizen": customer.senior_citizen,
        "Partner": customer.partner,
        "Dependents": customer.dependents,
        "tenure": customer.tenure,
        "PhoneService": customer.phone_service,
        "MultipleLines": customer.multiple_lines,
        "InternetService": customer.internet_service,
        "OnlineSecurity": customer.online_security,
        "OnlineBackup": customer.online_backup,
        "DeviceProtection": customer.device_protection,
        "TechSupport": customer.tech_support,
        "StreamingTV": customer.streaming_tv,
        "StreamingMovies": customer.streaming_movies,
        "Contract": customer.contract,
        "PaperlessBilling": customer.paperless_billing,
        "PaymentMethod": customer.payment_method,
        "MonthlyCharges": (
            float(customer.monthly_charges)
            if customer.monthly_charges is not None else None
        ),
        "TotalCharges": (
            float(customer.total_charges)
            if customer.total_charges is not None else None
        ),
    }


def predict_customer_churn(
    customer_id: int,
    db: Session
) -> dict:

    # 1. Retrieve customer
    customer = db.get(Customer, customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    # 2. Retrieve active model version
    model_version = (
        db.query(ModelVersion)
        .filter(ModelVersion.is_active.is_(True))
        .order_by(ModelVersion.id.desc())
        .first()
    )

    if model_version is None:
        raise HTTPException(
            status_code=503,
            detail="No active machine learning model is registered."
        )

    # 3. Load model pipeline
    try:
        bundle = load_model_bundle(model_version.artifact_path)
        model = bundle["model"]

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to load the active model: {error}"
        )

    # 4. Prepare customer features
    features = get_customer_features(customer)

    input_data = pd.DataFrame(
        [features],
        columns=bundle["original_features"]
    )

    # 5. Generate churn probability
    try:
        probabilities = model.predict_proba(input_data)[0]

        classes = list(model.classes_)
        churn_class_index = classes.index(1)

        churn_probability = float(
            probabilities[churn_class_index]
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {error}"
        )

    # 6. Apply registered model threshold
    threshold = float(model_version.threshold)

    prediction_result = (
        "Churn"
        if churn_probability >= threshold
        else "No Churn"
    )

    # 7. Apply business risk categories
    if churn_probability < 0.30:
        risk_level = "Low"
    elif churn_probability < 0.70:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # 8. Save prediction to MySQL
    prediction_record = Prediction(
        customer_id=customer.id,
        model_version_id=model_version.id,
        churn_probability=round(churn_probability, 5),
        threshold=round(threshold, 5),
        prediction=prediction_result,
        risk_level=risk_level
    )

    try:
        db.add(prediction_record)
        db.commit()
        db.refresh(prediction_record)

    except Exception:
        db.rollback()
        raise

    # 9. Return result
    return {
        "prediction_id": prediction_record.id,
        "customer_id": customer.id,
        "customer_code": customer.customer_code,
        "model": model_version.model_name,
        "model_version": model_version.version,
        "churn_probability": round(churn_probability * 100, 2),
        "threshold": round(threshold * 100, 2),
        "prediction": prediction_result,
        "risk_level": risk_level,
        "created_at": prediction_record.created_at
    }
