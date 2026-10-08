import React from 'react';
import { Server, Database, CheckCircle2, AlertCircle, RefreshCw, Clock, Layers } from 'lucide-react';

export default function HealthStatus({ health, loading, error, latency, onRefresh, apiUrl }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white tracking-tight">System & Engine Telemetry</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              /health
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time diagnostics from FastAPI gateway and PostgreSQL data layer
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-medium border border-slate-700/60 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Check</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Backend API Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200">FastAPI Backend</span>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">{apiUrl}</p>
              </div>
            </div>
            {health?.status === 'healthy' ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Offline
              </span>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Latency</span>
            <span className="font-mono text-cyan-400 font-medium">{latency !== null ? `${latency} ms` : '--'}</span>
          </div>
        </div>

        {/* Database Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200">Database Layer</span>
                <p className="text-[11px] text-slate-400 font-mono">
                  {health?.database?.database_type?.toUpperCase() || 'POSTGRESQL'}
                </p>
              </div>
            </div>
            {health?.database?.status === 'connected' ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full" title={health?.database?.error || 'Database awaiting start'}>
                <AlertCircle className="w-3 h-3" /> Configured
              </span>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Target Host</span>
            <span className="font-mono text-slate-300">{health?.database?.host || 'localhost:5432'}</span>
          </div>
        </div>

        {/* Environment / Build Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200">Environment</span>
                <p className="text-[11px] text-slate-400">
                  {health?.environment || 'development'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-medium text-purple-300 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full">
              v{health?.version || '0.1.0'}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Synced
            </span>
            <span className="font-mono text-slate-300 text-[11px]">
              {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>Backend unreachable: {error}. Verify that FastAPI is running on {apiUrl}.</span>
        </div>
      )}
    </div>
  );
}
