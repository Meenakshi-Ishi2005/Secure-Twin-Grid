"""Cryptographic Hashing Utilities for SecureTwinGrid Blockchain.

Provides deterministic SHA-256 serialization and hash generation for
transactions, blocks, and verification routines.

NOTE: This is a research and educational prototype designed for microgrid
simulation demonstration and tamper-evidence analysis, not a production
cryptocurrency blockchain.
"""

import hashlib
import json
from typing import Any, Dict, List


def sha256_hash(data: str | bytes) -> str:
    """Compute the SHA-256 hexadecimal hash string for input data.
    
    Args:
        data: String or bytes data to hash.
        
    Returns:
        str: 64-character lowercase hexadecimal SHA-256 digest.
    """
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def hash_dict(d: Dict[str, Any]) -> str:
    """Compute a deterministic SHA-256 hash of a dictionary.
    
    Uses canonical JSON serialization with sorted keys and no unnecessary whitespace.
    
    Args:
        d: Dictionary to hash.
        
    Returns:
        str: 64-character hexadecimal hash.
    """
    canonical_json = json.dumps(d, sort_keys=True, separators=(",", ":"))
    return sha256_hash(canonical_json)


def calculate_transaction_hash(tx_dict: Dict[str, Any]) -> str:
    """Compute deterministic hash for a trade transaction dictionary.
    
    Excludes any volatile computed hash field if present.
    """
    clean_dict = {
        "community_id": str(tx_dict.get("community_id", "COMM-001")),
        "trade_id": str(tx_dict.get("trade_id", "")),
        "seller_id": str(tx_dict.get("seller_id", "")),
        "buyer_id": str(tx_dict.get("buyer_id", "")),
        "energy_kwh": round(float(tx_dict.get("energy_kwh", 0.0)), 6),
        "price_per_kwh": round(float(tx_dict.get("price_per_kwh", 0.0)), 6),
        "total_value": round(float(tx_dict.get("total_value", 0.0)), 6),
        "timestamp": str(tx_dict.get("timestamp", "")),
    }
    return hash_dict(clean_dict)



def calculate_block_hash(
    index: int,
    timestamp: str,
    transactions_data: List[Dict[str, Any]],
    previous_hash: str,
    nonce: int = 0,
    validator: str = "validator-node-01"
) -> str:
    """Compute deterministic SHA-256 block hash.
    
    Args:
        index: Block index in the blockchain.
        timestamp: Time when block was formed.
        transactions_data: Canonical list of serialized transaction dictionaries.
        previous_hash: SHA-256 hash of the immediate preceding block.
        nonce: Deterministic counter or PoA sequence number.
        validator: Proof-of-Authority validator identifier.
        
    Returns:
        str: 64-character SHA-256 hexadecimal block digest.
    """
    block_payload = {
        "index": index,
        "timestamp": str(timestamp),
        "transactions": transactions_data,
        "previous_hash": str(previous_hash),
        "nonce": nonce,
        "validator": str(validator),
    }
    return hash_dict(block_payload)
