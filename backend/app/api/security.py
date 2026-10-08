"""FastAPI Router for SecureTwinGrid Security, Replay Protection, and Attack Simulation."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status, Depends

from security.models import SignedTransaction
from security.replay_protection import get_replay_protection_engine
from security.event_logger import get_security_event_logger
from attacks.replay_attack import ReplayAttackSimulator
from app.schemas.security import (
    SignedTransactionRequest,
    ValidationOutcomeResponse,
    SecurityEventResponse,
    SecurityStatsResponse,
    ReplaySimulationReportResponse,
    ReplayProtectionStatusResponse,
)

router = APIRouter(prefix="/security", tags=["Security & Replay Protection"])


@router.post(
    "/validate-transaction",
    response_model=ValidationOutcomeResponse,
    summary="Validate Signed Transaction with Replay Defense",
    description="Audits signed energy transactions against duplicate IDs, reused nonces, expired timestamps, and cryptographic signature mismatch.",
)
def validate_signed_transaction(
    request: SignedTransactionRequest,
) -> ValidationOutcomeResponse:
    engine = get_replay_protection_engine()
    tx = SignedTransaction(
        transaction_id=request.transaction_id,
        sender_id=request.sender_id,
        recipient_id=request.recipient_id,
        energy_kwh=request.energy_kwh,
        price_per_kwh=request.price_per_kwh,
        total_value=request.total_value or round(request.energy_kwh * request.price_per_kwh, 4),
        timestamp=request.timestamp,
        nonce=request.nonce,
        public_key=request.public_key,
        signature=request.signature,
    )
    outcome = engine.validate_transaction(tx)
    return ValidationOutcomeResponse(
        is_valid=outcome.is_valid,
        status_code=outcome.status_code,
        message=outcome.message,
        security_event=SecurityEventResponse(**outcome.security_event.to_dict()) if outcome.security_event else None,
        details=outcome.details,
    )


@router.get(
    "/events",
    response_model=List[SecurityEventResponse],
    summary="Get Security Audit Event Log",
    description="Retrieve chronological security event log entries, including blocked replay attacks, duplicate nonces, and validated trades.",
)
def get_security_events(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    sender_id: Optional[str] = Query(None, description="Filter by sender / actor ID"),
    status: Optional[str] = Query(None, description="Filter by status (ACCEPTED, BLOCKED, REJECTED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (INFO, LOW, MEDIUM, HIGH, CRITICAL)"),
) -> List[SecurityEventResponse]:
    logger = get_security_event_logger()
    events = logger.get_events(
        limit=limit,
        offset=offset,
        event_type=event_type,
        sender_id=sender_id,
        status=status,
        severity=severity,
    )
    return [SecurityEventResponse(**e.to_dict()) for e in events]


@router.get(
    "/stats",
    response_model=SecurityStatsResponse,
    summary="Get Security Incident Statistics",
    description="Aggregated count of blocked attacks, reused nonces, expired timestamps, and total security events.",
)
def get_security_stats() -> SecurityStatsResponse:
    logger = get_security_event_logger()
    stats = logger.get_stats()
    return SecurityStatsResponse(**stats)


from app.api.deps import get_current_admin, get_current_approved_user
from app.models.user import User


@router.post(
    "/simulate-replay-attack",
    response_model=ReplaySimulationReportResponse,
    summary="Run Replay Attack Simulation",
    description="Executes a live multi-vector replay attack simulation capturing valid signed energy trades and proving strict rejection.",
)
def simulate_replay_attack(
    sender_id: str = Query("HH-014-PROSUMER", description="Simulated prosumer ID"),
    recipient_id: str = Query("HH-088-CONSUMER", description="Simulated consumer ID"),
    energy_kwh: float = Query(8.25, gt=0, description="Energy volume in kWh"),
    price_per_kwh: float = Query(0.15, gt=0, description="Clearing price $/kWh"),
) -> ReplaySimulationReportResponse:
    simulator = ReplayAttackSimulator()
    report = simulator.run_simulation(
        sender_id=sender_id,
        recipient_id=recipient_id,
        energy_kwh=energy_kwh,
        price_per_kwh=price_per_kwh,
    )
    return ReplaySimulationReportResponse(**report)


@router.get(
    "/replay-protection/status",
    response_model=ReplayProtectionStatusResponse,
    summary="Get Replay Protection Engine Status",
    description="Retrieve server-side state including total processed transaction IDs, active sender nonces, and timestamp drift settings.",
)
def get_replay_protection_status() -> ReplayProtectionStatusResponse:
    engine = get_replay_protection_engine()
    state = engine.get_status()
    return ReplayProtectionStatusResponse(**state)


@router.post(
    "/reset",
    summary="Reset Security State and Event Logs",
    description="Clears server-side processed transaction IDs, sender nonces, and event audit logs.",
)
def reset_security_state():
    engine = get_replay_protection_engine()
    engine.reset()
    logger = get_security_event_logger()
    logger.clear()
    return {"message": "Security state and event logs reset successfully."}
