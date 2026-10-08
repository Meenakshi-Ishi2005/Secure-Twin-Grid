"""Chain Validation and Tamper Detection Engine for SecureTwinGrid.

Implements cryptographic integrity checks, previous-hash linkage verification,
genesis block validation, and granular diagnostic reporting for adversarial
or accidental ledger modifications.

NOTE: This is a research prototype for microgrid simulation and tamper-evidence
demonstration, not a production cryptocurrency blockchain.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from blockchain.block import Block


@dataclass
class ValidationResult:
    """Detailed cryptographic audit report for the blockchain."""
    is_valid: bool
    error_message: Optional[str] = None
    invalid_block_index: Optional[int] = None
    error_type: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "error_message": self.error_message,
            "invalid_block_index": self.invalid_block_index,
            "error_type": self.error_type,
            "details": self.details,
        }


def validate_genesis_block(genesis: Block) -> ValidationResult:
    """Validate that the first block satisfies Genesis properties."""
    if genesis.index != 0:
        return ValidationResult(
            is_valid=False,
            error_message=f"Genesis block must have index 0, found index {genesis.index}.",
            invalid_block_index=genesis.index,
            error_type="GENESIS_INVALID_INDEX",
        )

    # Recompute and verify Genesis hash
    recomputed_hash = genesis.calculate_hash()
    if genesis.hash != recomputed_hash:
        return ValidationResult(
            is_valid=False,
            error_message=(
                f"Genesis block hash mismatch. Expected '{recomputed_hash}', "
                f"stored '{genesis.hash}'."
            ),
            invalid_block_index=0,
            error_type="GENESIS_HASH_MISMATCH",
            details={"expected_hash": recomputed_hash, "stored_hash": genesis.hash},
        )

    return ValidationResult(is_valid=True)


def validate_block_transactions(block: Block) -> ValidationResult:
    """Validate all transactions recorded within a block."""
    for idx, tx in enumerate(block.transactions):
        computed_tx_hash = tx.calculate_hash()
        if tx.tx_hash and tx.tx_hash != computed_tx_hash:
            return ValidationResult(
                is_valid=False,
                error_message=(
                    f"Block #{block.index} transaction #{idx} ({tx.trade_id}) hash corrupted. "
                    f"Expected '{computed_tx_hash}', stored '{tx.tx_hash}'."
                ),
                invalid_block_index=block.index,
                error_type="TRANSACTION_TAMPERED",
                details={
                    "trade_id": tx.trade_id,
                    "tx_index": idx,
                    "expected_hash": computed_tx_hash,
                    "stored_hash": tx.tx_hash,
                },
            )

        if not tx.is_valid():
            return ValidationResult(
                is_valid=False,
                error_message=(
                    f"Block #{block.index} transaction #{idx} ({tx.trade_id}) contains invalid payload data."
                ),
                invalid_block_index=block.index,
                error_type="TRANSACTION_INVALID_PAYLOAD",
                details={"trade_id": tx.trade_id, "tx_index": idx},
            )

    return ValidationResult(is_valid=True)


def validate_chain(chain: List[Block]) -> ValidationResult:
    """Perform a complete cryptographic integrity audit on the entire blockchain.
    
    Verifies:
    1. Chain is non-empty.
    2. Genesis block validity.
    3. Sequential block indexing (0, 1, 2, ...).
    4. Previous hash linkage (block[i].previous_hash == block[i-1].hash).
    5. SHA-256 block hash integrity (block[i].hash == calculate_hash(block[i])).
    6. Transaction payload and hash validity.
    
    Returns:
        ValidationResult: Detailed audit outcome.
    """
    if not chain:
        return ValidationResult(
            is_valid=False,
            error_message="Blockchain is empty (no Genesis block found).",
            invalid_block_index=None,
            error_type="EMPTY_CHAIN",
        )

    # 1. Validate Genesis block
    genesis_res = validate_genesis_block(chain[0])
    if not genesis_res.is_valid:
        return genesis_res

    # Validate transactions in Genesis
    genesis_tx_res = validate_block_transactions(chain[0])
    if not genesis_tx_res.is_valid:
        return genesis_tx_res

    # 2. Iterate through subsequent blocks
    for i in range(1, len(chain)):
        current_block = chain[i]
        prev_block = chain[i - 1]

        # Check index continuity
        if current_block.index != i:
            return ValidationResult(
                is_valid=False,
                error_message=(
                    f"Block index sequence broken at position {i}. Expected index {i}, "
                    f"found {current_block.index}."
                ),
                invalid_block_index=current_block.index,
                error_type="INDEX_SEQUENCE_BROKEN",
                details={"expected_index": i, "found_index": current_block.index},
            )

        # Check previous hash linkage
        if current_block.previous_hash != prev_block.hash:
            return ValidationResult(
                is_valid=False,
                error_message=(
                    f"Block #{current_block.index} previous_hash link broken. Expected parent hash "
                    f"'{prev_block.hash}', but block points to '{current_block.previous_hash}'."
                ),
                invalid_block_index=current_block.index,
                error_type="PREVIOUS_HASH_MISMATCH",
                details={
                    "block_index": current_block.index,
                    "expected_previous_hash": prev_block.hash,
                    "stored_previous_hash": current_block.previous_hash,
                },
            )

        # Check transaction internal validity
        tx_res = validate_block_transactions(current_block)
        if not tx_res.is_valid:
            return tx_res

        # Check block hash integrity
        recomputed_hash = current_block.calculate_hash()
        if current_block.hash != recomputed_hash:
            return ValidationResult(
                is_valid=False,
                error_message=(
                    f"Block #{current_block.index} content has been tampered with. "
                    f"Expected SHA-256 '{recomputed_hash}', stored hash is '{current_block.hash}'."
                ),
                invalid_block_index=current_block.index,
                error_type="BLOCK_HASH_MISMATCH",
                details={
                    "block_index": current_block.index,
                    "expected_hash": recomputed_hash,
                    "stored_hash": current_block.hash,
                },
            )

    return ValidationResult(
        is_valid=True,
        error_message=None,
        invalid_block_index=None,
        error_type=None,
        details={"total_blocks": len(chain), "total_transactions": sum(len(b.transactions) for b in chain)},
    )


def detect_tampering(chain: List[Block]) -> ValidationResult:
    """Helper alias function to run chain validation and report any tampering."""
    return validate_chain(chain)
