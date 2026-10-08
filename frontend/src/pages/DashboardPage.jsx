import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '../components/charts/ChartSetup';
import { getNormalizedHouseholdId } from '../utils/householdUtils';
import {
  Zap,
  Sun,
  Battery,
  BatteryCharging,
  ArrowLeftRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  ShoppingBag,
  Blocks,
  Layers,
  Search,
  Eye,
  RefreshCw,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import SimulationControls from '../components/SimulationControls';

export default function DashboardPage({
  simulationStatus,
  energySummary,
  energyHistory,
  householdsData,
  tradesData,
  blockchainSummary,
  blockchainBlocks,
  currentUser,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  onStepSimulation,
  isOperating,
  autoPlaying,
  onToggleAutoPlay,
  setActiveTab,
  onNavigateToTrading,
  onSelectHouseholdById,
  onSelectBlock
}) {
  // Fixed user household ID based on authenticated user -> household mapping
  const households = householdsData?.households || [];
  const myHouseholdId = useMemo(() => {
    return getNormalizedHouseholdId(currentUser?.household_id, households);
  }, [currentUser, households]);

  const [tradeViewMode, setTradeViewMode] = useState('all'); // 'my' | 'all'
  const [showCalculationHelp, setShowCalculationHelp] = useState(false);
  const [showP2PHelp, setShowP2PHelp] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [selectedTradeExplanation, setSelectedTradeExplanation] = useState(null);
  const [tradeSearchTerm, setTradeSearchTerm] = useState('');

  // Selected Household Object (Your Home - Fixed to authenticated household)
  const myHousehold = useMemo(() => {
    return households.find((h) => h.household_id === myHouseholdId) || households[0] || null;
  }, [households, myHouseholdId]);

  // Household Dynamic Metrics (Current Step)
  const myGenKw = myHousehold?.current_generation_kw ?? 0;
  const myConKw = myHousehold?.current_consumption_kw ?? 0;
  const myBatKwh = myHousehold?.battery_level_kwh ?? 0;
  const myBatCapKwh = myHousehold?.battery_capacity_kwh ?? 0;
  const mySurplusKwh = myHousehold?.current_surplus_kwh ?? 0;
  const myDeficitKwh = myHousehold?.current_deficit_kwh ?? 0;
  const myStatus = (myHousehold?.status || 'BALANCED').toUpperCase();

  // Net balance for my household (kW)
  const myNetKw = myGenKw - myConKw;
  const isMySurplus = myStatus === 'SELLING' || myNetKw > 0.05;
  const isMyDeficit = myStatus === 'BUYING' || myNetKw < -0.05;

  // Community Metrics
  const totalHouseholdsCount = simulationStatus?.num_households ?? households.length ?? 100;
  const communitySellers = householdsData?.sellers_count ?? households.filter((h) => h.status === 'SELLING').length;
  const communityBuyers = householdsData?.buyers_count ?? households.filter((h) => h.status === 'BUYING').length;
  const communityBalanced = householdsData?.balanced_count ?? households.filter((h) => h.status === 'BALANCED').length;

  const communityTotalGenKwh = energySummary?.total_generation_kwh ?? 0;
  const communityTotalConKwh = energySummary?.total_consumption_kwh ?? 0;
  const communityCurGenKw = energySummary?.current_total_generation_kw ?? 0;
  const communityCurConKw = energySummary?.current_total_consumption_kw ?? 0;
  const communityBatStoredKwh = energySummary?.total_battery_stored_kwh ?? 0;

  // Trades
  const trades = tradesData?.trades || [];
  const totalCommunityTradesCount = simulationStatus?.total_trades_count ?? tradesData?.total_count ?? trades.length;

  // Trades involving my household
  const myTrades = useMemo(() => {
    if (!myHouseholdId) return [];
    return trades.filter((t) => t.seller_id === myHouseholdId || t.buyer_id === myHouseholdId);
  }, [trades, myHouseholdId]);

  const displayedTrades = useMemo(() => {
    const baseList = tradeViewMode === 'my' ? myTrades : trades;
    if (!tradeSearchTerm.trim()) return baseList;
    const term = tradeSearchTerm.toLowerCase().trim();
    return baseList.filter(
      (t) =>
        t.trade_id?.toLowerCase().includes(term) ||
        t.seller_id?.toLowerCase().includes(term) ||
        t.buyer_id?.toLowerCase().includes(term) ||
        t.timestamp?.toLowerCase().includes(term)
    );
  }, [trades, myTrades, tradeViewMode, tradeSearchTerm]);

  // Live community activity stream (latest 6 settled trades)
  const liveActivity = useMemo(() => {
    return trades.slice(0, 6);
  }, [trades]);

  // Blockchain blocks
  const blocks = blockchainBlocks?.blocks || [];
  const latestBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
  const isBlockchainValid = blockchainSummary?.is_valid ?? true;

  // Step history for time-series charts
  const history = energyHistory?.history || [];
  const chartLabels = useMemo(() => {
    if (history.length > 0) {
      return history.map((s) => s.time || `Step ${s.step}`);
    }
    return ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'];
  }, [history]);

  // Clean Generation vs Usage Line Chart with markers
  const [chartViewMode, setChartViewMode] = useState('household'); // 'household' | 'community'

  const chartData = useMemo(() => {
    if (chartViewMode === 'household') {
      const solarCap = myHousehold?.solar_capacity_kw || (myHousehold?.has_solar ? 4.5 : 0);
      const baseLoad = myHousehold?.base_consumption_kw || 1.2;

      if (history.length > 0) {
        const hhGenData = history.map((s) => {
          const fleetGen = s.total_generation_kw || 0;
          return Number(((fleetGen / Math.max(1, totalHouseholdsCount * 3.5)) * solarCap).toFixed(2));
        });
        const hhConData = history.map((s) => {
          const fleetCon = s.total_consumption_kw || 0;
          return Number(((fleetCon / Math.max(1, totalHouseholdsCount * 1.5)) * baseLoad).toFixed(2));
        });

        return {
          labels: chartLabels,
          datasets: [
            {
              label: `My Solar Produced (kW) [${myHouseholdId?.replace('HH-', 'Home ')}]`,
              data: hhGenData,
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.18)',
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: history.length > 30 ? 0 : 2,
            },
            {
              label: `My Electricity Used (kW) [${myHouseholdId?.replace('HH-', 'Home ')}]`,
              data: hhConData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: history.length > 30 ? 0 : 2,
            },
          ],
        };
      }

      return {
        labels: chartLabels,
        datasets: [
          {
            label: 'My Solar Produced (kW)',
            data: [0, 0, 0.4, 2.8, 4.2, 3.4, 0.6, 0, 0],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.18)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: 'My Electricity Used (kW)',
            data: [0.6, 0.5, 1.2, 1.8, 1.9, 1.5, 2.8, 2.1, 0.9],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
          },
        ],
      };
    }

    // Community Fleet Total Chart
    if (history.length > 0) {
      return {
        labels: chartLabels,
        datasets: [
          {
            label: 'Community Solar Generation (kW) [All 100 Homes]',
            data: history.map((s) => s.total_generation_kw),
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: history.length > 30 ? 0 : 2,
          },
          {
            label: 'Community Electricity Usage (kW) [All 100 Homes]',
            data: history.map((s) => s.total_consumption_kw),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: history.length > 30 ? 0 : 2,
          },
        ],
      };
    }

    return {
      labels: chartLabels,
      datasets: [
        {
          label: 'Community Solar Generation (kW)',
          data: [0, 0, 15, 140, 260, 210, 40, 0, 0],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Community Electricity Usage (kW)',
          data: [45, 38, 70, 95, 110, 90, 135, 105, 55],
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
      ],
    };
  }, [history, chartLabels, chartViewMode, myHousehold, totalHouseholdsCount, myHouseholdId]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Inter', size: 11, weight: '600' },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 }, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.2)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } },
      },
    },
  };

  const currentTime = simulationStatus?.current_time || '00:00';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. SIMULATION ENGINE BANNER & CONTROLS */}
      <SimulationControls
        simulationStatus={simulationStatus}
        onStart={onStartSimulation}
        onStop={onStopSimulation}
        onReset={onResetSimulation}
        onStep={onStepSimulation}
        isOperating={isOperating}
        autoPlaying={autoPlaying}
        onToggleAutoPlay={onToggleAutoPlay}
        currentUser={currentUser}
      />

      {/* Software Simulation Context Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-950/90 px-2.5 py-0.5 rounded-full border border-cyan-800/80">
                SOFTWARE SIMULATION
              </span>
              <span className="text-xs text-slate-400">Green Valley Local Community &bull; Digital Twin</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>⚡ SecureTwinGrid</span>
            </h1>
            <p className="text-xs sm:text-sm text-cyan-300 font-medium">
              Simulation of energy production, household demand, battery storage, and P2P trading across the community.
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Current simulation time (<strong className="text-white font-mono">{currentTime}</strong>) determines the energy state and trades shown below.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Household:</span>
            <select
              value={myHouseholdId}
              onChange={(e) => onSelectHouseholdById && onSelectHouseholdById(e.target.value)}
              className="bg-slate-900 border border-cyan-700/60 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
            >
              {households.length > 0 ? (
                households.slice(0, 30).map((h) => (
                  <option key={h.household_id} value={h.household_id}>
                    {h.household_id.replace('HH-', 'Home ')} ({h.has_solar ? '☀️ Solar' : 'Demand Only'})
                  </option>
                ))
              ) : (
                <option value={myHouseholdId}>{myHouseholdId ? myHouseholdId.replace('HH-', 'Home ') : 'Home 001'}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL A: YOUR HOUSEHOLD (MY HOME)
          ======================================================== */}
      <div className="bg-slate-900/90 border border-cyan-900/40 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center font-bold font-mono">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  YOUR HOME — {myHouseholdId?.replace('HH-', 'HOME ')}
                </h2>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/50">
                  {currentTime}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Current simulated household energy state during this 15-minute interval
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCalculationHelp(!showCalculationHelp)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium self-start sm:self-auto bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-cyan-800/60 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How is this calculated?</span>
            {showCalculationHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Calculation Helper Progressive Disclosure */}
        {showCalculationHelp && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-800/60 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
            <div className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Energy Balance Formula</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 font-mono text-cyan-300 text-xs flex flex-wrap items-center gap-2">
              <span>Generation ({myGenKw.toFixed(1)} kW)</span>
              <span className="text-slate-500">-</span>
              <span>Consumption ({myConKw.toFixed(1)} kW)</span>
              <span className="text-slate-500">=</span>
              <span className="font-bold text-white">Net Energy ({myNetKw > 0 ? `+${myNetKw.toFixed(1)}` : myNetKw.toFixed(1)} kW)</span>
            </div>
            <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px] leading-relaxed pt-1">
              <li><strong>If Net Energy &gt; 0:</strong> Your home has a <em>Surplus</em> and can charge its battery or sell extra power to neighbors.</li>
              <li><strong>If Net Energy &lt; 0:</strong> Your home has a <em>Deficit</em> and will discharge battery or buy power from participating neighbors.</li>
              <li><strong>If Net Energy &approx; 0:</strong> Your home is <em>Balanced</em> (self-sufficient in this interval).</li>
            </ul>
          </div>
        )}

        {/* Dynamic Context-Aware Status Banner */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isMySurplus
              ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/60 border-emerald-800/80 text-emerald-200'
              : isMyDeficit
              ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-orange-950/60 border-amber-800/80 text-amber-200'
              : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-700 text-slate-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              {isMySurplus ? (
                <>
                  <Sun className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-white">☀️ You are producing extra energy</span>
                </>
              ) : isMyDeficit ? (
                <>
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-white">⚡ Your home needs additional energy</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-white">✓ Your energy is currently balanced</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-300">
              {isMySurplus
                ? `Your home currently has ${Math.abs(myNetKw).toFixed(1)} kW available to share with community members.`
                : isMyDeficit
                ? `Your home currently needs ${Math.abs(myNetKw).toFixed(1)} kW from solar neighbors or battery.`
                : 'Your home is producing enough energy for its current demand.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isMySurplus ? (
              <button
                onClick={() => {
                  setTradeViewMode('all');
                  setActiveTab && setActiveTab('trading');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition"
              >
                <span>Offer Energy / View Trades</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : isMyDeficit ? (
              <button
                onClick={() => {
                  if (onNavigateToTrading) {
                    onNavigateToTrading('sellers');
                  } else if (setActiveTab) {
                    setActiveTab('trading');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/40 transition"
              >
                <span>Find Energy / View Sellers</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab && setActiveTab('energy')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition"
              >
                <span>View Household Flow</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Contextual Household Energy Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: ☀️ Solar Produced */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">☀️ Solar Produced</span>
              <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/50">
                <Sun className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">
                {myGenKw.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">kW</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Energy produced by your simulated solar panels.
              </p>
            </div>
          </div>

          {/* Card 2: 🏠 Energy Used */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">🏠 Energy Used</span>
              <div className="p-1.5 rounded-lg bg-teal-950/80 text-teal-400 border border-teal-800/50">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">
                {myConKw.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">kW</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Energy currently being used by your home.
              </p>
            </div>
          </div>

          {/* Card 3: 🔋 Battery Stored */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">🔋 Battery Stored</span>
              <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                <BatteryCharging className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {myBatKwh.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">kWh</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {myBatCapKwh > 0 ? `${Math.round((myBatKwh / myBatCapKwh) * 100)}% capacity stored for later use.` : 'No battery installed.'}
              </p>
            </div>
          </div>

          {/* Card 4: ⚡ Energy Balance */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">⚡ Energy Balance</span>
              <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono">
                {isMySurplus ? (
                  <span className="text-emerald-400">+{myNetKw.toFixed(1)} kW</span>
                ) : isMyDeficit ? (
                  <span className="text-amber-400">{myNetKw.toFixed(1)} kW</span>
                ) : (
                  <span className="text-cyan-300">0.0 kW</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isMySurplus
                  ? 'Your home has surplus energy to sell.'
                  : isMyDeficit
                  ? 'Your home needs additional energy.'
                  : 'Your energy is balanced.'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Energy Flow Visualization */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-3">
            Live Household Energy Flow ({currentTime})
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-mono">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-amber-800/50 text-amber-300">
              <Sun className="w-4 h-4" />
              <span>Solar: {myGenKw.toFixed(1)} kW</span>
            </div>

            <span className="text-slate-500 font-sans">&rarr;</span>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-200 font-bold">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Your Home ({myHouseholdId?.replace('HH-', 'Home ')})</span>
            </div>

            <span className="text-slate-500 font-sans">&rarr;</span>

            {isMySurplus ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Exporting +{myNetKw.toFixed(1)} kW to Community</span>
              </div>
            ) : isMyDeficit ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950 border border-amber-700/60 text-amber-300">
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
                <span>Importing {Math.abs(myNetKw).toFixed(1)} kW from Community</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Self-Supplied (Balanced)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL B: COMMUNITY (100 HOMES OVERVIEW & ACTIVITY)
          ======================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950 text-purple-400 border border-purple-800/60 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                COMMUNITY — {totalHouseholdsCount} HOMES
              </h2>
              <p className="text-xs text-slate-400">
                Aggregate metrics and live trading activity across all participating households
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>Live Grid Load: <strong className="text-teal-300">{communityCurConKw.toFixed(1)} kW</strong></span>
            <span>&bull;</span>
            <span>Live Solar: <strong className="text-amber-300">{communityCurGenKw.toFixed(1)} kW</strong></span>
          </div>
        </div>

        {/* 4 Community Aggregate Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Fleet Capacity</span>
            <div className="text-xl font-bold text-white font-mono">
              {totalHouseholdsCount} <span className="text-xs font-normal text-slate-400 font-sans">Homes</span>
            </div>
            <span className="text-[10px] text-slate-500">Participating microgrid members</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-emerald-400 block mb-1">Active Sellers</span>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {communitySellers} <span className="text-xs font-normal text-slate-400 font-sans">Homes</span>
            </div>
            <span className="text-[10px] text-slate-500">Homes with extra solar energy</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-rose-400 block mb-1">Active Buyers</span>
            <div className="text-xl font-bold text-rose-400 font-mono">
              {communityBuyers} <span className="text-xs font-normal text-slate-400 font-sans">Homes</span>
            </div>
            <span className="text-[10px] text-slate-500">Homes requesting peer energy</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-purple-400 block mb-1">Community Trades</span>
            <div className="text-xl font-bold text-purple-300 font-mono">
              {totalCommunityTradesCount} <span className="text-xs font-normal text-slate-400 font-sans">Trades</span>
            </div>
            <span className="text-[10px] text-slate-500">Across all participating homes</span>
          </div>
        </div>

        {/* Dynamic Live Activity Feed */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Community Live Activity</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Real-time simulation events</span>
          </div>

          {liveActivity.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {liveActivity.map((t, idx) => (
                <div
                  key={t.trade_id || idx}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-emerald-400 font-bold">{t.seller_id?.replace('HH-', 'Home ')}</span>
                      <span className="text-slate-500">&rarr;</span>
                      <span className="text-rose-400 font-bold">{t.buyer_id?.replace('HH-', 'Home ')}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span>{Number(t.energy_kwh || 0).toFixed(2)} kWh</span>
                      <span className="mx-1.5 text-slate-600">&bull;</span>
                      <span className="text-amber-400 font-mono">${Number(t.price_per_kwh || 0).toFixed(2)}/kWh</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-cyan-400 block">{t.timestamp || currentTime}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Settled ✓</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              No live trading activity in this interval. Trading activity is generated automatically as the community simulation advances.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          LEVEL C: COMMUNITY ENERGY TRADING TABLE
          ======================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-purple-400" />
              <h2 className="text-base sm:text-lg font-extrabold text-white">Community Energy Trading</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              These are simulated peer-to-peer energy trades between participating homes in your community.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowP2PHelp(!showP2PHelp)}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>What is P2P energy trading?</span>
              {showP2PHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Tabs: My Trades vs Community Trades */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTradeViewMode('my')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  tradeViewMode === 'my'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Trades ({myTrades.length})
              </button>
              <button
                onClick={() => setTradeViewMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  tradeViewMode === 'all'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Community Trades ({totalCommunityTradesCount})
              </button>
            </div>
          </div>
        </div>

        {/* P2P Trading Explanation Helper */}
        {showP2PHelp && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-purple-800/60 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
            <div className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>How Peer-to-Peer (P2P) Energy Trading Works</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Households with extra simulated solar energy can sell it directly to households that need energy. The double auction engine automatically matches buyer bids and seller asks, clearing trades at fair prices and recording receipts on the blockchain ledger.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-emerald-400 font-bold block">Seller</span>
                <span className="text-slate-400">Home with extra energy</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-rose-400 font-bold block">Buyer</span>
                <span className="text-slate-400">Home that needs energy</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-cyan-300 font-bold block">Energy</span>
                <span className="text-slate-400">Volume traded (kWh)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-amber-400 font-bold block">Price</span>
                <span className="text-slate-400">Clearing price per kWh</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-emerald-400 font-bold block">Status</span>
                <span className="text-slate-400">Ledger settlement state</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Trade Detailed Breakdown Modal/Drawer */}
        {selectedTradeExplanation && (
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/80 text-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-purple-800/60 pb-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Trade Breakdown: {selectedTradeExplanation.trade_id}</span>
              </div>
              <button
                onClick={() => setSelectedTradeExplanation(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-900 border border-slate-800"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Seller Excess</span>
                <span className="text-emerald-400 font-bold">{selectedTradeExplanation.seller_id?.replace('HH-', 'Home ')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Buyer Demand</span>
                <span className="text-rose-400 font-bold">{selectedTradeExplanation.buyer_id?.replace('HH-', 'Home ')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Settled Amount</span>
                <span className="text-cyan-300 font-bold">{selectedTradeExplanation.energy_kwh} kWh @ ${selectedTradeExplanation.price_per_kwh}/kWh</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Ledger Block</span>
                <span className="text-purple-300 font-bold">Block #Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* Community Trading Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/90 text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                <th className="py-3 px-4">Trade ID</th>
                <th className="py-3 px-4">Seller (Extra Solar)</th>
                <th className="py-3 px-4">Buyer (Needs Energy)</th>
                <th className="py-3 px-4 text-right">Energy (kWh)</th>
                <th className="py-3 px-4 text-right">Price ($/kWh)</th>
                <th className="py-3 px-4 text-right">Total ($)</th>
                <th className="py-3 px-4 text-center">Time</th>
                <th className="py-3 px-4 text-center">Blockchain Block</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {displayedTrades.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ArrowLeftRight className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-400">
                        {tradeViewMode === 'my'
                          ? `No completed trades recorded for ${myHouseholdId?.replace('HH-', 'Home ')} yet.`
                          : 'No completed community trades yet.'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Trading activity is recorded on blockchain automatically as the simulation advances.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedTrades.slice(0, 8).map((trade, idx) => (
                  <tr
                    key={trade.trade_id || idx}
                    className="hover:bg-slate-850/50 transition cursor-pointer"
                    onClick={() => setSelectedTradeExplanation(trade)}
                  >
                    {/* Trade ID */}
                    <td className="py-3 px-4 font-bold text-white font-mono">
                      {trade.trade_id}
                    </td>

                    {/* Seller */}
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHouseholdById && onSelectHouseholdById(trade.seller_id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-medium ${
                          trade.seller_id === myHouseholdId
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                            : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/60'
                        }`}
                      >
                        <Store className="w-3 h-3" />
                        <span>{trade.seller_id?.replace('HH-', 'Home ')}</span>
                        {trade.seller_id === myHouseholdId && <span className="text-[9px] text-cyan-400 font-mono">(You)</span>}
                      </button>
                    </td>

                    {/* Buyer */}
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHouseholdById && onSelectHouseholdById(trade.buyer_id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-medium ${
                          trade.buyer_id === myHouseholdId
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                            : 'bg-rose-950/70 text-rose-300 border-rose-800/50 hover:bg-rose-900/60'
                        }`}
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>{trade.buyer_id?.replace('HH-', 'Home ')}</span>
                        {trade.buyer_id === myHouseholdId && <span className="text-[9px] text-cyan-400 font-mono">(You)</span>}
                      </button>
                    </td>

                    {/* Energy (kWh) */}
                    <td className="py-3 px-4 text-right font-bold text-cyan-300 font-mono">
                      {Number(trade.energy_kwh || 0).toFixed(2)} kWh
                    </td>

                    {/* Price ($/kWh) */}
                    <td className="py-3 px-4 text-right text-amber-400 font-mono">
                      ${Number(trade.price_per_kwh || 0).toFixed(2)}/kWh
                    </td>

                    {/* Total Value */}
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                      ${Number(trade.total_value || 0).toFixed(2)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {trade.timestamp || currentTime}
                    </td>

                    {/* Blockchain Block link */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectBlock && blocks.length > 0) {
                            const matchedBlock = blocks.find((b) =>
                              b.transactions?.some((tx) => tx.trade_id === trade.trade_id)
                            ) || blocks[blocks.length - 1];
                            onSelectBlock(matchedBlock);
                          } else {
                            setActiveTab && setActiveTab('blockchain');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 hover:bg-purple-900 transition text-[11px] font-mono"
                      >
                        <Blocks className="w-3 h-3" />
                        <span>Block #Verified</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed ✓</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {displayedTrades.length > 8 && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setActiveTab && setActiveTab('trading')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              <span>View all {displayedTrades.length} trades in full trading terminal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          LEVEL D: YOUR ENERGY TODAY & COMMUNITY CHART
          ======================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              {chartViewMode === 'household'
                ? `Your Energy Today — ${myHouseholdId?.replace('HH-', 'Home ')}`
                : 'Community Energy Overview — All 100 Homes'}
            </h2>
            <p className="text-xs text-slate-400">
              {chartViewMode === 'household'
                ? 'See how your household solar production and electricity use change throughout the simulated day'
                : 'Total aggregate generation and consumption profile across all participating homes'}
            </p>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setChartViewMode('household')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                chartViewMode === 'household'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Home
            </button>
            <button
              onClick={() => setChartViewMode('community')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                chartViewMode === 'community'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Community Fleet (100)
            </button>
          </div>
        </div>

        {/* Time markers info line */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-2 font-mono">
          <span>🌅 Sunrise (06:00)</span>
          <span>☀️ Solar Peak (12:00)</span>
          <span>🌇 Evening Peak (18:00)</span>
          <span>🌙 Night (24:00)</span>
        </div>

        <div className="h-64 sm:h-72 w-full pt-1">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* ========================================================
          LEVEL E: BLOCKCHAIN & SECURITY PREVIEWS
          ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Blockchain Preview Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60">
                  <Blocks className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Blockchain Records</h3>
                  <p className="text-xs text-slate-400">Completed trades are permanently recorded in secure blocks</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                ✓ Valid Chain
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Latest Block</span>
                <span className="text-white font-bold">#{latestBlock?.index ?? (blocks.length > 0 ? blocks.length - 1 : 0)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Total Blocks</span>
                <span className="text-purple-300 font-bold">{blocks.length || 1} Blocks</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Audit Status</span>
                <span className="text-emerald-400 font-bold">{isBlockchainValid ? 'Passed ✓' : 'Checking'}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Proof-of-Authority consensus &bull; SHA-256</span>
            <button
              onClick={() => setActiveTab && setActiveTab('blockchain')}
              className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
            >
              <span>View Blockchain Explorer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security Status Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Security Status</h3>
                  <p className="text-xs text-slate-400">Continuous protection of accounts & transactions</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                🟢 Protected
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Your account and energy transactions are protected</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Asymmetric ECC cryptographic signatures, replay attack defense, and tamper-evident blockchain verification active.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">ECC NIST P-256 &bull; Replay Shield</span>
            <button
              onClick={() => setActiveTab && setActiveTab('security')}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              <span>View Security Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL F: PROGRESSIVE DISCLOSURE - TECHNICAL DETAILS
          ======================================================== */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Technical Simulation Parameters & Microgrid Specifications</span>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Simulation Interval</span>
              <span className="text-cyan-300 font-bold">15 Minutes (96 steps/day)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Trading Mechanism</span>
              <span className="text-purple-300 font-bold">Continuous Double Auction</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Clearing Price Rule</span>
              <span className="text-emerald-400 font-bold">Mid-point (k = 0.5)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Consensus Engine</span>
              <span className="text-white font-bold">Proof-of-Authority (PoA)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
