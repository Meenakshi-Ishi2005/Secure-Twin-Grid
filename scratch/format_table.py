import json

with open(r"c:\Users\Bhushan\OneDrive\Documents\Pract_MSc\msc_rp\Secure-Twin-Grid\scratch\full_24h_trace.json") as f:
    records = json.load(f)

# Let's inspect intervals 25 to 36 (06:15 to 09:00) - 12 consecutive intervals!
print("=== 12 CONSECUTIVE INTERVALS TRACE (06:15 to 09:00) ===")
print("| Time | User Gen | User Con | User Surplus | User Deficit | User Status | Buying Enabled | Sellers | Buyers | User Buy Bid | User Sell Offer | User Completed Trades |")
print("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")

for r in records[24:36]:
    time_s = r['time']
    gen_s = f"{r['gen']:.2f} kW"
    con_s = f"{r['con']:.2f} kW"
    surp_s = f"{r['surplus']:.4f} kWh"
    def_s = f"{r['deficit']:.4f} kWh"
    stat_s = r['status']
    buy_en = str(r['buying_enabled'])
    sellers_c = r['selling_status_count']
    buyers_c = r['buying_status_count']
    
    if r['h14_bid']:
        buy_bid_s = f"{r['h14_bid']['energy']:.4f} kWh @ ${r['h14_bid']['price']:.2f}"
    else:
        buy_bid_s = "None (Surplus/Balanced)"
        
    if r['h14_offer']:
        sell_off_s = f"{r['h14_offer']['energy']:.4f} kWh @ ${r['h14_offer']['price']:.2f}"
    else:
        sell_off_s = "None (Deficit/No Surplus)"
        
    trades_c = r['h14_trades_this_step']
    
    print(f"| {time_s} | {gen_s} | {con_s} | {surp_s} | {def_s} | {stat_s} | {buy_en} | {sellers_c} | {buyers_c} | {buy_bid_s} | {sell_off_s} | {trades_c} |")
