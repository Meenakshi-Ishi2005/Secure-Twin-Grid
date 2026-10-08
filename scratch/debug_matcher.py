import urllib.request
import json
import os
import sys

root_dir = r"c:\Users\Bhushan\OneDrive\Documents\Pract_MSc\msc_rp\Secure-Twin-Grid"
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from simulation.engine import SimulationEngine
from simulation.config import SimulationConfig
from trading.matcher import DoubleAuctionMatcher
from trading.order_book import OrderBook

# Let's create an engine, step to step 32 (08:00), and inspect the matcher!
engine = SimulationEngine(SimulationConfig(num_households=100, interval_minutes=15, duration_hours=24, random_seed=42))
matcher = DoubleAuctionMatcher()

for s in range(32):
    summary = engine.step()

print(f"Engine at step {engine.current_step}, time {summary.time_str}")
print(f"Households with surplus > 0: {sum(1 for h in engine.households if h.current_surplus_kwh > 0)}")
print(f"Households with deficit > 0: {sum(1 for h in engine.households if h.current_deficit_kwh > 0)}")

# Let's inspect create_orders_from_simulation
order_book = matcher.create_orders_from_simulation(
    households=engine.households,
    timestamp=summary.time_str,
    default_seller_ask=0.10,
    default_buyer_bid=0.18,
    price_noise=True,
    random_seed=42 + summary.step,
)

print(f"OrderBook offers: {len(order_book.offers)}")
print(f"OrderBook bids: {len(order_book.bids)}")

# Let's inspect the first 5 offers and first 5 bids
print("Sample Offers:")
for o in order_book.offers[:5]:
    print(f"  Seller: {o.seller_id}, Comm: {o.community_id}, Energy: {o.energy_amount_kwh} kWh, Ask: ${o.asking_price_per_kwh}")

print("Sample Bids:")
for b in order_book.bids[:5]:
    print(f"  Buyer: {b.buyer_id}, Comm: {b.community_id}, Energy: {b.energy_amount_kwh} kWh, Bid: ${b.maximum_price_per_kwh}")

# Let's run matcher.match(order_book)
trades = matcher.match(order_book)
print(f"Matched trades: {len(trades)}")
for t in trades[:10]:
    print(f"  Trade {t.trade_id}: {t.seller_id} -> {t.buyer_id}, {t.energy_kwh} kWh @ ${t.price_per_kwh}")
