import sys
import os
import csv

# Add root folder to sys.path so trading module can be run directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from simulation.config import SimulationConfig
from simulation.engine import SimulationEngine
from trading.matcher import DoubleAuctionMatcher
from trading.settlement import SettlementEngine


def run_p2p_trading_simulation():
    print("=" * 80)
    print(" SECURETWINGRID: P2P ELECTRICITY TRADING ENGINE EXECUTION")
    print(" Double-Auction Mechanism Consuming 100-Household Digital Twin Simulation")
    print("=" * 80)

    # 1. Initialize simulation engine
    config = SimulationConfig(
        num_households=100,
        interval_minutes=15,
        duration_hours=24,
        random_seed=42,
    )
    sim_engine = SimulationEngine(config=config)
    matcher = DoubleAuctionMatcher()
    settlement = SettlementEngine()

    all_trades = []
    interval_stats = []

    print(f"Executing 24-hour P2P market clearing (96 intervals of 15 min)...")

    for step_idx in range(config.total_steps):
        step_summary = sim_engine.step()
        timestamp = step_summary.time_str

        # Match households with surplus (sellers) and deficit (buyers)
        trades, order_book = matcher.execute_simulation_interval(
            households=sim_engine.households,
            timestamp=timestamp,
            default_seller_ask=0.10,
            default_buyer_bid=0.18,
            price_noise=True,
            random_seed=42 + step_idx,
        )

        all_trades.extend(trades)
        settlement.settle_trades(trades)

        traded_vol = sum(t.energy_kwh for t in trades)
        interval_stats.append({
            "step": step_idx,
            "time": timestamp,
            "offers_count": len(order_book.offers),
            "bids_count": len(order_book.bids),
            "trades_count": len(trades),
            "volume_kwh": round(traded_vol, 4),
        })

    summary = settlement.get_summary()

    # 2. Print P2P Market Report
    print("\n" + "=" * 80)
    print(" P2P ELECTRICITY MARKET SUMMARY (24 HOURS):")
    print("-" * 80)
    print(f"  • Total Completed Trades:       {summary.total_trades:,}")
    print(f"  • Total P2P Volume Traded:      {summary.total_volume_kwh:,.2f} kWh")
    print(f"  • Total Financial Turnover:     ${summary.total_value:,.2f}")
    print(f"  • Average Clearing Price:       ${summary.average_price_per_kwh:.4f} / kWh")
    print(f"  • Total Seller Revenue:         ${summary.total_seller_revenue:,.2f}")
    print(f"  • Total Buyer Expenditure:      ${summary.total_buyer_expenditure:,.2f}")
    print(f"  • Participating Households:     {len(summary.accounts)} prosumers/consumers")
    print("=" * 80)

    # 3. Peak Trading Intervals
    sorted_by_volume = sorted(interval_stats, key=lambda s: s["volume_kwh"], reverse=True)
    print("\nTOP 5 PEAK P2P TRADING INTERVALS:")
    print("-" * 80)
    print(f"{'Time':<8} | {'Offers':<8} | {'Bids':<8} | {'Trades':<8} | {'Volume Traded (kWh)':<20}")
    print("-" * 80)
    for s in sorted_by_volume[:5]:
        print(f"{s['time']:<8} | {s['offers_count']:<8} | {s['bids_count']:<8} | {s['trades_count']:<8} | {s['volume_kwh']:<20.2f}")
    print("-" * 80)

    # 4. Sample Executed Trades
    print("\nSAMPLE EXECUTED TRADES (FIRST 6 TRANSACTIONS):")
    print("-" * 80)
    print(f"{'Trade ID':<11} | {'Time':<7} | {'Seller':<9} | {'Buyer':<9} | {'Energy (kWh)':<14} | {'Price ($/kWh)':<14} | {'Total ($)':<10}")
    print("-" * 80)
    for t in all_trades[:6]:
        print(
            f"{t.trade_id:<11} | {t.timestamp:<7} | {t.seller_id:<9} | {t.buyer_id:<9} | "
            f"{t.energy_kwh:>10.3f} kWh | ${t.price_per_kwh:>10.4f} | ${t.total_value:>7.2f}"
        )
    print("-" * 80)

    # 5. Export Trades to CSV
    output_dir = os.path.join(parent_dir, "data")
    os.makedirs(output_dir, exist_ok=True)
    trades_csv_path = os.path.join(output_dir, "trading_trades_100hh_24h.csv")

    fieldnames = [
        "trade_id",
        "timestamp",
        "seller_id",
        "buyer_id",
        "energy_kwh",
        "price_per_kwh",
        "total_value",
        "status",
    ]

    with open(trades_csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for t in all_trades:
            writer.writerow(t.to_dict())

    print(f"\n[+] Exported all {len(all_trades)} executed trades to CSV:\n    {trades_csv_path}\n")


if __name__ == "__main__":
    run_p2p_trading_simulation()
