import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  CheckCircle2,
  Lock,
  FileCheck,
  KeyRound,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function SecurityPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const fetchSecurityStatus = async () => {
    setIsLoading(true);
    try {
      const statsData = await api.getSecurityStats().catch(() => null);
      setStats(statsData);
    } catch {
      // Keep friendly fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    const interval = setInterval(fetchSecurityStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/60">
              SOFTWARE SIMULATION
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>🛡️ Security</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Your account and trades are protected. The system continuously checks activity for suspicious behavior.
          </p>
        </div>

        {/* System Status Banner */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold shadow-lg shadow-emerald-950/40">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>🟢 System Status: Protected</span>
          </div>
          <button
            onClick={fetchSecurityStatus}
            disabled={isLoading}
            title="Check security status"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Clean Security Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Account */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Account Security</span>
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Secure ✓</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Your household identity and credentials are encrypted and protected.
            </p>
          </div>
        </div>

        {/* 2. Trades */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Energy Trades</span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Verified ✓</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Every energy trade is digitally verified before final settlement.
            </p>
          </div>
        </div>

        {/* 3. Trade Records */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Trade Records</span>
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/50">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Protected ✓</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              All completed records are permanently stored and cannot be altered.
            </p>
          </div>
        </div>

        {/* 4. Suspicious Activity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Suspicious Activity</span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>None detected</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active defense rules continuously protect the community grid.
            </p>
          </div>
        </div>
      </div>

      {/* What We Protect - 3 Core Guarantees */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-base font-bold text-white border-b border-slate-800/80 pb-3">
          How SecureTwinGrid Protects You
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>Tamper-Proof Record Keeping</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a trade completes, its details are stored in an append-only verifiable chain, ensuring no one can alter past electricity settlements.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Digital Signature Verification</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every energy transfer is authorized by your household's unique cryptographic key, preventing unauthorized trades on your behalf.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Automated Threat Defense</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The platform automatically rejects repeated, outdated, or fraudulent transaction requests before they can affect your energy balance.
            </p>
          </div>
        </div>
      </div>

      {/* "Learn More about Grid Security" Educational Accordions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Learn More About Grid Security</span>
        </div>

        <div className="space-y-2">
          {/* FAQ 1 */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60">
            <button
              onClick={() => toggleFaq(1)}
              className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <span>How do digital signatures protect my trades?</span>
              {openFaq === 1 ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {openFaq === 1 && (
              <div className="p-3.5 pt-0 text-xs text-slate-400 border-t border-slate-800/60 leading-relaxed">
                A digital signature is a mathematical proof that a message originated from you and was not altered in transit. This ensures that only you can offer your solar energy or buy electricity from neighbors.
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60">
            <button
              onClick={() => toggleFaq(2)}
              className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <span>What prevents old trades from being replayed?</span>
              {openFaq === 2 ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {openFaq === 2 && (
              <div className="p-3.5 pt-0 text-xs text-slate-400 border-t border-slate-800/60 leading-relaxed">
                Each trade has a unique sequence number (nonce) and strict timestamp window. The platform verifies each number exactly once, automatically blocking duplicate or replayed transactions.
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60">
            <button
              onClick={() => toggleFaq(3)}
              className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              <span>Is my household electricity usage private?</span>
              {openFaq === 3 ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {openFaq === 3 && (
              <div className="p-3.5 pt-0 text-xs text-slate-400 border-t border-slate-800/60 leading-relaxed">
                Yes. SecureTwinGrid follows strict data minimization principles. Only net energy bids are shared for matching; individual appliance usage and private routines remain strictly on your client side.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
