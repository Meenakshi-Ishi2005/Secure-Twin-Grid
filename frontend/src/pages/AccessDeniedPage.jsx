import React from 'react';
import {
  XCircle,
  ShieldAlert,
  Building,
  LogOut,
  ArrowLeft
} from 'lucide-react';

export default function AccessDeniedPage({
  currentUser,
  onLogout,
}) {
  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#090e1a]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                SecureTwinGrid
              </span>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Local Energy Community
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Return to Login</span>
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 max-w-lg mx-auto w-full animate-in fade-in duration-300">
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-950/40">
            <XCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Access Not Approved
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your registration was not approved for this energy community.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-xs text-left space-y-2 text-slate-400">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span>Account Email:</span>
              <span className="font-mono text-slate-200">{currentUser?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span>Community:</span>
              <span className="text-slate-200">{currentUser?.community || 'Green Valley Community'}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Status:</span>
              <span className="text-rose-400 font-semibold">Not Approved / Rejected</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Login</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060a14] py-4 text-xs text-slate-500 text-center mt-auto">
        Software Simulation • Research Project • SecureTwinGrid
      </footer>
    </div>
  );
}
