
from sqlalchemy import Boolean, Enum, Integer, String, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    role: Mapped[str] = mapped_column(
        Enum("admin", "analyst", name="user_role"),
        nullable=False,
        server_default=text("'analyst'")
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("1")
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
