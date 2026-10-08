from typing import List, Optional
from pydantic import BaseModel, Field


class TradeResponse(BaseModel):
    """Represents a completed peer-to-peer electricity trade transaction."""
    trade_id: str = Field(..., description="Unique trade transaction identifier (e.g. TRD-00001)")
    community_id: str = Field("COMM-001", description="Community ID where this trade executed")
    seller_id: str = Field(..., description="Prosumer seller household ID")
    buyer_id: str = Field(..., description="Consumer buyer household ID")
    energy_kwh: float = Field(..., description="Volume of energy traded in kWh")
    price_per_kwh: float = Field(..., description="Clearing price per kWh ($/kWh)")
    total_value: float = Field(..., description="Total trade transaction value ($)")
    timestamp: str = Field(..., description="Time interval of trade execution (e.g. 12:30)")
    status: str = Field(default="COMPLETED", description="Trade settlement status")



class TradeListResponse(BaseModel):
    """Collection of executed trades and market totals."""
    total_count: int = Field(..., description="Total number of trades returned")
    total_volume_kwh: float = Field(..., description="Total energy volume across returned trades (kWh)")
    total_value: float = Field(..., description="Total financial turnover across returned trades ($)")
    trades: List[TradeResponse] = Field(..., description="List of individual trade records")


class TradingRunRequest(BaseModel):
    """Parameters to trigger a trading round on current interval balances."""
    default_seller_ask: Optional[float] = Field(
        default=0.10,
        ge=0.01,
        le=1.00,
        description="Benchmark seller asking price in $/kWh (defaults to $0.10)"
    )
    default_buyer_bid: Optional[float] = Field(
        default=0.18,
        ge=0.01,
        le=1.00,
        description="Benchmark buyer maximum bid in $/kWh (defaults to $0.18)"
    )
    price_noise: Optional[bool] = Field(
        default=False,
        description="Whether to apply stochastic price variation across participants"
    )


class TradingRunResponse(BaseModel):
    """Results from executing a trading auction."""
    message: str = Field(..., description="Execution status message")
    trades_executed: int = Field(..., description="Number of new trades generated in this round")
    volume_kwh: float = Field(..., description="Total energy volume cleared in kWh")
    total_value: float = Field(..., description="Total transaction value cleared in $")
    average_price_per_kwh: float = Field(..., description="Weighted average transaction price in $/kWh")
    trades: List[TradeResponse] = Field(..., description="List of trades cleared in this round")
