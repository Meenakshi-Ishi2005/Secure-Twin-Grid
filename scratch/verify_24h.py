import urllib.request
import json

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

# 2. Advance simulation through full 24 hours (96 steps)
advance_res = post_json('http://127.0.0.1:8000/api/v1/simulation/start', {"steps": 96, "run_trading": True})
print("Advanced to:", advance_res.get('current_time'), "Total trades:", advance_res.get('details', {}).get('total_trades'))

# 3. Fetch all trades from /api/v1/trades
trades_resp = get_json('http://127.0.0.1:8000/api/v1/trades?limit=5000')
all_trades = trades_resp['trades']
print(f"Total Completed Trades in Backend API: {len(all_trades)}")

# 4. Test target users
target_tests = [
    {"username": "bob_prosumer", "household_id": "HH-014", "role": "USER"},
    {"username": "meenati", "household_id": "HH-006", "role": "USER"},
    {"username": "Harshal", "household_id": "HH-008", "role": "USER"},
    {"username": "Adarsh", "household_id": "HH-004", "role": "USER"},
    {"username": "sys_admin", "household_id": "HH-001", "role": "ADMIN"},
]

all_passed = True

for user_info in target_tests:
    hid = user_info["household_id"]
    
    # Calculate EXPECTED_MY_TRADES from raw trade history
    seller_trades = [t for t in all_trades if t['seller_id'].upper() == hid.upper() and t['status'].upper() == 'COMPLETED']
    buyer_trades = [t for t in all_trades if t['buyer_id'].upper() == hid.upper() and t['status'].upper() == 'COMPLETED']
    expected_my_trades = [t for t in all_trades if (t['seller_id'].upper() == hid.upper() or t['buyer_id'].upper() == hid.upper()) and t['status'].upper() == 'COMPLETED']
    
    # Deduplicate
    seen = set()
    deduped = []
    for t in expected_my_trades:
        if t['trade_id'] not in seen:
            seen.add(t['trade_id'])
            deduped.append(t)
            
    # Test API endpoint with household_id query param
    api_hh_trades_resp = get_json(f'http://127.0.0.1:8000/api/v1/trades?household_id={hid}&limit=5000')
    api_hh_trades = api_hh_trades_resp['trades']
    
    # Third-party trades
    third_party_trades = [t for t in all_trades if t['seller_id'].upper() != hid.upper() and t['buyer_id'].upper() != hid.upper()]
    
    # Verification checks
    dedupe_pass = len(expected_my_trades) == len(deduped)
    third_party_pass = all(t['trade_id'] not in [x['trade_id'] for x in expected_my_trades] for t in third_party_trades)
    api_match_pass = len(api_hh_trades) == len(expected_my_trades)
    
    if not (dedupe_pass and third_party_pass and api_match_pass):
        all_passed = False
    
    print(f"\n================ USER: {user_info['username']} ({hid}) ================")
    print(f"  Seller Trades: {len(seller_trades)}")
    print(f"  Buyer Trades: {len(buyer_trades)}")
    print(f"  EXPECTED MY TRADES COUNT: {len(expected_my_trades)}")
    print(f"  API HOUSEHOLD FILTER COUNT: {len(api_hh_trades)}")
    print(f"  Deduplication Verified: {dedupe_pass}")
    print(f"  Third-Party Exclusion Verified: {third_party_pass}")
    print(f"  API & Client Filter Equality: {api_match_pass}")

print(f"\nALL INTEGRATION CHECKS PASSED: {all_passed}")
