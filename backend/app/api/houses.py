from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.services.simulation_service import SimulationService, get_simulation_service
from app.schemas.household import HouseholdResponse, HouseholdListResponse

router = APIRouter(prefix="/houses", tags=["Households"])


@router.get(
    "",
    response_model=HouseholdListResponse,
    summary="List Microgrid Households",
    description="Retrieve all households in the digital twin, optionally filtering by trading status ('SELLING', 'BUYING', or 'BALANCED').",
)
def list_households(
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Filter by trading classification ('SELLING', 'BUYING', or 'BALANCED')"
    ),
    service: SimulationService = Depends(get_simulation_service),
) -> HouseholdListResponse:
    all_households = service.get_households(status_filter=None)
    filtered = service.get_households(status_filter=status_filter)

    sellers = sum(1 for h in all_households if h.status == "SELLING")
    buyers = sum(1 for h in all_households if h.status == "BUYING")
    balanced = sum(1 for h in all_households if h.status == "BALANCED")

    items = [HouseholdResponse(**hh.to_dict()) for hh in filtered]
    return HouseholdListResponse(
        total_count=len(items),
        sellers_count=sellers,
        buyers_count=buyers,
        balanced_count=balanced,
        households=items,
    )


@router.get(
    "/{household_id}",
    response_model=HouseholdResponse,
    summary="Get Household Details",
    description="Retrieve detailed specifications, current generation, load demand, battery storage, and trading status for a single household.",
    responses={
        404: {"description": "Household not found"}
    },
)
def get_household(
    household_id: str,
    service: SimulationService = Depends(get_simulation_service),
) -> HouseholdResponse:
    hh = service.get_household(household_id)
    if not hh:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Household with ID '{household_id}' was not found in the microgrid.",
        )
    return HouseholdResponse(**hh.to_dict())
