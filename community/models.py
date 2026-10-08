"""Local Energy Community Data Model for SecureTwinGrid.

Defines the simulated geographical/logical boundary for virtual households,
P2P energy trading, and community blockchain ledger.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, Optional


@dataclass
class Community:
    """Represents a simulated Local Energy Community / Microgrid.
    
    Attributes:
        community_id: Unique identifier for the energy community (e.g. "COMM-001").
        community_name: Descriptive name of the community (e.g. "Green Valley Community").
        description: Functional description of the local microgrid.
        location_name: Geographical/logical location label (e.g. "Simulated Local Microgrid").
        household_capacity: Maximum allowed virtual households in this microgrid boundary.
        current_household_count: Number of active virtual households currently provisioned.
        solar_penetration_percent: Percentage of households with rooftop solar PV installed.
        battery_penetration_percent: Percentage of households with battery storage (BESS).
        ev_penetration_percent: Percentage of households with electric vehicles.
        status: Operational status ("ACTIVE", "PAUSED", "MAINTENANCE").
        created_at: ISO 8601 creation timestamp.
    """
    community_id: str = "COMM-001"
    community_name: str = "Green Valley Community"
    description: str = "Simulated residential prosumer microgrid with rooftop solar and battery storage"
    location_name: str = "Simulated Local Microgrid"
    household_capacity: int = 500
    current_household_count: int = 100
    solar_penetration_percent: float = 50.0
    battery_penetration_percent: float = 35.0
    ev_penetration_percent: float = 20.0
    status: str = "ACTIVE"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert community entity to dictionary representation."""
        return {
            "community_id": self.community_id,
            "community_name": self.community_name,
            "description": self.description,
            "location_name": self.location_name,
            "household_capacity": self.household_capacity,
            "current_household_count": self.current_household_count,
            "solar_penetration_percent": round(self.solar_penetration_percent, 1),
            "battery_penetration_percent": round(self.battery_penetration_percent, 1),
            "ev_penetration_percent": round(self.ev_penetration_percent, 1),
            "status": self.status,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Community":
        """Reconstruct community entity from dictionary."""
        return cls(
            community_id=str(data.get("community_id", "COMM-001")),
            community_name=str(data.get("community_name", "Green Valley Community")),
            description=str(data.get("description", "Simulated residential prosumer microgrid")),
            location_name=str(data.get("location_name", "Simulated Local Microgrid")),
            household_capacity=int(data.get("household_capacity", 500)),
            current_household_count=int(data.get("current_household_count", 100)),
            solar_penetration_percent=float(data.get("solar_penetration_percent", 50.0)),
            battery_penetration_percent=float(data.get("battery_penetration_percent", 35.0)),
            ev_penetration_percent=float(data.get("ev_penetration_percent", 20.0)),
            status=str(data.get("status", "ACTIVE")),
            created_at=str(data.get("created_at", datetime.now(timezone.utc).isoformat())),
        )
