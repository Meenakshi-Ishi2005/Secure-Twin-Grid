import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Users,
  Sun,
  BatteryCharging,
  Car,
  Zap,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Building2,
  TreePine,
  Search,
  Filter,
  ArrowLeftRight,
  Blocks
} from 'lucide-react';
import { api } from '../services/api';
import SimulationControls from '../components/SimulationControls';

export default function CommunityPage({
  simulationStatus,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  onStepSimulation,
  isOperating,
  autoPlaying,
  onToggleAutoPlay,
  onSelectHouseholdById
}) {
  const [communitySummary, setCommunitySummary] = useState(null);
  const [households, setHouseholds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scaleTarget, setScaleTarget] = useState(100);

  const fetchCommunityData = async () => {
    setIsLoading(true);
    try {
      const [summaryData, householdsData] = await Promise.all([
        api.getCommunitySummary().catch(() => null),
        api.getCommunityHouseholds().catch(() => null),
      ]);
      setCommunitySummary(summaryData);
      setHouseholds(householdsData?.households || []);
      if (summaryData?.community?.current_household_count) {
        setScaleTarget(summaryData.community.current_household_count);
      }
    } catch (err) {
      console.error('Failed to load community data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
    const interval = setInterval(fetchCommunityData, 6000);
    return () => clearInterval(interval);
  }, []);

  const community = communitySummary?.community || {
    community_id: 'COMM-001',
    community_name: 'Green Valley Community',
    description: 'Simulated residential prosumer microgrid with rooftop solar and battery storage',
    location_name: 'Simulated Local Microgrid',
    household_capacity: 500,
    current_household_count: households.length || 100,
    solar_penetration_percent: 50.0,
    battery_penetration_percent: 35.0,
    ev_penetration_percent: 20.0,
    status: 'ACTIVE',
  };

  const energy = communitySummary?.energy_metrics || {};
  const trading = communitySummary?.trading_metrics || {};
  const blockchain = communitySummary?.blockchain_metrics || {};

  // Technology segment breakdown
  const solarProducers = useMemo(() => households.filter((h) => h.has_solar), [households]);
  const batteryHomes = useMemo(() => households.filter((h) => h.has_battery), [households]);
  const evHomes = useMemo(() => households.filter((h) => h.has_ev), [households]);
  const prosumers = useMemo(() => households.filter((h) => h.has_solar && h.has_battery), [households]);
  const pureConsumers = useMemo(() => households.filter((h) => !h.has_solar), [households]);

  const handleScaleChange = async (count) => {
    setScaleTarget(count);
    try {
      await onResetSimulation(count);
      await fetchCommunityData();
    } catch (err) {
      console.error('Failed to update household scale:', err);
    }
  };

  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!h.household_id.toLowerCase().includes(q) && !(h.status || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [households, statusFilter, searchQuery]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Simulation Controls Header */}
      <SimulationControls
        simulationStatus={simulationStatus}
        onStart={onStartSimulation}
        onStop={onStopSimulation}
        onReset={onResetSimulation}
        onStep={onStepSimulation}
        isOperating={isOperating}
        autoPlaying={autoPlaying}
        onToggleAutoPlay={onToggleAutoPlay}
      />

      {/* Community Hero Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-800/40 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/60">
              <Layers className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-0.5 rounded-full border border-emerald-800/60">
                  LOCAL ENERGY COMMUNITY
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-800">
                  {community.community_id}
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {community.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {community.community_name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                {community.description}. All P2P electricity trades and blockchain blocks are localized within this microgrid boundary.
              </p>
            </div>
          </div>

          {/* Scale Configurator Buttons (10, 50, 100, 250, 500) */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Configurable Community Scale
            </span>
            <div className="flex items-center gap-1.5">
              {[10, 50, 100, 250, 500].map((num) => (
                <button
                  key={num}
                  onClick={() => handleScaleChange(num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                    community.current_household_count === num
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-500 block">
              Max Capacity: {community.household_capacity} households
            </span>
          </div>
        </div>

        {/* Community Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Network Type</span>
            <span className="text-xs sm:text-sm font-bold text-white mt-1 block truncate">
              {community.location_name}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Households</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-300 mt-1 block font-mono">
              {community.current_household_count} / {community.household_capacity}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Solar Adoption</span>
            <span className="text-xs sm:text-sm font-bold text-cyan-300 mt-1 block font-mono">
              {community.solar_penetration_percent}% ({solarProducers.length})
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Battery Storage</span>
            <span className="text-xs sm:text-sm font-bold text-amber-300 mt-1 block font-mono">
              {community.battery_penetration_percent}% ({batteryHomes.length})
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">EV Penetration</span>
            <span className="text-xs sm:text-sm font-bold text-purple-300 mt-1 block font-mono">
              {community.ev_penetration_percent}% ({evHomes.length})
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Blockchain Ledger</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 mt-1 block font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {blockchain.total_blocks ?? 1} Blocks
            </span>
          </div>
        </div>
      </div>

      {/* Visual Hierarchy Tree Representation */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Community Logical Structure & Asset Allocation</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Boundary: {community.community_id}
          </span>
        </div>

        {/* Tree Diagram */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs sm:text-sm space-y-3">
          <div className="text-emerald-400 font-bold flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-950 border border-emerald-800/60 text-[10px]">ROOT</span>
            <span>LOCAL COMMUNITY: {community.community_name} ({community.community_id})</span>
          </div>

          <div className="pl-6 border-l-2 border-emerald-800/40 space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Sun className="w-4 h-4 text-cyan-400" />
                <span>├── Solar Producers (Active PV generation):</span>
              </div>
              <span className="font-bold text-cyan-300 font-mono">{solarProducers.length} households</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-4 h-4 text-rose-400" />
                <span>├── Pure Consumers (Grid/Market dependent):</span>
              </div>
              <span className="font-bold text-rose-300 font-mono">{pureConsumers.length} households</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>├── Prosumers (Solar PV + Battery Storage):</span>
              </div>
              <span className="font-bold text-emerald-300 font-mono">{prosumers.length} households</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                <span>├── Stationary Battery Homes (BESS flexibility):</span>
              </div>
              <span className="font-bold text-amber-300 font-mono">{batteryHomes.length} households</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Car className="w-4 h-4 text-purple-400" />
                <span>└── Electric Vehicle Homes (Smart charging):</span>
              </div>
              <span className="font-bold text-purple-300 font-mono">{evHomes.length} households</span>
            </div>
          </div>
        </div>
      </div>

      {/* Community Roster Table */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Community Household Roster
            </h2>
            <p className="text-xs text-slate-400">
              All virtual households enrolled in {community.community_name}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search house ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 w-40 sm:w-52"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SELLING">Sellers</option>
              <option value="BUYING">Buyers</option>
              <option value="BALANCED">Balanced</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">House ID</th>
                <th className="py-3 px-4">Community</th>
                <th className="py-3 px-4">Assets</th>
                <th className="py-3 px-4">Current Generation</th>
                <th className="py-3 px-4">Current Load</th>
                <th className="py-3 px-4">Surplus / Deficit</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredHouseholds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No households found matching filters.
                  </td>
                </tr>
              ) : (
                filteredHouseholds.map((hh) => (
                  <tr
                    key={hh.household_id}
                    onClick={() => onSelectHouseholdById && onSelectHouseholdById(hh.household_id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-bold text-white">{hh.household_id}</td>
                    <td className="py-3 px-4 text-emerald-400">{hh.community_id || 'COMM-001'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {hh.has_solar && <Sun className="w-3.5 h-3.5 text-cyan-400" title="Solar PV" />}
                        {hh.has_battery && <BatteryCharging className="w-3.5 h-3.5 text-amber-400" title="Battery BESS" />}
                        {hh.has_ev && <Car className="w-3.5 h-3.5 text-purple-400" title="Electric Vehicle" />}
                        {!hh.has_solar && !hh.has_battery && !hh.has_ev && (
                          <span className="text-[10px] text-slate-500 font-sans">Consumer only</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-cyan-300">{(hh.current_generation_kw || 0).toFixed(2)} kW</td>
                    <td className="py-3 px-4 text-teal-300">{(hh.current_consumption_kw || 0).toFixed(2)} kW</td>
                    <td className="py-3 px-4">
                      {hh.current_surplus_kwh > 0 ? (
                        <span className="text-emerald-400 font-bold">+{hh.current_surplus_kwh.toFixed(2)} kWh</span>
                      ) : hh.current_deficit_kwh > 0 ? (
                        <span className="text-rose-400 font-bold">-{hh.current_deficit_kwh.toFixed(2)} kWh</span>
                      ) : (
                        <span className="text-slate-500">0.00 kWh</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hh.status === 'SELLING'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : hh.status === 'BUYING'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {hh.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
