import React, { useState } from 'react';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Clock,
  Sliders,
  Settings2,
  CheckCircle,
  Sparkles,
  Zap
} from 'lucide-react';

export default function SimulationControls({
  simulationStatus,
  onStart,
  onStop,
  onReset,
  onStep,
  isOperating,
  autoPlaying,
  onToggleAutoPlay,
  currentUser,
}) {
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
  if (!isAdmin) {
    return null;
  }
  const currentStep = simulationStatus?.current_step ?? 0;
  const totalSteps = simulationStatus?.total_steps ?? 96;
  const currentTime = simulationStatus?.current_time || '00:00';
  const numHouseholds = simulationStatus?.num_households ?? 100;
  const statusStr = simulationStatus?.status || 'INITIALIZED';
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  const [showConfig, setShowConfig] = useState(false);
  const [customHouseholds, setCustomHouseholds] = useState(100);
  const [customSeed, setCustomSeed] = useState(42);

  const handleCustomReset = (e) => {
    e.preventDefault();
    onReset(customHouseholds, customSeed);
    setShowConfig(false);
  };

  const getStatusBadge = () => {
    switch (statusStr) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Simulating
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            24h Completed
          </span>
        );
      case 'STOPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
            <Pause className="w-3.5 h-3.5" />
            Paused
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Ready (Step 0)
          </span>
        );
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900/90 via-[#0e1628] to-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Engine Status & Clock */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Digital Twin Simulation Engine</h2>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-mono">
              <span>Time: <strong className="text-white text-sm">{currentTime}</strong> / 24:00</span>
              <span>&bull;</span>
              <span>Interval: <strong className="text-slate-300">15 min</strong></span>
              <span>&bull;</span>
              <span>Step: <strong className="text-cyan-400">{currentStep}</strong> / {totalSteps}</span>
              <span>&bull;</span>
              <span>Fleet: <strong className="text-slate-300">{numHouseholds} Houses</strong></span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 hidden md:block">
              Simulation of energy production, household demand, battery storage, and P2P trading. Current simulation time determines the energy state and trades.
            </p>
          </div>
        </div>

        {/* Right: Simulation Actions & Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Start / Advance Full Simulation */}
          <button
            onClick={() => onStart()}
            disabled={isOperating || currentStep >= totalSteps}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-500/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Simulation</span>
          </button>

          {/* Step (+15m) Button */}
          <button
            onClick={() => onStep(1)}
            disabled={isOperating || currentStep >= totalSteps}
            title="Advance simulation by 1 step (+15 minutes)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FastForward className="w-4 h-4 text-cyan-400" />
            <span>Step (+15m)</span>
          </button>

          {/* Auto-Play Toggle */}
          <button
            onClick={onToggleAutoPlay}
            disabled={currentStep >= totalSteps && !autoPlaying}
            title={autoPlaying ? 'Pause continuous simulation' : 'Auto-advance step by step'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              autoPlaying
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {autoPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Auto</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Play</span>
              </>
            )}
          </button>

          {/* Reset Simulation Button */}
          <button
            onClick={() => onReset()}
            disabled={isOperating}
            title="Reset Digital Twin to 00:00 (Step 0)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Reset Simulation</span>
          </button>

          {/* Config Drawer Toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Simulation Parameters"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 24-Hour Progress Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
          <div className="flex items-center gap-4">
            <span className="font-mono">00:00 (Start)</span>
            <span className="hidden sm:inline font-mono text-slate-500">06:00 (Sunrise)</span>
            <span className="hidden sm:inline font-mono text-slate-500">12:00 (Solar Peak)</span>
            <span className="hidden sm:inline font-mono text-slate-500">18:00 (Evening Peak)</span>
            <span className="font-mono">24:00 (End)</span>
          </div>
          <span className="font-mono text-cyan-400 font-semibold">{progressPercent}% Progress</span>
        </div>
        <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <form
          onSubmit={handleCustomReset}
          className="mt-4 pt-3 border-t border-slate-800 bg-slate-950/60 p-4 rounded-xl flex flex-wrap items-center gap-4 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Households:</span>
            <input
              type="number"
              min="2"
              max="500"
              value={customHouseholds}
              onChange={(e) => setCustomHouseholds(parseInt(e.target.value) || 100)}
              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Random Seed:</span>
            <input
              type="number"
              value={customSeed}
              onChange={(e) => setCustomSeed(parseInt(e.target.value) || 42)}
              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition"
          >
            Apply & Reset Simulation
          </button>
        </form>
      )}
    </div>
  );
}
