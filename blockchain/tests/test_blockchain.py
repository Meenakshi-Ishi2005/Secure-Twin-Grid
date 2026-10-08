"""Unit Tests for SecureTwinGrid Educational Blockchain Module.

Tests cover:
1. Valid chain initialization, genesis block linking, and multi-block growth.
2. Tampered transaction detection (e.g. modified energy, price, or participants).
3. Tampered block header/content detection (e.g. modified timestamp, nonce).
4. Broken previous-hash pointer detection across chained blocks.
5. Invalid chain edge cases (empty chain, broken index sequence, forged genesis).
6. Trade conversion from trading module models.
7. Ledger serialization, export, and import with integrity checks.
"""

import os
import tempfile
import pytest
from blockchain.blockchain import Blockchain
from blockchain.block import Block
from blockchain.transaction import Transaction
from blockchain.validation import validate_chain, detect_tampering
from blockchain.hash_utils import sha256_hash
from trading.models import Trade


@pytest.fixture
def sample_trades():
    return [
        Trade(
            trade_id="TRD-00001",
            seller_id="HH-001",
            buyer_id="HH-002",
            energy_kwh=3.5,
            price_per_kwh=0.14,
            total_value=0.49,
            timestamp="12:00",
        ),
        Trade(
            trade_id="TRD-00002",
            seller_id="HH-003",
            buyer_id="HH-004",
            energy_kwh=5.2,
            price_per_kwh=0.15,
            total_value=0.78,
            timestamp="12:15",
        ),
        Trade(
            trade_id="TRD-00003",
            seller_id="HH-005",
            buyer_id="HH-006",
            energy_kwh=2.1,
            price_per_kwh=0.12,
            total_value=0.252,
            timestamp="12:30",
        ),
    ]


class TestValidChain:
    """Tests for valid blockchain creation, genesis, and block appending."""

    def test_genesis_block_initialization(self):
        bc = Blockchain()
        assert len(bc.chain) == 1
        genesis = bc.chain[0]
        assert genesis.index == 0
        assert genesis.previous_hash == "0" * 64
        assert len(genesis.transactions) == 0
        assert genesis.hash is not None
        assert len(genesis.hash) == 64
        assert bc.is_chain_valid() is True

    def test_block_creation_and_previous_hash_linking(self, sample_trades):
        bc = Blockchain()

        # Block 1
        bc.add_transaction(sample_trades[0])
        bc.add_transaction(sample_trades[1])
        b1 = bc.create_block()

        assert b1.index == 1
        assert len(b1.transactions) == 2
        assert b1.previous_hash == bc.chain[0].hash
        assert len(bc.chain) == 2
        assert bc.is_chain_valid() is True

        # Block 2
        bc.add_transaction(sample_trades[2])
        b2 = bc.create_block()

        assert b2.index == 2
        assert len(b2.transactions) == 1
        assert b2.previous_hash == b1.hash
        assert len(bc.chain) == 3
        assert bc.is_chain_valid() is True

        # Total transactions check
        assert bc.get_total_transactions_count() == 3

    def test_query_transactions(self, sample_trades):
        bc = Blockchain()
        bc.add_transactions_batch(sample_trades)
        bc.create_block()

        # Query by Trade ID
        result = bc.get_transaction_by_id("TRD-00002")
        assert result is not None
        tx, block_idx = result
        assert tx.trade_id == "TRD-00002"
        assert tx.seller_id == "HH-003"
        assert block_idx == 1

        # Query by Household
        hh_txs = bc.get_transactions_for_household("HH-001")
        assert len(hh_txs) == 1
        assert hh_txs[0][0].trade_id == "TRD-00001"


class TestTamperedTransaction:
    """Tests for detecting unauthorized modification of transaction records."""

    def test_tampered_transaction_energy(self, sample_trades):
        bc = Blockchain()
        bc.add_transactions_batch(sample_trades)
        bc.create_block()

        assert bc.is_chain_valid() is True

        # Adversary alters energy_kwh in block 1 transaction 0
        bc.chain[1].transactions[0].energy_kwh = 999.9

        # Audit should immediately flag the tampering
        report = bc.get_validation_report()
        assert report.is_valid is False
        assert report.invalid_block_index == 1
        assert report.error_type in ("TRANSACTION_TAMPERED", "BLOCK_HASH_MISMATCH")

    def test_tampered_transaction_price(self, sample_trades):
        bc = Blockchain()
        bc.add_transactions_batch(sample_trades)
        bc.create_block()

        # Adversary alters price_per_kwh
        bc.chain[1].transactions[1].price_per_kwh = 0.99

        report = detect_tampering(bc.chain)
        assert report.is_valid is False
        assert report.invalid_block_index == 1

    def test_tampered_transaction_buyer(self, sample_trades):
        bc = Blockchain()
        bc.add_transactions_batch(sample_trades)
        bc.create_block()

        # Adversary alters buyer ID to steal credit
        bc.chain[1].transactions[0].buyer_id = "HH-ATTACKER"

        assert bc.is_chain_valid() is False


class TestTamperedBlock:
    """Tests for detecting modifications to block headers or payloads."""

    def test_tampered_block_timestamp(self, sample_trades):
        bc = Blockchain()
        bc.add_transactions_batch(sample_trades)
        b1 = bc.create_block()

        # Adversary changes block timestamp without updating hash
        b1.timestamp = "1999-01-01T00:00:00Z"

        report = bc.get_validation_report()
        assert report.is_valid is False
        assert report.invalid_block_index == 1
        assert report.error_type == "BLOCK_HASH_MISMATCH"

    def test_tampered_block_hash(self, sample_trades):
        bc = Blockchain()
        bc.add_transactions_batch(sample_trades)
        b1 = bc.create_block()

        # Adversary injects a fake block hash
        b1.hash = sha256_hash("forged_hash_data")

        report = bc.get_validation_report()
        assert report.is_valid is False
        assert report.invalid_block_index == 1
        assert report.error_type == "BLOCK_HASH_MISMATCH"


class TestBrokenPreviousHash:
    """Tests for detecting broken cryptographic pointers between blocks."""

    def test_broken_previous_hash_linkage(self, sample_trades):
        bc = Blockchain()
        bc.add_transaction(sample_trades[0])
        bc.create_block()

        bc.add_transaction(sample_trades[1])
        b2 = bc.create_block()

        assert bc.is_chain_valid() is True

        # Adversary breaks the previous_hash link on Block 2
        b2.previous_hash = sha256_hash("fake_parent_hash")
        # Recomputing b2's hash to match its content still fails parent check!
        b2.hash = b2.calculate_hash()

        report = bc.get_validation_report()
        assert report.is_valid is False
        assert report.invalid_block_index == 2
        assert report.error_type == "PREVIOUS_HASH_MISMATCH"


class TestInvalidChain:
    """Tests for edge cases and structural chain invalidity."""

    def test_empty_chain(self):
        report = validate_chain([])
        assert report.is_valid is False
        assert report.error_type == "EMPTY_CHAIN"

    def test_corrupted_genesis_index(self):
        bc = Blockchain()
        bc.chain[0].index = 5
        bc.chain[0].hash = bc.chain[0].calculate_hash()

        report = bc.get_validation_report()
        assert report.is_valid is False
        assert report.error_type == "GENESIS_INVALID_INDEX"

    def test_broken_index_sequence(self, sample_trades):
        bc = Blockchain()
        bc.add_transaction(sample_trades[0])
        bc.create_block()

        bc.add_transaction(sample_trades[1])
        bc.create_block()

        # Change index of block 2 to 9
        bc.chain[2].index = 9
        bc.chain[2].hash = bc.chain[2].calculate_hash()

        report = bc.get_validation_report()
        assert report.is_valid is False
        assert report.error_type == "INDEX_SEQUENCE_BROKEN"


class TestTradeConversionAndSerialization:
    """Tests for model conversions and JSON persistence."""

    def test_trade_model_conversion(self):
        trade = Trade(
            trade_id="TRD-99999",
            seller_id="HH-010",
            buyer_id="HH-020",
            energy_kwh=10.5,
            price_per_kwh=0.16,
            total_value=1.68,
            timestamp="14:00",
        )
        tx = Transaction.from_trade(trade)
        assert tx.trade_id == "TRD-99999"
        assert tx.energy_kwh == 10.5
        assert tx.is_valid() is True
        assert tx.tx_hash is not None

    def test_json_export_and_import(self, sample_trades):
        bc = Blockchain()
        bc.add_transactions_batch(sample_trades)
        bc.create_block()

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            bc.export_to_json(tmp_path)
            loaded_bc = Blockchain.import_from_json(tmp_path)

            assert len(loaded_bc.chain) == 2
            assert loaded_bc.is_chain_valid() is True
            assert loaded_bc.get_total_transactions_count() == 3
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
