"""Blockchain Transaction Model for SecureTwinGrid.

Represents an immutable record of an executed peer-to-peer electricity trade
committed to the SecureTwinGrid community distributed ledger.

NOTE: This is a research prototype for microgrid simulation and tamper-evidence
demonstration, not a production cryptocurrency token or financial ledger.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from blockchain.hash_utils import calculate_transaction_hash


@dataclass
class Transaction:
    """Represents a validated P2P electricity trade recorded on the community blockchain.
    
    Fields strictly fulfill the user specification:
    - trade_id: Unique identifier for the trade transaction (e.g. TRD-00001)
    - seller_id: Prosumer household seller ID (e.g. HH-014)
    - buyer_id: Consumer household buyer ID (e.g. HH-088)
    - energy_kwh: Volume of electricity traded in kWh
    - price_per_kwh: Clearing price ($/kWh)
    - total_value: Total transaction turnover ($)
    - timestamp: Execution timestamp (e.g. "12:15" or ISO string)
    - community_id: Local energy community boundary identifier (e.g. "COMM-001")
    """
    trade_id: str
    seller_id: str
    buyer_id: str
    energy_kwh: float
    price_per_kwh: float
    total_value: float
    timestamp: str
    community_id: str = "COMM-001"
    tx_hash: Optional[str] = field(default=None)

    def __post_init__(self):
        self.energy_kwh = float(self.energy_kwh)
        self.price_per_kwh = float(self.price_per_kwh)
        self.total_value = float(self.total_value)
        if not self.tx_hash:
            self.tx_hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        """Compute the deterministic SHA-256 hash for this transaction."""
        return calculate_transaction_hash(self.to_dict(include_hash=False))

    def to_dict(self, include_hash: bool = True) -> Dict[str, Any]:
        """Serialize transaction to a canonical dictionary."""
        d = {
            "community_id": self.community_id,
            "trade_id": self.trade_id,
            "seller_id": self.seller_id,
            "buyer_id": self.buyer_id,
            "energy_kwh": round(self.energy_kwh, 6),
            "price_per_kwh": round(self.price_per_kwh, 6),
            "total_value": round(self.total_value, 6),
            "timestamp": str(self.timestamp),
        }
        if include_hash and self.tx_hash:
            d["tx_hash"] = self.tx_hash
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Transaction":
        """Reconstruct a Transaction instance from a dictionary."""
        return cls(
            trade_id=str(data["trade_id"]),
            seller_id=str(data["seller_id"]),
            buyer_id=str(data["buyer_id"]),
            energy_kwh=float(data["energy_kwh"]),
            price_per_kwh=float(data["price_per_kwh"]),
            total_value=float(data["total_value"]),
            timestamp=str(data["timestamp"]),
            community_id=str(data.get("community_id", "COMM-001")),
            tx_hash=data.get("tx_hash"),
        )

    @classmethod
    def from_trade(cls, trade: Any) -> "Transaction":
        """Convert a trading module Trade model or dict into a blockchain Transaction."""
        if hasattr(trade, "to_dict"):
            data = trade.to_dict()
        elif isinstance(trade, dict):
            data = trade
        else:
            data = {
                "trade_id": getattr(trade, "trade_id", ""),
                "seller_id": getattr(trade, "seller_id", ""),
                "buyer_id": getattr(trade, "buyer_id", ""),
                "energy_kwh": getattr(trade, "energy_kwh", 0.0),
                "price_per_kwh": getattr(trade, "price_per_kwh", 0.0),
                "total_value": getattr(trade, "total_value", 0.0),
                "timestamp": getattr(trade, "timestamp", ""),
                "community_id": getattr(trade, "community_id", "COMM-001"),
            }

        return cls(
            trade_id=str(data["trade_id"]),
            seller_id=str(data["seller_id"]),
            buyer_id=str(data["buyer_id"]),
            energy_kwh=float(data["energy_kwh"]),
            price_per_kwh=float(data["price_per_kwh"]),
            total_value=float(data["total_value"]),
            timestamp=str(data["timestamp"]),
            community_id=str(data.get("community_id", "COMM-001")),
        )

    def is_valid(self) -> bool:
        """Verify internal consistency and integrity of transaction fields."""
        if not self.trade_id or not self.seller_id or not self.buyer_id:
            return False
        if not self.community_id:
            return False
        if self.energy_kwh <= 0:
            return False
        if self.price_per_kwh < 0 or self.total_value < 0:
            return False
        # Verify hash match
        computed = self.calculate_hash()
        if self.tx_hash and self.tx_hash != computed:
            return False
        return True
