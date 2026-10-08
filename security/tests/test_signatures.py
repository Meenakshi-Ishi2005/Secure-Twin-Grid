"""Unit Tests for Digital Signatures and Transaction Canonicalization.

Tests verify:
1. Valid digital signature generation and verification (seller & buyer).
2. Detection of modified energy amount (energy_kwh tampering).
3. Detection of modified clearing price (price_per_kwh tampering).
4. Detection of modified buyer identifier (buyer_id tampering).
5. Detection of modified execution timestamp (timestamp tampering).
6. Rejection of corrupted signature bytes or wrong public keys.
7. Multi-party dual-signed trade validation (seller authorization + buyer acceptance).
8. Deterministic canonicalization stability across key permutations and float precisions.
9. Verification that private keys are never exposed in dictionaries or outputs.
"""

import copy
import pytest
from security.canonicalization import (
    canonicalize_transaction,
    canonicalize_to_bytes,
    canonicalize_to_json,
    extract_trade_fields,
)
from security.signatures import (
    generate_ecc_keypair,
    sign_transaction,
    verify_transaction_signature,
    sign_dual_trade,
    verify_trade,
)


@pytest.fixture
def sample_trade():
    """Standard valid P2P electricity trade payload."""
    return {
        "trade_id": "TRD-88219",
        "seller_id": "HH-014-PROSUMER",
        "buyer_id": "HH-088-CONSUMER",
        "energy_kwh": 6.5,
        "price_per_kwh": 0.14,
        "total_value": 0.91,
        "timestamp": "2026-10-03T12:15:00Z",
    }


@pytest.fixture
def keypairs():
    """Returns separate ECC keypairs for seller and buyer."""
    seller_pub, seller_priv = generate_ecc_keypair()
    buyer_pub, buyer_priv = generate_ecc_keypair()
    return {
        "seller_pub": seller_pub,
        "seller_priv": seller_priv,
        "buyer_pub": buyer_pub,
        "buyer_priv": buyer_priv,
    }


class TestDigitalSignatures:
    """Test suite covering transaction signing and tamper detection."""

    def test_valid_signature(self, sample_trade, keypairs):
        """Test that a validly signed transaction verifies successfully."""
        trade = copy.deepcopy(sample_trade)
        seller_pub = keypairs["seller_pub"]
        seller_priv = keypairs["seller_priv"]

        # Sign transaction
        sig = sign_transaction(trade, seller_priv, role="seller", attach=True)
        assert sig != ""
        assert trade["seller_signature"] == sig

        # Verify signature
        is_valid = verify_transaction_signature(
            trade,
            public_key_pem=seller_pub,
            signature_b64=sig,
            role="seller",
        )
        assert is_valid is True

    def test_modified_energy_amount(self, sample_trade, keypairs):
        """Tampering with energy_kwh must cause signature verification to fail."""
        trade = copy.deepcopy(sample_trade)
        seller_pub = keypairs["seller_pub"]
        seller_priv = keypairs["seller_priv"]

        sig = sign_transaction(trade, seller_priv, role="seller", attach=True)

        # Attacker inflates energy volume from 6.5 to 65.0 kWh
        trade["energy_kwh"] = 65.0

        is_valid = verify_transaction_signature(
            trade,
            public_key_pem=seller_pub,
            signature_b64=sig,
            role="seller",
        )
        assert is_valid is False

    def test_modified_price(self, sample_trade, keypairs):
        """Tampering with price_per_kwh must cause signature verification to fail."""
        trade = copy.deepcopy(sample_trade)
        seller_pub = keypairs["seller_pub"]
        seller_priv = keypairs["seller_priv"]

        sig = sign_transaction(trade, seller_priv, role="seller", attach=True)

        # Attacker modifies price from $0.14 to $0.99
        trade["price_per_kwh"] = 0.99

        is_valid = verify_transaction_signature(
            trade,
            public_key_pem=seller_pub,
            signature_b64=sig,
            role="seller",
        )
        assert is_valid is False

    def test_modified_buyer_id(self, sample_trade, keypairs):
        """Tampering with buyer_id must cause signature verification to fail."""
        trade = copy.deepcopy(sample_trade)
        seller_pub = keypairs["seller_pub"]
        seller_priv = keypairs["seller_priv"]

        sig = sign_transaction(trade, seller_priv, role="seller", attach=True)

        # Attacker redirects trade to a different buyer ID
        trade["buyer_id"] = "HH-999-IMPOSTOR"

        is_valid = verify_transaction_signature(
            trade,
            public_key_pem=seller_pub,
            signature_b64=sig,
            role="seller",
        )
        assert is_valid is False

    def test_modified_timestamp(self, sample_trade, keypairs):
        """Tampering with timestamp must cause signature verification to fail."""
        trade = copy.deepcopy(sample_trade)
        seller_pub = keypairs["seller_pub"]
        seller_priv = keypairs["seller_priv"]

        sig = sign_transaction(trade, seller_priv, role="seller", attach=True)

        # Attacker modifies execution time
        trade["timestamp"] = "2026-10-03T23:59:59Z"

        is_valid = verify_transaction_signature(
            trade,
            public_key_pem=seller_pub,
            signature_b64=sig,
            role="seller",
        )
        assert is_valid is False

    def test_invalid_signature(self, sample_trade, keypairs):
        """Corrupted signature bytes or wrong public key must be rejected."""
        trade = copy.deepcopy(sample_trade)
        seller_pub = keypairs["seller_pub"]
        buyer_pub = keypairs["buyer_pub"]
        seller_priv = keypairs["seller_priv"]

        sig = sign_transaction(trade, seller_priv, role="seller", attach=True)

        # Case 1: Corrupted signature string
        corrupt_sig = "A" * len(sig)
        assert verify_transaction_signature(trade, seller_pub, signature_b64=corrupt_sig, role="seller") is False

        # Case 2: Verification with wrong public key (buyer pub instead of seller pub)
        assert verify_transaction_signature(trade, buyer_pub, signature_b64=sig, role="seller") is False

        # Case 3: Empty signature / empty public key
        assert verify_transaction_signature(trade, "", signature_b64=sig, role="seller") is False
        assert verify_transaction_signature(trade, seller_pub, signature_b64="", role="seller") is False


class TestDualSignedTradeValidation:
    """Test suite covering multi-party trade agreements (seller + buyer)."""

    def test_dual_signed_trade_valid(self, sample_trade, keypairs):
        """A trade with valid seller and buyer signatures is fully accepted."""
        signed_trade = sign_dual_trade(
            sample_trade,
            seller_private_key_pem=keypairs["seller_priv"],
            buyer_private_key_pem=keypairs["buyer_priv"],
            seller_public_key_pem=keypairs["seller_pub"],
            buyer_public_key_pem=keypairs["buyer_pub"],
        )

        assert "seller_signature" in signed_trade
        assert "buyer_signature" in signed_trade

        is_valid, msg, results = verify_trade(
            signed_trade,
            seller_public_key_pem=keypairs["seller_pub"],
            buyer_public_key_pem=keypairs["buyer_pub"],
            require_buyer_signature=True,
        )

        assert is_valid is True
        assert results["seller_signature_valid"] is True
        assert results["buyer_signature_valid"] is True

    def test_dual_signed_trade_rejected_on_buyer_tamper(self, sample_trade, keypairs):
        """If buyer signature is corrupted, entire trade must be invalid."""
        signed_trade = sign_dual_trade(
            sample_trade,
            seller_private_key_pem=keypairs["seller_priv"],
            buyer_private_key_pem=keypairs["buyer_priv"],
            seller_public_key_pem=keypairs["seller_pub"],
            buyer_public_key_pem=keypairs["buyer_pub"],
        )

        # Attacker alters buyer signature
        signed_trade["buyer_signature"] = signed_trade["buyer_signature"][:-5] + "XXXXX"

        is_valid, msg, results = verify_trade(
            signed_trade,
            seller_public_key_pem=keypairs["seller_pub"],
            buyer_public_key_pem=keypairs["buyer_pub"],
            require_buyer_signature=True,
        )

        assert is_valid is False
        assert results["seller_signature_valid"] is True
        assert results["buyer_signature_valid"] is False
        assert "Buyer trade acceptance" in msg


class TestDeterministicCanonicalization:
    """Test suite ensuring deterministic serialization."""

    def test_canonical_byte_determinism(self):
        """Key order variations must produce bit-for-bit identical canonical bytes."""
        trade_ordered_a = {
            "trade_id": "TRD-001",
            "seller_id": "HH-01",
            "buyer_id": "HH-02",
            "energy_kwh": 5.0,
            "price_per_kwh": 0.12,
            "total_value": 0.60,
            "timestamp": "12:00",
        }

        trade_ordered_b = {
            "timestamp": "12:00",
            "total_value": 0.60,
            "price_per_kwh": 0.12,
            "energy_kwh": 5.000000,
            "buyer_id": "HH-02",
            "seller_id": "HH-01",
            "trade_id": "TRD-001",
        }

        bytes_a = canonicalize_to_bytes(trade_ordered_a, role="trade")
        bytes_b = canonicalize_to_bytes(trade_ordered_b, role="trade")
        assert bytes_a == bytes_b

    def test_private_key_never_exposed(self, sample_trade, keypairs):
        """Verify that private keys are never added to canonical dicts or signed structures."""
        signed = sign_dual_trade(
            sample_trade,
            seller_private_key_pem=keypairs["seller_priv"],
            buyer_private_key_pem=keypairs["buyer_priv"],
            seller_public_key_pem=keypairs["seller_pub"],
            buyer_public_key_pem=keypairs["buyer_pub"],
        )

        # Ensure no private key leaks
        for k in signed.keys():
            assert "private" not in k.lower()
        signed_str = str(signed)
        assert "-----BEGIN PRIVATE KEY-----" not in signed_str
