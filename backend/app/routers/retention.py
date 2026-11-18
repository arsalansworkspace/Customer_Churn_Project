
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import (
    Customer,
    CustomerInteraction,
    Prediction,
    RetentionAction,
    User,
)
from backend.app.schemas.retention import (
    CustomerInteractionCreate,
    RetentionActionCreate,
    RetentionActionUpdate,
)
from backend.app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/retention",
    tags=["Retention Center"],
    dependencies=[Depends(get_current_user)],
)


def get_latest_predictions_statement():
    """
    Return a subquery containing the highest prediction ID
    for each customer.
    """
    latest_ids = (
        select(
            Prediction.customer_id,
            func.max(Prediction.id).label("latest_prediction_id"),
        )
        .group_by(Prediction.customer_id)
        .subquery()
    )

    return (
        select(Customer, Prediction)
        .join(
            latest_ids,
            Customer.id == latest_ids.c.customer_id,
        )
        .join(
            Prediction,
            Prediction.id == latest_ids.c.latest_prediction_id,
        )
    )


def get_customer_or_404(db: Session, customer_id: int):
    customer = db.get(Customer, customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found.",
        )

    return customer


def validate_assigned_user(db: Session, assigned_to: int | None):
    if assigned_to is None:
        return

    user = db.get(User, assigned_to)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Assigned user does not exist or is inactive.",
        )


# ---------------------------------------------------------
# RETENTION OVERVIEW
# ---------------------------------------------------------

@router.get("/overview")
def get_retention_overview(
    db: Session = Depends(get_db),
):
    latest_statement = get_latest_predictions_statement()

    latest_records = db.execute(latest_statement).all()

    risk_counts = {
        "Low": 0,
        "Medium": 0,
        "High": 0,
    }

    for customer, prediction in latest_records:
        if prediction.risk_level in risk_counts:
            risk_counts[prediction.risk_level] += 1

    total_predicted = len(latest_records)

    risk_distribution = {
        level: {
            "customer_count": count,
            "percentage": round(
                count / total_predicted * 100, 2
            ) if total_predicted else 0,
        }
        for level, count in risk_counts.items()
    }

    action_rows = db.execute(
        select(
            RetentionAction.status,
            func.count(RetentionAction.id),
        ).group_by(RetentionAction.status)
    ).all()

    action_counts = {
        "Pending": 0,
        "In Progress": 0,
        "Completed": 0,
        "Cancelled": 0,
    }

    for action_status, count in action_rows:
        action_counts[action_status] = count

    total_actions = sum(action_counts.values())

    overdue_actions = db.scalar(
        select(func.count(RetentionAction.id)).where(
            RetentionAction.due_date < date.today(),
            RetentionAction.status.in_(["Pending", "In Progress"]),
        )
    ) or 0

    total_interactions = db.scalar(
        select(func.count(CustomerInteraction.id))
    ) or 0

    return {
        "total_customers_with_predictions": total_predicted,
        "risk_distribution": risk_distribution,
        "total_retention_actions": total_actions,
        "action_status_distribution": action_counts,
        "overdue_actions": overdue_actions,
        "total_interactions": total_interactions,
    }


# ---------------------------------------------------------
# AT-RISK CUSTOMERS
# ---------------------------------------------------------

@router.get("/at-risk-customers")
def get_at_risk_customers(
    risk_level: str | None = Query(
        default=None,
        pattern="^(Low|Medium|High)$",
    ),
    search: str | None = Query(
        default=None,
        max_length=100,
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    statement = get_latest_predictions_statement()

    if risk_level:
        statement = statement.where(
            Prediction.risk_level == risk_level
        )

    if search:
        search_term = f"%{search.strip()}%"

        statement = statement.where(
            Customer.customer_code.ilike(search_term)
        )

    statement = (
        statement
        .order_by(
            Prediction.churn_probability.desc(),
            Customer.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    records = db.execute(statement).all()

    return {
        "total_returned": len(records),
        "customers": [
            {
                "customer_id": customer.id,
                "customer_code": customer.customer_code,
                "gender": customer.gender,
                "tenure": customer.tenure,
                "contract": customer.contract,
                "monthly_charges": float(
                    customer.monthly_charges or 0
                ),
                "churn_status": customer.churn_status,
                "prediction_id": prediction.id,
                "churn_probability": round(
                    float(prediction.churn_probability) * 100, 2
                ),
                "prediction": prediction.prediction,
                "risk_level": prediction.risk_level,
                "prediction_date": prediction.created_at,
            }
            for customer, prediction in records
        ],
    }


# ---------------------------------------------------------
# CREATE RETENTION ACTION
# ---------------------------------------------------------

@router.post(
    "/actions",
    status_code=status.HTTP_201_CREATED,
)
def create_retention_action(
    action_data: RetentionActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_customer_or_404(db, action_data.customer_id)

    validate_assigned_user(db, action_data.assigned_to)

    action = RetentionAction(
        **action_data.model_dump()
    )

    db.add(action)

    try:
        db.commit()
        db.refresh(action)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to create retention action due to a database conflict.",
        )

    return {
        "message": "Retention action created successfully.",
        "action": {
            "id": action.id,
            "customer_id": action.customer_id,
            "assigned_to": action.assigned_to,
            "created_by": current_user.id,
            "action_type": action.action_type,
            "description": action.description,
            "priority": action.priority,
            "status": action.status,
            "due_date": action.due_date,
            "created_at": action.created_at,
        },
    }


# ---------------------------------------------------------
# LIST RETENTION ACTIONS
# ---------------------------------------------------------

@router.get("/actions")
def get_retention_actions(
    action_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(Pending|In Progress|Completed|Cancelled)$",
    ),
    priority: str | None = Query(
        default=None,
        pattern="^(Low|Medium|High)$",
    ),
    customer_id: int | None = Query(default=None, gt=0),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    statement = (
        select(RetentionAction, Customer, User)
        .join(
            Customer,
            RetentionAction.customer_id == Customer.id,
        )
        .outerjoin(
            User,
            RetentionAction.assigned_to == User.id,
        )
    )

    if action_status:
        statement = statement.where(
            RetentionAction.status == action_status
        )

    if priority:
        statement = statement.where(
            RetentionAction.priority == priority
        )

    if customer_id:
        statement = statement.where(
            RetentionAction.customer_id == customer_id
        )

    statement = (
        statement
        .order_by(RetentionAction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    records = db.execute(statement).all()

    return {
        "total_returned": len(records),
        "actions": [
            {
                "id": action.id,
                "customer_id": customer.id,
                "customer_code": customer.customer_code,
                "assigned_to": action.assigned_to,
                "assigned_user": (
                    user.full_name if user else None
                ),
                "action_type": action.action_type,
                "description": action.description,
                "priority": action.priority,
                "status": action.status,
                "outcome": action.outcome,
                "due_date": action.due_date,
                "completed_at": action.completed_at,
                "created_at": action.created_at,
                "updated_at": action.updated_at,
            }
            for action, customer, user in records
        ],
    }


# ---------------------------------------------------------
# UPDATE RETENTION ACTION
# ---------------------------------------------------------

@router.patch("/actions/{action_id}")
def update_retention_action(
    action_id: int,
    action_data: RetentionActionUpdate,
    db: Session = Depends(get_db),
):
    action = db.get(RetentionAction, action_id)

    if action is None:
        raise HTTPException(
            status_code=404,
            detail="Retention action not found.",
        )

    update_data = action_data.model_dump(
        exclude_unset=True
    )

    if "assigned_to" in update_data:
        validate_assigned_user(
            db,
            update_data["assigned_to"],
        )

    if "status" in update_data:
        if update_data["status"] == "Completed":
            action.completed_at = datetime.now()
        else:
            action.completed_at = None

    for field, value in update_data.items():
        setattr(action, field, value)

    try:
        db.commit()
        db.refresh(action)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to update retention action.",
        )

    return {
        "message": "Retention action updated successfully.",
        "action": {
            "id": action.id,
            "customer_id": action.customer_id,
            "action_type": action.action_type,
            "priority": action.priority,
            "status": action.status,
            "outcome": action.outcome,
            "due_date": action.due_date,
            "completed_at": action.completed_at,
            "updated_at": action.updated_at,
        },
    }


# ---------------------------------------------------------
# RECORD CUSTOMER INTERACTION
# ---------------------------------------------------------

@router.post(
    "/interactions",
    status_code=status.HTTP_201_CREATED,
)
def create_customer_interaction(
    interaction_data: CustomerInteractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_customer_or_404(
        db,
        interaction_data.customer_id,
    )

    interaction_values = interaction_data.model_dump(
        exclude={"interaction_date"}
    )

    interaction = CustomerInteraction(
        **interaction_values,
        recorded_by=current_user.id,
    )

    if interaction_data.interaction_date is not None:
        interaction.interaction_date = (
            interaction_data.interaction_date
        )

    db.add(interaction)

    try:
        db.commit()
        db.refresh(interaction)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to record customer interaction.",
        )

    return {
        "message": "Customer interaction recorded successfully.",
        "interaction": {
            "id": interaction.id,
            "customer_id": interaction.customer_id,
            "recorded_by": interaction.recorded_by,
            "interaction_type": interaction.interaction_type,
            "channel": interaction.channel,
            "subject": interaction.subject,
            "notes": interaction.notes,
            "interaction_date": interaction.interaction_date,
        },
    }


# ---------------------------------------------------------
# CUSTOMER INTERACTION HISTORY
# ---------------------------------------------------------

@router.get("/customers/{customer_id}/interactions")
def get_customer_interactions(
    customer_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    customer = get_customer_or_404(db, customer_id)

    statement = (
        select(CustomerInteraction, User)
        .outerjoin(
            User,
            CustomerInteraction.recorded_by == User.id,
        )
        .where(
            CustomerInteraction.customer_id == customer_id
        )
        .order_by(
            CustomerInteraction.interaction_date.desc(),
            CustomerInteraction.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    records = db.execute(statement).all()

    return {
        "customer_id": customer.id,
        "customer_code": customer.customer_code,
        "total_returned": len(records),
        "interactions": [
            {
                "id": interaction.id,
                "recorded_by": interaction.recorded_by,
                "recorded_by_name": (
                    user.full_name if user else None
                ),
                "interaction_type": interaction.interaction_type,
                "channel": interaction.channel,
                "subject": interaction.subject,
                "notes": interaction.notes,
                "interaction_date": interaction.interaction_date,
                "created_at": interaction.created_at,
            }
            for interaction, user in records
        ],
    }
