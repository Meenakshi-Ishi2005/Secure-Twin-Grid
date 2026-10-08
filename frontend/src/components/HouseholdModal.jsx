import React from 'react';
import {
  X,
  Home,
  Sun,
  Battery,
  Car,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  Cpu,
  Layers
} from 'lucide-react';

export default function HouseholdModal({ household, onClose }) {
  if (!household) return null;

  const {
    household_id,
    has_solar,
    solar_capacity_kw = 0,
    has_battery,
    battery_capacity_kwh = 0,
    battery_level_kwh = 0,
    has_ev,
    ev_battery_capacity_kwh = 0,
    ev_charge_level_kwh = 0,
    base_consumption_kw = 0,
    current_generation_kw = 0,
    current_consumption_kw = 0,
    current_surplus_kwh = 0,
    current_deficit_kwh = 0,
    status = 'BALANCED',
  } = household;

  const batterySoC = has_battery && battery_capacity_kwh > 0
    ? Math.round((battery_level_kwh / battery_capacity_kwh) * 100)
    : 0;

  const evSoC = has_ev && ev_battery_capacity_kwh > 0
    ? Math.round((ev_charge_level_kwh / ev_battery_capacity_kwh) * 100)
    : 0;

  const netPower = (current_generation_kw - current_consumption_kw).toFixed(2);
  const isNetPositive = current_generation_kw >= current_consumption_kw;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white font-mono">{household_id}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    status === 'SELLING'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : status === 'BUYING'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Prosumer / Microgrid Digital Twin Asset Profile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-Time Power Balance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Current Solar Output</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {current_generation_kw.toFixed(2)}{' '}
              <span className="text-xs text-slate-400 font-sans">kW</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Capacity: {solar_capacity_kw} kW
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Current Load Demand</span>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {current_consumption_kw.toFixed(2)}{' '}
              <span className="text-xs text-slate-400 font-sans">kW</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Base: {base_consumption_kw} kW
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>15m Net Trading Balance</span>
              {isNetPositive ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div
              className={`text-2xl font-bold font-mono ${
                isNetPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isNetPositive ? `+${netPower}` : netPower}{' '}
              <span className="text-xs text-slate-400 font-sans">kW</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {status === 'SELLING'
                ? `Surplus: ${current_surplus_kwh.toFixed(3)} kWh`
                : status === 'BUYING'
                ? `Deficit: ${current_deficit_kwh.toFixed(3)} kWh`
                : 'Self-Balanced'}
            </span>
          </div>
        </div>

        {/* Distributed Energy Resource (DER) Assets Breakdown */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Installed DER Assets & Storage State
          </h4>

          {/* Solar PV Asset */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  has_solar
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">Rooftop Solar PV</span>
                <span className="text-xs text-slate-400">
                  {has_solar ? `${solar_capacity_kw} kW Nameplate Array` : 'No Solar Installed'}
                </span>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold font-mono ${
                has_solar ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {has_solar ? `${current_generation_kw.toFixed(2)} kW Now` : 'Disabled'}
            </span>
          </div>

          {/* Stationary Battery Asset */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    has_battery
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Battery className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">Home Battery Storage (BESS)</span>
                  <span className="text-xs text-slate-400">
                    {has_battery ? `${battery_capacity_kwh} kWh Capacity` : 'No Battery Storage'}
                  </span>
                </div>
              </div>
              {has_battery && (
                <div className="text-right">
                  <span className="text-sm font-bold text-white font-mono">
                    {battery_level_kwh.toFixed(2)} / {battery_capacity_kwh} kWh
                  </span>
                  <span className="text-xs text-emerald-400 font-mono block">SoC: {batterySoC}%</span>
                </div>
              )}
            </div>
            {has_battery && (
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${batterySoC}%` }}
                />
              </div>
            )}
          </div>

          {/* Electric Vehicle Asset */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    has_ev
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block">Electric Vehicle (EV)</span>
                  <span className="text-xs text-slate-400">
                    {has_ev ? `${ev_battery_capacity_kwh} kWh EV Battery` : 'No EV Present'}
                  </span>
                </div>
              </div>
              {has_ev && (
                <div className="text-right">
                  <span className="text-sm font-bold text-white font-mono">
                    {ev_charge_level_kwh.toFixed(2)} / {ev_battery_capacity_kwh} kWh
                  </span>
                  <span className="text-xs text-cyan-400 font-mono block">SoC: {evSoC}%</span>
                </div>
              )}
            </div>
            {has_ev && (
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${evSoC}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Digital Twin Prosumer Node &bull; Pure Emulation</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
