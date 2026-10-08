"""Audit Logging Service for SecureTwinGrid.

Maintains an append-only, searchable log of administrative operations, security audits,
blockchain validations, user suspensions, and simulation state modifications.
"""

import uuid
import threading
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.core.database import SessionLocal


class AuditService:
    """Thread-safe service for recording and querying administrative audit trails."""

    def __init__(self, max_memory_logs: int = 1000):
        self._lock = threading.Lock()
        self.max_memory_logs = max_memory_logs
        self._memory_logs: List[Dict[str, Any]] = []

    def record(
        self,
        action: str,
        target: str,
        admin_id: str = "system",
        admin_username: str = "System Operator",
        result: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Record an immutable audit log entry."""
        log_id = f"AUDIT-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.now(timezone.utc)
        entry = {
            "log_id": log_id,
            "admin_id": str(admin_id),
            "admin_username": admin_username,
            "action": action,
            "target": target,
            "timestamp": now.isoformat() + "Z",
            "result": result,
            "metadata": metadata or {},
        }

        with self._lock:
            self._memory_logs.insert(0, entry)
            if len(self._memory_logs) > self.max_memory_logs:
                self._memory_logs = self._memory_logs[:self.max_memory_logs]

        # Also persist to database if available
        should_close = False
        if db is None:
            try:
                db = SessionLocal()
                should_close = True
            except Exception:
                db = None

        if db:
            try:
                db_log = AuditLog(
                    log_id=log_id,
                    admin_id=str(admin_id),
                    admin_username=admin_username,
                    action=action,
                    target=target,
                    timestamp=now,
                    result=result,
                    details=metadata or {},
                )
                db.add(db_log)
                db.commit()
            except Exception:
                db.rollback()
            finally:
                if should_close:
                    db.close()

        return entry

    def get_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        action: Optional[str] = None,
        admin_id: Optional[str] = None,
        result: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve audit logs with optional filtering and pagination."""
        if db:
            try:
                query = db.query(AuditLog)
                if action:
                    query = query.filter(AuditLog.action.ilike(f"%{action.strip()}%"))
                if admin_id:
                    query = query.filter(AuditLog.admin_id == str(admin_id).strip())
                if result:
                    query = query.filter(AuditLog.result.ilike(result.strip()))

                query = query.order_by(AuditLog.timestamp.desc())
                db_records = query.offset(offset).limit(limit).all()
                if db_records:
                    return [r.to_dict() for r in db_records]
            except Exception:
                pass

        # Fallback to in-memory logs
        with self._lock:
            logs = list(self._memory_logs)
            if action:
                a_lower = action.strip().lower()
                logs = [l for l in logs if a_lower in l["action"].lower()]
            if admin_id:
                logs = [l for l in logs if l["admin_id"] == str(admin_id).strip()]
            if result:
                r_lower = result.strip().lower()
                logs = [l for l in logs if l["result"].lower() == r_lower]

            return logs[offset : offset + limit]

    def clear(self):
        """Clear in-memory logs (for unit tests)."""
        with self._lock:
            self._memory_logs.clear()


# Global audit service singleton
_default_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    global _default_audit_service
    if _default_audit_service is None:
        _default_audit_service = AuditService()
    return _default_audit_service
