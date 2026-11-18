
from sqlalchemy import (
    Boolean,
    Integer,
    String,
    Numeric,
    JSON,
    TIMESTAMP,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class ModelVersion(Base):
    __tablename__ = "model_versions"

    __table_args__ = (
        UniqueConstraint(
            "model_name",
            "version",
            name="uq_model_version"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    version: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    algorithm: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    artifact_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    threshold: Mapped[float] = mapped_column(
        Numeric(7, 5),
        nullable=False,
        server_default=text("0.50000")
    )

    accuracy = mapped_column(Numeric(7, 5), nullable=True)
    precision_score = mapped_column(Numeric(7, 5), nullable=True)
    recall_score = mapped_column(Numeric(7, 5), nullable=True)
    f1_score = mapped_column(Numeric(7, 5), nullable=True)
    roc_auc = mapped_column(Numeric(7, 5), nullable=True)

    metrics_json = mapped_column(
        JSON,
        nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("0")
    )

    created_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
