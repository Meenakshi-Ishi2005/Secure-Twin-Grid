"""FastAPI Router for Admin & Operator Endpoints.

All endpoints in this router are protected by RBAC requiring the ADMIN role.
Administrative operations are appended to the immutable Audit Log.
The Admin manages the software platform and digital twin simulation,
and does NOT control physical electricity or manipulate historical blockchain ledgers.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.api.deps import get_current_admin
from app.services.simulation_service import SimulationService, get_simulation_service
from app.services.audit_service import AuditService, get_audit_service
from security.event_logger import get_security_event_logger
from attacks.replay_attack import ReplayAttackSimulator
from attacks.fdi_attack import FalseDataInjectionSimulator
from attacks.sybil_attack import SybilAttackSimulator

from app.schemas.user import UserResponse, UserStatusUpdateRequest
from app.schemas.admin import (
    AdminDashboardResponse,
    AdminUserListResponse,
    AdminCommunityConfigUpdateRequest,
    AdminCommunityResponse,
    AdminPrivacyResponse,
    AdminAnalyticsResponse,
    AuditLogListResponse,
    AuditLogItemSchema,
    AttackSimulationRequest,
)
from app.schemas.trading import TradeListResponse, TradeResponse
from app.schemas.blockchain import BlockchainSummaryResponse, ValidationResultResponse
from app.schemas.household import HouseholdListResponse, HouseholdResponse
from app.schemas.security import SecurityStatsResponse, SecurityEventResponse

router = APIRouter(prefix="/admin", tags=["Admin / Operator Platform Management"])


@router.get(
    "/dashboard",
    response_model=AdminDashboardResponse,
    summary="Get Consolidated Admin Dashboard Overview",
    description="Returns high-level system, energy, trading, blockchain, and security overview for platform administrators.",
)
def get_admin_dashboard(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    overview = sim_service.get_admin_dashboard_overview()

    # Dynamic user count stats from DB
    try:
        total_u = db.query(User).count()
        active_u = db.query(User).filter(User.status == UserStatus.ACTIVE.value).count()
        suspended_u = db.query(User).filter(User.status == UserStatus.SUSPENDED.value).count()
        if total_u > 0:
            overview["system_overview"]["active_users_count"] = active_u
            overview["system_overview"]["suspended_users_count"] = suspended_u
    except Exception:
        pass

    # Dynamic security stats
    sec_logger = get_security_event_logger()
    sec_stats = sec_logger.get_stats()
    overview["security"] = {
        "attacks_detected": sec_stats["by_status"].get("BLOCKED", 0) + sec_stats["by_status"].get("REJECTED", 0),
        "attacks_blocked": sec_stats["by_status"].get("BLOCKED", 0),
        "replay_attempts": sec_stats.get("replay_attacks_blocked", 0),
        "false_data_injection_attempts": sec_stats["by_type"].get("FALSE_DATA_INJECTION_DETECTED", 0),
        "sybil_attempts": sec_stats["by_type"].get("SYBIL_ATTACK_DETECTED", 0),
        "active_security_alerts": sum(
            1 for e in sec_logger.events if e.severity in ["HIGH", "CRITICAL"] and e.status != "ACCEPTED"
        ),
    }

    return AdminDashboardResponse(**overview)


from datetime import datetime, timezone
from app.models.user import User, UserRole, UserStatus, ApprovalStatus
from app.schemas.user import UserResponse, UserStatusUpdateRequest, UserApprovalRequest


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List Registered Users for User Management",
    description="Admin can view user accounts, roles, communities, public keys, and suspension/approval status.",
)
def get_admin_users(
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, PENDING, SUSPENDED, REJECTED)"),
    approval_status: Optional[str] = Query(None, description="Filter by approval status"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    query = db.query(User)
    if status:
        query = query.filter(User.status == status.upper().strip())
    if approval_status:
        query = query.filter(User.approval_status == approval_status.upper().strip())
    
    users = query.order_by(User.id.asc()).all()
    all_users = db.query(User).all()
    
    active_cnt = sum(1 for u in all_users if getattr(u, "status", "ACTIVE") == "ACTIVE")
    pending_cnt = sum(1 for u in all_users if getattr(u, "status", "ACTIVE") == "PENDING" or getattr(u, "approval_status", "APPROVED") == "PENDING")
    suspended_cnt = sum(1 for u in all_users if getattr(u, "status", "ACTIVE") == "SUSPENDED")
    rejected_cnt = sum(1 for u in all_users if getattr(u, "status", "ACTIVE") == "REJECTED" or getattr(u, "approval_status", "APPROVED") == "REJECTED")

    return AdminUserListResponse(
        total_users=len(all_users),
        active_users=active_cnt,
        pending_users=pending_cnt,
        suspended_users=suspended_cnt,
        rejected_users=rejected_cnt,
        users=[UserResponse.model_validate(u) for u in users],
    )


@router.get(
    "/pending-registrations",
    response_model=List[UserResponse],
    summary="Get Pending Community User Registrations",
    description="Lists all user accounts awaiting administrator review and approval.",
)
def get_pending_registrations(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> List[UserResponse]:
    pending_users = (
        db.query(User)
        .filter(
            (User.status == UserStatus.PENDING.value)
            | (User.approval_status == ApprovalStatus.PENDING.value)
        )
        .order_by(User.created_at.desc())
        .all()
    )
    return [UserResponse.model_validate(u) for u in pending_users]


@router.post(
    "/users/{user_id}/approve",
    response_model=UserResponse,
    summary="Approve Community Registration",
    description="Administrator approves a pending user, granting them active community membership.",
)
def approve_user_registration(
    user_id: int,
    request: Optional[UserApprovalRequest] = None,
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} does not exist.",
        )

    prev_status = user.status
    prev_approval = getattr(user, "approval_status", "PENDING")

    user.status = UserStatus.ACTIVE.value
    user.approval_status = ApprovalStatus.APPROVED.value
    user.approved_at = datetime.now(timezone.utc)
    user.approved_by = current_admin.username
    db.commit()
    db.refresh(user)

    audit_service.record(
        action="USER_APPROVE",
        target=f"User:{user.username} (ID:{user.id})",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="SUCCESS",
        metadata={
            "previous_status": prev_status,
            "previous_approval": prev_approval,
            "new_status": user.status,
            "new_approval": user.approval_status,
            "community": user.community,
            "unit": user.unit,
            "reason": request.reason if request else "Administrator community admission approval",
        },
        db=db,
    )

    return UserResponse.model_validate(user)


@router.post(
    "/users/{user_id}/reject",
    response_model=UserResponse,
    summary="Reject Community Registration",
    description="Administrator rejects a pending user registration application.",
)
def reject_user_registration(
    user_id: int,
    request: Optional[UserApprovalRequest] = None,
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} does not exist.",
        )

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot reject their own administrative account.",
        )

    prev_status = user.status
    prev_approval = getattr(user, "approval_status", "PENDING")

    user.status = UserStatus.REJECTED.value
    user.approval_status = ApprovalStatus.REJECTED.value
    db.commit()
    db.refresh(user)

    audit_service.record(
        action="USER_REJECT",
        target=f"User:{user.username} (ID:{user.id})",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="SUCCESS",
        metadata={
            "previous_status": prev_status,
            "previous_approval": prev_approval,
            "new_status": user.status,
            "new_approval": user.approval_status,
            "community": user.community,
            "unit": user.unit,
            "reason": request.reason if request else "Administrator rejection",
        },
        db=db,
    )

    return UserResponse.model_validate(user)


@router.post(
    "/users/{user_id}/status",
    response_model=UserResponse,
    summary="Suspend or Reactivate a Simulated User",
    description="Admin can suspend, reactivate, or update status of simulated users. Audited append-only.",
)
def update_user_status(
    user_id: int,
    request: UserStatusUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} does not exist.",
        )

    # Protect against self-suspension of active admin
    if user.id == current_admin.id and request.status.upper() == UserStatus.SUSPENDED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot suspend their own active administrative account.",
        )

    new_status = request.status.upper().strip()
    valid_statuses = [
        UserStatus.ACTIVE.value,
        UserStatus.SUSPENDED.value,
        UserStatus.REJECTED.value,
        UserStatus.PENDING.value,
    ]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{request.status}'. Allowed values: {valid_statuses}.",
        )

    prev_status = user.status
    user.status = new_status
    if new_status == UserStatus.ACTIVE.value:
        user.approval_status = ApprovalStatus.APPROVED.value
        if not user.approved_at:
            user.approved_at = datetime.now(timezone.utc)
            user.approved_by = current_admin.username
    elif new_status == UserStatus.REJECTED.value:
        user.approval_status = ApprovalStatus.REJECTED.value
    elif new_status == UserStatus.PENDING.value:
        user.approval_status = ApprovalStatus.PENDING.value

    db.commit()
    db.refresh(user)

    # Append to immutable audit log
    action_name = (
        "USER_SUSPEND" if new_status == UserStatus.SUSPENDED.value
        else "USER_REACTIVATE" if new_status == UserStatus.ACTIVE.value
        else f"USER_STATUS_{new_status}"
    )
    audit_service.record(
        action=action_name,
        target=f"User:{user.username} (ID:{user.id})",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="SUCCESS",
        metadata={
            "previous_status": prev_status,
            "new_status": new_status,
            "reason": request.reason or "Administrative action",
        },
        db=db,
    )

    return UserResponse.model_validate(user)


@router.get(
    "/community",
    response_model=AdminCommunityResponse,
    summary="Get Community Management Profile & Config",
    description="Retrieve community settings, capacity, and future simulation parameters.",
)
def get_admin_community(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> AdminCommunityResponse:
    comm_info = sim_service.get_community_info()
    future_cfg = sim_service.get_future_config()

    return AdminCommunityResponse(
        community_id=comm_info.get("community_id", "COMM-001-GREENVALLEY"),
        community_name=comm_info.get("community_name", "Green Valley Community"),
        network_type=comm_info.get("network_type", "Virtual Microgrid"),
        household_capacity=comm_info.get("household_capacity", 500),
        current_household_count=comm_info.get("current_household_count", 100),
        status=comm_info.get("status", "ACTIVE"),
        configuration=future_cfg,
    )


@router.post(
    "/community/config",
    response_model=AdminCommunityResponse,
    summary="Update Simulation Configuration for Future Runs",
    description="Configures parameters for future simulation runs without rewriting historical simulation/trading data.",
)
def update_admin_community_config(
    request: AdminCommunityConfigUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> AdminCommunityResponse:
    config_dict = request.model_dump(exclude_unset=True)
    updated_cfg = sim_service.update_future_config(config_dict)

    # Record action in audit log
    audit_service.record(
        action="SIMULATION_CONFIG_CHANGE",
        target="Local Energy Community Future Configuration",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="SUCCESS",
        metadata=config_dict,
        db=db,
    )

    comm_info = sim_service.get_community_info()
    return AdminCommunityResponse(
        community_id=comm_info.get("community_id", "COMM-001-GREENVALLEY"),
        community_name=comm_info.get("community_name", "Green Valley Community"),
        network_type=comm_info.get("network_type", "Virtual Microgrid"),
        household_capacity=comm_info.get("household_capacity", 500),
        current_household_count=comm_info.get("current_household_count", 100),
        status=comm_info.get("status", "ACTIVE"),
        configuration=updated_cfg,
    )


@router.get(
    "/energy",
    summary="Admin Energy Monitoring",
    description="Retrieve generation, consumption, surplus, deficit, battery storage, and EV load for monitoring.",
)
def get_admin_energy(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    energy_summary = sim_service.get_energy_summary()
    history = sim_service.get_energy_history()
    overview = sim_service.get_admin_dashboard_overview()["energy_overview"]

    return {
        "energy_overview": overview,
        "current_interval_summary": energy_summary,
        "history": history,
    }


@router.get(
    "/trades",
    response_model=TradeListResponse,
    summary="Admin Trading Monitoring",
    description="Inspect all P2P trades executed on the platform. Read-only.",
)
def get_admin_trades(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    seller_id: Optional[str] = Query(None),
    buyer_id: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> TradeListResponse:
    trades, total_count, total_vol, total_val = sim_service.get_trades(
        limit=limit,
        offset=offset,
        seller_id=seller_id,
        buyer_id=buyer_id,
    )
    return TradeListResponse(
        total_count=total_count,
        total_volume_kwh=total_vol,
        total_value=total_val,
        trades=[TradeResponse(**t.to_dict()) for t in trades],
    )


@router.get(
    "/blockchain",
    summary="Admin Blockchain Ledger Monitoring",
    description="View blockchain blocks, transactions, and validator status. Admin cannot modify or delete blocks.",
)
def get_admin_blockchain(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    summary = sim_service.get_blockchain_summary()
    blocks = sim_service.get_blockchain_blocks()
    return {
        "summary": summary,
        "blocks": blocks,
    }


@router.post(
    "/blockchain/validate",
    response_model=ValidationResultResponse,
    summary="Trigger Blockchain Cryptographic Audit",
    description="Audits SHA-256 block hash integrity, parent hashes, and transaction non-repudiation.",
)
def validate_blockchain(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> ValidationResultResponse:
    audit_report = sim_service.validate_blockchain()

    audit_service.record(
        action="BLOCKCHAIN_VALIDATE",
        target=f"Blockchain Ledger ({audit_report.get('details', {}).get('total_blocks', 0)} blocks)",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="VALID" if audit_report.get("is_valid") else "INVALID",
        metadata=audit_report,
        db=db,
    )

    return ValidationResultResponse(**audit_report)


@router.get(
    "/security",
    summary="Admin Security Monitoring",
    description="Monitor detected attacks, blocked threats, and security events log.",
)
def get_admin_security(
    current_admin: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    logger = get_security_event_logger()
    stats = logger.get_stats()
    events = logger.get_events(limit=50)

    return {
        "stats": stats,
        "events": [e.to_dict() for e in events],
        "supported_attack_types": [
            {
                "type": "REPLAY",
                "name": "Replay Attack",
                "description": "Adversary re-submits previously captured signed transaction or reuses nonces.",
            },
            {
                "type": "FDI",
                "name": "False Data Injection",
                "description": "Compromised sensor injects falsified generation surge or tampered price bid.",
            },
            {
                "type": "SYBIL",
                "name": "Sybil Attack",
                "description": "Adversary creates multiple fake virtual identities to manipulate market clearing.",
            },
        ],
    }


@router.post(
    "/security/simulate-attack",
    summary="Launch Controlled Attack Simulation",
    description="Executes a controlled attack simulation (Replay, FDI, or Sybil) against digital twin software defenses.",
)
def simulate_attack(
    request: AttackSimulationRequest,
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    attack_type = request.attack_type.upper().strip()

    if attack_type == "REPLAY":
        simulator = ReplayAttackSimulator()
        sender_id = request.target_id or "HH-014-PROSUMER"
        report = simulator.run_simulation(sender_id=sender_id)
        action_name = "SIMULATE_REPLAY_ATTACK"

    elif attack_type == "FDI":
        simulator = FalseDataInjectionSimulator()
        target_id = request.target_id or "HH-042-SOLAR-PV"
        report = simulator.run_simulation(target_household_id=target_id)
        action_name = "SIMULATE_FDI_ATTACK"

    elif attack_type == "SYBIL":
        simulator = SybilAttackSimulator()
        target_comm = request.target_id or "Green Valley Community"
        num_bots = request.parameters.get("num_fake_identities", 5) if request.parameters else 5
        report = simulator.run_simulation(target_community=target_comm, num_fake_identities=num_bots)
        action_name = "SIMULATE_SYBIL_ATTACK"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported attack simulation type '{request.attack_type}'. Supported: 'REPLAY', 'FDI', 'SYBIL'.",
        )

    # Log action to audit log
    audit_service.record(
        action=action_name,
        target=request.target_id or "Digital Twin Microgrid Environment",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result=report.get("status", "COMPLETED"),
        metadata={
            "attacks_simulated": report.get("attacks_simulated", 0),
            "attacks_blocked": report.get("attacks_blocked", 0),
            "detection_rate_pct": report.get("detection_rate_pct", 100.0),
        },
        db=db,
    )

    return report


@router.get(
    "/privacy",
    response_model=AdminPrivacyResponse,
    summary="Get Privacy Baseline & Access Control Matrix",
    description="Displays data minimization rules, zero-knowledge policies, and access rights across microgrid roles.",
)
def get_admin_privacy(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> AdminPrivacyResponse:
    matrix = sim_service.get_privacy_matrix()
    return AdminPrivacyResponse(**matrix)


@router.get(
    "/analytics",
    response_model=AdminAnalyticsResponse,
    summary="Get Microgrid System & Market Analytics",
    description="Provides deep analytics: Self-consumption %, Self-sufficiency %, peak shaving, average clearing prices.",
)
def get_admin_analytics(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> AdminAnalyticsResponse:
    analytics = sim_service.get_system_analytics()
    return AdminAnalyticsResponse(**analytics)


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="View Administrative Audit Trail",
    description="Retrieve chronological append-only audit records of operator actions.",
)
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: Optional[str] = Query(None),
    admin_id: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    logs = audit_service.get_logs(
        limit=limit,
        offset=offset,
        action=action,
        admin_id=admin_id,
        result=result,
        db=db,
    )
    return AuditLogListResponse(
        total_count=len(logs),
        logs=[AuditLogItemSchema(**l) for l in logs],
    )


# --- Simulation lifecycle control endpoints for Admin ---


@router.post(
    "/simulation/start",
    summary="Admin Start / Advance Simulation",
    description="Advances the digital twin simulation cycle. Audited.",
)
def admin_start_simulation(
    steps: Optional[int] = Query(None, ge=1, le=96),
    continuous: Optional[bool] = Query(None),
    speed_ms: Optional[int] = Query(1000, ge=100, le=10000),
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if continuous or (steps is None and continuous is not False):
        step_delay = (speed_ms or 1000) / 1000.0
        res = sim_service.start_continuous(step_delay=step_delay, run_trading=True)
    else:
        res = sim_service.start(steps=steps, run_trading=True)
    audit_service.record(
        action="SIMULATION_START",
        target=f"Microgrid Digital Twin (steps={steps or 'CONTINUOUS'})",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="SUCCESS",
        metadata=res,
        db=db,
    )
    return res


@router.post(
    "/simulation/stop",
    summary="Admin Stop / Pause Simulation",
    description="Pauses the simulation execution. Audited.",
)
def admin_stop_simulation(
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    res = sim_service.stop()
    audit_service.record(
        action="SIMULATION_STOP",
        target="Microgrid Digital Twin",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="SUCCESS",
        metadata=res,
        db=db,
    )
    return res


@router.post(
    "/simulation/reset",
    summary="Admin Reset Simulation",
    description="Resets the simulation to 00:00 applying staged configuration. Audited.",
)
def admin_reset_simulation(
    num_households: Optional[int] = Query(None, ge=5, le=500),
    random_seed: Optional[int] = Query(None),
    current_admin: User = Depends(get_current_admin),
    sim_service: SimulationService = Depends(get_simulation_service),
    audit_service: AuditService = Depends(get_audit_service),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    future_cfg = sim_service.get_future_config()
    final_hh = num_households or future_cfg.get("num_households", 100)
    final_seed = random_seed or future_cfg.get("random_seed", 42)

    res = sim_service.reset(num_households=final_hh, random_seed=final_seed)
    audit_service.record(
        action="SIMULATION_RESET",
        target=f"Microgrid Digital Twin (households={final_hh}, seed={final_seed})",
        admin_id=str(current_admin.id),
        admin_username=current_admin.username,
        result="SUCCESS",
        metadata={"num_households": final_hh, "random_seed": final_seed},
        db=db,
    )
    return res
