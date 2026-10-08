"""Blockchain Block Model for SecureTwinGrid.

Represents an immutable ledger block storing a batch of verified P2P electricity trades,
cryptographically linked to its ancestor block via SHA-256 hashing.

NOTE: This is a research prototype for microgrid simulation and tamper-evidence
demonstration, not a production cryptocurrency blockchain.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import datetime

from blockchain.transaction import Transaction
from blockchain.hash_utils import calculate_block_hash


@dataclass
class Block:
    """Represents a discrete cryptographic block in the SecureTwinGrid ledger.
    
    Fields strictly fulfill the user specification:
    - index: Sequential integer position (0 = Genesis block)
    - timestamp: Human-readable or ISO timestamp of block sealing
    - transactions: List of validated peer-to-peer electricity trade records
    - previous_hash: 64-char SHA-256 hash of the parent block (or "0"*64 for Genesis)
    - nonce: Nonce counter / Proof-of-Authority deterministic sequence
    - hash: SHA-256 cryptographic digest covering all block contents
    """
    index: int
    timestamp: str
    transactions: List[Transaction]
    previous_hash: str
    nonce: int = 0
    validator: str = "poa-validator-primary"
    hash: Optional[str] = field(default=None)

    def __post_init__(self):
        if not self.hash:
            self.hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        """Compute the deterministic SHA-256 hash of this block's contents."""
        tx_data = [t.to_dict(include_hash=True) for t in self.transactions]
        return calculate_block_hash(
            index=self.index,
            timestamp=self.timestamp,
            transactions_data=tx_data,
            previous_hash=self.previous_hash,
            nonce=self.nonce,
            validator=self.validator,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize block to a canonical dictionary representation."""
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": [t.to_dict(include_hash=True) for t in self.transactions],
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
            "validator": self.validator,
            "hash": self.hash or self.calculate_hash(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Block":
        """Reconstruct a Block instance from a serialized dictionary."""
        tx_list = [
            Transaction.from_dict(t) if isinstance(t, dict) else t
            for t in data.get("transactions", [])
        ]
        return cls(
            index=int(data["index"]),
            timestamp=str(data["timestamp"]),
            transactions=tx_list,
            previous_hash=str(data["previous_hash"]),
            nonce=int(data.get("nonce", 0)),
            validator=str(data.get("validator", "poa-validator-primary")),
            hash=data.get("hash"),
        )

    def is_valid(self) -> bool:
        """Verify that the block's stored hash matches its recomputed content hash."""
        recomputed = self.calculate_hash()
        if self.hash != recomputed:
            return False
        # Verify all child transactions
        for tx in self.transactions:
            if not tx.is_valid():
                return False
        return True
