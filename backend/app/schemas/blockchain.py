"""Pydantic Schemas for SecureTwinGrid Blockchain Endpoints."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TransactionResponse(BaseModel):
    """Represents a validated P2P trade transaction stored in a block."""
    trade_id: str = Field(..., description="Unique trade transaction identifier")
    community_id: str = Field("COMM-001", description="Local energy community ID")
    seller_id: str = Field(..., description="Seller household ID")
    buyer_id: str = Field(..., description="Buyer household ID")
    energy_kwh: float = Field(..., description="Volume of electricity traded in kWh")
    price_per_kwh: float = Field(..., description="Clearing price in $/kWh")
    total_value: float = Field(..., description="Total trade transaction value in $")
    timestamp: str = Field(..., description="Execution timestamp")
    tx_hash: Optional[str] = Field(None, description="Deterministic SHA-256 transaction hash")



class BlockResponse(BaseModel):
    """Represents a cryptographic block in the blockchain ledger."""
    index: int = Field(..., description="Block index in sequence (0 for Genesis)")
    timestamp: str = Field(..., description="Block creation timestamp")
    transactions: List[TransactionResponse] = Field(..., description="List of trade transactions in this block")
    previous_hash: str = Field(..., description="SHA-256 hash of previous block")
    nonce: int = Field(0, description="Proof-of-Authority deterministic nonce sequence")
    validator: str = Field(..., description="Proof-of-Authority trusted validator node identifier")
    hash: str = Field(..., description="SHA-256 cryptographic digest of this block")


class BlockListResponse(BaseModel):
    """Collection of all blocks on the blockchain ledger."""
    total_blocks: int = Field(..., description="Total number of blocks on the chain")
    total_transactions: int = Field(..., description="Total number of transactions across all blocks")
    blocks: List[BlockResponse] = Field(..., description="Sequential list of blocks")


class ValidationResultResponse(BaseModel):
    """Cryptographic audit result of the blockchain."""
    is_valid: bool = Field(..., description="Whether the entire blockchain passed all cryptographic checks")
    error_message: Optional[str] = Field(None, description="Diagnostic error description if invalid")
    invalid_block_index: Optional[int] = Field(None, description="Index of corrupted block if invalid")
    error_type: Optional[str] = Field(None, description="Structured error classification code")
    details: Dict[str, Any] = Field(default_factory=dict, description="Supplementary diagnostic metadata")


class BlockchainSummaryResponse(BaseModel):
    """High-level summary of blockchain ledger status."""
    chain_length: int = Field(..., description="Number of blocks on chain")
    total_transactions: int = Field(..., description="Total transactions committed")
    latest_block_index: int = Field(..., description="Index of latest block")
    latest_block_hash: str = Field(..., description="SHA-256 hash of latest block")
    latest_block_timestamp: str = Field(..., description="Timestamp of latest block")
    validator_id: str = Field(..., description="Proof-of-Authority validator identity")
    is_valid: bool = Field(..., description="Whether the blockchain passed verification")
    validation_report: ValidationResultResponse = Field(..., description="Structured cryptographic verification report")
