
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


RetentionPriority = Literal["Low", "Medium", "High"]

RetentionStatus = Literal[
    "Pending",
    "In Progress",
    "Completed",
    "Cancelled",
]

InteractionType = Literal[
    "Call",
    "Email",
    "Meeting",
    "Follow-up",
    "Other",
]


class RetentionActionCreate(BaseModel):
    customer_id: int = Field(gt=0)
    action_type: str = Field(min_length=1, max_length=100)
    description: str | None = None
    priority: RetentionPriority = "Medium"
    status: RetentionStatus = "Pending"
    assigned_to: int | None = Field(default=None, gt=0)
    due_date: date | None = None


class RetentionActionUpdate(BaseModel):
    action_type: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    priority: RetentionPriority | None = None
    status: RetentionStatus | None = None
    assigned_to: int | None = Field(default=None, gt=0)
    due_date: date | None = None
    outcome: str | None = None


class CustomerInteractionCreate(BaseModel):
    customer_id: int = Field(gt=0)
    interaction_type: InteractionType
    channel: str | None = Field(default=None, max_length=50)
    subject: str | None = Field(default=None, max_length=200)
    notes: str | None = None
    interaction_date: datetime | None = None


class RetentionActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    assigned_to: int | None
    action_type: str
    description: str | None
    priority: str
    status: str
    outcome: str | None
    due_date: date | None
    completed_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None
