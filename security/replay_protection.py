"""Replay Attack Protection Engine for SecureTwinGrid.

Protects against replay attacks, duplicate transaction submissions, nonce reuse,
stale/expired timestamps, and cryptographic signature tampering in microgrid
energy trades.
"""

from datetime import datetime, timezone
from typing import Set, Dict, Optional, Tuple, Any
import threading
import time

from security.models import SignedTransaction, SecurityEvent, ValidationOutcome
from security.signer import verify_transaction_signature
from security.event_logger import SecurityEventLogger, get_security_event_logger


class ReplayProtectionEngine:
    """Validates signed energy transactions and enforces replay attack defenses.
    
    Protective Invariants Enforced:
    1. Transaction ID Uniqueness: Every transaction ID may be processed at most once.
    2. Monotonic Nonce / Sequence Validation: Per sender, every transaction nonce must be strictly
       greater than previously recorded nonces (or unique per sender).
    3. Timestamp Freshness Window: Transaction creation timestamp must fall within an acceptable
       drift window relative to the validator clock (default: 300 seconds / 5 minutes).
    4. Cryptographic Signature Integrity: The ECDSA signature must match the canonical transaction
       payload bytes and sender's public key.
    """

    def __init__(
        self,
        max_timestamp_drift_seconds: float = 300.0,
        event_logger: Optional[SecurityEventLogger] = None,
    ):
        self._lock = threading.Lock()
        self.max_timestamp_drift_seconds = float(max_timestamp_drift_seconds)
        self.event_logger = event_logger or get_security_event_logger()

        # Server-side record of processed transaction IDs
        self.processed_tx_ids: Set[str] = set()

        # Server-side record of highest recorded nonce per sender ID
        self.sender_highest_nonce: Dict[str, int] = {}

        # Set of all processed (sender_id, nonce) pairs
        self.used_nonces: Set[Tuple[str, int]] = set()

        # History of validated transactions for inspection
        self.validated_transactions: Dict[str, SignedTransaction] = {}

    def validate_transaction(
        self,
        tx: SignedTransaction,
        current_time: Optional[float] = None,
    ) -> ValidationOutcome:
        """Validate a signed energy transaction against all replay protection rules.
        
        Args:
            tx: The SignedTransaction to audit.
            current_time: Optional mock time epoch for deterministic testing.
            
        Returns:
            ValidationOutcome: Detailed decision with status_code and reason.
        """
        now = float(current_time if current_time is not None else time.time())

        with self._lock:
            # -------------------------------------------------------------
            # 1. REJECTION RULE 1: Duplicate Transaction ID Check
            # -------------------------------------------------------------
            if tx.transaction_id in self.processed_tx_ids:
                event = self.event_logger.log(
                    event_type="REPLAY_ATTACK_DETECTED",
                    severity="HIGH",
                    transaction_id=tx.transaction_id,
                    sender_id=tx.sender_id,
                    status="BLOCKED",
                    reason=f"Duplicate transaction ID '{tx.transaction_id}' detected. Transaction has already been processed.",
                    details={
                        "rule_violated": "DUPLICATE_TRANSACTION_ID",
                        "attempted_nonce": tx.nonce,
                        "energy_kwh": tx.energy_kwh,
                        "timestamp": tx.timestamp,
                    },
                )
                return ValidationOutcome(
                    is_valid=False,
                    status_code="DUPLICATE_TRANSACTION_ID",
                    message=f"Replay attack blocked: Transaction ID '{tx.transaction_id}' was already executed.",
                    security_event=event,
                    details={"transaction_id": tx.transaction_id},
                )

            # -------------------------------------------------------------
            # 2. REJECTION RULE 2: Reused or Out-of-Order Nonce Check
            # -------------------------------------------------------------
            sender_key = str(tx.sender_id).strip().upper()
            highest_nonce = self.sender_highest_nonce.get(sender_key, 0)
            nonce_tuple = (sender_key, tx.nonce)

            if nonce_tuple in self.used_nonces or tx.nonce <= highest_nonce:
                event = self.event_logger.log(
                    event_type="REUSED_NONCE_BLOCKED",
                    severity="HIGH",
                    transaction_id=tx.transaction_id,
                    sender_id=tx.sender_id,
                    status="BLOCKED",
                    reason=(
                        f"Reused or invalid sequence nonce {tx.nonce} for sender '{tx.sender_id}'. "
                        f"Highest valid nonce is {highest_nonce}."
                    ),
                    details={
                        "rule_violated": "REUSED_NONCE",
                        "sender_id": tx.sender_id,
                        "submitted_nonce": tx.nonce,
                        "highest_valid_nonce": highest_nonce,
                    },
                )
                return ValidationOutcome(
                    is_valid=False,
                    status_code="REUSED_NONCE",
                    message=(
                        f"Replay attack blocked: Nonce {tx.nonce} for sender '{tx.sender_id}' "
                        f"has already been used (highest valid: {highest_nonce})."
                    ),
                    security_event=event,
                    details={
                        "submitted_nonce": tx.nonce,
                        "highest_valid_nonce": highest_nonce,
                    },
                )

            # -------------------------------------------------------------
            # 3. REJECTION RULE 3: Timestamp Freshness & Expiration Check
            # -------------------------------------------------------------
            time_drift = now - tx.timestamp
            if abs(time_drift) > self.max_timestamp_drift_seconds:
                drift_direction = "expired/stale" if time_drift > 0 else "future-dated"
                event = self.event_logger.log(
                    event_type="EXPIRED_TIMESTAMP_BLOCKED",
                    severity="MEDIUM",
                    transaction_id=tx.transaction_id,
                    sender_id=tx.sender_id,
                    status="REJECTED",
                    reason=(
                        f"Transaction timestamp is {drift_direction}. Time difference of "
                        f"{abs(time_drift):.2f}s exceeds maximum allowed drift of "
                        f"{self.max_timestamp_drift_seconds:.2f}s."
                    ),
                    details={
                        "rule_violated": "EXPIRED_TIMESTAMP",
                        "tx_timestamp": tx.timestamp,
                        "server_timestamp": now,
                        "drift_seconds": round(time_drift, 3),
                        "max_allowed_drift_seconds": self.max_timestamp_drift_seconds,
                    },
                )
                return ValidationOutcome(
                    is_valid=False,
                    status_code="EXPIRED_TIMESTAMP",
                    message=(
                        f"Transaction timestamp {drift_direction} (drift: {abs(time_drift):.1f}s, "
                        f"limit: {self.max_timestamp_drift_seconds:.1f}s)."
                    ),
                    security_event=event,
                    details={
                        "tx_timestamp": tx.timestamp,
                        "server_timestamp": now,
                        "drift_seconds": round(time_drift, 3),
                    },
                )

            # -------------------------------------------------------------
            # 4. REJECTION RULE 4: Cryptographic Signature Integrity Check
            # -------------------------------------------------------------
            if not tx.signature or not tx.public_key:
                event = self.event_logger.log(
                    event_type="INVALID_SIGNATURE_BLOCKED",
                    severity="HIGH",
                    transaction_id=tx.transaction_id,
                    sender_id=tx.sender_id,
                    status="REJECTED",
                    reason="Missing digital signature or public key.",
                    details={"rule_violated": "MISSING_SIGNATURE"},
                )
                return ValidationOutcome(
                    is_valid=False,
                    status_code="INVALID_SIGNATURE",
                    message="Transaction rejected: Missing cryptographic signature or public key.",
                    security_event=event,
                )

            sig_valid = verify_transaction_signature(tx)
            if not sig_valid:
                event = self.event_logger.log(
                    event_type="INVALID_SIGNATURE_BLOCKED",
                    severity="CRITICAL",
                    transaction_id=tx.transaction_id,
                    sender_id=tx.sender_id,
                    status="BLOCKED",
                    reason="ECDSA signature verification failed. The transaction payload may have been tampered with or signed with an invalid key.",
                    details={
                        "rule_violated": "INVALID_SIGNATURE",
                        "transaction_id": tx.transaction_id,
                        "sender_id": tx.sender_id,
                        "public_key_preview": tx.public_key[:40] + "..." if tx.public_key else "",
                    },
                )
                return ValidationOutcome(
                    is_valid=False,
                    status_code="INVALID_SIGNATURE",
                    message="Cryptographic signature verification failed: Payload tampered or signature invalid.",
                    security_event=event,
                )

            # -------------------------------------------------------------
            # 5. ALL CHECKS PASSED: Commit to server-side record
            # -------------------------------------------------------------
            self.processed_tx_ids.add(tx.transaction_id)
            self.sender_highest_nonce[sender_key] = max(highest_nonce, tx.nonce)
            self.used_nonces.add(nonce_tuple)
            self.validated_transactions[tx.transaction_id] = tx

            event = self.event_logger.log(
                event_type="TRANSACTION_VALIDATED",
                severity="INFO",
                transaction_id=tx.transaction_id,
                sender_id=tx.sender_id,
                status="ACCEPTED",
                reason="All cryptographic signatures, nonces, and timestamp freshness checks verified successfully.",
                details={
                    "energy_kwh": tx.energy_kwh,
                    "price_per_kwh": tx.price_per_kwh,
                    "total_value": tx.total_value,
                    "nonce": tx.nonce,
                },
            )

            return ValidationOutcome(
                is_valid=True,
                status_code="ACCEPTED",
                message="Transaction cryptographically verified and accepted into grid settlement.",
                security_event=event,
                details={
                    "transaction_id": tx.transaction_id,
                    "sender_id": tx.sender_id,
                    "nonce": tx.nonce,
                },
            )

    def get_status(self) -> Dict[str, Any]:
        """Return operational state of replay protection engine."""
        with self._lock:
            return {
                "total_processed_transactions": len(self.processed_tx_ids),
                "active_senders_count": len(self.sender_highest_nonce),
                "sender_highest_nonces": dict(self.sender_highest_nonce),
                "max_timestamp_drift_seconds": self.max_timestamp_drift_seconds,
                "recent_processed_tx_ids": list(self.processed_tx_ids)[-20:],
            }

    def reset(self) -> None:
        """Reset replay protection state for fresh test/simulation run."""
        with self._lock:
            self.processed_tx_ids.clear()
            self.sender_highest_nonce.clear()
            self.used_nonces.clear()
            self.validated_transactions.clear()


# Global singleton instance
_global_engine: Optional[ReplayProtectionEngine] = None


def get_replay_protection_engine() -> ReplayProtectionEngine:
    global _global_engine
    if _global_engine is None:
        _global_engine = ReplayProtectionEngine()
    return _global_engine
