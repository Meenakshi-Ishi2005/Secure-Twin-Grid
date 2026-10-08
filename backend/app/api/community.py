"""FastAPI Router for Local Energy Community Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.services.simulation_service import SimulationService, get_simulation_service
from app.schemas.community import (
    CommunityResponse,
    CommunitySummaryResponse,
    CommunityEnergySummaryResponse,
)
from app.schemas.household import HouseholdResponse, HouseholdListResponse
from app.schemas.trading import TradeResponse, TradeListResponse

router = APIRouter(prefix="/community", tags=["Local Energy Community"])


@router.get(
    "",
    response_model=CommunityResponse,
    summary="Get Local Energy Community Profile",
    description="Retrieve the simulated Local Energy Community configuration, household capacity, and adoption penetration rates.",
)
def get_community(
    service: SimulationService = Depends(get_simulation_service),
) -> CommunityResponse:
    info = service.get_community_info()
    return CommunityResponse(**info)


@router.get(
    "/summary",
    response_model=CommunitySummaryResponse,
    summary="Get Community Summary & Ledger Overview",
    description="Retrieve consolidated overview of the community including energy flows, prosumer trading metrics, and blockchain status.",
)
def get_community_summary(
    service: SimulationService = Depends(get_simulation_service),
) -> CommunitySummaryResponse:
    summary = service.get_community_summary()
    return CommunitySummaryResponse(**summary)


@router.get(
    "/households",
    response_model=HouseholdListResponse,
    summary="List Community Households",
    description="Retrieve all virtual households residing within the local community microgrid boundary.",
)
def get_community_households(
    status: Optional[str] = Query(None, description="Filter by status: SELLING, BUYING, or BALANCED"),
    service: SimulationService = Depends(get_simulation_service),
) -> HouseholdListResponse:
    all_hh = service.get_households(status_filter=status)
    sellers_cnt = sum(1 for h in all_hh if h.status.upper() == "SELLING")
    buyers_cnt = sum(1 for h in all_hh if h.status.upper() == "BUYING")
    balanced_cnt = sum(1 for h in all_hh if h.status.upper() == "BALANCED")

    return HouseholdListResponse(
        total_count=len(all_hh),
        sellers_count=sellers_cnt,
        buyers_count=buyers_cnt,
        balanced_count=balanced_cnt,
        households=[HouseholdResponse(**h.to_dict()) for h in all_hh],
    )


@router.get(
    "/energy-summary",
    response_model=CommunityEnergySummaryResponse,
    summary="Get Community Energy Balance",
    description="Retrieve aggregate generation, consumption, surplus, deficit, and battery storage metrics for this community.",
)
def get_community_energy_summary(
    service: SimulationService = Depends(get_simulation_service),
) -> CommunityEnergySummaryResponse:
    energy_data = service.get_community_energy_summary()
    return CommunityEnergySummaryResponse(**energy_data)


@router.get(
    "/trades",
    response_model=TradeListResponse,
    summary="List Community P2P Trades",
    description="Retrieve peer-to-peer electricity trades executed within this local energy community.",
)
def get_community_trades(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    seller_id: Optional[str] = Query(None, description="Filter by seller household ID"),
    buyer_id: Optional[str] = Query(None, description="Filter by buyer household ID"),
    service: SimulationService = Depends(get_simulation_service),
) -> TradeListResponse:
    trades, total_count, total_vol, total_val = service.get_trades(
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
