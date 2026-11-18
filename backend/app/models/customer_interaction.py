
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, Text, TIMESTAMP, text
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class CustomerInteraction(Base):
    __tablename__ = "customer_interactions"

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

    recorded_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL")
    )

    interaction_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    channel = mapped_column(String(50))
    subject = mapped_column(String(200))
    notes = mapped_column(Text)

    interaction_date = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP")
    )

    created_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
