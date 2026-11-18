from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Customer
from backend.app.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
)


router = APIRouter(
    prefix="/api/customers",
    tags=["Customers"]
)


# CREATE CUSTOMER
@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED
)
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db)
):
    customer = Customer(**customer_data.model_dump())

    db.add(customer)

    try:
        db.commit()
        db.refresh(customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Customer code already exists or a referenced dataset is invalid."
        )

    return customer


# GET ALL CUSTOMERS WITH SEARCH AND PAGINATION
@router.get("/", response_model=list[CustomerResponse])
def get_customers(
    search: str | None = Query(default=None, max_length=100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    statement = select(Customer)

    if search:
        search_term = f"%{search.strip()}%"

        statement = statement.where(
            or_(
                Customer.customer_code.ilike(search_term),
                Customer.gender.ilike(search_term),
                Customer.contract.ilike(search_term),
                Customer.payment_method.ilike(search_term),
            )
        )

    statement = (
        statement
        .order_by(Customer.id.desc())
        .offset(skip)
        .limit(limit)
    )

    return db.scalars(statement).all()


# GET TOTAL CUSTOMER COUNT
@router.get("/count")
def get_customer_count(
    db: Session = Depends(get_db)
):
    total = db.scalar(
        select(func.count()).select_from(Customer)
    )

    return {"total_customers": total}


# GET CUSTOMER BY ID
@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    customer = db.get(Customer, customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    return customer


# UPDATE CUSTOMER
@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db)
):
    customer = db.get(Customer, customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    update_data = customer_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(customer, field, value)

    try:
        db.commit()
        db.refresh(customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Update conflicts with an existing customer code or database relationship."
        )

    return customer


# DELETE CUSTOMER
@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    customer = db.get(Customer, customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    db.delete(customer)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Customer cannot be deleted because related records exist."
        )

    return {
        "message": "Customer deleted successfully.",
        "customer_id": customer_id
    }
