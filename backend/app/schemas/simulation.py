from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class SimulationStartRequest(BaseModel):
    """Parameters to start or advance the digital twin simulation."""
    steps: Optional[int] = Field(
        None,
        description="Number of 15-minute intervals to advance (defaults to full remaining duration)",
        ge=1,
        le=500
    )
    run_trading: bool = Field(
        True,
        description="Whether to automatically clear P2P electricity trades on each simulated interval"
    )
    num_households: Optional[int] = Field(
        None,
        description="Re-initialize with a specific number of households if resetting",
        ge=2,
        le=1000
    )
    random_seed: Optional[int] = Field(
        None,
        description="Deterministic seed for reproducibility"
    )


class SimulationStatusResponse(BaseModel):
    """Current state of the simulation engine."""
    status: str = Field(..., description="Simulation status: INITIALIZED, RUNNING, STOPPED, or COMPLETED")
    current_step: int = Field(..., description="Current discrete time-step index (0-indexed)")
    total_steps: int = Field(..., description="Total planned time-steps in simulation duration")
    current_time: str = Field(..., description="Clock time in HH:MM format (e.g. 12:15)")
    hour_of_day: float = Field(..., description="Current fractional hour of the day (0.0 to 24.0)")
    num_households: int = Field(..., description="Number of virtual households in the microgrid")
    interval_minutes: int = Field(..., description="Time interval between simulation steps in minutes")
    duration_hours: float = Field(..., description="Total simulation duration in hours")
    total_trades_count: int = Field(..., description="Cumulative number of executed P2P trades")
    is_running: bool = Field(..., description="Flag indicating if simulation execution is active")


class SimulationActionResponse(BaseModel):
    """Generic action confirmation response."""
    message: str = Field(..., description="Human-readable result message")
    status: str = Field(..., description="Updated simulation status")
    current_step: int = Field(..., description="Time step after action")
    current_time: str = Field(..., description="Clock time after action")
    details: Optional[Dict[str, Any]] = Field(None, description="Optional extra execution details")
