import csv
import os
import random
from typing import List, Dict, Any, Optional
from simulation.config import SimulationConfig
from simulation.models import Household, GridStepSummary, SimulationSummary
from simulation.generator import ProfileGenerator



class SimulationEngine:
    """Core digital twin simulation engine for SecureTwinGrid microgrid.
    
    Coordinates virtual households, time progression, solar and consumption
    profile synthesis, battery management, and peer-to-peer energy balance classification.
    """

    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or SimulationConfig()
        self.generator = ProfileGenerator(random_seed=self.config.random_seed)
        self.households: List[Household] = []
        self.step_history: List[GridStepSummary] = []
        self.current_step: int = 0
        self.initialize_households()

    def initialize_households(self) -> None:
        """Create and populate virtual households based on configuration probabilities."""
        rng = random.Random(self.config.random_seed)
        self.households.clear()
        self.step_history.clear()
        self.current_step = 0

        for i in range(1, self.config.num_households + 1):
            hid = f"HH-{i:03d}"

            # Solar configuration
            has_solar = rng.random() < self.config.solar_probability
            solar_cap = (
                round(rng.uniform(self.config.solar_min_kw, self.config.solar_max_kw), 2)
                if has_solar
                else 0.0
            )

            # Stationary Battery configuration
            has_battery = rng.random() < self.config.battery_probability
            battery_cap = (
                round(rng.uniform(self.config.battery_min_kwh, self.config.battery_max_kwh), 2)
                if has_battery
                else 0.0
            )
            initial_battery_ratio = rng.uniform(
                self.config.battery_initial_min_ratio,
                self.config.battery_initial_max_ratio
            )
            battery_level = round(battery_cap * initial_battery_ratio, 2) if has_battery else 0.0

            # EV configuration (Software consumer/storage only, no physical motion)
            has_ev = rng.random() < self.config.ev_probability
            ev_cap = (
                round(rng.uniform(self.config.ev_min_kwh, self.config.ev_max_kwh), 2)
                if has_ev
                else 0.0
            )
            initial_ev_ratio = rng.uniform(
                self.config.ev_initial_min_ratio,
                self.config.ev_initial_max_ratio
            )
            ev_level = round(ev_cap * initial_ev_ratio, 2) if has_ev else 0.0

            # Base electrical load
            base_cons = round(
                rng.uniform(self.config.base_consumption_min_kw, self.config.base_consumption_max_kw),
                2
            )

            # Ensure designated user prosumer households (HH-001 and HH-006) have solar PV and battery
            if hid in ("HH-001", "HH-006"):
                if not has_solar or solar_cap <= 0:
                    has_solar = True
                    solar_cap = 5.25
                if not has_battery or battery_cap <= 0:
                    has_battery = True
                    battery_cap = 9.50
                    battery_level = 4.75

            hh = Household(
                household_id=hid,
                community_id=self.config.community_id,
                has_solar=has_solar,
                solar_capacity_kw=solar_cap,
                has_battery=has_battery,
                battery_capacity_kwh=battery_cap,
                battery_level_kwh=battery_level,
                has_ev=has_ev,
                ev_battery_capacity_kwh=ev_cap,
                ev_charge_level_kwh=ev_level,
                base_consumption_kw=base_cons,
                current_generation_kw=0.0,
                current_consumption_kw=0.0,
                current_surplus_kwh=0.0,
                current_deficit_kwh=0.0,
                status="BALANCED",
            )

            self.households.append(hh)

    def step(self) -> GridStepSummary:
        """Advance the microgrid simulation by one time-step (e.g. 15 minutes)."""
        dt_hours = self.config.interval_hours
        step_idx = self.current_step
        total_minutes = step_idx * self.config.interval_minutes
        hour_of_day = (total_minutes / 60.0) % 24.0

        time_hours = int(hour_of_day)
        time_mins = int((hour_of_day - time_hours) * 60)
        time_str = f"{time_hours:02d}:{time_mins:02d}"

        step_gen_kw = 0.0
        step_con_kw = 0.0
        step_surplus_kwh = 0.0
        step_deficit_kwh = 0.0
        sellers = 0
        buyers = 0
        balanced = 0
        total_battery_stored = 0.0
        total_battery_cap = 0.0

        for hh in self.households:
            # 1. Solar generation (kW)
            if hh.has_solar and hh.solar_capacity_kw > 0:
                hh.current_generation_kw = self.generator.calculate_solar_generation(
                    hh.solar_capacity_kw,
                    hour_of_day,
                    variability=True
                )
            else:
                hh.current_generation_kw = 0.0

            # 2. EV charging state (optional evening/night charging)
            is_charging_window = (hour_of_day >= 19.0 or hour_of_day < 4.0)
            ev_needs_charge = hh.has_ev and (hh.ev_charge_level_kwh < hh.ev_battery_capacity_kwh * 0.95)
            ev_active = is_charging_window and ev_needs_charge
            ev_power = self.config.ev_charging_power_kw if ev_active else 0.0

            # 3. Electricity consumption (kW)
            hh.current_consumption_kw = self.generator.calculate_household_consumption(
                base_consumption_kw=hh.base_consumption_kw,
                hour_of_day=hour_of_day,
                has_ev=hh.has_ev,
                ev_needs_charging=ev_active,
                ev_charge_power_kw=ev_power,
                variability=True
            )

            # Update EV state of charge if charging
            if ev_active:
                ev_energy_drawn = ev_power * dt_hours
                hh.charge_ev(ev_energy_drawn)

            # 4. Energy balances over interval (kWh)
            energy_gen = hh.current_generation_kw * dt_hours
            energy_con = hh.current_consumption_kw * dt_hours
            net_energy = energy_gen - energy_con

            # 5. Stationary Battery Storage & Trading Classification
            if net_energy > 0:
                # Household has surplus energy
                if hh.has_battery:
                    energy_charged = hh.charge_battery(net_energy)
                    remaining_surplus = net_energy - energy_charged
                else:
                    remaining_surplus = net_energy

                hh.current_surplus_kwh = round(max(0.0, remaining_surplus), 4)
                hh.current_deficit_kwh = 0.0

            elif net_energy < 0:
                # Household has energy deficit
                deficit = abs(net_energy)
                if hh.has_battery:
                    energy_discharged = hh.discharge_battery(deficit)
                    remaining_deficit = deficit - energy_discharged
                else:
                    remaining_deficit = deficit

                hh.current_deficit_kwh = round(max(0.0, remaining_deficit), 4)
                hh.current_surplus_kwh = 0.0

            else:
                hh.current_surplus_kwh = 0.0
                hh.current_deficit_kwh = 0.0

            # 6. Status classification
            # SELLING if surplus available to trade, BUYING if deficit needed, BALANCED if self-satisfied
            if hh.current_surplus_kwh > 1e-4:
                hh.status = "SELLING"
                sellers += 1
            elif hh.current_deficit_kwh > 1e-4:
                hh.status = "BUYING"
                buyers += 1
            else:
                hh.status = "BALANCED"
                balanced += 1

            # Tally metrics
            step_gen_kw += hh.current_generation_kw
            step_con_kw += hh.current_consumption_kw
            step_surplus_kwh += hh.current_surplus_kwh
            step_deficit_kwh += hh.current_deficit_kwh

            if hh.has_battery:
                total_battery_stored += hh.battery_level_kwh
                total_battery_cap += hh.battery_capacity_kwh

        summary = GridStepSummary(
            step=step_idx,
            time_str=time_str,
            hour_of_day=hour_of_day,
            total_generation_kw=round(step_gen_kw, 2),
            total_consumption_kw=round(step_con_kw, 2),
            total_generation_kwh=round(step_gen_kw * dt_hours, 2),
            total_consumption_kwh=round(step_con_kw * dt_hours, 2),
            total_surplus_kwh=round(step_surplus_kwh, 2),
            total_deficit_kwh=round(step_deficit_kwh, 2),
            sellers_count=sellers,
            buyers_count=buyers,
            balanced_count=balanced,
            total_battery_stored_kwh=round(total_battery_stored, 2),
            total_battery_capacity_kwh=round(total_battery_cap, 2),
        )

        self.step_history.append(summary)
        self.current_step += 1
        return summary

    def run_simulation(self, steps: Optional[int] = None) -> List[GridStepSummary]:
        """Execute the simulation for the configured duration (default: 24h = 96 steps)."""
        total_steps = steps if steps is not None else self.config.total_steps
        for _ in range(total_steps):
            self.step()
        return self.step_history

    def get_summary(self) -> SimulationSummary:
        """Compute structured SimulationSummary metrics across all simulation steps."""
        total_gen_kwh = sum(s.total_generation_kwh for s in self.step_history)
        total_con_kwh = sum(s.total_consumption_kwh for s in self.step_history)
        total_surplus_kwh = sum(s.total_surplus_kwh for s in self.step_history)
        total_deficit_kwh = sum(s.total_deficit_kwh for s in self.step_history)

        peak_gen_kw = max((s.total_generation_kw for s in self.step_history), default=0.0)
        peak_demand_kw = max((s.total_consumption_kw for s in self.step_history), default=0.0)
        max_buyers = max((s.buyers_count for s in self.step_history), default=0)
        max_sellers = max((s.sellers_count for s in self.step_history), default=0)

        return SimulationSummary(
            total_generation_kwh=round(total_gen_kwh, 2),
            total_consumption_kwh=round(total_con_kwh, 2),
            total_surplus_kwh=round(total_surplus_kwh, 2),
            total_deficit_kwh=round(total_deficit_kwh, 2),
            peak_generation_kw=round(peak_gen_kw, 2),
            peak_demand_kw=round(peak_demand_kw, 2),
            max_buyers=max_buyers,
            max_sellers=max_sellers,
            num_households=len(self.households),
            total_steps=len(self.step_history),
            duration_hours=round(len(self.step_history) * self.config.interval_hours, 2),
        )

    def get_summary_report(self) -> Dict[str, Any]:
        """Compute comprehensive 24-hour summary metrics across all households."""
        summary = self.get_summary()
        solar_count = sum(1 for h in self.households if h.has_solar)
        battery_count = sum(1 for h in self.households if h.has_battery)
        ev_count = sum(1 for h in self.households if h.has_ev)

        report = summary.to_dict()
        report.update({
            "households_count": len(self.households),
            "solar_households": solar_count,
            "battery_households": battery_count,
            "ev_households": ev_count,
        })
        return report

    def export_to_csv(self, filepath: str) -> str:
        """Export simulation interval step history to a CSV file.
        
        Args:
            filepath: Destination file path for the CSV.
            
        Returns:
            str: Normalized absolute path to the exported CSV file.
        """
        abs_path = os.path.abspath(filepath)
        parent_dir = os.path.dirname(abs_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

        fieldnames = [
            "step",
            "time",
            "hour_of_day",
            "total_generation_kw",
            "total_consumption_kw",
            "total_generation_kwh",
            "total_consumption_kwh",
            "total_surplus_kwh",
            "total_deficit_kwh",
            "battery_storage_kwh",
            "sellers_count",
            "buyers_count",
            "balanced_count",
            "total_battery_capacity_kwh",
        ]

        with open(abs_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for summary in self.step_history:
                writer.writerow(summary.to_dict())

        return abs_path

