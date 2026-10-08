import sys
import os
import pytest

# Ensure root dir is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from simulation.models import Household
from trading.matcher import DoubleAuctionMatcher
from trading.models import Trade
from trading.settlement import SettlementEngine
from blockchain.blockchain import Blockchain


def test_participation_buying_disabled():
    """Verify that a household in deficit does not create a buy bid if buying is disabled."""
    matcher = DoubleAuctionMatcher()
    hh_buyer = Household(
        household_id="HH-001",
        current_deficit_kwh=3.5,
        current_surplus_kwh=0.0,
        buying_enabled=False,
    )
    hh_seller = Household(
        household_id="HH-002",
        current_deficit_kwh=0.0,
        current_surplus_kwh=5.0,
        selling_enabled=True,
    )

    trades, order_book = matcher.execute_simulation_interval(
        households=[hh_buyer, hh_seller],
        timestamp="12:00",
    )

    # Order book should have 1 offer (seller) and 0 bids (buyer disabled)
    assert len(order_book.offers) == 1
    assert len(order_book.bids) == 0
    assert len(trades) == 0


def test_participation_selling_disabled():
    """Verify that a household with surplus does not create a sell offer if selling is disabled."""
    matcher = DoubleAuctionMatcher()
    hh_buyer = Household(
        household_id="HH-001",
        current_deficit_kwh=3.5,
        current_surplus_kwh=0.0,
        buying_enabled=True,
    )
    hh_seller = Household(
        household_id="HH-002",
        current_deficit_kwh=0.0,
        current_surplus_kwh=5.0,
        selling_enabled=False,
    )

    trades, order_book = matcher.execute_simulation_interval(
        households=[hh_buyer, hh_seller],
        timestamp="12:00",
    )

    # Order book should have 0 offers (seller disabled) and 1 bid (buyer)
    assert len(order_book.offers) == 0
    assert len(order_book.bids) == 1
    assert len(trades) == 0


def test_participation_enabled_matching_and_blockchain_settlement():
    """Verify that when both buying and selling are enabled, trade matches and settles on blockchain."""
    matcher = DoubleAuctionMatcher()
    blockchain = Blockchain(validator_id="poa-validator-primary")
    settlement = SettlementEngine(blockchain=blockchain)

    hh_buyer = Household(
        household_id="HH-001",
        current_deficit_kwh=2.0,
        current_surplus_kwh=0.0,
        buying_enabled=True,
    )
    hh_seller = Household(
        household_id="HH-002",
        current_deficit_kwh=0.0,
        current_surplus_kwh=3.0,
        selling_enabled=True,
    )

    trades, order_book = matcher.execute_simulation_interval(
        households=[hh_buyer, hh_seller],
        timestamp="12:00",
        default_seller_ask=0.10,
        default_buyer_bid=0.18,
    )

    assert len(trades) == 1
    trade = trades[0]
    assert trade.buyer_id == "HH-001"
    assert trade.seller_id == "HH-002"
    assert trade.energy_kwh == 2.0
    assert trade.status == "COMPLETED"

    # Settle onto blockchain
    summary = settlement.settle_trades(trades)
    assert summary is not None
    assert summary.total_trades == 1
    assert summary.blockchain_blocks_created >= 1
    assert len(blockchain.chain) == 2
    assert blockchain.get_validation_report().is_valid is True


def test_participation_no_sellers_available():
    """Verify that when a buyer is in deficit but no sellers exist (e.g. night), 0 trades execute."""
    matcher = DoubleAuctionMatcher()
    hh_buyer = Household(
        household_id="HH-001",
        current_deficit_kwh=2.5,
        current_surplus_kwh=0.0,
        buying_enabled=True,
    )
    hh_other_buyer = Household(
        household_id="HH-002",
        current_deficit_kwh=1.5,
        current_surplus_kwh=0.0,
        buying_enabled=True,
    )

    trades, order_book = matcher.execute_simulation_interval(
        households=[hh_buyer, hh_other_buyer],
        timestamp="00:00",
    )

    assert len(order_book.bids) == 2
    assert len(order_book.offers) == 0
    assert len(trades) == 0


def test_participation_backward_compatible_fallback():
    """Verify that households without explicit flags default to True (enabled)."""
    matcher = DoubleAuctionMatcher()

    class OldHousehold:
        def __init__(self, hid, surplus, deficit):
            self.household_id = hid
            self.current_surplus_kwh = surplus
            self.current_deficit_kwh = deficit

    old_buyer = OldHousehold("HH-010", 0.0, 1.5)
    old_seller = OldHousehold("HH-020", 2.0, 0.0)

    trades, order_book = matcher.execute_simulation_interval(
        households=[old_buyer, old_seller],
        timestamp="11:00",
    )

    assert len(order_book.bids) == 1
    assert len(order_book.offers) == 1
    assert len(trades) == 1
