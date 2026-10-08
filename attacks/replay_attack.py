"""Replay Attack Simulation Module for SecureTwinGrid.

Simulates adversarial replay attacks on peer-to-peer microgrid energy trading:
1. Captures a legitimate, cryptographically signed energy transaction.
2. Submits the valid transaction to the grid engine (verifying initial acceptance).
3. Intercepts and replays the exact same transaction (verifying rejection & audit logging).
4. Tests variations including nonce reuse, expired timestamp injection, and payload tampering.
"""

import time
import uuid
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone

from security.models import SignedTransaction, ValidationOutcome, SecurityEvent
from security.signer import generate_keypair, sign_transaction
from security.replay_protection import ReplayProtectionEngine, get_replay_protection_engine
from security.event_logger import SecurityEventLogger, get_security_event_logger


class ReplayAttackSimulator:
    """Automates and records replay attack simulations against SecureTwinGrid."""

    def __init__(
        self,
        engine: Optional[ReplayProtectionEngine] = None,
        logger: Optional[SecurityEventLogger] = None,
    ):
        self.engine = engine or get_replay_protection_engine()
        self.logger = logger or (self.engine.event_logger if self.engine else get_security_event_logger())

    def create_simulated_prosumer_transaction(
        self,
        sender_id: str = "HH-014-PROSUMER",
        recipient_id: str = "HH-088-CONSUMER",
        energy_kwh: float = 7.5,
        price_per_kwh: float = 0.14,
        nonce: int = 1,
        timestamp_offset_seconds: float = 0.0,
    ) -> Tuple[SignedTransaction, str, str]:
        """Helper to generate a valid ECC key pair and signed transaction."""
        pub_key, priv_key = generate_keypair()
        now = time.time() + timestamp_offset_seconds

        tx = SignedTransaction(
            transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}",
            sender_id=sender_id,
            recipient_id=recipient_id,
            energy_kwh=energy_kwh,
            price_per_kwh=price_per_kwh,
            total_value=round(energy_kwh * price_per_kwh, 4),
            timestamp=now,
            nonce=nonce,
            public_key=pub_key,
        )
        sign_transaction(tx, priv_key)
        return tx, pub_key, priv_key

    def run_simulation(
        self,
        sender_id: str = "HH-014-PROSUMER",
        recipient_id: str = "HH-088-CONSUMER",
        energy_kwh: float = 8.25,
        price_per_kwh: float = 0.15,
    ) -> Dict[str, Any]:
        """Execute a complete end-to-end replay attack demonstration.
        
        Demonstration Steps:
        1. Capture & Submit Legitimate Transaction: Valid signature, fresh timestamp, nonce=1.
        2. Direct Replay Attack: Attacker captures identical signed transaction payload and re-submits.
        3. Nonce Replay Attack: Attacker generates a new tx_id but reuses the already submitted nonce.
        4. Stale Timestamp Attack: Attacker submits an expired transaction (timestamp beyond max drift).
        5. Tampered Payload Attack: Attacker attempts to alter energy values with original signature.
        """
        results: List[Dict[str, Any]] = []

        # -------------------------------------------------------------
        # Step 1: Formulate and submit legitimate signed transaction
        # -------------------------------------------------------------
        pub_key, priv_key = generate_keypair()
        legit_tx = SignedTransaction(
            transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}",
            sender_id=sender_id,
            recipient_id=recipient_id,
            energy_kwh=energy_kwh,
            price_per_kwh=price_per_kwh,
            total_value=round(energy_kwh * price_per_kwh, 4),
            timestamp=time.time(),
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(legit_tx, priv_key)

        first_submission_outcome = self.engine.validate_transaction(legit_tx)
        results.append({
            "step": 1,
            "scenario": "Legitimate Initial Submission",
            "description": "Prosumer signs energy trade with valid private key and fresh nonce.",
            "transaction": legit_tx.to_dict(),
            "expected_outcome": "ACCEPTED",
            "actual_outcome": first_submission_outcome.status_code,
            "is_valid": first_submission_outcome.is_valid,
            "message": first_submission_outcome.message,
            "protection_successful": first_submission_outcome.is_valid is True,
        })

        # -------------------------------------------------------------
        # Step 2: Adversary captures and replays identical transaction
        # -------------------------------------------------------------
        captured_payload = legit_tx.to_dict()
        replayed_tx = SignedTransaction.from_dict(captured_payload)

        direct_replay_outcome = self.engine.validate_transaction(replayed_tx)
        results.append({
            "step": 2,
            "scenario": "Direct Transaction Replay Attack",
            "description": "Adversary re-submits previously captured valid signed transaction.",
            "transaction": replayed_tx.to_dict(),
            "expected_outcome": "DUPLICATE_TRANSACTION_ID",
            "actual_outcome": direct_replay_outcome.status_code,
            "is_valid": direct_replay_outcome.is_valid,
            "message": direct_replay_outcome.message,
            "protection_successful": (
                direct_replay_outcome.is_valid is False
                and direct_replay_outcome.status_code == "DUPLICATE_TRANSACTION_ID"
            ),
        })

        # -------------------------------------------------------------
        # Step 3: Adversary modifies tx_id but reuses previously spent nonce
        # -------------------------------------------------------------
        reused_nonce_tx = SignedTransaction(
            transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}",  # New unique TX ID
            sender_id=sender_id,
            recipient_id=recipient_id,
            energy_kwh=3.0,
            price_per_kwh=0.12,
            total_value=0.36,
            timestamp=time.time(),
            nonce=1,  # REUSED NONCE (must be > 1)
            public_key=pub_key,
        )
        sign_transaction(reused_nonce_tx, priv_key)

        nonce_replay_outcome = self.engine.validate_transaction(reused_nonce_tx)
        results.append({
            "step": 3,
            "scenario": "Reused Nonce / Out-of-Sequence Attack",
            "description": "Attacker constructs new transaction ID but reuses stale sequence nonce.",
            "transaction": reused_nonce_tx.to_dict(),
            "expected_outcome": "REUSED_NONCE",
            "actual_outcome": nonce_replay_outcome.status_code,
            "is_valid": nonce_replay_outcome.is_valid,
            "message": nonce_replay_outcome.message,
            "protection_successful": (
                nonce_replay_outcome.is_valid is False
                and nonce_replay_outcome.status_code == "REUSED_NONCE"
            ),
        })

        # -------------------------------------------------------------
        # Step 4: Adversary submits expired / stale transaction (e.g. 1 hour old)
        # -------------------------------------------------------------
        stale_tx = SignedTransaction(
            transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}",
            sender_id=sender_id,
            recipient_id=recipient_id,
            energy_kwh=5.0,
            price_per_kwh=0.15,
            total_value=0.75,
            timestamp=time.time() - 3600.0,  # 1 hour in the past
            nonce=2,
            public_key=pub_key,
        )
        sign_transaction(stale_tx, priv_key)

        stale_outcome = self.engine.validate_transaction(stale_tx)
        results.append({
            "step": 4,
            "scenario": "Expired Timestamp Injection Attack",
            "description": "Attacker replays old signed transaction with timestamp outside allowed drift window.",
            "transaction": stale_tx.to_dict(),
            "expected_outcome": "EXPIRED_TIMESTAMP",
            "actual_outcome": stale_outcome.status_code,
            "is_valid": stale_outcome.is_valid,
            "message": stale_outcome.message,
            "protection_successful": (
                stale_outcome.is_valid is False
                and stale_outcome.status_code == "EXPIRED_TIMESTAMP"
            ),
        })

        # -------------------------------------------------------------
        # Step 5: Adversary alters energy quantity without valid private key
        # -------------------------------------------------------------
        tampered_tx = SignedTransaction(
            transaction_id=f"TX-{uuid.uuid4().hex[:10].upper()}",
            sender_id=sender_id,
            recipient_id=recipient_id,
            energy_kwh=99.9,  # Tampered energy claim
            price_per_kwh=price_per_kwh,
            total_value=99.9 * price_per_kwh,
            timestamp=time.time(),
            nonce=2,
            public_key=pub_key,
            signature=legit_tx.signature,  # Stolen signature from different payload
        )

        tampered_outcome = self.engine.validate_transaction(tampered_tx)
        results.append({
            "step": 5,
            "scenario": "Tampered Payload / Signature Mismatch Attack",
            "description": "Attacker alters energy volume using signature from another transaction.",
            "transaction": tampered_tx.to_dict(),
            "expected_outcome": "INVALID_SIGNATURE",
            "actual_outcome": tampered_outcome.status_code,
            "is_valid": tampered_outcome.is_valid,
            "message": tampered_outcome.message,
            "protection_successful": (
                tampered_outcome.is_valid is False
                and tampered_outcome.status_code == "INVALID_SIGNATURE"
            ),
        })

        all_mitigated = all(r["protection_successful"] for r in results)
        attacks_blocked_count = sum(1 for r in results if r["step"] > 1 and r.get("protection_successful"))

        return {
            "simulation_id": f"SIM-REPLAY-{uuid.uuid4().hex[:8].upper()}",
            "attack_type": "Replay Attack",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "target": sender_id,
            "target_sender_id": sender_id,
            "target_recipient_id": recipient_id,
            "total_attack_vectors_tested": len(results),
            "attacks_simulated": len(results) - 1,
            "attacks_blocked": attacks_blocked_count,
            "all_attacks_blocked": all_mitigated,
            "status": "ALL_ATTACKS_BLOCKED" if all_mitigated else "VULNERABILITY_FOUND",
            "detection_rate_pct": 100.0 if all_mitigated else (attacks_blocked_count / max(len(results) - 1, 1) * 100.0),
            "results": results,
            "steps": results,
            "security_stats": self.logger.get_stats(),
        }
