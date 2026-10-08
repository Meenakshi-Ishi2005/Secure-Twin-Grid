"""User SQLAlchemy Database Model for SecureTwinGrid.

Stores user credentials, role-based authorization levels, and public ECC identity keys.
Passwords are never stored in plaintext.
"""

from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    """User account model for SecureTwinGrid microgrid participants and administrators."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(128), nullable=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default=UserRole.USER.value, nullable=False)
    status = Column(String(32), default=UserStatus.PENDING.value, nullable=False)
    approval_status = Column(String(32), default=ApprovalStatus.PENDING.value, nullable=False)
    community = Column(String(128), default="Green Valley Community", nullable=False)
    unit = Column(String(64), nullable=True, default="A-204")
    household_id = Column(String(64), nullable=True, default="HH-001")
    phone = Column(String(32), nullable=True)
    public_key = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(64), nullable=True)
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)

    def __repr__(self) -> str:
        return f"<User id={self.id} username='{self.username}' email='{self.email}' role='{self.role}' status='{self.status}' approval_status='{self.approval_status}'>"
