from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.customer import Customer
from backend.app.models.prediction import Prediction
from backend.app.models.user import User
from backend.app.services.prediction_service import predict_customer_churn
from backend.app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/predictions",
    tags=["Churn Predictions"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/customers/{customer_id}")
def create_customer_prediction(
    customer_id: int,
    db: Session = Depends(get_db),
):
    """
    Generate a churn prediction and save it in MySQL.
    Authentication is required.
    """
    return predict_customer_churn(customer_id, db)


@router.get("/customers/{customer_id}/history")
def get_customer_prediction_history(
    customer_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve prediction history for a specific customer.
    """

    customer = db.get(Customer, customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    records = (
        db.query(Prediction)
        .filter(Prediction.customer_id == customer_id)
        .order_by(Prediction.created_at.desc(), Prediction.id.desc())
        .all()
    )

    return {
        "customer_id": customer.id,
        "customer_code": customer.customer_code,
        "total_predictions": len(records),
        "predictions": [
            {
                "prediction_id": record.id,
                "churn_probability": round(
                    float(record.churn_probability) * 100, 2
                ),
                "threshold": round(
                    float(record.threshold) * 100, 2
                ),
                "prediction": record.prediction,
                "risk_level": record.risk_level,
                "model_version_id": record.model_version_id,
                "created_at": record.created_at
            }
            for record in records
        ]
    }


@router.get("/")
def get_recent_predictions(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Retrieve recent predictions across all customers.
    """

    records = (
        db.query(Prediction, Customer)
        .join(Customer, Prediction.customer_id == Customer.id)
        .order_by(Prediction.created_at.desc(), Prediction.id.desc())
        .limit(limit)
        .all()
    )

    return {
        "total_returned": len(records),
        "predictions": [
            {
                "prediction_id": prediction.id,
                "customer_id": customer.id,
                "customer_code": customer.customer_code,
                "churn_probability": round(
                    float(prediction.churn_probability) * 100, 2
                ),
                "threshold": round(
                    float(prediction.threshold) * 100, 2
                ),
                "prediction": prediction.prediction,
                "risk_level": prediction.risk_level,
                "model_version_id": prediction.model_version_id,
                "created_at": prediction.created_at
            }
            for prediction, customer in records
        ]
    }
