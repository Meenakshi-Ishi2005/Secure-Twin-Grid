"""AuditLog SQLAlchemy Database Model for SecureTwinGrid.

Stores an immutable, append-only chronological log of all administrative actions,
security events, simulation overrides, user management operations, and blockchain audits.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from app.core.database import Base


class AuditLog(Base):
    """Append-only audit log for administrative and operator actions in SecureTwinGrid."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    log_id = Column(String(64), unique=True, index=True, nullable=False)
    admin_id = Column(String(64), index=True, nullable=False)
    admin_username = Column(String(64), nullable=False)
    action = Column(String(128), index=True, nullable=False)
    target = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    result = Column(String(32), default="SUCCESS", nullable=False)
    details = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            "log_id": self.log_id,
            "admin_id": self.admin_id,
            "admin_username": self.admin_username,
            "action": self.action,
            "target": self.target,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp),
            "result": self.result,
            "metadata": self.details or {},
        }

    def __repr__(self) -> str:
        return f"<AuditLog log_id='{self.log_id}' action='{self.action}' admin='{self.admin_username}' result='{self.result}'>"
