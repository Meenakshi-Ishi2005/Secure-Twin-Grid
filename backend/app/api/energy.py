from fastapi import APIRouter, Depends
from app.services.simulation_service import SimulationService, get_simulation_service
from app.schemas.energy import EnergySummaryResponse, EnergyHistoryResponse

router = APIRouter(prefix="/energy", tags=["Energy"])


@router.get(
    "/summary",
    response_model=EnergySummaryResponse,
    summary="Get Microgrid Energy Summary",
    description="Retrieve aggregated energy generation, demand, surplus, deficit, peak levels, and battery storage metrics across the microgrid.",
)
def get_energy_summary(
    service: SimulationService = Depends(get_simulation_service),
) -> EnergySummaryResponse:
    summary_data = service.get_energy_summary()
    return EnergySummaryResponse(**summary_data)


@router.get(
    "/history",
    response_model=EnergyHistoryResponse,
    summary="Get Microgrid Step History",
    description="Retrieve chronological step-by-step history of generation, consumption, market participants, and storage.",
)
def get_energy_history(
    service: SimulationService = Depends(get_simulation_service),
) -> EnergyHistoryResponse:
    history_data = service.get_step_history()
    status_data = service.get_status()
    return EnergyHistoryResponse(
        total_steps=status_data["total_steps"],
        completed_steps=len(history_data),
        history=history_data,
    )

