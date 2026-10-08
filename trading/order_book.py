from typing import List, Dict, Any, Optional
from trading.models import EnergyOffer, EnergyBid


class OrderBook:
    """Maintains active energy offers and bids for a trading interval."""

    def __init__(self):
        self.offers: List[EnergyOffer] = []
        self.bids: List[EnergyBid] = []

    def add_offer(self, offer: EnergyOffer) -> None:
        """Add an energy offer from a selling household."""
        if offer.energy_amount_kwh > 0:
            self.offers.append(offer)

    def add_bid(self, bid: EnergyBid) -> None:
        """Add an energy bid from a buying household."""
        if bid.energy_amount_kwh > 0:
            self.bids.append(bid)

    def get_active_offers(self) -> List[EnergyOffer]:
        """Return non-filled seller offers."""
        return [o for o in self.offers if not o.is_filled]

    def get_active_bids(self) -> List[EnergyBid]:
        """Return non-filled buyer bids."""
        return [b for b in self.bids if not b.is_filled]

    def get_sorted_offers(self) -> List[EnergyOffer]:
        """Sort active seller offers by asking_price_per_kwh ascending (cheapest first).
        
        Tie-breaker: earliest timestamp.
        """
        return sorted(
            self.get_active_offers(),
            key=lambda o: (o.asking_price_per_kwh, o.timestamp)
        )

    def get_sorted_bids(self) -> List[EnergyBid]:
        """Sort active buyer bids by maximum_price_per_kwh descending (highest willingness to pay first).
        
        Tie-breaker: earliest timestamp.
        """
        return sorted(
            self.get_active_bids(),
            key=lambda b: (-b.maximum_price_per_kwh, b.timestamp)
        )

    @property
    def total_supply_kwh(self) -> float:
        """Sum of remaining energy across all active offers."""
        return round(sum(o.remaining_energy_kwh for o in self.get_active_offers()), 4)

    @property
    def total_demand_kwh(self) -> float:
        """Sum of remaining energy across all active bids."""
        return round(sum(b.remaining_energy_kwh for b in self.get_active_bids()), 4)

    @property
    def bid_ask_spread(self) -> Optional[float]:
        """Difference between highest bid price and lowest ask price."""
        sorted_bids = self.get_sorted_bids()
        sorted_offers = self.get_sorted_offers()
        if sorted_bids and sorted_offers:
            return round(sorted_bids[0].maximum_price_per_kwh - sorted_offers[0].asking_price_per_kwh, 4)
        return None

    def clear(self) -> None:
        """Reset the order book for the next trading interval."""
        self.offers.clear()
        self.bids.clear()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "active_offers_count": len(self.get_active_offers()),
            "active_bids_count": len(self.get_active_bids()),
            "total_supply_kwh": self.total_supply_kwh,
            "total_demand_kwh": self.total_demand_kwh,
            "bid_ask_spread": self.bid_ask_spread,
        }
