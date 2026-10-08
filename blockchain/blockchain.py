"""SecureTwinGrid Blockchain Ledger Engine.

Implements an immutable, append-only distributed ledger for storing and auditing
completed peer-to-peer electricity trades across smart microgrid households.

Architecture:
- Cryptographic Linkage: SHA-256 hashing across block headers and transaction records.
- Consensus / Block Sealing: Proof-of-Authority (PoA) trusted validator simulation
  (deterministic block creation without energy-wasteful Proof-of-Work mining).
- Tamper Evidence: Instant cryptographic failure detection if any historic trade,
  energy quantity, clearing price, or block pointer is altered.

NOTE: This blockchain is an educational and research prototype designed for MSc
thesis modeling, digital twin simulation, and tamper-resistance benchmarking.
It does NOT contain cryptocurrency mining, gas fees, or real financial tokens.
"""

import json
import os
import datetime
from typing import List, Dict, Any, Optional, Tuple

from blockchain.block import Block
from blockchain.transaction import Transaction
from blockchain.validation import validate_chain, ValidationResult


class Blockchain:
    """Manages the lifecycle, transaction pool, and cryptographic state of the ledger."""

    GENESIS_PREVIOUS_HASH: str = "0" * 64
    DEFAULT_VALIDATOR_ID: str = "poa-validator-primary"

    def __init__(self, validator_id: Optional[str] = None):
        self.validator_id: str = validator_id or self.DEFAULT_VALIDATOR_ID
        self.chain: List[Block] = []
        self.pending_transactions: List[Transaction] = []
        self.create_genesis_block()

    def create_genesis_block(self) -> Block:
        """Initialize the blockchain with a deterministic Genesis block (Index 0)."""
        self.chain.clear()
        self.pending_transactions.clear()

        genesis_block = Block(
            index=0,
            timestamp="2026-01-01T00:00:00Z",
            transactions=[],
            previous_hash=self.GENESIS_PREVIOUS_HASH,
            nonce=0,
            validator=self.validator_id,
        )
        self.chain.append(genesis_block)
        return genesis_block

    @property
    def latest_block(self) -> Block:
        """Retrieve the most recently committed block on the chain."""
        return self.chain[-1]

    def add_transaction(self, trade_or_tx: Any) -> Transaction:
        """Add a verified P2P trade transaction into the pending pool.
        
        Args:
            trade_or_tx: Transaction instance, Trade dataclass, or dictionary.
            
        Returns:
            Transaction: Formatted and hash-sealed transaction added to pool.
            
        Raises:
            ValueError: If transaction fields are malformed or invalid.
        """
        if isinstance(trade_or_tx, Transaction):
            tx = trade_or_tx
        elif hasattr(trade_or_tx, "to_dict") or isinstance(trade_or_tx, dict):
            tx = Transaction.from_trade(trade_or_tx)
        else:
            tx = Transaction.from_trade(trade_or_tx)

        if not tx.is_valid():
            raise ValueError(f"Invalid transaction payload: {tx.to_dict()}")

        self.pending_transactions.append(tx)
        return tx

    def add_transactions_batch(self, trades_list: List[Any]) -> List[Transaction]:
        """Batch append multiple P2P trades into the pending transaction pool."""
        added = []
        for t in trades_list:
            added.append(self.add_transaction(t))
        return added

    def create_block(
        self,
        validator: Optional[str] = None,
        timestamp: Optional[str] = None,
        max_transactions: Optional[int] = None,
    ) -> Block:
        """Seal pending transactions into a new cryptographic block and append to chain.
        
        Uses deterministic Proof-of-Authority (PoA) validator signature.
        
        Args:
            validator: Optional validator node identity override.
            timestamp: Optional timestamp string (defaults to UTC ISO format).
            max_transactions: Optional cap on transactions per block.
            
        Returns:
            Block: Newly sealed and committed block.
        """
        val_id = validator or self.validator_id
        time_str = timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat()

        if max_transactions is not None and max_transactions > 0:
            tx_to_commit = self.pending_transactions[:max_transactions]
            self.pending_transactions = self.pending_transactions[max_transactions:]
        else:
            tx_to_commit = list(self.pending_transactions)
            self.pending_transactions.clear()

        new_index = len(self.chain)
        prev_hash = self.latest_block.hash

        new_block = Block(
            index=new_index,
            timestamp=time_str,
            transactions=tx_to_commit,
            previous_hash=prev_hash,
            nonce=len(self.chain),
            validator=val_id,
        )

        self.chain.append(new_block)
        return new_block

    def is_chain_valid(self) -> bool:
        """Quick boolean verification of entire blockchain cryptographic integrity."""
        return validate_chain(self.chain).is_valid

    def get_validation_report(self) -> ValidationResult:
        """Run full diagnostic audit on the blockchain and return structured result."""
        return validate_chain(self.chain)

    def get_transaction_by_id(self, trade_id: str) -> Optional[Tuple[Transaction, int]]:
        """Search for a committed transaction by trade_id.
        
        Returns:
            Optional[Tuple[Transaction, int]]: Tuple of (Transaction, block_index) or None.
        """
        target = trade_id.strip().upper()
        for block in self.chain:
            for tx in block.transactions:
                if tx.trade_id.upper() == target:
                    return tx, block.index
        return None

    def get_transactions_for_household(self, household_id: str) -> List[Tuple[Transaction, int]]:
        """Find all committed trade transactions involving a specific household (as seller or buyer).
        
        Returns:
            List[Tuple[Transaction, int]]: List of (Transaction, block_index).
        """
        target = household_id.strip().upper()
        results = []
        for block in self.chain:
            for tx in block.transactions:
                if tx.seller_id.upper() == target or tx.buyer_id.upper() == target:
                    results.append((tx, block.index))
        return results

    def get_total_transactions_count(self) -> int:
        """Count total committed transactions across all blocks in the chain."""
        return sum(len(b.transactions) for b in self.chain)

    def to_list(self) -> List[Dict[str, Any]]:
        """Export the entire blockchain to a serializable list of dictionaries."""
        return [b.to_dict() for b in self.chain]

    @classmethod
    def from_list(cls, data: List[Dict[str, Any]], validator_id: Optional[str] = None) -> "Blockchain":
        """Reconstruct a Blockchain instance from serialized block data."""
        instance = cls(validator_id=validator_id)
        instance.chain.clear()
        for b_data in data:
            block = Block.from_dict(b_data)
            instance.chain.append(block)
        return instance

    def export_to_json(self, filepath: str) -> str:
        """Persist the blockchain ledger to a JSON file."""
        abs_path = os.path.abspath(filepath)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            json.dump(self.to_list(), f, indent=2)
        return abs_path

    @classmethod
    def import_from_json(cls, filepath: str) -> "Blockchain":
        """Load blockchain ledger from a JSON file and verify integrity."""
        abs_path = os.path.abspath(filepath)
        with open(abs_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        instance = cls.from_list(data)
        audit = instance.get_validation_report()
        if not audit.is_valid:
            raise ValueError(f"Imported blockchain failed cryptographic audit: {audit.error_message}")
        return instance
