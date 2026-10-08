import csv
import math
import os
import tempfile
import pytest
from simulation.config import SimulationConfig
from simulation.engine import SimulationEngine
from simulation.models import SimulationSummary, GridStepSummary


@pytest.fixture(scope="module")
def executed_simulation():
    """Run a standard 100-household, 24-hour simulation once for consistency assertions."""
    config = SimulationConfig(
        num_households=100,
        interval_minutes=15,
        duration_hours=24,
        random_seed=42,
    )
    engine = SimulationEngine(config=config)
    engine.run_simulation()
    return engine


def test_simulation_structure_and_length(executed_simulation):
    """Verify that a 24-hour run with 15-minute intervals produces exactly 96 steps."""
    engine = executed_simulation
    assert len(engine.households) == 100
    assert len(engine.step_history) == 96

    # Verify time steps from 00:00 to 23:45
    assert engine.step_history[0].step == 0
    assert engine.step_history[0].time_str == "00:00"
    assert engine.step_history[-1].step == 95
    assert engine.step_history[-1].time_str == "23:45"


def test_household_partition_consistency(executed_simulation):
    """Verify that in every interval: sellers + buyers + balanced == total households."""
    engine = executed_simulation
    for step in engine.step_history:
        total_classified = step.sellers_count + step.buyers_count + step.balanced_count
        assert total_classified == 100, (
            f"Step {step.step} partition mismatch: {total_classified} != 100"
        )
        assert step.sellers_count >= 0
        assert step.buyers_count >= 0
        assert step.balanced_count >= 0


def test_household_status_consistency(executed_simulation):
    """Verify that household status strictly matches its surplus/deficit state."""
    engine = executed_simulation
    for hh in engine.households:
        if hh.current_surplus_kwh > 1e-4:
            assert hh.status == "SELLING"
            assert hh.current_deficit_kwh == 0.0
        elif hh.current_deficit_kwh > 1e-4:
            assert hh.status == "BUYING"
            assert hh.current_surplus_kwh == 0.0
        else:
            assert hh.status == "BALANCED"
            assert hh.current_surplus_kwh <= 1e-4
            assert hh.current_deficit_kwh <= 1e-4


def test_spatial_aggregation_consistency(executed_simulation):
    """Verify step-level aggregates equal the sum of household metrics at the current step."""
    engine = executed_simulation
    # Check end-of-day household states vs step 95
    last_step = engine.step_history[-1]

    sum_gen_kw = sum(hh.current_generation_kw for hh in engine.households)
    sum_con_kw = sum(hh.current_consumption_kw for hh in engine.households)
    sum_surplus_kwh = sum(hh.current_surplus_kwh for hh in engine.households)
    sum_deficit_kwh = sum(hh.current_deficit_kwh for hh in engine.households)
    sum_battery_kwh = sum(hh.battery_level_kwh for hh in engine.households if hh.has_battery)

    assert math.isclose(sum_gen_kw, last_step.total_generation_kw, abs_tol=0.1)
    assert math.isclose(sum_con_kw, last_step.total_consumption_kw, abs_tol=0.1)
    assert math.isclose(sum_surplus_kwh, last_step.total_surplus_kwh, abs_tol=0.1)
    assert math.isclose(sum_deficit_kwh, last_step.total_deficit_kwh, abs_tol=0.1)
    assert math.isclose(sum_battery_kwh, last_step.battery_storage_kwh, abs_tol=0.1)


def test_battery_storage_bounds(executed_simulation):
    """Verify that battery storage never exceeds capacity or drops below zero."""
    engine = executed_simulation
    for hh in engine.households:
        if hh.has_battery:
            assert 0.0 <= hh.battery_level_kwh <= (hh.battery_capacity_kwh + 1e-5), (
                f"Household {hh.household_id} battery level {hh.battery_level_kwh} out of bounds [0, {hh.battery_capacity_kwh}]"
            )
        else:
            assert hh.battery_capacity_kwh == 0.0
            assert hh.battery_level_kwh == 0.0

        if hh.has_ev:
            assert 0.0 <= hh.ev_charge_level_kwh <= (hh.ev_battery_capacity_kwh + 1e-5)
        else:
            assert hh.ev_battery_capacity_kwh == 0.0
            assert hh.ev_charge_level_kwh == 0.0


def test_simulation_summary_consistency(executed_simulation):
    """Verify that SimulationSummary matches interval history values exactly."""
    engine = executed_simulation
    summary = engine.get_summary()

    expected_gen = round(sum(s.total_generation_kwh for s in engine.step_history), 2)
    expected_con = round(sum(s.total_consumption_kwh for s in engine.step_history), 2)
    expected_surplus = round(sum(s.total_surplus_kwh for s in engine.step_history), 2)
    expected_deficit = round(sum(s.total_deficit_kwh for s in engine.step_history), 2)

    expected_peak_gen = max(s.total_generation_kw for s in engine.step_history)
    expected_peak_con = max(s.total_consumption_kw for s in engine.step_history)
    expected_max_buyers = max(s.buyers_count for s in engine.step_history)
    expected_max_sellers = max(s.sellers_count for s in engine.step_history)

    assert math.isclose(summary.total_generation_kwh, expected_gen, abs_tol=0.01)
    assert math.isclose(summary.total_consumption_kwh, expected_con, abs_tol=0.01)
    assert math.isclose(summary.total_surplus_kwh, expected_surplus, abs_tol=0.01)
    assert math.isclose(summary.total_deficit_kwh, expected_deficit, abs_tol=0.01)
    assert math.isclose(summary.peak_generation_kw, expected_peak_gen, abs_tol=0.01)
    assert math.isclose(summary.peak_demand_kw, expected_peak_con, abs_tol=0.01)
    assert summary.max_buyers == expected_max_buyers
    assert summary.max_sellers == expected_max_sellers
    assert summary.num_households == 100
    assert summary.total_steps == 96
    assert summary.duration_hours == 24.0

    # Test format_report string output contains all required keys
    report_text = summary.format_report()
    assert "Total Generation:" in report_text
    assert "Total Consumption:" in report_text
    assert "Total Surplus:" in report_text
    assert "Total Deficit:" in report_text
    assert "Peak Generation:" in report_text
    assert "Peak Demand:" in report_text
    assert "Maximum Buyers:" in report_text
    assert "Maximum Sellers:" in report_text


def test_csv_export_consistency(executed_simulation):
    """Verify that export_to_csv writes all 96 intervals with exact matching columns and rows."""
    engine = executed_simulation
    with tempfile.TemporaryDirectory() as tmp_dir:
        csv_file = os.path.join(tmp_dir, "test_output.csv")
        exported_path = engine.export_to_csv(csv_file)

        assert os.path.exists(exported_path)
        assert os.path.getsize(exported_path) > 0

        with open(exported_path, mode="r", encoding="utf-8") as f:
            reader = list(csv.DictReader(f))

        # Check total rows
        assert len(reader) == 96

        # Check required columns
        expected_columns = {
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
        }
        for col in expected_columns:
            assert col in reader[0]

        # Verify values match step history for first, middle, and last step
        for idx in [0, 48, 95]:
            csv_row = reader[idx]
            step_obj = engine.step_history[idx]
            assert int(csv_row["step"]) == step_obj.step
            assert csv_row["time"] == step_obj.time_str
            assert math.isclose(float(csv_row["total_generation_kw"]), step_obj.total_generation_kw, abs_tol=0.01)
            assert math.isclose(float(csv_row["total_consumption_kw"]), step_obj.total_consumption_kw, abs_tol=0.01)
            assert math.isclose(float(csv_row["total_surplus_kwh"]), step_obj.total_surplus_kwh, abs_tol=0.01)
            assert math.isclose(float(csv_row["total_deficit_kwh"]), step_obj.total_deficit_kwh, abs_tol=0.01)
            assert math.isclose(float(csv_row["battery_storage_kwh"]), step_obj.battery_storage_kwh, abs_tol=0.01)
            assert int(csv_row["sellers_count"]) == step_obj.sellers_count
            assert int(csv_row["buyers_count"]) == step_obj.buyers_count
            assert int(csv_row["balanced_count"]) == step_obj.balanced_count
