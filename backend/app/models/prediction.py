
from sqlalchemy import (
    Enum, ForeignKey, Integer, Numeric, TIMESTAMP, text
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

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

    model_version_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("model_versions.id", ondelete="RESTRICT"),
        nullable=False
    )

    churn_probability: Mapped[float] = mapped_column(
        Numeric(7, 5),
        nullable=False
    )

    threshold: Mapped[float] = mapped_column(
        Numeric(7, 5),
        nullable=False
    )

    prediction: Mapped[str] = mapped_column(
        Enum("Churn", "No Churn", name="prediction_result"),
        nullable=False
    )

    risk_level: Mapped[str] = mapped_column(
        Enum("Low", "Medium", "High", name="prediction_risk_level"),
        nullable=False
    )

    created_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
