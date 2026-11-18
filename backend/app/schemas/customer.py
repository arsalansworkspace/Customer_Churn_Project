from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ChurnStatus = Literal["Yes", "No", "Unknown"]


class CustomerBase(BaseModel):
    customer_code: str = Field(min_length=1, max_length=50)

    gender: str | None = None
    senior_citizen: int | None = Field(default=None, ge=0, le=1)
    partner: str | None = None
    dependents: str | None = None
    tenure: int | None = Field(default=None, ge=0)

    phone_service: str | None = None
    multiple_lines: str | None = None
    internet_service: str | None = None
    online_security: str | None = None
    online_backup: str | None = None
    device_protection: str | None = None
    tech_support: str | None = None
    streaming_tv: str | None = None
    streaming_movies: str | None = None

    contract: str | None = None
    paperless_billing: str | None = None
    payment_method: str | None = None

    monthly_charges: Decimal | None = Field(default=None, ge=0)
    total_charges: Decimal | None = Field(default=None, ge=0)

    churn_status: ChurnStatus = "Unknown"
    dataset_id: int | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    customer_code: str | None = Field(default=None, min_length=1, max_length=50)

    gender: str | None = None
    senior_citizen: int | None = Field(default=None, ge=0, le=1)
    partner: str | None = None
    dependents: str | None = None
    tenure: int | None = Field(default=None, ge=0)

    phone_service: str | None = None
    multiple_lines: str | None = None
    internet_service: str | None = None
    online_security: str | None = None
    online_backup: str | None = None
    device_protection: str | None = None
    tech_support: str | None = None
    streaming_tv: str | None = None
    streaming_movies: str | None = None

    contract: str | None = None
    paperless_billing: str | None = None
    payment_method: str | None = None

    monthly_charges: Decimal | None = Field(default=None, ge=0)
    total_charges: Decimal | None = Field(default=None, ge=0)

    churn_status: ChurnStatus | None = None
    dataset_id: int | None = None


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: object
    updated_at: object
