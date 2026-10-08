from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class Household:
    """Represents a virtual prosumer or consumer household in the microgrid digital twin.
    
    Fields strictly fulfill the required specification:
    - household_id: Unique identifier for the household
    - has_solar: Whether solar PV generation is installed
    - solar_capacity_kw: Nameplate solar peak generation capacity in kW
    - has_battery: Whether a stationary battery storage system (BESS) is installed
    - battery_capacity_kwh: Total energy capacity of the home battery in kWh
    - battery_level_kwh: Current energy stored in the home battery in kWh
    - has_ev: Whether an electric vehicle is present at the household
    - ev_battery_capacity_kwh: Total battery capacity of the EV in kWh
    - ev_charge_level_kwh: Current energy stored in the EV battery in kWh
    - base_consumption_kw: Baseline nominal power consumption in kW
    - current_generation_kw: Instantaneous solar power generation in kW
    - current_consumption_kw: Instantaneous power demand in kW
    - current_surplus_kwh: Net excess energy available for trading in the current interval (kWh)
    - current_deficit_kwh: Net deficit energy required to buy in the current interval (kWh)
    - status: Trading classification ("SELLING", "BUYING", or "BALANCED")
    """
    household_id: str
    community_id: str = "COMM-001"
    has_solar: bool = False
    solar_capacity_kw: float = 0.0
    has_battery: bool = False
    battery_capacity_kwh: float = 0.0
    battery_level_kwh: float = 0.0
    has_ev: bool = False
    ev_battery_capacity_kwh: float = 0.0
    ev_charge_level_kwh: float = 0.0
    base_consumption_kw: float = 1.0
    current_generation_kw: float = 0.0
    current_consumption_kw: float = 0.0
    current_surplus_kwh: float = 0.0
    current_deficit_kwh: float = 0.0
    status: str = "BALANCED"
    selling_enabled: bool = True
    buying_enabled: bool = True

    def charge_battery(self, energy_kwh: float) -> float:
        """Charge the stationary battery with available surplus energy.
        
        Args:
            energy_kwh: Surplus energy offered to charge the battery.
            
        Returns:
            float: Energy (kWh) successfully absorbed into the battery.
        """
        if not self.has_battery or self.battery_capacity_kwh <= 0:
            return 0.0
        available_space = max(0.0, self.battery_capacity_kwh - self.battery_level_kwh)
        energy_charged = min(energy_kwh, available_space)
        self.battery_level_kwh += energy_charged
        return energy_charged

    def discharge_battery(self, energy_needed_kwh: float) -> float:
        """Discharge the stationary battery to cover a household energy deficit.
        
        Args:
            energy_needed_kwh: Energy needed to satisfy the deficit.
            
        Returns:
            float: Energy (kWh) supplied from the battery.
        """
        if not self.has_battery or self.battery_level_kwh <= 0:
            return 0.0
        energy_discharged = min(energy_needed_kwh, self.battery_level_kwh)
        self.battery_level_kwh -= energy_discharged
        return energy_discharged

    def charge_ev(self, energy_kwh: float) -> float:
        """Charge the EV battery with available energy.
        
        Args:
            energy_kwh: Energy offered for charging.
            
        Returns:
            float: Energy (kWh) successfully absorbed by the EV battery.
        """
        if not self.has_ev or self.ev_battery_capacity_kwh <= 0:
            return 0.0
        available_space = max(0.0, self.ev_battery_capacity_kwh - self.ev_charge_level_kwh)
        energy_charged = min(energy_kwh, available_space)
        self.ev_charge_level_kwh += energy_charged
        return energy_charged

    def to_dict(self) -> Dict[str, Any]:
        """Convert household state to a dictionary representation."""
        return {
            "household_id": self.household_id,
            "community_id": self.community_id,
            "has_solar": self.has_solar,
            "solar_capacity_kw": round(self.solar_capacity_kw, 2),
            "has_battery": self.has_battery,
            "battery_capacity_kwh": round(self.battery_capacity_kwh, 2),
            "battery_level_kwh": round(self.battery_level_kwh, 2),
            "has_ev": self.has_ev,
            "ev_battery_capacity_kwh": round(self.ev_battery_capacity_kwh, 2),
            "ev_charge_level_kwh": round(self.ev_charge_level_kwh, 2),
            "base_consumption_kw": round(self.base_consumption_kw, 2),
            "current_generation_kw": round(self.current_generation_kw, 3),
            "current_consumption_kw": round(self.current_consumption_kw, 3),
            "current_surplus_kwh": round(self.current_surplus_kwh, 3),
            "current_deficit_kwh": round(self.current_deficit_kwh, 3),
            "status": self.status,
            "selling_enabled": getattr(self, "selling_enabled", True),
            "buying_enabled": getattr(self, "buying_enabled", True),
        }



@dataclass
class GridStepSummary:
    """Aggregated metrics across all households for a single time step."""
    step: int
    time_str: str
    hour_of_day: float
    total_generation_kw: float
    total_consumption_kw: float
    total_generation_kwh: float
    total_consumption_kwh: float
    total_surplus_kwh: float
    total_deficit_kwh: float
    sellers_count: int
    buyers_count: int
    balanced_count: int
    total_battery_stored_kwh: float
    total_battery_capacity_kwh: float = 0.0

    @property
    def battery_storage_kwh(self) -> float:
        """Alias for total battery energy stored (kWh)."""
        return self.total_battery_stored_kwh

    @property
    def number_of_sellers(self) -> int:
        return self.sellers_count

    @property
    def number_of_buyers(self) -> int:
        return self.buyers_count

    @property
    def number_of_balanced(self) -> int:
        return self.balanced_count

    def to_dict(self) -> Dict[str, Any]:
        """Convert step summary to dictionary representation."""
        return {
            "step": self.step,
            "time": self.time_str,
            "hour_of_day": round(self.hour_of_day, 2),
            "total_generation_kw": round(self.total_generation_kw, 2),
            "total_consumption_kw": round(self.total_consumption_kw, 2),
            "total_generation_kwh": round(self.total_generation_kwh, 2),
            "total_consumption_kwh": round(self.total_consumption_kwh, 2),
            "total_surplus_kwh": round(self.total_surplus_kwh, 2),
            "total_deficit_kwh": round(self.total_deficit_kwh, 2),
            "battery_storage_kwh": round(self.battery_storage_kwh, 2),
            "sellers_count": self.sellers_count,
            "buyers_count": self.buyers_count,
            "balanced_count": self.balanced_count,
            "total_battery_capacity_kwh": round(self.total_battery_capacity_kwh, 2),
        }


@dataclass
class SimulationSummary:
    """Aggregated end-of-run metrics for the entire multi-interval simulation."""
    total_generation_kwh: float
    total_consumption_kwh: float
    total_surplus_kwh: float
    total_deficit_kwh: float
    peak_generation_kw: float
    peak_demand_kw: float
    max_buyers: int
    max_sellers: int
    num_households: int = 100
    total_steps: int = 96
    duration_hours: float = 24.0

    def format_report(self) -> str:
        """Generate structured text report as required by SecureTwinGrid specification."""
        lines = [
            f"Total Generation: {self.total_generation_kwh:.2f} kWh",
            f"Total Consumption: {self.total_consumption_kwh:.2f} kWh",
            f"Total Surplus: {self.total_surplus_kwh:.2f} kWh",
            f"Total Deficit: {self.total_deficit_kwh:.2f} kWh",
            f"Peak Generation: {self.peak_generation_kw:.2f} kW",
            f"Peak Demand: {self.peak_demand_kw:.2f} kW",
            f"Maximum Buyers: {self.max_buyers}",
            f"Maximum Sellers: {self.max_sellers}",
        ]
        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Convert simulation summary to dictionary representation."""
        return {
            "total_generation_kwh": round(self.total_generation_kwh, 2),
            "total_consumption_kwh": round(self.total_consumption_kwh, 2),
            "total_surplus_kwh": round(self.total_surplus_kwh, 2),
            "total_deficit_kwh": round(self.total_deficit_kwh, 2),
            "peak_generation_kw": round(self.peak_generation_kw, 2),
            "peak_demand_kw": round(self.peak_demand_kw, 2),
            "max_buyers": self.max_buyers,
            "max_sellers": self.max_sellers,
            "num_households": self.num_households,
            "total_steps": self.total_steps,
            "duration_hours": round(self.duration_hours, 2),
        }

