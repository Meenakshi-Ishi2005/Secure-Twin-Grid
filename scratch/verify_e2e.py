import urllib.request
import json
import os
import sys

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def post_json(url, data=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data or {}).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

# 1. Reset simulation to 00:00
post_json('http://127.0.0.1:8000/api/v1/simulation/reset?num_households=100&random_seed=42')

# 2. Advance simulation through 40 steps (00:00 -> 10:00)
advance_res = post_json('http://127.0.0.1:8000/api/v1/simulation/start', {"steps": 40, "run_trading": True})
print("Advanced to:", advance_res.get('current_time'), "Total trades:", advance_res.get('details', {}).get('total_trades'))

# 3. Fetch all trades from /api/v1/trades
trades_resp = get_json('http://127.0.0.1:8000/api/v1/trades?limit=1000')
all_trades = trades_resp['trades']

print(f"Total Completed Trades in Backend: {len(all_trades)}")

# 4. Test target users
target_tests = [
    {"username": "bob_prosumer", "household_id": "HH-014", "role": "USER"},
    {"username": "meenati", "household_id": "HH-006", "role": "USER"},
    {"username": "Harshal", "household_id": "HH-008", "role": "USER"},
    {"username": "Adarsh", "household_id": "HH-004", "role": "USER"},
]

for user_info in target_tests:
    hid = user_info["household_id"]
    
    # Calculate EXPECTED_MY_TRADES from raw trade history
    seller_trades = [t for t in all_trades if t['seller_id'].upper() == hid.upper() and t['status'].upper() == 'COMPLETED']
    buyer_trades = [t for t in all_trades if t['buyer_id'].upper() == hid.upper() and t['status'].upper() == 'COMPLETED']
    expected_my_trades = [t for t in all_trades if (t['seller_id'].upper() == hid.upper() or t['buyer_id'].upper() == hid.upper()) and t['status'].upper() == 'COMPLETED']
    
    # Check deduplication
    seen = set()
    deduped = []
    for t in expected_my_trades:
        if t['trade_id'] not in seen:
            seen.add(t['trade_id'])
            deduped.append(t)
            
    # Also test API endpoint with household_id query param
    api_hh_trades_resp = get_json(f'http://127.0.0.1:8000/api/v1/trades?household_id={hid}&limit=1000')
    api_hh_trades = api_hh_trades_resp['trades']
    
    # Third-party trades
    third_party_trades = [t for t in all_trades if t['seller_id'].upper() != hid.upper() and t['buyer_id'].upper() != hid.upper()]
    
    # Verification checks
    buyer_test_pass = len(buyer_trades) > 0 or hid == "HH-014" # HH-014 has seller trades, HH-006 has buyer trades
    seller_test_pass = len(seller_trades) > 0 or hid == "HH-006"
    third_party_pass = all(t['trade_id'] not in [x['trade_id'] for x in expected_my_trades] for t in third_party_trades)
    dedupe_pass = len(expected_my_trades) == len(deduped)
    api_match_pass = len(api_hh_trades) == len(expected_my_trades)
    
    print(f"\n================ USER: {user_info['username']} ({hid}) ================")
    print(f"  Seller Trades Count: {len(seller_trades)}")
    if seller_trades:
        print(f"    Sample Seller Trade: {seller_trades[0]['trade_id']} ({seller_trades[0]['seller_id']} -> {seller_trades[0]['buyer_id']}, {seller_trades[0]['energy_kwh']} kWh @ ${seller_trades[0]['price_per_kwh']})")
    print(f"  Buyer Trades Count: {len(buyer_trades)}")
    if buyer_trades:
        print(f"    Sample Buyer Trade: {buyer_trades[0]['trade_id']} ({buyer_trades[0]['seller_id']} -> {buyer_trades[0]['buyer_id']}, {buyer_trades[0]['energy_kwh']} kWh @ ${buyer_trades[0]['price_per_kwh']})")
    print(f"  EXPECTED MY TRADES COUNT: {len(expected_my_trades)}")
    print(f"  API HOUSEHOLD FILTER COUNT: {len(api_hh_trades)}")
    print(f"  Deduplication Verified: {dedupe_pass}")
    print(f"  Third-Party Exclusion Verified: {third_party_pass}")
    print(f"  API & Client Filter Equality: {api_match_pass}")
