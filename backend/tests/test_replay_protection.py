"""Comprehensive Unit & Integration Tests for Replay Attack Protection.

Tests cover:
1. Valid cryptographically signed transaction acceptance.
2. Duplicate transaction ID rejection (direct replay attack).
3. Reused and out-of-order nonce rejection (sequence replay attack).
4. Strictly increasing nonce acceptance per sender.
5. Expired / stale timestamp rejection (drift window violation).
6. Future-dated timestamp rejection.
7. Signature verification failure (invalid signature / wrong key).
8. Tampered payload rejection (data modification after signing).
9. Security event audit logging and incident statistics.
10. End-to-end replay attack simulation module execution.
11. FastAPI REST endpoints for security and attack simulation.
"""

import time
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from security.models import SignedTransaction
from security.signer import generate_keypair, sign_transaction
from security.replay_protection import ReplayProtectionEngine
from security.event_logger import SecurityEventLogger
from attacks.replay_attack import ReplayAttackSimulator


@pytest.fixture
def clean_engine():
    """Returns an isolated ReplayProtectionEngine with dedicated logger."""
    logger = SecurityEventLogger(max_events=500)
    engine = ReplayProtectionEngine(max_timestamp_drift_seconds=300.0, event_logger=logger)
    return engine, logger


@pytest.fixture
def client():
    return TestClient(app)


class TestReplayProtectionCore:
    """Core cryptographic and replay defense unit tests."""

    def test_valid_signed_transaction_accepted(self, clean_engine):
        engine, logger = clean_engine
        pub_key, priv_key = generate_keypair()

        tx = SignedTransaction(
            transaction_id=f"TX-{uuid.uuid4().hex[:8].upper()}",
            sender_id="HH-001",
            recipient_id="HH-002",
            energy_kwh=5.0,
            price_per_kwh=0.15,
            total_value=0.75,
            timestamp=time.time(),
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(tx, priv_key)

        outcome = engine.validate_transaction(tx)
        assert outcome.is_valid is True
        assert outcome.status_code == "ACCEPTED"
        assert tx.transaction_id in engine.processed_tx_ids
        assert engine.sender_highest_nonce["HH-001"] == 1

        # Check logged security event
        events = logger.get_events(limit=10)
        assert len(events) == 1
        assert events[0].event_type == "TRANSACTION_VALIDATED"
        assert events[0].status == "ACCEPTED"

    def test_duplicate_transaction_id_rejected(self, clean_engine):
        """Rule 1: Reject duplicate transaction IDs (Direct replay attack)."""
        engine, logger = clean_engine
        pub_key, priv_key = generate_keypair()

        tx = SignedTransaction(
            transaction_id="TX-FIXED-REPLAY-1",
            sender_id="HH-001",
            recipient_id="HH-002",
            energy_kwh=4.0,
            price_per_kwh=0.14,
            total_value=0.56,
            timestamp=time.time(),
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(tx, priv_key)

        # 1st Submission: Legitimate
        first_res = engine.validate_transaction(tx)
        assert first_res.is_valid is True
        assert first_res.status_code == "ACCEPTED"

        # 2nd Submission: Direct Replay Attempt
        second_res = engine.validate_transaction(tx)
        assert second_res.is_valid is False
        assert second_res.status_code == "DUPLICATE_TRANSACTION_ID"
        assert "replay attack blocked" in second_res.message.lower()

        # Check security audit event
        events = logger.get_events(event_type="REPLAY_ATTACK_DETECTED")
        assert len(events) == 1
        assert events[0].status == "BLOCKED"
        assert events[0].transaction_id == "TX-FIXED-REPLAY-1"

    def test_reused_nonce_rejected(self, clean_engine):
        """Rule 2: Reject reused sequence nonces for the same sender."""
        engine, logger = clean_engine
        pub_key, priv_key = generate_keypair()

        # First transaction with Nonce 1
        tx1 = SignedTransaction(
            transaction_id="TX-001",
            sender_id="HH-005",
            recipient_id="HH-010",
            energy_kwh=2.5,
            price_per_kwh=0.16,
            total_value=0.40,
            timestamp=time.time(),
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(tx1, priv_key)
        assert engine.validate_transaction(tx1).is_valid is True

        # Second transaction with distinct TX ID but REUSED Nonce 1
        tx2 = SignedTransaction(
            transaction_id="TX-002-NEW-ID",
            sender_id="HH-005",
            recipient_id="HH-010",
            energy_kwh=3.0,
            price_per_kwh=0.16,
            total_value=0.48,
            timestamp=time.time(),
            nonce=1,  # Reused!
            public_key=pub_key,
        )
        sign_transaction(tx2, priv_key)

        res2 = engine.validate_transaction(tx2)
        assert res2.is_valid is False
        assert res2.status_code == "REUSED_NONCE"

        # Lower Nonce 0 attempt
        tx3 = SignedTransaction(
            transaction_id="TX-003-LOWER-NONCE",
            sender_id="HH-005",
            recipient_id="HH-010",
            energy_kwh=1.0,
            price_per_kwh=0.10,
            total_value=0.10,
            timestamp=time.time(),
            nonce=0,
            public_key=pub_key,
        )
        sign_transaction(tx3, priv_key)
        assert engine.validate_transaction(tx3).is_valid is False

    def test_strictly_increasing_nonces_accepted(self, clean_engine):
        """Valid monotonic nonces succeed."""
        engine, _ = clean_engine
        pub_key, priv_key = generate_keypair()

        for nonce_val in [1, 2, 5, 10]:
            tx = SignedTransaction(
                transaction_id=f"TX-SEQ-{nonce_val}",
                sender_id="HH-PROSUMER",
                recipient_id="HH-CONSUMER",
                energy_kwh=2.0,
                price_per_kwh=0.12,
                total_value=0.24,
                timestamp=time.time(),
                nonce=nonce_val,
                public_key=pub_key,
            )
            sign_transaction(tx, priv_key)
            res = engine.validate_transaction(tx)
            assert res.is_valid is True
            assert res.status_code == "ACCEPTED"

    def test_expired_timestamp_rejected(self, clean_engine):
        """Rule 3: Reject stale/expired timestamps beyond max drift."""
        engine, logger = clean_engine
        pub_key, priv_key = generate_keypair()

        now = time.time()
        stale_time = now - 600.0  # 10 minutes ago (limit is 300s)

        tx = SignedTransaction(
            transaction_id="TX-EXPIRED-1",
            sender_id="HH-020",
            recipient_id="HH-030",
            energy_kwh=6.0,
            price_per_kwh=0.15,
            total_value=0.90,
            timestamp=stale_time,
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(tx, priv_key)

        res = engine.validate_transaction(tx, current_time=now)
        assert res.is_valid is False
        assert res.status_code == "EXPIRED_TIMESTAMP"
        assert "expired/stale" in res.message.lower() or "drift" in res.message.lower()

    def test_future_timestamp_rejected(self, clean_engine):
        """Rule 3: Reject future timestamps beyond max drift."""
        engine, logger = clean_engine
        pub_key, priv_key = generate_keypair()

        now = time.time()
        future_time = now + 800.0

        tx = SignedTransaction(
            transaction_id="TX-FUTURE-1",
            sender_id="HH-020",
            recipient_id="HH-030",
            energy_kwh=6.0,
            price_per_kwh=0.15,
            total_value=0.90,
            timestamp=future_time,
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(tx, priv_key)

        res = engine.validate_transaction(tx, current_time=now)
        assert res.is_valid is False
        assert res.status_code == "EXPIRED_TIMESTAMP"

    def test_invalid_signature_rejected(self, clean_engine):
        """Rule 4: Reject corrupt signature or signature signed by wrong key."""
        engine, logger = clean_engine
        pub_key, priv_key = generate_keypair()
        wrong_pub, wrong_priv = generate_keypair()

        tx = SignedTransaction(
            transaction_id="TX-WRONG-SIG",
            sender_id="HH-040",
            recipient_id="HH-050",
            energy_kwh=4.0,
            price_per_kwh=0.13,
            total_value=0.52,
            timestamp=time.time(),
            nonce=1,
            public_key=pub_key,  # Proclaims pub_key
        )
        # Sign with wrong_priv
        sign_transaction(tx, wrong_priv)

        res = engine.validate_transaction(tx)
        assert res.is_valid is False
        assert res.status_code == "INVALID_SIGNATURE"

    def test_tampered_payload_rejected(self, clean_engine):
        """Rule 4: Reject modified transaction content."""
        engine, logger = clean_engine
        pub_key, priv_key = generate_keypair()

        tx = SignedTransaction(
            transaction_id="TX-TAMPER-1",
            sender_id="HH-040",
            recipient_id="HH-050",
            energy_kwh=5.0,
            price_per_kwh=0.10,
            total_value=0.50,
            timestamp=time.time(),
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(tx, priv_key)

        # Attacker modifies energy amount after signing
        tx.energy_kwh = 999.0
        tx.total_value = 99.9

        res = engine.validate_transaction(tx)
        assert res.is_valid is False
        assert res.status_code == "INVALID_SIGNATURE"


class TestReplayAttackSimulation:
    """Tests for the ReplayAttackSimulator module."""

    def test_simulator_execution(self, clean_engine):
        engine, logger = clean_engine
        simulator = ReplayAttackSimulator(engine=engine, logger=logger)

        report = simulator.run_simulation(
            sender_id="HH-SIM-SELLER",
            recipient_id="HH-SIM-BUYER",
            energy_kwh=10.0,
            price_per_kwh=0.18,
        )

        assert report["all_attacks_blocked"] is True
        assert report["total_attack_vectors_tested"] == 5

        # Check step results
        steps = {r["step"]: r for r in report["results"]}
        assert steps[1]["actual_outcome"] == "ACCEPTED"
        assert steps[2]["actual_outcome"] == "DUPLICATE_TRANSACTION_ID"
        assert steps[3]["actual_outcome"] == "REUSED_NONCE"
        assert steps[4]["actual_outcome"] == "EXPIRED_TIMESTAMP"
        assert steps[5]["actual_outcome"] == "INVALID_SIGNATURE"

        stats = report["security_stats"]
        assert stats["replay_attacks_blocked"] >= 1
        assert stats["reused_nonces_blocked"] >= 1
        assert stats["expired_timestamps_blocked"] >= 1
        assert stats["invalid_signatures_blocked"] >= 1


class TestSecurityFastAPIEndpoints:
    """Integration tests for FastAPI /api/security endpoints."""

    def test_simulate_replay_attack_endpoint(self, client):
        res = client.post("/api/security/simulate-replay-attack?sender_id=HH-API-TEST&energy_kwh=5.5")
        assert res.status_code == 200
        data = res.json()
        assert data["all_attacks_blocked"] is True
        assert len(data["results"]) == 5

    def test_validate_signed_transaction_endpoint(self, client):
        pub_key, priv_key = generate_keypair()
        tx = SignedTransaction(
            transaction_id=f"TX-API-{uuid.uuid4().hex[:8].upper()}",
            sender_id="HH-API-PROSUMER",
            recipient_id="HH-API-CONSUMER",
            energy_kwh=6.0,
            price_per_kwh=0.14,
            total_value=0.84,
            timestamp=time.time(),
            nonce=1,
            public_key=pub_key,
        )
        sign_transaction(tx, priv_key)

        res = client.post("/api/security/validate-transaction", json=tx.to_dict())
        assert res.status_code == 200
        assert res.json()["is_valid"] is True
        assert res.json()["status_code"] == "ACCEPTED"

    def test_get_security_events_and_stats_endpoints(self, client):
        # Trigger an attack simulation to populate events
        client.post("/api/security/simulate-replay-attack")

        # Query events
        events_res = client.get("/api/security/events?limit=10")
        assert events_res.status_code == 200
        events = events_res.json()
        assert len(events) > 0

        # Query stats
        stats_res = client.get("/api/security/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_events"] > 0
        assert stats["replay_attacks_blocked"] > 0

        # Query status
        status_res = client.get("/api/security/replay-protection/status")
        assert status_res.status_code == 200
        assert status_res.json()["total_processed_transactions"] > 0
