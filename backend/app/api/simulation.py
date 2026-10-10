from fastapi import APIRouter, Depends, Query, status
from app.services.simulation_service import SimulationService, get_simulation_service
from app.schemas.simulation import (
    SimulationStartRequest,
    SimulationStatusResponse,
    SimulationActionResponse,
)

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.get(
    "/status",
    response_model=SimulationStatusResponse,
    summary="Get Digital Twin Simulation Status",
    description="Returns current status, active time-step, clock time, household count, and progress metrics.",
)
def get_simulation_status(
    service: SimulationService = Depends(get_simulation_service),
) -> SimulationStatusResponse:
    status_data = service.get_status()
    return SimulationStatusResponse(**status_data)


@router.post(
    "/start",
    response_model=SimulationActionResponse,
    summary="Start or Advance Simulation",
    description="Starts or advances the digital twin simulation by specified steps (or completes full 24h duration).",
)
def start_simulation(
    request: SimulationStartRequest = SimulationStartRequest(),
    service: SimulationService = Depends(get_simulation_service),
) -> SimulationActionResponse:
    result = service.start(
        steps=request.steps,
        run_trading=request.run_trading,
        num_households=request.num_households,
        random_seed=request.random_seed,
        continuous=request.continuous,
        step_delay=request.step_delay or 1.0,
    )
    return SimulationActionResponse(**result)


@router.post(
    "/stop",
    response_model=SimulationActionResponse,
    summary="Stop Simulation Execution",
    description="Pauses the simulation execution loop and preserves current state.",
)
def stop_simulation(
    service: SimulationService = Depends(get_simulation_service),
) -> SimulationActionResponse:
    result = service.stop()
    return SimulationActionResponse(**result)


@router.post(
    "/reset",
    response_model=SimulationActionResponse,
    summary="Reset Simulation to Initial State",
    description="Resets the microgrid digital twin back to Step 0 (00:00) with fresh household assets.",
)
def reset_simulation(
    num_households: int = Query(default=100, ge=2, le=1000, description="Household fleet size"),
    random_seed: int = Query(default=42, description="Random seed for reproducibility"),
    service: SimulationService = Depends(get_simulation_service),
) -> SimulationActionResponse:
    result = service.reset(num_households=num_households, random_seed=random_seed)
    return SimulationActionResponse(**result)
