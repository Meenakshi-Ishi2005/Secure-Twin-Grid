import urllib.request
import json

def post(url, d):
    req = urllib.request.Request(url, data=json.dumps(d).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

print("Resetting simulation...")
r_reset = post('http://127.0.0.1:8000/api/v1/simulation/reset?num_households=100&random_seed=42', {})
print("Reset response:", r_reset)

print("\nAdvancing 48 steps (to 12:00 PM)...")
r_start = post('http://127.0.0.1:8000/api/v1/simulation/start', {'steps': 48, 'run_trading': True})
print("Start response:", r_start)

status = get('http://127.0.0.1:8000/api/v1/simulation/status')
print("\nSimulation Status:", status)

energy = get('http://127.0.0.1:8000/api/v1/energy/summary')
print("\nEnergy Summary:", energy)

history = get('http://127.0.0.1:8000/api/v1/energy/history')
print(f"\nEnergy History Steps: {len(history['history'])}")
last_step = history['history'][-1]
print("Last step in history:", last_step)

houses = get('http://127.0.0.1:8000/api/v1/houses')
solar_hh = [h for h in houses['households'] if h['has_solar']]
print(f"\nTotal households: {houses['total_count']}, Solar households: {len(solar_hh)}")
print("Sample solar households:")
for h in solar_hh[:5]:
    print(f"  {h['household_id']}: cap={h['solar_capacity_kw']} kW, gen={h['current_generation_kw']} kW, con={h['current_consumption_kw']} kW, status={h['status']}")

no_solar_hh = [h for h in houses['households'] if not h['has_solar']]
print("Sample non-solar households:")
for h in no_solar_hh[:3]:
    print(f"  {h['household_id']}: cap={h['solar_capacity_kw']} kW, gen={h['current_generation_kw']} kW, con={h['current_consumption_kw']} kW, status={h['status']}")
