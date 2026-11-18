
from sqlalchemy import (
    Enum, ForeignKey, Integer, String, Numeric, TIMESTAMP, text
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    gender = mapped_column(String(20))
    senior_citizen = mapped_column(Integer)
    partner = mapped_column(String(30))
    dependents = mapped_column(String(30))
    tenure = mapped_column(Integer)

    phone_service = mapped_column(String(30))
    multiple_lines = mapped_column(String(50))
    internet_service = mapped_column(String(50))
    online_security = mapped_column(String(50))
    online_backup = mapped_column(String(50))
    device_protection = mapped_column(String(50))
    tech_support = mapped_column(String(50))
    streaming_tv = mapped_column(String(50))
    streaming_movies = mapped_column(String(50))

    contract = mapped_column(String(50))
    paperless_billing = mapped_column(String(30))
    payment_method = mapped_column(String(100))

    monthly_charges = mapped_column(Numeric(10, 2))
    total_charges = mapped_column(Numeric(10, 2))

    churn_status: Mapped[str] = mapped_column(
        Enum("Yes", "No", "Unknown", name="customer_churn_status"),
        nullable=False,
        server_default=text("'Unknown'")
    )

    dataset_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("datasets.id", ondelete="SET NULL")
    )

    created_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )

    updated_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP")
    )
