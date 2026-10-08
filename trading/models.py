import uuid
from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class EnergyOffer:
    """Represents a prosumer seller's offer to sell excess energy within a local community.
    
    Fields strictly fulfill the user specification:
    - seller_id: Identifier of the prosumer household
    - energy_amount_kwh: Offered surplus energy in kWh
    - asking_price_per_kwh: Minimum acceptable price ($/kWh)
    - timestamp: Simulation timestamp (e.g. "12:15" or ISO string)
    - community_id: Local energy community boundary identifier (e.g. "COMM-001")
    """
    seller_id: str
    energy_amount_kwh: float
    asking_price_per_kwh: float
    timestamp: str
    community_id: str = "COMM-001"
    offer_id: str = field(default_factory=lambda: f"OFF-{uuid.uuid4().hex[:8].upper()}")
    remaining_energy_kwh: float = field(init=False)
    status: str = "OPEN"  # OPEN, PARTIALLY_FILLED, FILLED, CANCELLED

    def __post_init__(self):
        self.remaining_energy_kwh = float(self.energy_amount_kwh)

    @property
    def is_filled(self) -> bool:
        return self.remaining_energy_kwh <= 1e-6

    def fill(self, amount_kwh: float) -> float:
        """Fill part or all of the remaining offer energy.
        
        Returns:
            float: Actually filled energy amount.
        """
        fill_amount = min(amount_kwh, self.remaining_energy_kwh)
        self.remaining_energy_kwh -= fill_amount
        if self.is_filled:
            self.status = "FILLED"
        else:
            self.status = "PARTIALLY_FILLED"
        return fill_amount

    def to_dict(self) -> Dict[str, Any]:
        return {
            "offer_id": self.offer_id,
            "community_id": self.community_id,
            "seller_id": self.seller_id,
            "energy_amount_kwh": round(self.energy_amount_kwh, 4),
            "remaining_energy_kwh": round(self.remaining_energy_kwh, 4),
            "asking_price_per_kwh": round(self.asking_price_per_kwh, 4),
            "timestamp": self.timestamp,
            "status": self.status,
        }


@dataclass
class EnergyBid:
    """Represents a consumer buyer's bid to purchase energy deficit within a local community.
    
    Fields strictly fulfill the user specification:
    - buyer_id: Identifier of the consumer household
    - energy_amount_kwh: Energy deficit requested in kWh
    - maximum_price_per_kwh: Maximum acceptable price ($/kWh)
    - timestamp: Simulation timestamp (e.g. "12:15" or ISO string)
    - community_id: Local energy community boundary identifier (e.g. "COMM-001")
    """
    buyer_id: str
    energy_amount_kwh: float
    maximum_price_per_kwh: float
    timestamp: str
    community_id: str = "COMM-001"
    bid_id: str = field(default_factory=lambda: f"BID-{uuid.uuid4().hex[:8].upper()}")
    remaining_energy_kwh: float = field(init=False)
    status: str = "OPEN"  # OPEN, PARTIALLY_FILLED, FILLED, CANCELLED

    def __post_init__(self):
        self.remaining_energy_kwh = float(self.energy_amount_kwh)

    @property
    def is_filled(self) -> bool:
        return self.remaining_energy_kwh <= 1e-6

    def fill(self, amount_kwh: float) -> float:
        """Fill part or all of the remaining bid energy.
        
        Returns:
            float: Actually filled energy amount.
        """
        fill_amount = min(amount_kwh, self.remaining_energy_kwh)
        self.remaining_energy_kwh -= fill_amount
        if self.is_filled:
            self.status = "FILLED"
        else:
            self.status = "PARTIALLY_FILLED"
        return fill_amount

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bid_id": self.bid_id,
            "community_id": self.community_id,
            "buyer_id": self.buyer_id,
            "energy_amount_kwh": round(self.energy_amount_kwh, 4),
            "remaining_energy_kwh": round(self.remaining_energy_kwh, 4),
            "maximum_price_per_kwh": round(self.maximum_price_per_kwh, 4),
            "timestamp": self.timestamp,
            "status": self.status,
        }


@dataclass
class Trade:
    """Represents a successfully executed peer-to-peer electricity trade within a community.
    
    Fields strictly fulfill the user specification:
    - trade_id: Unique identifier for the trade transaction
    - seller_id: ID of the selling household
    - buyer_id: ID of the buying household
    - energy_kwh: Volume of electricity traded in kWh
    - price_per_kwh: Clearing price ($/kWh)
    - total_value: Total transaction cost ($) = energy_kwh * price_per_kwh
    - timestamp: Simulation timestamp of execution
    - community_id: Local community boundary identifier (e.g. "COMM-001")
    - status: Execution state ("COMPLETED")
    """
    trade_id: str
    seller_id: str
    buyer_id: str
    energy_kwh: float
    price_per_kwh: float
    total_value: float
    timestamp: str
    community_id: str = "COMM-001"
    status: str = "COMPLETED"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trade_id": self.trade_id,
            "community_id": self.community_id,
            "seller_id": self.seller_id,
            "buyer_id": self.buyer_id,
            "energy_kwh": round(self.energy_kwh, 4),
            "price_per_kwh": round(self.price_per_kwh, 4),
            "total_value": round(self.total_value, 4),
            "timestamp": self.timestamp,
            "status": self.status,
        }
