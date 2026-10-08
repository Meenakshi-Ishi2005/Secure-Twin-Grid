from abc import ABC, abstractmethod
from typing import Tuple
from trading.models import EnergyOffer, EnergyBid


class PricingStrategy(ABC):
    """Abstract base class for determining the clearing price in double auctions."""

    @abstractmethod
    def determine_clearing_price(self, offer: EnergyOffer, bid: EnergyBid) -> float:
        """Calculate clearing price given an accepted offer and bid.
        
        Args:
            offer: Matched EnergyOffer
            bid: Matched EnergyBid
            
        Returns:
            float: Transaction price per kWh.
        """
        pass


class MidpointPricingStrategy(PricingStrategy):
    """Fair double auction pricing: splits the surplus evenly between buyer and seller.
    
    Price = (seller_asking_price + buyer_maximum_price) / 2
    """

    def determine_clearing_price(self, offer: EnergyOffer, bid: EnergyBid) -> float:
        return round((offer.asking_price_per_kwh + bid.maximum_price_per_kwh) / 2.0, 4)


class SellerAskPricingStrategy(PricingStrategy):
    """Clearing price equals the seller's asking price."""

    def determine_clearing_price(self, offer: EnergyOffer, bid: EnergyBid) -> float:
        return round(offer.asking_price_per_kwh, 4)


class BuyerBidPricingStrategy(PricingStrategy):
    """Clearing price equals the buyer's maximum bid price."""

    def determine_clearing_price(self, offer: EnergyOffer, bid: EnergyBid) -> float:
        return round(bid.maximum_price_per_kwh, 4)


class GridReferencePricing:
    """Provides market benchmark boundaries based on utility grid tariffs.
    
    Typical values:
    - feed_in_tariff: Grid export rate prosumers receive from utility (e.g. $0.08/kWh).
    - retail_rate: Grid import rate consumers pay to utility (e.g. $0.22/kWh).
    P2P trades are mutually beneficial when:
    feed_in_tariff <= P2P price <= retail_rate
    """

    def __init__(
        self,
        feed_in_tariff: float = 0.08,
        retail_rate: float = 0.22,
    ):
        self.feed_in_tariff = feed_in_tariff
        self.retail_rate = retail_rate

    def generate_seller_ask(self, markup_ratio: float = 0.20) -> float:
        """Generate seller asking price slightly above feed-in tariff.
        
        e.g. $0.08 + (0.20 * ($0.22 - $0.08)) = $0.108 / kWh
        """
        spread = self.retail_rate - self.feed_in_tariff
        return round(self.feed_in_tariff + (spread * markup_ratio), 4)

    def generate_buyer_max_bid(self, discount_ratio: float = 0.20) -> float:
        """Generate buyer maximum bid slightly below retail grid rate.
        
        e.g. $0.22 - (0.20 * ($0.22 - $0.08)) = $0.192 / kWh
        """
        spread = self.retail_rate - self.feed_in_tariff
        return round(self.retail_rate - (spread * discount_ratio), 4)
