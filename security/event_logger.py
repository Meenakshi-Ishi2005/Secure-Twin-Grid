"""Security Event Logging System for SecureTwinGrid.

Maintains an auditable log of security events, tamper detections, replay attacks,
and cryptographic validations.
"""

from typing import List, Dict, Any, Optional
import threading
from security.models import SecurityEvent


class SecurityEventLogger:
    """Thread-safe event logger and auditor for grid security incidents."""

    def __init__(self, max_events: int = 1000):
        self._lock = threading.Lock()
        self.max_events = max_events
        self.events: List[SecurityEvent] = []

    def log_event(self, event: SecurityEvent) -> SecurityEvent:
        """Record a new security event into the audit log."""
        with self._lock:
            self.events.insert(0, event)
            if len(self.events) > self.max_events:
                self.events = self.events[:self.max_events]
            return event

    def log(
        self,
        event_type: str,
        severity: str = "INFO",
        transaction_id: Optional[str] = None,
        sender_id: Optional[str] = None,
        status: str = "ACCEPTED",
        reason: str = "",
        details: Optional[Dict[str, Any]] = None,
    ) -> SecurityEvent:
        """Helper to create and log an event in a single call."""
        event = SecurityEvent(
            event_type=event_type,
            severity=severity,
            transaction_id=transaction_id,
            sender_id=sender_id,
            status=status,
            reason=reason,
            details=details or {},
        )
        return self.log_event(event)

    def get_events(
        self,
        limit: int = 50,
        offset: int = 0,
        event_type: Optional[str] = None,
        sender_id: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[SecurityEvent]:
        """Retrieve events matching optional criteria with pagination."""
        with self._lock:
            filtered = self.events
            if event_type:
                t_lower = event_type.strip().upper()
                filtered = [e for e in filtered if e.event_type.upper() == t_lower]
            if sender_id:
                s_lower = sender_id.strip().upper()
                filtered = [e for e in filtered if (e.sender_id or "").upper() == s_lower]
            if status:
                st_lower = status.strip().upper()
                filtered = [e for e in filtered if e.status.upper() == st_lower]
            if severity:
                sev_lower = severity.strip().upper()
                filtered = [e for e in filtered if e.severity.upper() == sev_lower]

            return filtered[offset : offset + limit]

    def get_stats(self) -> Dict[str, Any]:
        """Return summary statistics of recorded security incidents."""
        with self._lock:
            total = len(self.events)
            by_status: Dict[str, int] = {}
            by_type: Dict[str, int] = {}
            by_severity: Dict[str, int] = {}

            for e in self.events:
                by_status[e.status] = by_status.get(e.status, 0) + 1
                by_type[e.event_type] = by_type.get(e.event_type, 0) + 1
                by_severity[e.severity] = by_severity.get(e.severity, 0) + 1

            return {
                "total_events": total,
                "by_status": by_status,
                "by_type": by_type,
                "by_severity": by_severity,
                "replay_attacks_blocked": by_type.get("REPLAY_ATTACK_DETECTED", 0) + by_type.get("DUPLICATE_TX_BLOCKED", 0),
                "reused_nonces_blocked": by_type.get("REUSED_NONCE_BLOCKED", 0),
                "expired_timestamps_blocked": by_type.get("EXPIRED_TIMESTAMP_BLOCKED", 0),
                "invalid_signatures_blocked": by_type.get("INVALID_SIGNATURE_BLOCKED", 0),
            }

    def clear(self) -> None:
        """Clear all audit logs."""
        with self._lock:
            self.events.clear()


# Global shared event logger instance
_default_logger: Optional[SecurityEventLogger] = None


def get_security_event_logger() -> SecurityEventLogger:
    global _default_logger
    if _default_logger is None:
        _default_logger = SecurityEventLogger()
    return _default_logger
