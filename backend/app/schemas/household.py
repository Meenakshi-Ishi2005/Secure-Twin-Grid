from typing import List, Optional
from pydantic import BaseModel, Field


class HouseholdResponse(BaseModel):
    """Represents a virtual prosumer or consumer household."""
    household_id: str = Field(..., description="Unique household identifier (e.g. HH-001)")
    community_id: str = Field("COMM-001", description="Community / microgrid identifier this household belongs to")
    has_solar: bool = Field(..., description="Whether rooftop solar PV is installed")

    solar_capacity_kw: float = Field(..., description="Solar nameplate capacity in kW")
    has_battery: bool = Field(..., description="Whether a home battery storage system is installed")
    battery_capacity_kwh: float = Field(..., description="Total battery capacity in kWh")
    battery_level_kwh: float = Field(..., description="Current battery stored energy in kWh")
    has_ev: bool = Field(..., description="Whether an electric vehicle is present")
    ev_battery_capacity_kwh: float = Field(..., description="EV battery capacity in kWh")
    ev_charge_level_kwh: float = Field(..., description="EV current charge level in kWh")
    base_consumption_kw: float = Field(..., description="Baseline electricity consumption in kW")
    current_generation_kw: float = Field(..., description="Instantaneous solar power output in kW")
    current_consumption_kw: float = Field(..., description="Instantaneous total power demand in kW")
    current_surplus_kwh: float = Field(..., description="Net surplus energy available to sell in current interval")
    current_deficit_kwh: float = Field(..., description="Net deficit energy required to buy in current interval")
    status: str = Field(..., description="Trading status: SELLING, BUYING, or BALANCED")


class HouseholdListResponse(BaseModel):
    """Collection of households and status metrics."""
    total_count: int = Field(..., description="Total number of households returned")
    sellers_count: int = Field(..., description="Number of households selling energy")
    buyers_count: int = Field(..., description="Number of households buying energy")
    balanced_count: int = Field(..., description="Number of balanced / self-sufficient households")
    households: List[HouseholdResponse] = Field(..., description="List of household models")
