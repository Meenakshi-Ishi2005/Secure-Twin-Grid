import json

with open(r"c:\Users\Bhushan\OneDrive\Documents\Pract_MSc\msc_rp\Secure-Twin-Grid\scratch\full_24h_trace.json") as f:
    records = json.load(f)

# Re-run for HH-006 to get exact bids, offers, trades
import os
import sys

root_dir = r"c:\Users\Bhushan\OneDrive\Documents\Pract_MSc\msc_rp\Secure-Twin-Grid"
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from simulation.engine import SimulationEngine
from simulation.config import SimulationConfig
from trading.matcher import DoubleAuctionMatcher

engine = SimulationEngine(SimulationConfig(num_households=100, interval_minutes=15, duration_hours=24, random_seed=42))
matcher = DoubleAuctionMatcher()

print("=== HH-006 (PURE BUYER / ZERO SOLAR) 12 CONSECUTIVE INTERVALS (06:15 to 09:00) ===")
print("| Time | User Gen | User Con | User Surplus | User Deficit | User Status | Buying Enabled | Sellers | Buyers | User Buy Bid | User Sell Offer | User Completed Trades |")
print("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")

for step in range(1, 37):
    summary = engine.step()
    trades, order_book = matcher.execute_simulation_interval(
        households=engine.households,
        timestamp=summary.time_str,
        default_seller_ask=0.10,
        default_buyer_bid=0.18,
        price_noise=True,
        random_seed=42 + summary.step,
    )
    if step >= 25:
        h6 = next(h for h in engine.households if h.household_id == 'HH-006')
        h6_trades = [t for t in trades if t.seller_id == 'HH-006' or t.buyer_id == 'HH-006']
        h6_bid = next((b for b in order_book.bids if b.buyer_id == 'HH-006'), None)
        h6_offer = next((o for o in order_book.offers if o.seller_id == 'HH-006'), None)
        
        sellers_c = sum(1 for h in engine.households if h.status == 'SELLING')
        buyers_c = sum(1 for h in engine.households if h.status == 'BUYING')
        
        buy_bid_s = f"{h6_bid.energy_amount_kwh:.4f} kWh @ ${h6_bid.maximum_price_per_kwh:.2f}" if h6_bid else "None"
        sell_off_s = f"{h6_offer.energy_amount_kwh:.4f} kWh @ ${h6_offer.asking_price_per_kwh:.2f}" if h6_offer else "None (Deficit)"
        
        print(f"| {summary.time_str} | {h6.current_generation_kw:.2f} kW | {h6.current_consumption_kw:.2f} kW | {h6.current_surplus_kwh:.4f} kWh | {h6.current_deficit_kwh:.4f} kWh | {h6.status} | {h6.buying_enabled} | {sellers_c} | {buyers_c} | {buy_bid_s} | {sell_off_s} | {len(h6_trades)} |")
