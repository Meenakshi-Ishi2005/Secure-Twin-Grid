import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '../components/charts/ChartSetup';
import { getNormalizedHouseholdId } from '../utils/householdUtils';
import {
  Zap,
  Sun,
  Battery,
  BatteryCharging,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Building2,
  Clock
} from 'lucide-react';
import SimulationControls from '../components/SimulationControls';

export default function EnergyPage({
  simulationStatus,
  energySummary,
  energyHistory,
  householdsData,
  currentUser,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  onStepSimulation,
  isOperating,
  autoPlaying,
  onToggleAutoPlay,
  onSelectHouseholdById
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showCalculationHelp, setShowCalculationHelp] = useState(false);
  const [chartViewMode, setChartViewMode] = useState('household'); // 'household' | 'community'

  const households = householdsData?.households || [];
  const myHouseholdId = useMemo(() => {
    return getNormalizedHouseholdId(currentUser?.household_id, households);
  }, [currentUser, households]);

  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
  const activeHouseholdId = selectedHouseholdId || myHouseholdId;

  const myHousehold = useMemo(() => {
    return households.find((h) => h.household_id === activeHouseholdId) || households[0] || null;
  }, [households, activeHouseholdId]);

  // Household-level dynamic metrics (Current timestep)
  const myGenKw = myHousehold?.current_generation_kw ?? 0;
  const myConKw = myHousehold?.current_consumption_kw ?? 0;
  const myBatKwh = myHousehold?.battery_level_kwh ?? 0;
  const myBatCapKwh = myHousehold?.battery_capacity_kwh ?? 0;
  const myStatus = (myHousehold?.status || 'BALANCED').toUpperCase();
  const myNetKw = myGenKw - myConKw;
  const isMySurplus = myStatus === 'SELLING' || myNetKw > 0.05;
  const isMyDeficit = myStatus === 'BUYING' || myNetKw < -0.05;

  // Community-level metrics
  const totalGenKwh = energySummary?.total_generation_kwh ?? 0;
  const totalConKwh = energySummary?.total_consumption_kwh ?? 0;
  const currentGenKw = energySummary?.current_total_generation_kw ?? 0;
  const currentConKw = energySummary?.current_total_consumption_kw ?? 0;
  const batteryStoredKwh = energySummary?.total_battery_stored_kwh ?? 0;
  const batteryCapKwh = energySummary?.total_battery_capacity_kwh ?? 0;
  const peakGenKw = energySummary?.peak_generation_kw ?? 0;
  const peakDemandKw = energySummary?.peak_demand_kw ?? 0;
  const totalHouseholdsCount = simulationStatus?.num_households ?? households.length ?? 100;

  const fleetBatterySoC = batteryCapKwh > 0 ? Math.round((batteryStoredKwh / batteryCapKwh) * 100) : 0;
  const myBatterySoC = myBatCapKwh > 0 ? Math.round((myBatKwh / myBatCapKwh) * 100) : 0;

  // Time-series Chart
  const history = energyHistory?.history || [];
  const chartLabels = useMemo(() => {
    if (history.length > 0) {
      return history.map((s) => s.time || `Step ${s.step}`);
    }
    return ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'];
  }, [history]);

  const genVsDemandData = useMemo(() => {
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
              label: `My Solar Generated (kW) [${activeHouseholdId?.replace('HH-', 'Home ')}]`,
              data: hhGenData,
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: history.length > 30 ? 1 : 2,
            },
            {
              label: `My Electricity Used (kW) [${activeHouseholdId?.replace('HH-', 'Home ')}]`,
              data: hhConData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: history.length > 30 ? 1 : 2,
            },
          ],
        };
      }

      return {
        labels: chartLabels,
        datasets: [
          {
            label: `My Solar Generated (kW) [${activeHouseholdId?.replace('HH-', 'Home ')}]`,
            data: solarCap > 0 ? [0, 0, 0.4, 2.8, 4.2, 3.4, 0.6, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.2)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: `My Electricity Used (kW) [${activeHouseholdId?.replace('HH-', 'Home ')}]`,
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

    // Community fleet
    if (history.length > 0) {
      return {
        labels: chartLabels,
        datasets: [
          {
            label: 'Community Solar Generated (kW) [All 100 Homes]',
            data: history.map((s) => s.total_generation_kw),
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: history.length > 30 ? 1 : 2,
          },
          {
            label: 'Community Electricity Used (kW) [All 100 Homes]',
            data: history.map((s) => s.total_consumption_kw),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: history.length > 30 ? 1 : 2,
          },
        ],
      };
    }

    return {
      labels: chartLabels,
      datasets: [
        {
          label: 'Community Solar Generated (kW)',
          data: [0, 0, 15, 140, 260, 210, 40, 0, 0],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Community Electricity Used (kW)',
          data: [45, 38, 70, 95, 110, 90, 135, 105, 55],
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
      ],
    };
  }, [history, chartLabels, chartViewMode, myHousehold, totalHouseholdsCount, activeHouseholdId]);

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
      {/* Simulation Controls Banner */}
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

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/60">
              SOFTWARE SIMULATION
            </span>
            <span className="text-xs text-slate-400">Green Valley Local Community</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>⚡ Energy Generation & Demand</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Track instantaneous solar power, household demand, and battery storage across the 24-hour cycle.
          </p>
        </div>

        {/* Household selector */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Household:</span>
          <select
            value={activeHouseholdId}
            onChange={(e) => {
              setSelectedHouseholdId(e.target.value);
              onSelectHouseholdById && onSelectHouseholdById(e.target.value);
            }}
            className="bg-slate-900 border border-cyan-700/60 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
          >
            {households.length > 0 ? (
              households.slice(0, 30).map((h) => (
                <option key={h.household_id} value={h.household_id}>
                  {h.household_id.replace('HH-', 'Home ')} ({h.has_solar ? '☀️ Solar' : 'Demand Only'})
                </option>
              ))
            ) : (
              <option value={activeHouseholdId}>{activeHouseholdId ? activeHouseholdId.replace('HH-', 'Home ') : 'Home 001'}</option>
            )}
          </select>
        </div>
      </div>

      {/* ========================================================
          YOUR HOME CURRENT ENERGY STATE
          ======================================================== */}
      <div className="bg-slate-900/90 border border-cyan-900/40 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center font-bold font-mono">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  YOUR HOME — {activeHouseholdId?.replace('HH-', 'HOME ')}
                </h2>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/50">
                  {currentTime}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instantaneous power balance for your simulated home at timestep {currentTime}
              </p>
            </div>
          </div>

          {/* Dynamic Status Pill */}
          <div className="shrink-0">
            {isMySurplus ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold shadow-md shadow-emerald-950/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>☀️ Extra Solar Available (+{myNetKw.toFixed(1)} kW)</span>
              </div>
            ) : isMyDeficit ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-bold shadow-md shadow-amber-950/40">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>⚡ Energy Needed ({Math.abs(myNetKw).toFixed(1)} kW)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>✓ Balanced</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Contextual Household Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Solar Produced */}
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
                Live solar production at {currentTime}
              </p>
            </div>
          </div>

          {/* 2. Energy Used */}
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
                Live household load demand at {currentTime}
              </p>
            </div>
          </div>

          {/* 3. Battery Stored */}
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
                {myBatCapKwh > 0 ? `${myBatterySoC}% charged (${myBatCapKwh} kWh total)` : 'No home battery'}
              </p>
            </div>
          </div>

          {/* 4. Energy Balance */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">⚡ Energy Balance</span>
              <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                <Sparkles className="w-4 h-4" />
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
                {isMySurplus ? 'Available to share/sell' : isMyDeficit ? 'Deficit needed from grid' : 'Self-sufficient'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          COMMUNITY FLEET OVERVIEW CARDS
          ======================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" />
              <span>Community Grid Overview — All {totalHouseholdsCount} Homes</span>
            </h3>
            <p className="text-xs text-slate-400">24-hour total generation, consumption, and storage metrics</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Fleet: 100 Houses</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-amber-400 block mb-1">Total Solar Generated</span>
            <div className="text-xl font-bold text-white font-mono">
              {totalGenKwh.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">kWh</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Peak: {peakGenKw.toFixed(1)} kW</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-teal-400 block mb-1">Total Electricity Used</span>
            <div className="text-xl font-bold text-white font-mono">
              {totalConKwh.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">kWh</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Peak: {peakDemandKw.toFixed(1)} kW</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-emerald-400 block mb-1">Fleet Battery Storage</span>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {batteryStoredKwh.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">kWh</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{fleetBatterySoC}% Fleet SoC ({batteryCapKwh.toFixed(1)} kWh cap)</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-semibold text-cyan-300 block mb-1">Instantaneous Grid Net</span>
            <div className="text-xl font-bold font-mono">
              {currentGenKw >= currentConKw ? (
                <span className="text-emerald-400">+{(currentGenKw - currentConKw).toFixed(1)} kW</span>
              ) : (
                <span className="text-amber-400">{(currentGenKw - currentConKw).toFixed(1)} kW</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Live balance at {currentTime}</span>
          </div>
        </div>
      </div>

      {/* Generation vs Usage Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              {chartViewMode === 'household'
                ? `Solar Generation vs Electricity Usage (${activeHouseholdId?.replace('HH-', 'Home ')})`
                : 'Community Solar Generation vs Electricity Usage (100 Homes)'}
            </h2>
            <p className="text-xs text-slate-400">
              Hourly profile of simulated solar generation compared with household demand across the 24-hour day
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
              Community Fleet
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
          <Line data={genVsDemandData} options={chartOptions} />
        </div>
      </div>

      {/* Simple 3 Household Energy Components */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Sun className="w-4 h-4" />
            <span>Rooftop Solar PV</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Clean solar electricity generated during daylight hours. Peak generation happens around mid-day when the sun is highest.
          </p>
          <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 font-mono flex justify-between">
            <span className="text-slate-500">Live Output:</span>
            <span className="text-amber-400 font-bold">{myGenKw.toFixed(1)} kW</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Home Electricity Demand</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Electricity used by lights, appliances, heating, cooling, and electric vehicle charging throughout your household.
          </p>
          <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 font-mono flex justify-between">
            <span className="text-slate-500">Live Usage:</span>
            <span className="text-teal-400 font-bold">{myConKw.toFixed(1)} kW</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Battery className="w-4 h-4" />
            <span>Home Battery Storage</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Stores extra solar power produced during the day so it can be used in the evening when solar output decreases.
          </p>
          <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 font-mono flex justify-between">
            <span className="text-slate-500">Stored Energy:</span>
            <span className="text-emerald-400 font-bold">{myBatKwh.toFixed(1)} kWh</span>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure: Technical Details Accordion */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Technical Simulation Metrics & Capacities</span>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Peak Solar Output</span>
              <span className="text-white font-bold">{peakGenKw.toFixed(2)} kW</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Peak Demand Load</span>
              <span className="text-white font-bold">{peakDemandKw.toFixed(2)} kW</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Fleet Battery Capacity</span>
              <span className="text-emerald-400 font-bold">{batteryCapKwh.toFixed(2)} kWh</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Simulation Interval</span>
              <span className="text-cyan-300 font-bold">15 Minutes (96 steps/day)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
