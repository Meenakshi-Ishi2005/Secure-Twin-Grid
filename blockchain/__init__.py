"""SecureTwinGrid Modular Educational Blockchain.

A lightweight, research-oriented distributed ledger prototype for logging,
verifying, and auditing peer-to-peer electricity trades in smart microgrids.

Core components:
- `Transaction`: Verified P2P trade record model.
- `Block`: SHA-256 sealed container cryptographically linked to predecessor.
- `Blockchain`: Ledger coordinator managing Genesis block, PoA block creation, and storage.
- `ValidationResult`, `validate_chain`, `detect_tampering`: Tamper-evidence engine.
- `sha256_hash`, `calculate_block_hash`, `calculate_transaction_hash`: Hashing utilities.

NOTE: This is an educational and research prototype. It does NOT implement
cryptocurrency mining, gas fees, or real monetary tokens.
"""

from blockchain.hash_utils import (
    sha256_hash,
    hash_dict,
    calculate_transaction_hash,
    calculate_block_hash,
)
from blockchain.transaction import Transaction
from blockchain.block import Block
from blockchain.validation import (
    ValidationResult,
    validate_chain,
    validate_genesis_block,
    validate_block_transactions,
    detect_tampering,
)
from blockchain.blockchain import Blockchain

__all__ = [
    "Blockchain",
    "Block",
    "Transaction",
    "ValidationResult",
    "validate_chain",
    "validate_genesis_block",
    "validate_block_transactions",
    "detect_tampering",
    "sha256_hash",
    "hash_dict",
    "calculate_transaction_hash",
    "calculate_block_hash",
]
