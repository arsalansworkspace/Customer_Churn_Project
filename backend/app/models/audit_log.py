
from sqlalchemy import (
    BigInteger, ForeignKey, Integer, String, Text, TIMESTAMP, text
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL")
    )

    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    entity_type = mapped_column(String(100))
    entity_id = mapped_column(String(100))
    details = mapped_column(Text)
    ip_address = mapped_column(String(45))

    created_at = mapped_column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
