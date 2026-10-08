from typing import List, Optional
from pydantic import BaseModel, Field


class GridStepSummaryResponse(BaseModel):
    """Energy and market metrics for a single 15-minute simulation interval."""
    step: int = Field(..., description="Simulation step index (0-95)")
    time: str = Field(..., description="Clock time in HH:MM")
    hour_of_day: float = Field(..., description="Fractional hour of the day (0.0 to 24.0)")
    total_generation_kw: float = Field(..., description="Instantaneous solar generation in kW")
    total_consumption_kw: float = Field(..., description="Instantaneous load demand in kW")
    total_generation_kwh: float = Field(..., description="Energy generated during the interval in kWh")
    total_consumption_kwh: float = Field(..., description="Energy consumed during the interval in kWh")
    total_surplus_kwh: float = Field(..., description="Total surplus energy offered in kWh")
    total_deficit_kwh: float = Field(..., description="Total deficit energy required in kWh")
    battery_storage_kwh: float = Field(..., description="Total battery energy stored in kWh")
    sellers_count: int = Field(..., description="Number of active seller households")
    buyers_count: int = Field(..., description="Number of active buyer households")
    balanced_count: int = Field(..., description="Number of self-balanced households")
    total_battery_capacity_kwh: float = Field(..., description="Total battery capacity in kWh")


class EnergyHistoryResponse(BaseModel):
    """Time-series array of completed microgrid simulation steps."""
    total_steps: int = Field(..., description="Total scheduled simulation steps")
    completed_steps: int = Field(..., description="Total completed intervals so far")
    history: List[GridStepSummaryResponse] = Field(..., description="Time-series interval summaries")


class EnergySummaryResponse(BaseModel):
    """Aggregated microgrid energy generation, demand, and storage metrics."""
    total_generation_kwh: float = Field(..., description="Cumulative solar generation produced across simulation (kWh)")
    total_consumption_kwh: float = Field(..., description="Cumulative power consumption demanded across simulation (kWh)")
    total_surplus_kwh: float = Field(..., description="Cumulative surplus energy offered for trading (kWh)")
    total_deficit_kwh: float = Field(..., description="Cumulative deficit energy required for buying (kWh)")
    peak_generation_kw: float = Field(..., description="Peak instantaneous solar generation observed (kW)")
    peak_demand_kw: float = Field(..., description="Peak instantaneous power demand observed (kW)")
    maximum_buyers: int = Field(..., description="Maximum number of simultaneous energy buyers observed in any interval")
    maximum_sellers: int = Field(..., description="Maximum number of simultaneous energy sellers observed in any interval")
    current_total_generation_kw: float = Field(..., description="Instantaneous total solar output across all homes (kW)")
    current_total_consumption_kw: float = Field(..., description="Instantaneous total load demand across all homes (kW)")
    total_battery_stored_kwh: float = Field(..., description="Total energy currently stored in all residential batteries (kWh)")
    total_battery_capacity_kwh: float = Field(..., description="Total residential battery capacity installed in the microgrid (kWh)")
    total_steps: int = Field(..., description="Total planned discrete intervals")
    completed_steps: int = Field(..., description="Number of discrete intervals completed so far")

