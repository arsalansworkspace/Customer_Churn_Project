
from sqlalchemy import (
    Enum,
    ForeignKey,
    Integer,
    String,
    TIMESTAMP,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    dataset_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    file_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    total_rows: Mapped[int | None] = mapped_column(
        Integer,
        server_default=text("0")
    )

    imported_rows: Mapped[int | None] = mapped_column(
        Integer,
        server_default=text("0")
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "uploaded",
            "processing",
            "completed",
            "failed",
            name="dataset_status"
        ),
        nullable=False,
        server_default=text("'uploaded'")
    )

    imported_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
