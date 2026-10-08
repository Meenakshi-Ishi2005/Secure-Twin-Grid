import sys
import os

# Add root folder to sys.path so simulation module can be run directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from simulation.config import SimulationConfig
from simulation.engine import SimulationEngine


def print_10_household_report():
    print("=" * 80)
    print(" SECURETWINGRID: DIGITAL TWIN SIMULATION REPORT (10 HOUSEHOLDS, 24 HOURS)")
    print(" Pure Software Simulation — Zero Physical Hardware Required")
    print("=" * 80)

    # 1. Initialize simulation with 10 households
    config_10 = SimulationConfig(
        num_households=10,
        interval_minutes=15,
        duration_hours=24,
        random_seed=42,
    )
    engine_10 = SimulationEngine(config=config_10)

    print("\n[1] INITIAL HOUSEHOLD ASSET INVENTORY:")
    print("-" * 80)
    print(f"{'ID':<8} | {'Solar':<7} | {'PV (kW)':<8} | {'Battery':<8} | {'BESS (kWh)':<10} | {'EV':<6} | {'EV (kWh)':<8} | {'Base (kW)':<9}")
    print("-" * 80)
    for hh in engine_10.households:
        solar_str = "YES" if hh.has_solar else "NO"
        bat_str = "YES" if hh.has_battery else "NO"
        ev_str = "YES" if hh.has_ev else "NO"
        bess_info = f"{hh.battery_level_kwh:.1f}/{hh.battery_capacity_kwh:.1f}" if hh.has_battery else "N/A"
        ev_info = f"{hh.ev_charge_level_kwh:.1f}/{hh.ev_battery_capacity_kwh:.1f}" if hh.has_ev else "N/A"

        print(
            f"{hh.household_id:<8} | {solar_str:<7} | {hh.solar_capacity_kw:<8.1f} | "
            f"{bat_str:<8} | {bess_info:<10} | {ev_str:<6} | {ev_info:<8} | {hh.base_consumption_kw:<9.2f}"
        )
    print("-" * 80)

    # 2. Run simulation
    print(f"\n[2] EXECUTING 24-HOUR SIMULATION (96 intervals of 15 minutes)...")
    history = engine_10.run_simulation()

    # 3. Snapshot intervals: 00:00 (Night), 07:30 (Morning Peak), 12:30 (Solar Peak), 19:30 (Evening Peak)
    sample_steps = [0, 30, 50, 78]  # corresponding to 00:00, 07:30, 12:30, 19:30
    print("\n[3] KEY TIME-STEP SNAPSHOTS ACROSS THE MICROGRID:")
    print("-" * 80)
    print(f"{'Time':<7} | {'Total Gen':<11} | {'Total Load':<12} | {'Surplus':<10} | {'Deficit':<10} | {'Sellers':<8} | {'Buyers':<7} | {'Balanced':<8}")
    print("-" * 80)
    for s_idx in sample_steps:
        s = history[s_idx]
        print(
            f"{s.time_str:<7} | {s.total_generation_kw:>7.2f} kW | {s.total_consumption_kw:>8.2f} kW | "
            f"{s.total_surplus_kwh:>6.2f} kWh | {s.total_deficit_kwh:>6.2f} kWh | "
            f"{s.sellers_count:>7} | {s.buyers_count:>6} | {s.balanced_count:>8}"
        )
    print("-" * 80)

    # 4. Final household state at the end of the day (Step 96 / 23:45)
    print("\n[4] END-OF-DAY STATUS (INTERVAL 23:45 - 24:00):")
    print("-" * 80)
    print(f"{'ID':<8} | {'Gen (kW)':<9} | {'Load (kW)':<10} | {'Battery (kWh)':<14} | {'Surplus':<10} | {'Deficit':<10} | {'Status':<9}")
    print("-" * 80)
    for hh in engine_10.households:
        bess_str = f"{hh.battery_level_kwh:.2f}/{hh.battery_capacity_kwh:.2f}" if hh.has_battery else "N/A"
        print(
            f"{hh.household_id:<8} | {hh.current_generation_kw:>7.2f}  | {hh.current_consumption_kw:>8.2f}   | "
            f"{bess_str:<14} | {hh.current_surplus_kwh:>6.3f} kWh | {hh.current_deficit_kwh:>6.3f} kWh | {hh.status:<9}"
        )
    print("-" * 80)

    # 5. 24-hour summary totals
    summary = engine_10.get_summary_report()
    print("\n[5] 24-HOUR AGGREGATED MICROGRID TOTALS:")
    print(f"  • Total Households:        {summary['households_count']}")
    print(f"  • Total Solar Installed:   {summary['solar_households']} homes")
    print(f"  • Total Batteries Active:  {summary['battery_households']} homes")
    print(f"  • Total EV Consumers:      {summary['ev_households']} homes")
    print(f"  • Total Energy Generated:  {summary['total_generation_kwh']} kWh")
    print(f"  • Total Energy Consumed:   {summary['total_consumption_kwh']} kWh")
    print(f"  • Total P2P Trade Surplus: {summary['total_surplus_kwh']} kWh")
    print(f"  • Total P2P Trade Deficit: {summary['total_deficit_kwh']} kWh")
    print("=" * 80)


def run_100_household_simulation():
    """Run a complete 24-hour simulation for 100 households at 15-minute intervals."""
    print("=" * 80)
    print(" SECURETWINGRID: 24-HOUR DIGITAL TWIN SIMULATION (100 HOUSEHOLDS)")
    print(" 15-Minute Discrete Time Intervals (96 Total Steps)")
    print("=" * 80)

    # 1. Initialize simulation with 100 households
    config = SimulationConfig(
        num_households=100,
        interval_minutes=15,
        duration_hours=24,
        random_seed=42,
    )
    engine = SimulationEngine(config=config)
    print(f"Initialized microgrid with {len(engine.households)} virtual households.")

    # 2. Run simulation
    print(f"Running simulation for {config.duration_hours} hours ({config.total_steps} intervals)...")
    history = engine.run_simulation()

    # 3. Obtain structured summary object
    summary = engine.get_summary()

    # 4. Print the exact required summary format
    print("\n" + "=" * 80)
    print(" SIMULATION SUMMARY")
    print("-" * 80)
    print(summary.format_report())
    print("=" * 80)

    # 5. Export to CSV
    output_dir = os.path.join(parent_dir, "data")
    csv_path = os.path.join(output_dir, "simulation_results_100hh_24h.csv")
    exported_file = engine.export_to_csv(csv_path)
    print(f"\n[+] Exported interval simulation results to CSV:\n    {exported_file}")

    return engine, summary


def demonstrate_configuration_flexibility():
    print("\n" + "=" * 80)
    print(" CONFIGURATION DEMONSTRATION: DEFAULT (100) vs EXPANDED (500) HOUSEHOLDS")
    print("=" * 80)

    # Default configuration: 100 households
    default_cfg = SimulationConfig()
    engine_100 = SimulationEngine(config=default_cfg)
    engine_100.run_simulation()
    res_100 = engine_100.get_summary_report()
    print(f"Default Config   -> Households: {res_100['households_count']:>4} | Gen: {res_100['total_generation_kwh']:>9.1f} kWh | Cons: {res_100['total_consumption_kwh']:>9.1f} kWh")

    # Scaled configuration: 500 households
    config_500 = SimulationConfig(num_households=500, random_seed=123)
    engine_500 = SimulationEngine(config=config_500)
    engine_500.run_simulation()
    res_500 = engine_500.get_summary_report()
    print(f"Configured (500) -> Households: {res_500['households_count']:>4} | Gen: {res_500['total_generation_kwh']:>9.1f} kWh | Cons: {res_500['total_consumption_kwh']:>9.1f} kWh")
    print("=" * 80)


if __name__ == "__main__":
    run_100_household_simulation()
    print("\n")
    demonstrate_configuration_flexibility()

