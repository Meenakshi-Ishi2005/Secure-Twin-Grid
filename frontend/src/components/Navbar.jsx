import React from 'react';
import {
  Home,
  Zap,
  ArrowLeftRight,
  ShieldCheck,
  FileText,
  Settings,
  ShieldAlert,
  Clock,
  Play,
  RotateCcw,
  User,
  Shield,
  Layers
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  simulationStatus,
  onStart,
  onReset,
  isOperating,
  isBackendOnline,
  currentUser,
  onOpenAuthModal
}) {
  // 6 Main Normal User Navigation Tabs
  const userTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'energy', label: 'Energy', icon: Zap },
    { id: 'trading', label: 'Trading', icon: ArrowLeftRight },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  const currentTime = simulationStatus?.current_time || '00:00';
  const currentStep = simulationStatus?.current_step ?? 0;
  const totalSteps = simulationStatus?.total_steps ?? 96;
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <header className="border-b border-slate-800/90 bg-[#090e1a]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Brand */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/30 group-hover:scale-105 transition">
              <Zap className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-cyan-300 transition">
                  SecureTwinGrid
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  Simulation
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block font-medium">
                Your Local Energy Community
              </p>
            </div>
          </div>

          {/* Main Navigation (6 Normal User Tabs) */}
          <nav className="flex items-center space-x-0.5 sm:space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            {userTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (tab.id === 'records' && activeTab === 'blockchain');
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Separate Admin Console Tab ONLY visible if logged in user is Admin */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition shrink-0 ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-800/40'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>

          {/* Quick Simulation Clock & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Simulation Clock */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono font-bold text-white text-xs">{currentTime}</span>
              <span className="text-[10px] text-slate-500 font-mono">({progressPercent}%)</span>
            </div>

            {/* Quick Sim Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onStart()}
                disabled={isOperating}
                title="Run Simulation Step (+15m)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 border border-emerald-500/40 transition disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Sim</span>
              </button>

              <button
                onClick={() => onReset()}
                disabled={isOperating}
                title="Reset Simulation to 00:00"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* User Profile Button */}
            <button
              onClick={onOpenAuthModal}
              title={currentUser ? `Signed in as ${currentUser.username} (${currentUser.role})` : 'Sign in'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                currentUser
                  ? 'bg-cyan-950/80 border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/80'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-mono text-xs truncate max-w-[90px]">
                {currentUser ? currentUser.username : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
