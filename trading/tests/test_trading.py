import math
import pytest
from simulation.config import SimulationConfig
from simulation.engine import SimulationEngine
from simulation.models import Household
from trading.models import EnergyOffer, EnergyBid, Trade
from trading.order_book import OrderBook
from trading.pricing import MidpointPricingStrategy, SellerAskPricingStrategy, BuyerBidPricingStrategy
from trading.matcher import DoubleAuctionMatcher
from trading.settlement import SettlementEngine


def test_successful_matching():
    """Test standard 1-to-1 match when buyer price >= seller price and quantities equal."""
    book = OrderBook()
    offer = EnergyOffer(
        seller_id="HH-SELLER-1",
        energy_amount_kwh=5.0,
        asking_price_per_kwh=0.10,
        timestamp="12:00",
    )
    bid = EnergyBid(
        buyer_id="HH-BUYER-1",
        energy_amount_kwh=5.0,
        maximum_price_per_kwh=0.18,
        timestamp="12:00",
    )
    book.add_offer(offer)
    book.add_bid(bid)

    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)

    assert len(trades) == 1
    t = trades[0]
    assert t.seller_id == "HH-SELLER-1"
    assert t.buyer_id == "HH-BUYER-1"
    assert t.energy_kwh == 5.0
    assert math.isclose(t.price_per_kwh, 0.14)  # Midpoint of 0.10 and 0.18
    assert math.isclose(t.total_value, 5.0 * 0.14)
    assert t.status == "COMPLETED"

    # Both should be completely filled
    assert offer.is_filled
    assert bid.is_filled
    assert len(book.get_active_offers()) == 0
    assert len(book.get_active_bids()) == 0


def test_partial_matching_seller_has_more():
    """Test partial match when seller has more energy than buyer demands."""
    book = OrderBook()
    offer = EnergyOffer(
        seller_id="HH-SELLER-LARGE",
        energy_amount_kwh=10.0,
        asking_price_per_kwh=0.10,
        timestamp="12:00",
    )
    bid = EnergyBid(
        buyer_id="HH-BUYER-SMALL",
        energy_amount_kwh=3.5,
        maximum_price_per_kwh=0.16,
        timestamp="12:00",
    )
    book.add_offer(offer)
    book.add_bid(bid)

    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)

    assert len(trades) == 1
    assert trades[0].energy_kwh == 3.5
    assert bid.is_filled
    assert not offer.is_filled
    assert math.isclose(offer.remaining_energy_kwh, 6.5)
    assert len(book.get_active_offers()) == 1
    assert len(book.get_active_bids()) == 0


def test_partial_matching_buyer_has_more():
    """Test partial match when buyer demands more energy than seller offers."""
    book = OrderBook()
    offer = EnergyOffer(
        seller_id="HH-SELLER-SMALL",
        energy_amount_kwh=4.0,
        asking_price_per_kwh=0.12,
        timestamp="12:00",
    )
    bid = EnergyBid(
        buyer_id="HH-BUYER-LARGE",
        energy_amount_kwh=9.0,
        maximum_price_per_kwh=0.20,
        timestamp="12:00",
    )
    book.add_offer(offer)
    book.add_bid(bid)

    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)

    assert len(trades) == 1
    assert trades[0].energy_kwh == 4.0
    assert offer.is_filled
    assert not bid.is_filled
    assert math.isclose(bid.remaining_energy_kwh, 5.0)
    assert len(book.get_active_offers()) == 0
    assert len(book.get_active_bids()) == 1


def test_no_matching_empty_book():
    """Test matcher gracefully handles empty order book."""
    book = OrderBook()
    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)
    assert len(trades) == 0

    # Only offers, no bids
    book.add_offer(EnergyOffer("HH-S", 5.0, 0.10, "12:00"))
    assert len(matcher.match(book)) == 0

    # Only bids, no offers
    book.clear()
    book.add_bid(EnergyBid("HH-B", 5.0, 0.15, "12:00"))
    assert len(matcher.match(book)) == 0


def test_price_mismatch():
    """Test that no trade occurs when buyer max price is strictly below seller asking price."""
    book = OrderBook()
    # Seller wants $0.15/kWh, Buyer only willing to pay $0.09/kWh
    book.add_offer(EnergyOffer("HH-SELLER", 10.0, 0.15, "12:00"))
    book.add_bid(EnergyBid("HH-BUYER", 10.0, 0.09, "12:00"))

    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)

    assert len(trades) == 0
    assert len(book.get_active_offers()) == 1
    assert len(book.get_active_bids()) == 1
    assert book.get_active_offers()[0].remaining_energy_kwh == 10.0
    assert book.get_active_bids()[0].remaining_energy_kwh == 10.0


def test_multiple_buyers_price_priority():
    """Test matching with 1 seller and multiple competing buyers (highest bidder prioritized)."""
    book = OrderBook()
    # Seller offers 10 kWh @ $0.10
    book.add_offer(EnergyOffer("HH-SELLER", 10.0, 0.10, "12:00"))

    # Three buyers offering different prices
    book.add_bid(EnergyBid("HH-BUYER-LOW", 5.0, 0.12, "12:00"))
    book.add_bid(EnergyBid("HH-BUYER-HIGH", 5.0, 0.20, "12:00"))
    book.add_bid(EnergyBid("HH-BUYER-MID", 5.0, 0.15, "12:00"))

    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)

    # 10 kWh seller matches with highest bidder (5 kWh) and middle bidder (5 kWh)
    assert len(trades) == 2

    # First trade must be with HIGH bidder
    assert trades[0].buyer_id == "HH-BUYER-HIGH"
    assert trades[0].energy_kwh == 5.0
    assert math.isclose(trades[0].price_per_kwh, 0.15)  # (0.10 + 0.20)/2

    # Second trade must be with MID bidder
    assert trades[1].buyer_id == "HH-BUYER-MID"
    assert trades[1].energy_kwh == 5.0
    assert math.isclose(trades[1].price_per_kwh, 0.125)  # (0.10 + 0.15)/2

    # LOW bidder remains unmatched
    active_bids = book.get_active_bids()
    assert len(active_bids) == 1
    assert active_bids[0].buyer_id == "HH-BUYER-LOW"
    assert active_bids[0].remaining_energy_kwh == 5.0


def test_multiple_sellers_price_priority():
    """Test matching with 1 buyer and multiple competing sellers (cheapest seller prioritized)."""
    book = OrderBook()
    # Buyer wants 10 kWh @ $0.20
    book.add_bid(EnergyBid("HH-BUYER", 10.0, 0.20, "12:00"))

    # Three sellers offering at different prices
    book.add_offer(EnergyOffer("HH-SELLER-EXPENSIVE", 5.0, 0.16, "12:00"))
    book.add_offer(EnergyOffer("HH-SELLER-CHEAP", 5.0, 0.08, "12:00"))
    book.add_offer(EnergyOffer("HH-SELLER-MODERATE", 5.0, 0.12, "12:00"))

    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)

    # 10 kWh buyer matches with CHEAP seller (5 kWh) and MODERATE seller (5 kWh)
    assert len(trades) == 2

    # First trade must be with CHEAP seller
    assert trades[0].seller_id == "HH-SELLER-CHEAP"
    assert trades[0].energy_kwh == 5.0
    assert math.isclose(trades[0].price_per_kwh, 0.14)  # (0.08 + 0.20)/2

    # Second trade must be with MODERATE seller
    assert trades[1].seller_id == "HH-SELLER-MODERATE"
    assert trades[1].energy_kwh == 5.0
    assert math.isclose(trades[1].price_per_kwh, 0.16)  # (0.12 + 0.20)/2

    # EXPENSIVE seller remains unmatched
    active_offers = book.get_active_offers()
    assert len(active_offers) == 1
    assert active_offers[0].seller_id == "HH-SELLER-EXPENSIVE"


def test_insufficient_energy():
    """Test that when total offered energy is less than demand, all available energy trades."""
    book = OrderBook()
    # Sellers offer 6.0 kWh in total
    book.add_offer(EnergyOffer("HH-SELLER-A", 3.0, 0.10, "12:00"))
    book.add_offer(EnergyOffer("HH-SELLER-B", 3.0, 0.11, "12:00"))

    # Buyer demands 20.0 kWh
    book.add_bid(EnergyBid("HH-BUYER-DEFICIT", 20.0, 0.18, "12:00"))

    matcher = DoubleAuctionMatcher()
    trades = matcher.match(book)

    # Total energy traded is exactly 6.0 kWh
    total_traded = sum(t.energy_kwh for t in trades)
    assert math.isclose(total_traded, 6.0)

    # All sellers are fully drained
    assert len(book.get_active_offers()) == 0

    # Buyer still has remaining deficit of 14.0 kWh
    active_bids = book.get_active_bids()
    assert len(active_bids) == 1
    assert math.isclose(active_bids[0].remaining_energy_kwh, 14.0)


def test_pricing_strategies():
    """Test alternative pricing strategies (Midpoint vs SellerAsk vs BuyerBid)."""
    offer = EnergyOffer("S1", 10.0, 0.10, "12:00")
    bid = EnergyBid("B1", 10.0, 0.20, "12:00")

    # 1. Midpoint
    midpoint_price = MidpointPricingStrategy().determine_clearing_price(offer, bid)
    assert math.isclose(midpoint_price, 0.15)

    # 2. Seller Ask
    ask_price = SellerAskPricingStrategy().determine_clearing_price(offer, bid)
    assert math.isclose(ask_price, 0.10)

    # 3. Buyer Bid
    bid_price = BuyerBidPricingStrategy().determine_clearing_price(offer, bid)
    assert math.isclose(bid_price, 0.20)


def test_settlement_financial_conservation():
    """Test that settlement accounting strictly conserves money (buyer paid == seller received)."""
    trades = [
        Trade("TRD-1", "HH-S1", "HH-B1", 4.0, 0.12, 0.48, "12:00"),
        Trade("TRD-2", "HH-S2", "HH-B1", 3.0, 0.14, 0.42, "12:00"),
        Trade("TRD-3", "HH-S1", "HH-B2", 2.0, 0.15, 0.30, "12:00"),
    ]

    settler = SettlementEngine()
    summary = settler.settle_trades(trades)

    assert summary.total_trades == 3
    assert math.isclose(summary.total_volume_kwh, 9.0)
    assert math.isclose(summary.total_value, 1.20)
    assert math.isclose(summary.total_seller_revenue, 1.20)
    assert math.isclose(summary.total_buyer_expenditure, 1.20)

    # Check seller S1 account: earned 0.48 + 0.30 = 0.78
    s1_acc = settler.accounts["HH-S1"]
    assert math.isclose(s1_acc.revenue_earned, 0.78)
    assert math.isclose(s1_acc.net_balance, 0.78)
    assert math.isclose(s1_acc.energy_sold_kwh, 6.0)

    # Check buyer B1 account: spent 0.48 + 0.42 = 0.90
    b1_acc = settler.accounts["HH-B1"]
    assert math.isclose(b1_acc.expenditure_paid, 0.90)
    assert math.isclose(b1_acc.net_balance, -0.90)
    assert math.isclose(b1_acc.energy_bought_kwh, 7.0)

    # Global cashflow sum across all participants must equal 0.0
    net_global_cashflow = sum(acc.net_balance for acc in settler.accounts.values())
    assert math.isclose(net_global_cashflow, 0.0, abs_tol=1e-5)


def test_consuming_simulation_output():
    """Test end-to-end integration: SimulationEngine output directly ingested by DoubleAuctionMatcher."""
    config = SimulationConfig(num_households=50, random_seed=42)
    engine = SimulationEngine(config=config)

    # Advance until midday (e.g. step 48 = 12:00 PM) where solar PV generation is active
    for _ in range(49):
        engine.step()

    midday_step = engine.step_history[-1]
    assert midday_step.sellers_count > 0
    assert midday_step.buyers_count > 0

    matcher = DoubleAuctionMatcher()
    trades, order_book = matcher.execute_simulation_interval(
        households=engine.households,
        timestamp=midday_step.time_str,
        default_seller_ask=0.10,
        default_buyer_bid=0.18,
    )

    # Trades should have executed
    assert len(trades) > 0
    total_traded_kwh = sum(t.energy_kwh for t in trades)
    assert total_traded_kwh > 0

    # Every trade seller had surplus, every trade buyer had deficit
    household_map = {hh.household_id: hh for hh in engine.households}
    for trade in trades:
        seller_hh = household_map[trade.seller_id]
        buyer_hh = household_map[trade.buyer_id]
        assert seller_hh.current_surplus_kwh > 0
        assert buyer_hh.current_deficit_kwh > 0
        assert trade.energy_kwh > 0
        assert trade.total_value > 0
        assert trade.status == "COMPLETED"
