"""Pydantic Schemas for Local Energy Community Endpoints."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.household import HouseholdResponse
from app.schemas.trading import TradeResponse


class CommunityResponse(BaseModel):
    """Represents a simulated Local Energy Community."""
    community_id: str = Field(..., description="Unique community identifier (e.g. COMM-001)")
    community_name: str = Field(..., description="Descriptive community name (e.g. Green Valley Community)")
    description: str = Field(..., description="Functional description of the community microgrid")
    location_name: str = Field(..., description="Geographical / logical network label (e.g. Simulated Local Microgrid)")
    household_capacity: int = Field(..., description="Maximum household capacity limit in this community")
    current_household_count: int = Field(..., description="Number of currently active virtual households")
    solar_penetration_percent: float = Field(..., description="Percentage of households with solar PV")
    battery_penetration_percent: float = Field(..., description="Percentage of households with BESS batteries")
    ev_penetration_percent: float = Field(..., description="Percentage of households with electric vehicles")
    status: str = Field("ACTIVE", description="Community operational state")
    created_at: str = Field(..., description="ISO creation timestamp")


class CommunityTradingMetrics(BaseModel):
    """Trading metrics within the community boundary."""
    active_buyers: int
    active_sellers: int
    balanced_households: int
    completed_trades: int
    total_volume_kwh: float
    total_turnover_value: float


class CommunityBlockchainMetrics(BaseModel):
    """Ledger metrics for the community blockchain."""
    total_blocks: int
    total_transactions: int
    latest_block_hash: str
    is_valid: bool


class CommunitySummaryResponse(BaseModel):
    """Consolidated community overview, energy flow, trading, and blockchain status."""
    community: CommunityResponse
    current_time: str
    current_step: int
    total_steps: int
    energy_metrics: Dict[str, Any]
    trading_metrics: CommunityTradingMetrics
    blockchain_metrics: CommunityBlockchainMetrics


class CommunityEnergySummaryResponse(BaseModel):
    """Energy generation and consumption summary scoped to the community."""
    community_id: str
    community_name: str
    location_name: str
    household_count: int
    energy_summary: Dict[str, Any]
