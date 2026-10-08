import React from 'react';
import {
  Zap,
  ShieldCheck,
  Users,
  Lock,
  ArrowRight,
  LogIn,
  UserPlus,
  Shield,
  Building,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage({
  onOpenLogin,
  onOpenRegister,
  onQuickLogin,
  isBackendOnline,
}) {
  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#090e1a]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/30">
              <Zap className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  ⚡ SecureTwinGrid
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  Closed Community
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Local Energy Community
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
            <button
              onClick={onOpenRegister}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-950/40 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto text-center space-y-8 animate-in fade-in duration-300">
        {/* Research Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>Software Simulation • Research Project</span>
        </div>

        {/* Brand & Community Title */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            ⚡ SecureTwinGrid
            <span className="block text-xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent mt-2">
              Local Energy Community
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A secure software simulation of a local energy community where approved participants can generate, use and trade virtual energy.
          </p>
        </div>

        {/* Closed Community Notice Card */}
        <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-left space-y-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Private Community Microgrid Access
              </h2>
              <p className="text-xs text-slate-400">
                Participation requires community membership & admin approval
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-cyan-400 shrink-0" />
              <span><strong>Community:</strong> Green Valley Community (COMM-001)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Participant Scope:</strong> Assigned Households & Units</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span><strong>Security:</strong> Cryptographic Identity & Admin Verification</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-1/2 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Account</span>
            </button>
          </div>
        </div>

        {/* Demo Fast-Fill Bar */}
        <div className="w-full max-w-xl p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-2">
            <span>⚡ Demonstration Quick Access:</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onQuickLogin('sys_admin', 'AdminStrongPassword999!')}
              className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 text-xs font-mono transition"
            >
              👑 Admin (sys_admin)
            </button>
            <button
              type="button"
              onClick={() => onQuickLogin('bob_prosumer', 'UserStrongPassword123!')}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 text-xs font-mono transition"
            >
              🏠 Approved Prosumer (bob_prosumer)
            </button>
          </div>
        </div>

        {/* 3 Core Pillars (High level, Non-technical) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left pt-4">
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Local Clean Energy</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Virtual solar rooftop generation and battery storage modeling within the local community grid.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Peer-to-Peer Trading</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Simulated double auction energy trading between local prosumer and consumer households.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Secure Governance</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cryptographic ECC identity keys, tamper-proof logs, and verified administrator approval.
            </p>
          </div>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060a14] py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-semibold text-slate-400">SecureTwinGrid • Closed Local Energy Community Platform</span>
          </div>
          <div className="text-slate-500">
            Software Simulation • Research Project
          </div>
        </div>
      </footer>
    </div>
  );
}
