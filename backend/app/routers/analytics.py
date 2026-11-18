from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.customer import Customer
from backend.app.models.prediction import Prediction
from backend.app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"],
    dependencies=[Depends(get_current_user)]
)


def percentage(part, total):
    if not total:
        return 0
    return round((part / total) * 100, 2)


@router.get("/overview")
def get_analytics_overview(db: Session = Depends(get_db)):
    """
    Return analytics calculated from actual MySQL customer
    and prediction records. Authentication is required.
    """

    # -----------------------------------------
    # 1. CUSTOMER OVERVIEW
    # -----------------------------------------

    total_customers = (
        db.query(func.count(Customer.id)).scalar() or 0
    )

    churn_rows = (
        db.query(
            Customer.churn_status,
            func.count(Customer.id)
        )
        .group_by(Customer.churn_status)
        .all()
    )

    churn_counts = {
        status: count
        for status, count in churn_rows
    }

    churned = churn_counts.get("Yes", 0)
    retained = churn_counts.get("No", 0)
    unknown = churn_counts.get("Unknown", 0)

    churn_rate = percentage(churned, total_customers)

    customer_overview = {
        "total_customers": total_customers,
        "churned_customers": churned,
        "retained_customers": retained,
        "unknown_churn_status": unknown,
        "churn_rate": churn_rate,
        "retention_rate": percentage(retained, total_customers)
    }

    # -----------------------------------------
    # 2. CHURN BY CONTRACT
    # -----------------------------------------

    contract_rows = (
        db.query(
            Customer.contract,
            Customer.churn_status,
            func.count(Customer.id)
        )
        .group_by(Customer.contract, Customer.churn_status)
        .all()
    )

    contract_data = {}

    for contract, churn_status, count in contract_rows:
        contract_name = contract or "Unknown"

        if contract_name not in contract_data:
            contract_data[contract_name] = {
                "contract": contract_name,
                "churned": 0,
                "retained": 0,
                "unknown": 0,
                "total": 0
            }

        contract_data[contract_name]["total"] += count

        if churn_status == "Yes":
            contract_data[contract_name]["churned"] += count
        elif churn_status == "No":
            contract_data[contract_name]["retained"] += count
        else:
            contract_data[contract_name]["unknown"] += count

    contract_distribution = []

    for item in contract_data.values():
        item["churn_rate"] = percentage(
            item["churned"],
            item["total"]
        )
        contract_distribution.append(item)

    contract_distribution.sort(
        key=lambda item: item["total"],
        reverse=True
    )

    # -----------------------------------------
    # 3. CHURN BY TENURE GROUP
    # -----------------------------------------

    tenure_group = case(
        (Customer.tenure <= 12, "0-12 months"),
        (Customer.tenure <= 24, "13-24 months"),
        (Customer.tenure <= 48, "25-48 months"),
        (Customer.tenure > 48, "49+ months"),
        else_="Unknown"
    )

    tenure_rows = (
        db.query(
            tenure_group.label("tenure_group"),
            Customer.churn_status,
            func.count(Customer.id)
        )
        .group_by(tenure_group, Customer.churn_status)
        .all()
    )

    tenure_data = {}

    for group_name, churn_status, count in tenure_rows:
        group_name = group_name or "Unknown"

        if group_name not in tenure_data:
            tenure_data[group_name] = {
                "tenure_group": group_name,
                "churned": 0,
                "retained": 0,
                "unknown": 0,
                "total": 0
            }

        tenure_data[group_name]["total"] += count

        if churn_status == "Yes":
            tenure_data[group_name]["churned"] += count
        elif churn_status == "No":
            tenure_data[group_name]["retained"] += count
        else:
            tenure_data[group_name]["unknown"] += count

    tenure_distribution = []

    for item in tenure_data.values():
        item["churn_rate"] = percentage(
            item["churned"],
            item["total"]
        )
        tenure_distribution.append(item)

    # -----------------------------------------
    # 4. AVERAGE MONTHLY CHARGES
    # -----------------------------------------

    charge_rows = (
        db.query(
            Customer.churn_status,
            func.avg(Customer.monthly_charges),
            func.count(Customer.id)
        )
        .group_by(Customer.churn_status)
        .all()
    )

    charges_comparison = []

    for churn_status, average_charges, count in charge_rows:
        charges_comparison.append({
            "churn_status": churn_status or "Unknown",
            "average_monthly_charges": (
                round(float(average_charges), 2)
                if average_charges is not None else 0
            ),
            "customer_count": count
        })

    # -----------------------------------------
    # 5. LATEST PREDICTION RISK DISTRIBUTION
    # -----------------------------------------

    # Maximum prediction ID identifies each customer's
    # most recently inserted prediction record.

    latest_prediction_ids = (
        db.query(
            func.max(Prediction.id).label("latest_id")
        )
        .group_by(Prediction.customer_id)
        .subquery()
    )

    latest_predictions = (
        db.query(
            Prediction.risk_level,
            func.count(Prediction.id)
        )
        .join(
            latest_prediction_ids,
            Prediction.id == latest_prediction_ids.c.latest_id
        )
        .group_by(Prediction.risk_level)
        .all()
    )

    risk_counts = {
        "Low": 0,
        "Medium": 0,
        "High": 0
    }

    for risk_level, count in latest_predictions:
        if risk_level in risk_counts:
            risk_counts[risk_level] = count

    customers_with_predictions = sum(risk_counts.values())

    risk_distribution = [
        {
            "risk_level": level,
            "customer_count": count,
            "percentage": percentage(
                count,
                customers_with_predictions
            )
        }
        for level, count in risk_counts.items()
    ]

    # -----------------------------------------
    # 6. PREDICTION SUMMARY
    # -----------------------------------------

    total_predictions = (
        db.query(func.count(Prediction.id)).scalar() or 0
    )

    churn_predictions = (
        db.query(func.count(Prediction.id))
        .filter(Prediction.prediction == "Churn")
        .scalar() or 0
    )

    no_churn_predictions = (
        db.query(func.count(Prediction.id))
        .filter(Prediction.prediction == "No Churn")
        .scalar() or 0
    )

    prediction_summary = {
        "total_predictions": total_predictions,
        "customers_with_predictions": customers_with_predictions,
        "churn_predictions": churn_predictions,
        "no_churn_predictions": no_churn_predictions
    }

    # -----------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------

    return {
        "customer_overview": customer_overview,
        "contract_distribution": contract_distribution,
        "tenure_distribution": tenure_distribution,
        "charges_comparison": charges_comparison,
        "risk_distribution": risk_distribution,
        "prediction_summary": prediction_summary
    }