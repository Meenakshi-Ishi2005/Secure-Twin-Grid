import os
import sys
import json

root_dir = r"c:\Users\Bhushan\OneDrive\Documents\Pract_MSc\msc_rp\Secure-Twin-Grid"
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from simulation.engine import SimulationEngine
from simulation.config import SimulationConfig
from trading.matcher import DoubleAuctionMatcher
from trading.settlement import SettlementEngine
from blockchain.blockchain import Blockchain

engine = SimulationEngine(SimulationConfig(num_households=100, interval_minutes=15, duration_hours=24, random_seed=42))
matcher = DoubleAuctionMatcher()
blockchain = Blockchain()
settlement = SettlementEngine(blockchain=blockchain)

target_hh_ids = ['HH-001', 'HH-004', 'HH-006', 'HH-008', 'HH-014']
hh_trade_counts = {hid: 0 for hid in target_hh_ids}
interval_records = []

# Step through all 96 intervals
for step in range(1, 97):
    summary = engine.step()
    trades, order_book = matcher.execute_simulation_interval(
        households=engine.households,
        timestamp=summary.time_str,
        default_seller_ask=0.10,
        default_buyer_bid=0.18,
        price_noise=True,
        random_seed=42 + summary.step,
    )
    
    # Record for HH-014 specifically
    h14 = next(h for h in engine.households if h.household_id == 'HH-014')
    h14_trades = [t for t in trades if t.seller_id == 'HH-014' or t.buyer_id == 'HH-014']
    
    # Count sellers, buyers, orderbook
    surplus_households = sum(1 for h in engine.households if h.current_surplus_kwh > 0)
    selling_status_households = sum(1 for h in engine.households if h.status == 'SELLING')
    orderbook_offers_count = len(order_book.offers)
    
    deficit_households = sum(1 for h in engine.households if h.current_deficit_kwh > 0)
    buying_status_households = sum(1 for h in engine.households if h.status == 'BUYING')
    orderbook_bids_count = len(order_book.bids)
    
    for t in trades:
        if t.seller_id in hh_trade_counts:
            hh_trade_counts[t.seller_id] += 1
        if t.buyer_id in hh_trade_counts:
            hh_trade_counts[t.buyer_id] += 1
            
    # Check H14 bid / offer in orderbook
    h14_bid = next((b for b in order_book.bids if b.buyer_id == 'HH-014'), None)
    h14_offer = next((o for o in order_book.offers if o.seller_id == 'HH-014'), None)
    
    interval_records.append({
        "step": step,
        "time": summary.time_str,
        "gen": h14.current_generation_kw,
        "con": h14.current_consumption_kw,
        "surplus": h14.current_surplus_kwh,
        "deficit": h14.current_deficit_kwh,
        "status": h14.status,
        "buying_enabled": h14.buying_enabled,
        "selling_enabled": h14.selling_enabled,
        "surplus_hh_count": surplus_households,
        "selling_status_count": selling_status_households,
        "orderbook_offers": orderbook_offers_count,
        "deficit_hh_count": deficit_households,
        "buying_status_count": buying_status_households,
        "orderbook_bids": orderbook_bids_count,
        "h14_bid": {
            "energy": h14_bid.energy_amount_kwh,
            "price": h14_bid.maximum_price_per_kwh
        } if h14_bid else None,
        "h14_offer": {
            "energy": h14_offer.energy_amount_kwh,
            "price": h14_offer.asking_price_per_kwh
        } if h14_offer else None,
        "total_trades_this_step": len(trades),
        "h14_trades_this_step": len(h14_trades),
        "h14_trades": [
            {
                "trade_id": t.trade_id,
                "seller": t.seller_id,
                "buyer": t.buyer_id,
                "energy": t.energy_kwh,
                "price": t.price_per_kwh,
                "status": t.status,
                "time": t.timestamp
            } for t in h14_trades
        ],
        "all_trades_sample": [
            {
                "trade_id": t.trade_id,
                "seller": t.seller_id,
                "buyer": t.buyer_id,
                "energy": t.energy_kwh,
                "price": t.price_per_kwh,
                "status": t.status,
                "time": t.timestamp
            } for t in trades[:3]
        ]
    })

print("24-Hour Simulation Complete!")
print("Total Trades Per Target Household over 24h:")
for hid, count in hh_trade_counts.items():
    print(f"  {hid}: {count} trades")

with open(r"c:\Users\Bhushan\OneDrive\Documents\Pract_MSc\msc_rp\Secure-Twin-Grid\scratch\full_24h_trace.json", "w") as f:
    json.dump(interval_records, f, indent=2)
print("Saved full 24h trace to scratch/full_24h_trace.json")
