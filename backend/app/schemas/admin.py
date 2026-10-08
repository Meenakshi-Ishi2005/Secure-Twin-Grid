"""Pydantic Schemas for Admin & Operator Endpoints."""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse


class SystemOverviewSchema(BaseModel):
    community_name: str
    community_id: str
    network_type: str
    total_households: int
    household_capacity: int
    active_users_count: int
    suspended_users_count: int


class EnergyOverviewSchema(BaseModel):
    current_generation_kwh: float
    current_consumption_kwh: float
    current_surplus_kwh: float
    current_deficit_kwh: float
    solar_producers: int
    battery_homes: int
    ev_homes: int
    battery_stored_kwh: float
    ev_charging_kwh: float


class TradingOverviewSchema(BaseModel):
    active_buyers: int
    active_sellers: int
    completed_trades: int
    total_energy_traded_kwh: float
    average_trading_price_usd: float
    total_turnover_value_usd: float


class BlockchainOverviewSchema(BaseModel):
    total_blocks: int
    total_transactions: int
    latest_block_index: int
    latest_block_hash: str
    blockchain_status: str
    last_validation_time: Optional[str] = None


class SecurityOverviewSchema(BaseModel):
    attacks_detected: int
    attacks_blocked: int
    replay_attempts: int
    false_data_injection_attempts: int
    sybil_attempts: int
    active_security_alerts: int


class SystemStatusSchema(BaseModel):
    simulation_status: str
    simulation_time: str
    current_step: int
    total_steps: int
    number_of_households: int
    api_status: str
    database_status: str
    blockchain_status: str


class AdminDashboardResponse(BaseModel):
    """Consolidated Admin Dashboard Payload."""
    system_overview: SystemOverviewSchema
    energy_overview: EnergyOverviewSchema
    trading_overview: TradingOverviewSchema
    blockchain: BlockchainOverviewSchema
    security: SecurityOverviewSchema
    system: SystemStatusSchema


class AdminUserListResponse(BaseModel):
    """List of all registered platform users for administration."""
    total_users: int
    active_users: int
    pending_users: int = 0
    suspended_users: int
    rejected_users: int = 0
    users: List[UserResponse]


class AdminCommunityConfigUpdateRequest(BaseModel):
    """Payload to update parameters for future simulation runs."""
    num_households: Optional[int] = Field(None, ge=5, le=500, description="Virtual households count")
    solar_penetration: Optional[float] = Field(None, ge=0.0, le=1.0, description="Solar PV adoption ratio (0.0 - 1.0)")
    battery_penetration: Optional[float] = Field(None, ge=0.0, le=1.0, description="BESS storage adoption ratio")
    ev_penetration: Optional[float] = Field(None, ge=0.0, le=1.0, description="EV charging adoption ratio")
    interval_minutes: Optional[int] = Field(None, ge=1, le=60, description="Step interval in minutes")
    duration_hours: Optional[int] = Field(None, ge=1, le=168, description="Simulation cycle duration in hours")


class AdminCommunityResponse(BaseModel):
    """Community profile and configured future run parameters."""
    community_id: str
    community_name: str
    network_type: str
    household_capacity: int
    current_household_count: int
    status: str
    configuration: Dict[str, Any]


class PrivacyCategorySchema(BaseModel):
    category: str
    description: str
    owner: str
    buyer: str
    seller: str
    platform: str
    blockchain_observer: str
    admin: str
    privacy_level: str


class AdminPrivacyResponse(BaseModel):
    """Privacy baseline matrix and data access policy."""
    title: str
    description: str
    categories: List[PrivacyCategorySchema]
    privacy_guarantees: List[str]


class AdminAnalyticsResponse(BaseModel):
    """Aggregated microgrid engineering and market analytics."""
    community_name: str
    total_households: int
    solar_producers_count: int
    battery_storage_count: int
    ev_households_count: int
    self_consumption_rate_pct: float
    community_self_sufficiency_pct: float
    total_energy_generated_kwh: float
    total_energy_consumed_kwh: float
    total_energy_traded_kwh: float
    total_trading_turnover_usd: float
    average_clearing_price_usd: float
    peak_demand_shaved_kw: float
    blockchain_blocks_count: int
    blockchain_transactions_count: int
    blockchain_integrity_status: str


class AuditLogItemSchema(BaseModel):
    log_id: str
    admin_id: str
    admin_username: str
    action: str
    target: str
    timestamp: str
    result: str
    metadata: Dict[str, Any]


class AuditLogListResponse(BaseModel):
    total_count: int
    logs: List[AuditLogItemSchema]


class AttackSimulationRequest(BaseModel):
    attack_type: str = Field("REPLAY", description="Attack type: 'REPLAY', 'FDI', or 'SYBIL'")
    target_id: Optional[str] = Field(None, description="Target household or community ID")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom attack simulation params")
