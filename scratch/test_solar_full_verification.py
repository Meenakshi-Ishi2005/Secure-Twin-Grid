import urllib.request
import json
import time

BASE_URL = "http://localhost:8000"

def http_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def http_post(path, data=None):
    body = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_full_solar_verification():
    print("==================================================")
    print("   SECURETWINGRID SOLAR VERIFICATION RUN")
    print("==================================================")

    # 1. Reset simulation to 00:00 (Step 0)
    print("\n[Step 1] Resetting simulation to 00:00...")
    status = http_post("/api/v1/simulation/reset?num_households=100&random_seed=42")
    print(f"Status: {status.get('status')}, Time: {status.get('current_time')}, Step: {status.get('current_step')}")

    # Check solar at midnight (00:00)
    energy_summary = http_get("/api/v1/energy/summary")
    print(f"At 00:00 (Midnight):")
    print(f"  Current Total Gen: {energy_summary.get('current_total_generation_kw')} kW")
    print(f"  Total Gen kWh: {energy_summary.get('total_generation_kwh')} kWh")
    assert energy_summary.get('current_total_generation_kw') == 0.0, "Expected 0 kW at midnight!"

    # 2. Advance to midday (12:00, Step 48)
    print("\n[Step 2] Advancing 48 steps (+12 hours) to 12:00 midday...")
    start_res = http_post("/api/v1/simulation/start", {"steps": 48, "run_trading": True})
    status = http_get("/api/v1/simulation/status")
    print(f"Status: {status.get('status')}, Time: {status.get('current_time')}, Step: {status.get('current_step')}")
    assert status.get('current_time') == "12:00", f"Expected 12:00, got {status.get('current_time')}"

    # Check solar generation at midday (12:00)
    energy_summary = http_get("/api/v1/energy/summary")
    cur_gen = energy_summary.get('current_total_generation_kw')
    tot_gen = energy_summary.get('total_generation_kwh')
    print(f"\nAt 12:00 (Midday):")
    print(f"  Current Total Fleet Solar Generation: {cur_gen} kW")
    print(f"  Total Accumulated Solar Energy: {tot_gen} kWh")
    print(f"  Peak Generation: {energy_summary.get('peak_generation_kw')} kW")
    assert cur_gen > 150.0, f"Expected >150 kW generation at midday, got {cur_gen}"
    assert tot_gen > 500.0, f"Expected >500 kWh accumulated solar energy, got {tot_gen}"

    # 3. Inspect individual households at midday
    print("\n[Step 3] Inspecting household solar metrics at 12:00:")
    houses = http_get("/api/v1/houses")
    all_hh = houses.get("households", [])

    solar_hh = [h for h in all_hh if h.get("has_solar")]
    non_solar_hh = [h for h in all_hh if not h.get("has_solar")]

    print(f"  Total Households: {len(all_hh)}")
    print(f"  Solar Households: {len(solar_hh)} / {len(all_hh)}")
    print(f"  Non-Solar Households: {len(non_solar_hh)} / {len(all_hh)}")

    # Sample non-solar: HH-001
    hh1 = http_get("/api/v1/houses/HH-001")
    print(f"\n  Non-Solar Household (HH-001):")
    print(f"    has_solar: {hh1.get('has_solar')}")
    print(f"    solar_capacity_kw: {hh1.get('solar_capacity_kw')} kW")
    print(f"    current_generation_kw: {hh1.get('current_generation_kw')} kW")
    assert hh1.get("current_generation_kw") == 0.0, "Non-solar household should have 0 kW generation!"

    # Sample solar households: HH-002, HH-003, HH-014, HH-022
    for h_id in ["HH-002", "HH-003", "HH-014", "HH-022"]:
        hh = http_get(f"/api/v1/houses/{h_id}")
        print(f"\n  Solar Household ({h_id}):")
        print(f"    has_solar: {hh.get('has_solar')}")
        print(f"    solar_capacity_kw: {hh.get('solar_capacity_kw')} kW")
        print(f"    current_generation_kw: {hh.get('current_generation_kw')} kW")
        print(f"    current_consumption_kw: {hh.get('current_consumption_kw')} kW")
        print(f"    status: {hh.get('status')}")
        print(f"    surplus_kwh: {hh.get('current_surplus_kwh')} kWh")
        assert hh.get("current_generation_kw") > 0.0, f"{h_id} should have positive solar generation at 12:00!"

    # 4. Advance to nighttime (24:00, Step 96)
    print("\n[Step 4] Advancing remaining 48 steps to 24:00 (Night)...")
    http_post("/api/v1/simulation/start", {"steps": 48, "run_trading": True})
    status = http_get("/api/v1/simulation/status")
    print(f"Status: {status.get('status')}, Time: {status.get('current_time')}, Step: {status.get('current_step')}")
    energy_summary = http_get("/api/v1/energy/summary")
    night_gen = energy_summary.get('current_total_generation_kw')
    total_day_gen = energy_summary.get('total_generation_kwh')
    print(f"At 24:00 (Night):")
    print(f"  Current Total Generation: {night_gen} kW")
    print(f"  Full-Day Total Solar Generated: {total_day_gen} kWh")
    assert night_gen == 0.0, f"Night generation should be 0 kW, got {night_gen}"
    assert total_day_gen > 1500.0, f"Full day solar should be >1500 kWh, got {total_day_gen}"

    # 5. Continuous mode test
    print("\n[Step 5] Testing start_continuous from completed state...")
    cont_res = http_post(
        "/api/v1/simulation/start",
        {"continuous": True, "step_delay": 0.05, "run_trading": True}
    )
    print(f"Start continuous response: {cont_res}")
    time.sleep(0.3)
    c_status = http_get("/api/v1/simulation/status")
    print(f"Continuous status: {c_status.get('status')}, step: {c_status.get('current_step')}, time: {c_status.get('current_time')}")
    stop_res = http_post("/api/v1/simulation/stop")
    print(f"Stop response: {stop_res}")

    print("\n==================================================")
    print("   ALL SOLAR VERIFICATION CHECKS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    test_full_solar_verification()
