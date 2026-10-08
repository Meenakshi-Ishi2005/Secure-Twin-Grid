"""Unit and Integration Tests for Local Energy Community / Microgrid.

Tests cover:
1. Community creation and default model attributes.
2. Household assignment to local community (COMM-001).
3. Valid same-community P2P electricity trade clearing.
4. Rejection / prevention of cross-community trades.
5. Community household capacity validation (rejecting > capacity).
6. Support for configurable household scales (10, 50, 100, 250, 500).
7. Community energy generation and consumption summary.
8. Blockchain transactions and blocks containing community_id.
9. FastAPI REST endpoints for /api/v1/community/*.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from community.models import Community
from simulation.config import SimulationConfig
from simulation.engine import SimulationEngine
from simulation.models import Household
from trading.models import EnergyOffer, EnergyBid, Trade
from trading.matcher import DoubleAuctionMatcher
from trading.order_book import OrderBook
from trading.settlement import SettlementEngine
from blockchain.blockchain import Blockchain
from blockchain.transaction import Transaction


@pytest.fixture
def client():
    return TestClient(app)


class TestCommunityModelAndConfig:
    """Test community data model and configuration boundaries."""

    def test_community_creation_defaults(self):
        """Test default values of the Local Energy Community."""
        comm = Community()
        assert comm.community_id == "COMM-001"
        assert comm.community_name == "Green Valley Community"
        assert comm.location_name == "Simulated Local Microgrid"
        assert comm.household_capacity == 500
        assert comm.current_household_count == 100
        assert comm.status == "ACTIVE"
        assert "created_at" in comm.to_dict()

    def test_household_assigned_to_community(self):
        """Every generated household must belong to the configured community."""
        config = SimulationConfig(
            community_id="COMM-001",
            community_name="Green Valley Community",
            num_households=50,
        )
        engine = SimulationEngine(config=config)
        assert len(engine.households) == 50
        for hh in engine.households:
            assert hh.community_id == "COMM-001"
            assert "community_id" in hh.to_dict()
            assert hh.to_dict()["community_id"] == "COMM-001"

    def test_household_capacity_validation_error(self):
        """Provisioning more households than community capacity must raise ValueError."""
        with pytest.raises(ValueError, match="cannot exceed community capacity"):
            SimulationConfig(
                num_households=600,
                household_capacity=500,
            )

    @pytest.mark.parametrize("scale", [10, 50, 100, 250, 500])
    def test_configurable_household_scales(self, scale):
        """Supports scaling households to 10, 50, 100, 250, 500 without breaking community."""
        config = SimulationConfig(
            num_households=scale,
            household_capacity=500,
        )
        engine = SimulationEngine(config=config)
        assert len(engine.households) == scale
        assert all(hh.community_id == "COMM-001" for hh in engine.households)


class TestCommunityTradingAndBlockchainScope:
    """Test same-community trade enforcement and ledger recording."""

    def test_valid_same_community_trade(self):
        """Trades between prosumers in the same community must match and record community_id."""
        matcher = DoubleAuctionMatcher()
        order_book = OrderBook()

        offer = EnergyOffer(
            seller_id="HH-001",
            community_id="COMM-001",
            energy_amount_kwh=5.0,
            asking_price_per_kwh=0.10,
            timestamp="12:00",
        )
        bid = EnergyBid(
            buyer_id="HH-025",
            community_id="COMM-001",
            energy_amount_kwh=5.0,
            maximum_price_per_kwh=0.18,
            timestamp="12:00",
        )
        order_book.add_offer(offer)
        order_book.add_bid(bid)

        trades = matcher.match(order_book)
        assert len(trades) == 1
        trade = trades[0]
        assert trade.community_id == "COMM-001"
        assert trade.seller_id == "HH-001"
        assert trade.buyer_id == "HH-025"
        assert trade.energy_kwh == 5.0
        assert trade.price_per_kwh == 0.14
        assert "community_id" in trade.to_dict()

    def test_invalid_cross_community_trade_rejected(self):
        """Orders originating from different communities must NOT be matched."""
        matcher = DoubleAuctionMatcher()
        order_book = OrderBook()

        # Seller in Green Valley
        offer = EnergyOffer(
            seller_id="HH-001",
            community_id="COMM-001",
            energy_amount_kwh=5.0,
            asking_price_per_kwh=0.10,
            timestamp="12:00",
        )
        # Buyer in different external community
        bid = EnergyBid(
            buyer_id="HH-999",
            community_id="COMM-OTHER",
            energy_amount_kwh=5.0,
            maximum_price_per_kwh=0.18,
            timestamp="12:00",
        )
        order_book.add_offer(offer)
        order_book.add_bid(bid)

        trades = matcher.match(order_book)
        assert len(trades) == 0, "Cross-community trade must not match without inter-community bridge"

    def test_blockchain_transaction_contains_community_id(self):
        """Settled trade converted to blockchain transaction retains community_id."""
        bc = Blockchain(validator_id="poa-validator")
        settlement = SettlementEngine(blockchain=bc)

        trade = Trade(
            trade_id="TRD-COMM-TEST",
            community_id="COMM-001",
            seller_id="HH-001",
            buyer_id="HH-002",
            energy_kwh=4.0,
            price_per_kwh=0.15,
            total_value=0.60,
            timestamp="12:15",
        )

        ref = settlement.settle_single_trade(trade)
        assert ref["status"] == "RECORDED_ON_CHAIN"

        # Check blockchain block and transaction
        block = bc.chain[-1]
        assert len(block.transactions) == 1
        tx = block.transactions[0]
        assert tx.community_id == "COMM-001"
        assert tx.trade_id == "TRD-COMM-TEST"
        assert "community_id" in tx.to_dict()
        assert tx.is_valid() is True

    def test_settlement_rejects_trade_without_community(self):
        """Settlement engine requires valid community_id."""
        settlement = SettlementEngine()
        trade = Trade(
            trade_id="TRD-BAD",
            community_id="",
            seller_id="HH-001",
            buyer_id="HH-002",
            energy_kwh=2.0,
            price_per_kwh=0.10,
            total_value=0.20,
            timestamp="12:00",
        )
        assert settlement.validate_trade(trade) is False


class TestCommunityRestAPI:
    """Test FastAPI /api/v1/community endpoints."""

    def test_get_community_profile(self, client):
        res = client.get("/api/v1/community")
        assert res.status_code == 200
        data = res.json()
        assert data["community_id"] == "COMM-001"
        assert data["community_name"] == "Green Valley Community"
        assert data["location_name"] == "Simulated Local Microgrid"
        assert data["household_capacity"] == 500
        assert data["current_household_count"] > 0
        assert "solar_penetration_percent" in data
        assert "battery_penetration_percent" in data
        assert "ev_penetration_percent" in data

    def test_get_community_summary(self, client):
        res = client.get("/api/v1/community/summary")
        assert res.status_code == 200
        data = res.json()
        assert "community" in data
        assert data["community"]["community_id"] == "COMM-001"
        assert "energy_metrics" in data
        assert "trading_metrics" in data
        assert "blockchain_metrics" in data

    def test_get_community_households(self, client):
        res = client.get("/api/v1/community/households")
        assert res.status_code == 200
        data = res.json()
        assert data["total_count"] > 0
        assert len(data["households"]) > 0
        for hh in data["households"]:
            assert hh["community_id"] == "COMM-001"

    def test_get_community_energy_summary(self, client):
        res = client.get("/api/v1/community/energy-summary")
        assert res.status_code == 200
        data = res.json()
        assert data["community_id"] == "COMM-001"
        assert data["community_name"] == "Green Valley Community"
        assert "energy_summary" in data

    def test_get_community_trades(self, client):
        res = client.get("/api/v1/community/trades")
        assert res.status_code == 200
        data = res.json()
        assert "trades" in data
        assert "total_count" in data
