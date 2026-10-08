"""Pydantic Schemas for SecureTwinGrid Security, Replay Protection, and Attack Simulation."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SignedTransactionRequest(BaseModel):
    """Payload for submitting a signed transaction."""
    transaction_id: str = Field(..., description="Unique transaction ID")
    sender_id: str = Field(..., description="Prosumer sender household ID")
    recipient_id: str = Field(..., description="Consumer recipient household ID")
    energy_kwh: float = Field(..., gt=0, description="Energy volume in kWh")
    price_per_kwh: float = Field(..., ge=0, description="Clearing price per kWh")
    total_value: Optional[float] = Field(None, description="Total monetary turnover")
    timestamp: float = Field(..., description="Unix epoch timestamp in seconds")
    nonce: int = Field(..., ge=1, description="Monotonically increasing sequence number")
    public_key: str = Field(..., description="PEM-encoded ECC public key")
    signature: str = Field(..., description="Base64-encoded ECDSA signature")


class SecurityEventResponse(BaseModel):
    """Represents a logged security event or attack incident."""
    event_id: str = Field(..., description="Unique security event ID")
    timestamp: str = Field(..., description="ISO timestamp")
    event_type: str = Field(..., description="Event classification (e.g. REPLAY_ATTACK_DETECTED)")
    severity: str = Field(..., description="Severity level (INFO, LOW, MEDIUM, HIGH, CRITICAL)")
    transaction_id: Optional[str] = Field(None, description="Related transaction ID")
    sender_id: Optional[str] = Field(None, description="Sender / Actor ID")
    status: str = Field(..., description="Validation action status (ACCEPTED, BLOCKED, REJECTED)")
    reason: str = Field(..., description="Detailed diagnostic rationale")
    details: Dict[str, Any] = Field(default_factory=dict, description="Metadata and forensic evidence")


class ValidationOutcomeResponse(BaseModel):
    """Response returned when submitting a transaction for replay protection audit."""
    is_valid: bool = Field(..., description="Whether transaction was accepted")
    status_code: str = Field(..., description="Status code (ACCEPTED, DUPLICATE_TRANSACTION_ID, REUSED_NONCE, etc.)")
    message: str = Field(..., description="Detailed message")
    security_event: Optional[SecurityEventResponse] = Field(None, description="Associated security log record")
    details: Dict[str, Any] = Field(default_factory=dict, description="Diagnostic payload")


class ReplaySimulationStepResult(BaseModel):
    """Individual step result in a replay attack simulation."""
    step: int
    scenario: str
    description: str
    transaction: Dict[str, Any]
    expected_outcome: str
    actual_outcome: str
    is_valid: bool
    message: str
    protection_successful: bool


class ReplaySimulationReportResponse(BaseModel):
    """Comprehensive replay attack simulation report."""
    simulation_id: str = Field(..., description="Unique simulation run identifier")
    timestamp: str = Field(..., description="Execution ISO timestamp")
    target_sender_id: str = Field(..., description="Simulated prosumer ID")
    target_recipient_id: str = Field(..., description="Simulated consumer ID")
    total_attack_vectors_tested: int = Field(..., description="Number of test scenarios run")
    all_attacks_blocked: bool = Field(..., description="True if 100% of attack vectors were neutralized")
    results: List[ReplaySimulationStepResult] = Field(..., description="Step by step verification results")
    security_stats: Dict[str, Any] = Field(..., description="Updated security incident statistics")


class ReplayProtectionStatusResponse(BaseModel):
    """Operational status of the server-side replay protection engine."""
    total_processed_transactions: int
    active_senders_count: int
    sender_highest_nonces: Dict[str, int]
    max_timestamp_drift_seconds: float
    recent_processed_tx_ids: List[str]


class SecurityStatsResponse(BaseModel):
    """Aggregated security audit statistics."""
    total_events: int
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    replay_attacks_blocked: int
    reused_nonces_blocked: int
    expired_timestamps_blocked: int
    invalid_signatures_blocked: int
