"""Data models for SecureTwinGrid Security, Cryptographic Signatures, and Replay Protection.

Defines the structure of Signed Transactions, Security Events, and Verification Results.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import json
import uuid


@dataclass
class SignedTransaction:
    """Represents a cryptographically signed energy transaction with replay protection fields.
    
    Attributes:
        transaction_id: Globally unique transaction identifier (e.g. "TX-UUID" or SHA-256 hash).
        sender_id: Household/Prosumer identifier of the seller or trade initiator.
        recipient_id: Household/Consumer or Grid operator receiving the energy or settlement.
        energy_kwh: Quantity of electrical energy traded in kilowatt-hours.
        price_per_kwh: Clearing price per unit energy ($/kWh).
        total_value: Total transaction monetary turnover ($).
        timestamp: Unix epoch timestamp (seconds) when transaction was formulated.
        nonce: Monotonically increasing sequence number or unique sender counter.
        public_key: PEM-encoded ECC public key (SECP256R1 / NIST P-256) of the signer.
        signature: Base64-encoded ECDSA signature over canonical payload bytes.
    """
    transaction_id: str
    sender_id: str
    recipient_id: str
    energy_kwh: float
    price_per_kwh: float
    total_value: float
    timestamp: float
    nonce: int
    public_key: str = ""
    signature: str = ""

    def __post_init__(self):
        self.energy_kwh = float(self.energy_kwh)
        self.price_per_kwh = float(self.price_per_kwh)
        self.total_value = float(self.total_value)
        self.timestamp = float(self.timestamp)
        self.nonce = int(self.nonce)

    def get_signable_payload(self) -> Dict[str, Any]:
        """Returns the canonical deterministic dictionary to be signed/verified.
        
        CRITICAL: The 'signature' itself is strictly omitted to prevent circular references.
        """
        return {
            "transaction_id": str(self.transaction_id),
            "sender_id": str(self.sender_id),
            "recipient_id": str(self.recipient_id),
            "energy_kwh": round(self.energy_kwh, 6),
            "price_per_kwh": round(self.price_per_kwh, 6),
            "total_value": round(self.total_value, 6),
            "timestamp": round(self.timestamp, 4),
            "nonce": int(self.nonce),
            "public_key": str(self.public_key).strip(),
        }

    def get_signable_bytes(self) -> bytes:
        """Serializes signable payload into deterministic UTF-8 bytes with sorted keys."""
        payload = self.get_signable_payload()
        canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return canonical_json.encode("utf-8")

    def to_dict(self) -> Dict[str, Any]:
        """Convert signed transaction to full dictionary."""
        return {
            "transaction_id": self.transaction_id,
            "sender_id": self.sender_id,
            "recipient_id": self.recipient_id,
            "energy_kwh": round(self.energy_kwh, 6),
            "price_per_kwh": round(self.price_per_kwh, 6),
            "total_value": round(self.total_value, 6),
            "timestamp": self.timestamp,
            "timestamp_iso": datetime.fromtimestamp(self.timestamp, tz=timezone.utc).isoformat(),
            "nonce": self.nonce,
            "public_key": self.public_key,
            "signature": self.signature,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SignedTransaction":
        """Reconstitute SignedTransaction from dictionary."""
        return cls(
            transaction_id=str(data.get("transaction_id", f"TX-{uuid.uuid4().hex[:12].upper()}")),
            sender_id=str(data["sender_id"]),
            recipient_id=str(data["recipient_id"]),
            energy_kwh=float(data["energy_kwh"]),
            price_per_kwh=float(data["price_per_kwh"]),
            total_value=float(data.get("total_value", float(data["energy_kwh"]) * float(data["price_per_kwh"]))),
            timestamp=float(data.get("timestamp", datetime.now(timezone.utc).timestamp())),
            nonce=int(data.get("nonce", 1)),
            public_key=str(data.get("public_key", "")),
            signature=str(data.get("signature", "")),
        )


@dataclass
class SecurityEvent:
    """Represents an audit entry in the SecureTwinGrid security log.
    
    Used to record validated transactions, blocked replay attacks, duplicate nonces,
    and adversarial tamper attempts.
    """
    event_id: str = field(default_factory=lambda: f"SEC-{uuid.uuid4().hex[:10].upper()}")
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    event_type: str = "TRANSACTION_VALIDATED"  # REPLAY_ATTACK_DETECTED, REUSED_NONCE_BLOCKED, EXPIRED_TIMESTAMP_BLOCKED, INVALID_SIGNATURE_BLOCKED
    severity: str = "INFO"  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    transaction_id: Optional[str] = None
    sender_id: Optional[str] = None
    status: str = "ACCEPTED"  # ACCEPTED, BLOCKED, REJECTED, WARNING
    reason: str = "Transaction verified successfully."
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "severity": self.severity,
            "transaction_id": self.transaction_id,
            "sender_id": self.sender_id,
            "status": self.status,
            "reason": self.reason,
            "details": self.details,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SecurityEvent":
        return cls(
            event_id=str(data.get("event_id", f"SEC-{uuid.uuid4().hex[:10].upper()}")),
            timestamp=str(data.get("timestamp", datetime.now(timezone.utc).isoformat())),
            event_type=str(data.get("event_type", "TRANSACTION_VALIDATED")),
            severity=str(data.get("severity", "INFO")),
            transaction_id=data.get("transaction_id"),
            sender_id=data.get("sender_id"),
            status=str(data.get("status", "ACCEPTED")),
            reason=str(data.get("reason", "")),
            details=dict(data.get("details", {})),
        )


@dataclass
class ValidationOutcome:
    """Outcome of verifying a signed transaction against replay protection & cryptographic checks."""
    is_valid: bool
    status_code: str  # ACCEPTED, DUPLICATE_TRANSACTION_ID, REUSED_NONCE, EXPIRED_TIMESTAMP, INVALID_SIGNATURE, MALFORMED_PAYLOAD
    message: str
    security_event: Optional[SecurityEvent] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "status_code": self.status_code,
            "message": self.message,
            "security_event": self.security_event.to_dict() if self.security_event else None,
            "details": self.details,
        }
