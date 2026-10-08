"""P2P Double-Auction Electricity Matching Engine.

Matching Algorithm Documentation:
--------------------------------
1. Market Principle:
   In each discrete time step, the microgrid digital twin classifies households into:
   - SELLERS: Prosumers with positive net surplus energy after local battery storage.
   - BUYERS: Consumers with positive net deficit energy after local battery discharge.

2. Price-Time Priority Queues:
   - Seller offers are queued in ASCENDING order of asking price (cheapest energy offered first).
     Ties are broken by earliest timestamp (FIFO).
   - Buyer bids are queued in DESCENDING order of maximum willing price (highest paying buyer first).
     Ties are broken by earliest timestamp (FIFO).

3. Feasibility / Compatibility Condition:
   A match is feasible if and only if:
       buyer.maximum_price_per_kwh >= seller.asking_price_per_kwh
   If the highest remaining buyer bid is strictly lower than the lowest remaining seller ask,
   no further mutually agreeable trades exist and the matching round terminates immediately
   (price mismatch).

4. Partial & Multi-Party Matching:
   For every compatible pair:
       traded_energy = min(seller.remaining_energy_kwh, buyer.remaining_energy_kwh)
   - If seller energy > buyer energy: buyer is completely filled; seller remaining energy
     persists in the order book to be matched with the next highest buyer.
   - If buyer energy > seller energy: seller is completely filled; buyer remaining energy
     persists in the order book to be matched with the next cheapest seller.
   - If buyer energy == seller energy: both orders are completely filled and both advance.

5. Clearing Price Determination:
   By default, the engine applies the Midpoint (Split-the-Surplus) Pricing Rule:
       clearing_price = (seller.asking_price + buyer.maximum_price) / 2
   This guarantees that both buyer and seller extract equal economic surplus from the trade.
"""

import uuid
import random
from typing import List, Tuple, Optional, Dict, Any
from simulation.models import Household
from trading.models import EnergyOffer, EnergyBid, Trade
from trading.order_book import OrderBook
from trading.pricing import PricingStrategy, MidpointPricingStrategy, GridReferencePricing


class DoubleAuctionMatcher:
    """Executes discrete double-auction clearing for P2P electricity transactions."""

    def __init__(
        self,
        pricing_strategy: Optional[PricingStrategy] = None,
        trade_id_prefix: str = "TRD",
    ):
        self.pricing_strategy = pricing_strategy or MidpointPricingStrategy()
        self.trade_id_prefix = trade_id_prefix
        self._trade_counter = 0

    def generate_trade_id(self) -> str:
        """Generate an incremental, unique trade identifier."""
        self._trade_counter += 1
        return f"{self.trade_id_prefix}-{self._trade_counter:05d}"

    def match(self, order_book: OrderBook) -> List[Trade]:
        """Execute double-auction matching on an order book.
        
        Args:
            order_book: OrderBook containing active offers and bids.
            
        Returns:
            List[Trade]: List of executed Trade objects.
        """
        trades: List[Trade] = []
        sorted_offers = order_book.get_sorted_offers()
        sorted_bids = order_book.get_sorted_bids()

        offer_idx = 0
        bid_idx = 0

        while offer_idx < len(sorted_offers) and bid_idx < len(sorted_bids):
            offer = sorted_offers[offer_idx]
            bid = sorted_bids[bid_idx]

            # Same-Community Matching Rule:
            # Cross-community trading is strictly prohibited in the localized microgrid model.
            if offer.community_id != bid.community_id:
                # If communities differ, skip or advance incompatible pair
                offer_idx += 1
                continue

            # Price Compatibility Check
            if bid.maximum_price_per_kwh < offer.asking_price_per_kwh:
                # Since bids are sorted descending, all subsequent bids will be <= this bid.
                # Therefore, no further matches are possible with this or any higher-priced offer.
                break

            # Calculate traded volume: minimum of available amounts
            traded_energy = min(offer.remaining_energy_kwh, bid.remaining_energy_kwh)

            if traded_energy <= 1e-6:
                if offer.is_filled:
                    offer_idx += 1
                if bid.is_filled:
                    bid_idx += 1
                continue

            # Determine transaction clearing price
            clearing_price = self.pricing_strategy.determine_clearing_price(offer, bid)
            total_value = round(traded_energy * clearing_price, 4)
            timestamp = bid.timestamp or offer.timestamp

            trade = Trade(
                trade_id=self.generate_trade_id(),
                community_id=offer.community_id,
                seller_id=offer.seller_id,
                buyer_id=bid.buyer_id,
                energy_kwh=round(traded_energy, 4),
                price_per_kwh=round(clearing_price, 4),
                total_value=total_value,
                timestamp=timestamp,
                status="COMPLETED",
            )
            trades.append(trade)

            # Update order remaining quantities
            offer.fill(traded_energy)
            bid.fill(traded_energy)

            # Advance pointers when orders are completely filled
            if offer.is_filled:
                offer_idx += 1
            if bid.is_filled:
                bid_idx += 1

        return trades

    def create_orders_from_simulation(
        self,
        households: List[Household],
        timestamp: str,
        default_seller_ask: float = 0.10,
        default_buyer_bid: float = 0.18,
        price_noise: bool = False,
        random_seed: Optional[int] = None,
    ) -> OrderBook:
        """Consume households from the simulation engine and populate an OrderBook.
        
        Args:
            households: Virtual households from the simulation engine.
            timestamp: Current interval time (e.g. "12:15").
            default_seller_ask: Baseline seller asking price ($/kWh).
            default_buyer_bid: Baseline buyer maximum bid ($/kWh).
            price_noise: Whether to add minor stochastic valuation variation.
            random_seed: Optional random seed for reproducible pricing.
            
        Returns:
            OrderBook populated with EnergyOffers and EnergyBids.
        """
        rng = random.Random(random_seed) if random_seed is not None else random.Random(42)
        order_book = OrderBook()

        for hh in households:
            hh_comm = getattr(hh, "community_id", "COMM-001")

            # Extract participation settings with resilient backward-compatible fallback
            selling_flag = getattr(hh, "selling_enabled", None)
            if selling_flag is None:
                selling_flag = getattr(hh, "share_surplus_enabled", True)
            selling_enabled = bool(selling_flag)

            buying_flag = getattr(hh, "buying_enabled", None)
            if buying_flag is None:
                buying_flag = getattr(hh, "buy_community_energy_enabled", True)
            buying_enabled = bool(buying_flag)

            # Sellers: households with positive net surplus AND selling enabled
            if hh.current_surplus_kwh > 1e-4 and selling_enabled:
                ask_price = default_seller_ask
                if price_noise:
                    ask_price = round(default_seller_ask + rng.uniform(-0.02, 0.02), 4)
                offer = EnergyOffer(
                    seller_id=hh.household_id,
                    community_id=hh_comm,
                    energy_amount_kwh=hh.current_surplus_kwh,
                    asking_price_per_kwh=max(0.01, ask_price),
                    timestamp=timestamp,
                )
                order_book.add_offer(offer)

            # Buyers: households with positive net deficit AND buying enabled
            elif hh.current_deficit_kwh > 1e-4 and buying_enabled:
                bid_price = default_buyer_bid
                if price_noise:
                    bid_price = round(default_buyer_bid + rng.uniform(-0.02, 0.02), 4)
                bid = EnergyBid(
                    buyer_id=hh.household_id,
                    community_id=hh_comm,
                    energy_amount_kwh=hh.current_deficit_kwh,
                    maximum_price_per_kwh=max(0.01, bid_price),
                    timestamp=timestamp,
                )
                order_book.add_bid(bid)


        return order_book

    def execute_simulation_interval(
        self,
        households: List[Household],
        timestamp: str,
        default_seller_ask: float = 0.10,
        default_buyer_bid: float = 0.18,
        price_noise: bool = False,
        random_seed: Optional[int] = None,
    ) -> Tuple[List[Trade], OrderBook]:
        """Convenience method to convert simulation output into orders and execute trading.
        
        Returns:
            Tuple[List[Trade], OrderBook]: Executed trades and post-clearing order book.
        """
        order_book = self.create_orders_from_simulation(
            households=households,
            timestamp=timestamp,
            default_seller_ask=default_seller_ask,
            default_buyer_bid=default_buyer_bid,
            price_noise=price_noise,
            random_seed=random_seed,
        )
        trades = self.match(order_book)
        return trades, order_book
