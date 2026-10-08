import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_service():
    """Ensure simulation service is in fresh state before tests."""
    client.post("/api/simulation/reset?num_households=50&random_seed=42")


def test_health_endpoints():
    """Verify /health returns healthy status."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "project_name" in data


def test_openapi_documentation_accessible():
    """Verify OpenAPI schema and Swagger UI documentation endpoints."""
    res_schema = client.get("/openapi.json")
    assert res_schema.status_code == 200
    schema = res_schema.json()
    assert "openapi" in schema
    assert "paths" in schema
    assert "/health" in schema["paths"]
    assert "/api/simulation/status" in schema["paths"]
    assert "/api/houses" in schema["paths"]
    assert "/api/trades" in schema["paths"]

    res_docs = client.get("/docs")
    assert res_docs.status_code == 200


def test_simulation_status():
    """Verify GET /api/simulation/status returns structured status."""
    res = client.get("/api/simulation/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "current_step" in data
    assert "total_steps" in data
    assert "num_households" in data
    assert data["current_step"] == 0
    assert data["num_households"] == 50


def test_simulation_start_advance_and_stop():
    """Verify starting and advancing simulation."""
    # Advance 4 intervals (1 hour)
    start_res = client.post("/api/simulation/start", json={"steps": 4, "run_trading": True})
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["current_step"] == 4
    assert start_data["current_time"] == "01:00"

    # Check status
    status_res = client.get("/api/simulation/status")
    assert status_res.status_code == 200
    assert status_res.json()["current_step"] == 4

    # Stop simulation
    stop_res = client.post("/api/simulation/stop")
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "STOPPED"


def test_simulation_reset():
    """Verify POST /api/simulation/reset clears state and resets to step 0."""
    # Advance first
    client.post("/api/simulation/start", json={"steps": 10})

    # Reset with custom count
    reset_res = client.post("/api/simulation/reset?num_households=30&random_seed=123")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["status"] == "INITIALIZED"
    assert reset_data["current_step"] == 0

    status_data = client.get("/api/simulation/status").json()
    assert status_data["current_step"] == 0
    assert status_data["num_households"] == 30


def test_get_houses_and_filter():
    """Verify GET /api/houses and filtering by trading status."""
    res = client.get("/api/houses")
    assert res.status_code == 200
    data = res.json()
    assert "total_count" in data
    assert data["total_count"] == 50
    assert "households" in data
    assert len(data["households"]) == 50

    # Advance to midday when solar is generating
    client.post("/api/simulation/start", json={"steps": 48})

    res_all = client.get("/api/houses").json()
    res_sellers = client.get("/api/houses?status=SELLING").json()
    res_buyers = client.get("/api/houses?status=BUYING").json()

    assert res_sellers["total_count"] == res_all["sellers_count"]
    assert res_buyers["total_count"] == res_all["buyers_count"]
    for hh in res_sellers["households"]:
        assert hh["status"] == "SELLING"
        assert hh["current_surplus_kwh"] > 0


def test_get_household_by_id():
    """Verify GET /api/houses/{household_id} for valid ID and 404 for invalid ID."""
    res_valid = client.get("/api/houses/HH-001")
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert data["household_id"] == "HH-001"
    assert "has_solar" in data
    assert "base_consumption_kw" in data

    res_invalid = client.get("/api/houses/HH-NONEXISTENT-999")
    assert res_invalid.status_code == 404
    err_data = res_invalid.json()
    assert "detail" in err_data
    assert "not found" in err_data["detail"].lower()


def test_get_energy_summary():
    """Verify GET /api/energy/summary returns aggregate microgrid metrics."""
    # Advance simulation by 20 steps
    client.post("/api/simulation/start", json={"steps": 20})

    res = client.get("/api/energy/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_generation_kwh" in data
    assert "total_consumption_kwh" in data
    assert "total_surplus_kwh" in data
    assert "total_deficit_kwh" in data
    assert "peak_generation_kw" in data
    assert "peak_demand_kw" in data
    assert "maximum_buyers" in data
    assert "maximum_sellers" in data
    assert "total_battery_stored_kwh" in data
    assert data["completed_steps"] == 20


def test_get_trades_and_detail():
    """Verify GET /api/trades, filtering, pagination, and GET /api/trades/{trade_id}."""
    # Advance to midday to generate trades
    client.post("/api/simulation/start", json={"steps": 50, "run_trading": True})

    res = client.get("/api/trades?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "total_count" in data
    assert "trades" in data
    assert len(data["trades"]) > 0

    first_trade = data["trades"][0]
    trade_id = first_trade["trade_id"]

    # Test single trade retrieval
    res_single = client.get(f"/api/trades/{trade_id}")
    assert res_single.status_code == 200
    trade_data = res_single.json()
    assert trade_data["trade_id"] == trade_id
    assert "seller_id" in trade_data
    assert "buyer_id" in trade_data
    assert trade_data["energy_kwh"] > 0
    assert trade_data["status"] == "COMPLETED"

    # Test non-existent trade returns 404
    res_404 = client.get("/api/trades/TRD-DOESNOTEXIST-999")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()


def test_post_trading_run():
    """Verify POST /api/trading/run executes an ad-hoc double auction."""
    # Advance simulation so there are buyers/sellers
    client.post("/api/simulation/start", json={"steps": 48})

    res = client.post(
        "/api/trading/run",
        json={
            "default_seller_ask": 0.09,
            "default_buyer_bid": 0.20,
            "price_noise": False,
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "message" in data
    assert "trades_executed" in data
    assert "volume_kwh" in data
    assert "average_price_per_kwh" in data
    assert "trades" in data
    assert data["trades_executed"] > 0


def test_blockchain_endpoints_and_trade_settlement():
    """Verify GET /api/blockchain, /blocks, /blocks/{index}, and /validate."""
    # Initially, blockchain has only Genesis block
    res_summary = client.get("/api/blockchain")
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert summary_data["chain_length"] == 1
    assert summary_data["total_transactions"] == 0
    assert summary_data["latest_block_index"] == 0
    assert summary_data["is_valid"] is True

    # Advance simulation with trading enabled to create blocks
    client.post("/api/simulation/start", json={"steps": 48, "run_trading": True})

    # Summary should now show multiple blocks and transactions
    res_summary_after = client.get("/api/blockchain")
    assert res_summary_after.status_code == 200
    summary_after = res_summary_after.json()
    assert summary_after["chain_length"] > 1
    assert summary_after["total_transactions"] > 0
    assert summary_after["is_valid"] is True

    # List all blocks
    res_blocks = client.get("/api/blockchain/blocks")
    assert res_blocks.status_code == 200
    blocks_data = res_blocks.json()
    assert blocks_data["total_blocks"] == summary_after["chain_length"]
    assert len(blocks_data["blocks"]) == blocks_data["total_blocks"]

    # Verify Genesis block at index 0
    res_b0 = client.get("/api/blockchain/blocks/0")
    assert res_b0.status_code == 200
    b0 = res_b0.json()
    assert b0["index"] == 0
    assert b0["previous_hash"] == "0" * 64

    # Verify block at index 1
    res_b1 = client.get("/api/blockchain/blocks/1")
    assert res_b1.status_code == 200
    b1 = res_b1.json()
    assert b1["index"] == 1
    assert b1["previous_hash"] == b0["hash"]
    assert len(b1["transactions"]) > 0

    # Test non-existent block returns 404
    res_b_404 = client.get("/api/blockchain/blocks/99999")
    assert res_b_404.status_code == 404

    # Verify cryptographic validation endpoint
    res_val = client.get("/api/blockchain/validate")
    assert res_val.status_code == 200
    val_data = res_val.json()
    assert val_data["is_valid"] is True
    assert val_data["error_message"] is None

