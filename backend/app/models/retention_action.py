
from sqlalchemy import (
    Date, DateTime, Enum, ForeignKey, Integer, String,
    Text, TIMESTAMP, text
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class RetentionAction(Base):
    __tablename__ = "retention_actions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    customer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False
    )

    assigned_to: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL")
    )

    action_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    description = mapped_column(Text)

    priority: Mapped[str] = mapped_column(
        Enum("Low", "Medium", "High", name="retention_priority"),
        nullable=False,
        server_default=text("'Medium'")
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "Pending",
            "In Progress",
            "Completed",
            "Cancelled",
            name="retention_status"
        ),
        nullable=False,
        server_default=text("'Pending'")
    )

    outcome = mapped_column(Text)
    due_date = mapped_column(Date)
    completed_at = mapped_column(DateTime)

    created_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    updated_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP")
    )
