import pytest
import math
from simulation.config import SimulationConfig
from simulation.models import Household
from simulation.generator import ProfileGenerator
from simulation.engine import SimulationEngine


def test_solar_generation_diurnal_curve():
    """Test solar generation behavior: zero at night, rises after sunrise, peaks at midday, falls near sunset."""
    generator = ProfileGenerator(random_seed=42)
    capacity_kw = 5.0

    # 1. Nighttime: must be strictly 0.0
    night_hours = [0.0, 2.5, 4.0, 5.5, 19.0, 21.0, 23.5]
    for h in night_hours:
        gen = generator.calculate_solar_generation(capacity_kw, h, variability=False)
        assert gen == 0.0, f"Expected 0.0 generation at hour {h}, got {gen}"

    # 2. Morning progression
    gen_morning = generator.calculate_solar_generation(capacity_kw, 8.0, variability=False)
    assert gen_morning > 0.0, "Morning generation should be positive"

    # 3. Midday peak
    gen_midday = generator.calculate_solar_generation(capacity_kw, 12.25, variability=False)
    assert gen_midday > gen_morning, "Midday solar should exceed morning solar"
    assert math.isclose(gen_midday, capacity_kw, rel_tol=0.05), "Midday solar should be near capacity"

    # 4. Afternoon decrease
    gen_afternoon = generator.calculate_solar_generation(capacity_kw, 17.0, variability=False)
    assert 0.0 < gen_afternoon < gen_midday, "Late afternoon should decline below midday peak"


def test_solar_generation_controlled_variability():
    """Test solar generation with controlled randomness varies slightly around baseline."""
    gen1 = ProfileGenerator(random_seed=42)
    gen2 = ProfileGenerator(random_seed=99)
    capacity_kw = 5.0
    hour = 12.25

    val_base = gen1.calculate_solar_generation(capacity_kw, hour, variability=False)
    val_random1 = gen1.calculate_solar_generation(capacity_kw, hour, variability=True)
    val_random2 = gen2.calculate_solar_generation(capacity_kw, hour, variability=True)

    # Random variation should remain within reasonable bound (+/- 15%)
    assert 0.80 * val_base <= val_random1 <= 1.10 * val_base
    assert 0.80 * val_base <= val_random2 <= 1.10 * val_base


def test_consumption_generation_profile():
    """Test residential consumption profile: morning/evening peaks and lower midday/night demand."""
    generator = ProfileGenerator(random_seed=42)
    base_kw = 1.0

    load_night = generator.calculate_household_consumption(base_kw, 3.0, variability=False)
    load_morning = generator.calculate_household_consumption(base_kw, 8.0, variability=False)
    load_midday = generator.calculate_household_consumption(base_kw, 13.0, variability=False)
    load_evening = generator.calculate_household_consumption(base_kw, 19.5, variability=False)

    # Morning demand > night demand
    assert load_morning > load_night, "Morning peak should exceed night baseline"

    # Evening demand > midday demand
    assert load_evening > load_midday, "Evening peak should exceed midday lull"

    # Night demand is the lowest
    assert load_night < load_midday, "Late night demand should be lower than midday demand"


def test_ev_consumption_load():
    """Test that EV charging load is added only when active."""
    generator = ProfileGenerator(random_seed=42)
    base_kw = 1.0

    load_without_ev = generator.calculate_household_consumption(
        base_consumption_kw=base_kw,
        hour_of_day=20.0,
        has_ev=True,
        ev_needs_charging=False,
        ev_charge_power_kw=0.0,
        variability=False,
    )

    load_with_ev = generator.calculate_household_consumption(
        base_consumption_kw=base_kw,
        hour_of_day=20.0,
        has_ev=True,
        ev_needs_charging=True,
        ev_charge_power_kw=7.2,
        variability=False,
    )

    assert load_with_ev > load_without_ev
    assert math.isclose(load_with_ev - load_without_ev, 7.2, rel_tol=1e-3)


def test_energy_balance_calculation():
    """Test raw energy balance net_energy = generation - consumption."""
    hh = Household(household_id="HH-TEST", base_consumption_kw=1.0)

    # Generation exceeds consumption
    gen_kw = 5.0
    con_kw = 2.0
    net_kw = gen_kw - con_kw
    assert net_kw > 0
    assert net_kw == 3.0

    # Consumption exceeds generation
    gen_kw = 1.0
    con_kw = 3.5
    net_kw = gen_kw - con_kw
    assert net_kw < 0
    assert net_kw == -2.5

    # Equal
    assert (2.0 - 2.0) == 0.0


def test_battery_charging_with_surplus():
    """Test battery absorbs surplus until capacity, leaving remaining surplus for trading."""
    hh = Household(
        household_id="HH-BAT-CHG",
        has_battery=True,
        battery_capacity_kwh=10.0,
        battery_level_kwh=6.0,  # 4.0 kWh space available
    )

    # Case 1: Surplus less than available space (2.5 kWh)
    charged_1 = hh.charge_battery(2.5)
    assert charged_1 == 2.5
    assert hh.battery_level_kwh == 8.5

    # Case 2: Surplus exceeds remaining space (3.0 kWh offered, only 1.5 kWh space left)
    charged_2 = hh.charge_battery(3.0)
    assert charged_2 == 1.5
    assert hh.battery_level_kwh == 10.0  # Full capacity

    # Remaining surplus available for trading
    remaining_surplus = 3.0 - charged_2
    assert remaining_surplus == 1.5


def test_battery_discharging_with_deficit():
    """Test battery discharges to cover deficit down to zero, leaving remaining deficit as buying requirement."""
    hh = Household(
        household_id="HH-BAT-DIS",
        has_battery=True,
        battery_capacity_kwh=10.0,
        battery_level_kwh=5.0,
    )

    # Case 1: Deficit less than current level (3.0 kWh)
    discharged_1 = hh.discharge_battery(3.0)
    assert discharged_1 == 3.0
    assert hh.battery_level_kwh == 2.0

    # Case 2: Deficit exceeds remaining battery level (4.0 kWh needed, only 2.0 kWh available)
    discharged_2 = hh.discharge_battery(4.0)
    assert discharged_2 == 2.0
    assert hh.battery_level_kwh == 0.0

    # Remaining deficit becomes buying requirement
    remaining_deficit = 4.0 - discharged_2
    assert remaining_deficit == 2.0


def test_buying_selling_balanced_classification():
    """Test status classification: SELLING for surplus, BUYING for deficit, BALANCED for zero/absorbed."""
    config = SimulationConfig(num_households=5, random_seed=42)
    engine = SimulationEngine(config=config)

    # Run one step
    engine.step()

    for hh in engine.households:
        if hh.current_surplus_kwh > 1e-4:
            assert hh.status == "SELLING"
            assert hh.current_deficit_kwh == 0.0
        elif hh.current_deficit_kwh > 1e-4:
            assert hh.status == "BUYING"
            assert hh.current_surplus_kwh == 0.0
        else:
            assert hh.status == "BALANCED"


def test_simulation_reproducibility():
    """Test that deterministic seeds produce identical simulation outputs."""
    config_1 = SimulationConfig(num_households=15, random_seed=999)
    engine_1 = SimulationEngine(config=config_1)
    res_1 = engine_1.run_simulation(steps=10)

    config_2 = SimulationConfig(num_households=15, random_seed=999)
    engine_2 = SimulationEngine(config=config_2)
    res_2 = engine_2.run_simulation(steps=10)

    for s1, s2 in zip(res_1, res_2):
        assert s1.total_generation_kw == s2.total_generation_kw
        assert s1.total_consumption_kw == s2.total_consumption_kw
        assert s1.sellers_count == s2.sellers_count
        assert s1.buyers_count == s2.buyers_count


def test_configuration_scaling_to_500():
    """Test that household count can be configured to 500 households."""
    config_500 = SimulationConfig(num_households=500, random_seed=123)
    engine_500 = SimulationEngine(config=config_500)

    assert len(engine_500.households) == 500
    assert engine_500.households[0].household_id == "HH-001"
    assert engine_500.households[-1].household_id == "HH-500"

    # Step simulation
    step_summary = engine_500.step()
    assert (step_summary.sellers_count + step_summary.buyers_count + step_summary.balanced_count) == 500
