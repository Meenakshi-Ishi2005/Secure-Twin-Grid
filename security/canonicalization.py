"""Deterministic Canonicalization Engine for SecureTwinGrid Transactions.

Provides RFC 8785 / Canonical JSON style deterministic byte serialization for
peer-to-peer energy transactions, seller authorizations, and buyer trade acceptances.

Guarantees that identical transaction states always generate bit-for-bit identical
hashes and signature inputs, regardless of dictionary key order or platform differences.
"""

import json
from typing import Dict, Any, Union
from decimal import Decimal


def canonicalize_number(value: Union[int, float, Decimal, str], precision: int = 6) -> float:
    """Format numerical quantities to deterministic float precision."""
    try:
        return round(float(value), precision)
    except (ValueError, TypeError):
        return 0.0


def extract_trade_fields(trade: Any) -> Dict[str, Any]:
    """Extract standard trade fields from Trade dataclass, model, or dictionary.
    
    Required minimum fields per specification:
    - trade_id
    - seller_id
    - buyer_id
    - energy_kwh
    - price_per_kwh
    - total_value
    - timestamp
    """
    if hasattr(trade, "to_dict") and callable(trade.to_dict):
        d = trade.to_dict()
    elif isinstance(trade, dict):
        d = trade
    else:
        d = {
            "trade_id": getattr(trade, "trade_id", ""),
            "seller_id": getattr(trade, "seller_id", ""),
            "buyer_id": getattr(trade, "buyer_id", ""),
            "energy_kwh": getattr(trade, "energy_kwh", 0.0),
            "price_per_kwh": getattr(trade, "price_per_kwh", 0.0),
            "total_value": getattr(trade, "total_value", 0.0),
            "timestamp": getattr(trade, "timestamp", ""),
        }

    energy = canonicalize_number(d.get("energy_kwh", 0.0))
    price = canonicalize_number(d.get("price_per_kwh", 0.0))
    total = canonicalize_number(d.get("total_value", energy * price))

    return {
        "trade_id": str(d.get("trade_id", "")).strip(),
        "seller_id": str(d.get("seller_id", "")).strip(),
        "buyer_id": str(d.get("buyer_id", "")).strip(),
        "energy_kwh": energy,
        "price_per_kwh": price,
        "total_value": total,
        "timestamp": str(d.get("timestamp", "")).strip(),
    }


def canonicalize_transaction(
    trade: Any,
    role: str = "trade",
) -> Dict[str, Any]:
    """Create a deterministic canonical dictionary representation of a transaction.
    
    Args:
        trade: Trade object, dataclass, or dictionary.
        role: "trade" (full trade), "seller" (seller authorization), or "buyer" (buyer acceptance).
        
    Returns:
        Dict[str, Any]: Clean dictionary strictly omitting signature fields.
    """
    fields = extract_trade_fields(trade)

    if role == "seller":
        # Seller-side transaction scope
        return {
            "action": "SELL_ENERGY_AUTHORIZATION",
            "buyer_id": fields["buyer_id"],
            "energy_kwh": fields["energy_kwh"],
            "price_per_kwh": fields["price_per_kwh"],
            "seller_id": fields["seller_id"],
            "timestamp": fields["timestamp"],
            "total_value": fields["total_value"],
            "trade_id": fields["trade_id"],
        }
    elif role == "buyer":
        # Buyer-side trade acceptance scope
        return {
            "action": "BUY_ENERGY_ACCEPTANCE",
            "buyer_id": fields["buyer_id"],
            "energy_kwh": fields["energy_kwh"],
            "price_per_kwh": fields["price_per_kwh"],
            "seller_id": fields["seller_id"],
            "timestamp": fields["timestamp"],
            "total_value": fields["total_value"],
            "trade_id": fields["trade_id"],
        }
    else:
        # Full mutual trade scope
        return {
            "buyer_id": fields["buyer_id"],
            "energy_kwh": fields["energy_kwh"],
            "price_per_kwh": fields["price_per_kwh"],
            "seller_id": fields["seller_id"],
            "timestamp": fields["timestamp"],
            "total_value": fields["total_value"],
            "trade_id": fields["trade_id"],
        }


def canonicalize_to_json(
    trade: Any,
    role: str = "trade",
) -> str:
    """Serialize canonical transaction into deterministic UTF-8 JSON string.
    
    Enforces sorted keys and compact separators without whitespace.
    """
    canonical_dict = canonicalize_transaction(trade, role=role)
    return json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))


def canonicalize_to_bytes(
    trade: Any,
    role: str = "trade",
) -> bytes:
    """Serialize canonical transaction to deterministic UTF-8 bytes for hashing/signing."""
    return canonicalize_to_json(trade, role=role).encode("utf-8")
