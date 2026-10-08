import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_simulation_continuous_background_execution():
    """Verify global simulation runs continuously on server background thread."""
    # Reset simulation to fresh state
    client.post("/api/simulation/reset?num_households=50&random_seed=42")
    
    # Check initial status
    status_res = client.get("/api/simulation/status").json()
    assert status_res["current_step"] == 0
    assert status_res["current_time"] == "00:00"

    # Start continuous simulation via admin service endpoint with 0.1s delay
    from app.services.simulation_service import get_simulation_service
    service = get_simulation_service()
    service.start_continuous(step_delay=0.1, run_trading=True)

    # Allow background thread to run for 0.5s (advances ~4-5 steps)
    time.sleep(0.5)

    # Check status without active admin session (mimicking user observation)
    status_res2 = client.get("/api/simulation/status").json()
    assert status_res2["status"] == "RUNNING"
    assert status_res2["current_step"] > 0
    assert status_res2["current_time"] != "00:00"

    # Stop simulation
    stop_res = service.stop()
    assert stop_res["status"] == "STOPPED"
    step_at_stop = stop_res["current_step"]

    # Allow another 0.3s to verify it does not advance further while stopped
    time.sleep(0.3)
    status_res3 = client.get("/api/simulation/status").json()
    assert status_res3["current_step"] == step_at_stop
    assert status_res3["status"] == "STOPPED"
