import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Blocks,
  Clock,
  Key,
  Hash,
  ArrowLeftRight,
  Store,
  ShoppingBag,
  Zap,
  Check,
  Copy,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function BlockModal({ block, onClose, onSelectHouseholdById }) {
  const [copiedField, setCopiedField] = useState(null);
  const [showHashes, setShowHashes] = useState(false);

  if (!block) return null;

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isGenesis = block.index === 0;
  const transactions = block.transactions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-950/80 border border-purple-800/80 flex items-center justify-center text-purple-400">
              <Blocks className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white font-mono">
                  {isGenesis ? 'Genesis Record Block (#0)' : `Record Block #${block.index}`}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    isGenesis
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {isGenesis ? 'Genesis Anchor' : 'Verified ✓'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Sealed at {block.timestamp || '00:00'}</span>
                <span>&bull;</span>
                <span>{transactions.length} {transactions.length === 1 ? 'Trade' : 'Trades'} Settled</span>
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

        {/* Scrollable Block Content */}
        <div className="flex-1 overflow-y-auto space-y-5 py-5 pr-1 text-xs">
          {/* Friendly Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block mb-1">Block Number</span>
              <span className="text-base font-bold text-white font-mono">#{block.index}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block mb-1">Total Volume</span>
              <span className="text-base font-bold text-cyan-300 font-mono">
                {transactions.reduce((acc, t) => acc + (t.energy_kwh || 0), 0).toFixed(2)} kWh
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block mb-1">Verification Status</span>
              <span className="text-base font-bold text-emerald-400 flex items-center gap-1">
                <span>Valid Record ✓</span>
              </span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Settled Trades in this Period ({transactions.length})</span>
            </h4>

            {transactions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                {isGenesis
                  ? 'Genesis Block initialization anchor. No trades recorded in initial state.'
                  : 'No energy trades recorded in this block.'}
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-mono bg-slate-900/60">
                      <th className="py-2.5 px-4">Trade ID</th>
                      <th className="py-2.5 px-4">Seller</th>
                      <th className="py-2.5 px-4">Buyer</th>
                      <th className="py-2.5 px-4 text-right">Energy</th>
                      <th className="py-2.5 px-4 text-right">Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {transactions.map((tx, idx) => (
                      <tr key={tx.trade_id || idx} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-4 font-bold text-white">{tx.trade_id}</td>
                        <td className="py-2.5 px-4 text-emerald-400 font-medium">
                          {tx.seller_id?.replace('HH-', 'Home ')}
                        </td>
                        <td className="py-2.5 px-4 text-rose-400 font-medium">
                          {tx.buyer_id?.replace('HH-', 'Home ')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-cyan-300">
                          {Number(tx.energy_kwh).toFixed(2)} kWh
                        </td>
                        <td className="py-2.5 px-4 text-right text-amber-400">
                          ${Number(tx.price_per_kwh).toFixed(2)}/kWh
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                          ${Number(tx.total_value).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Progressive Disclosure: Collapsible Technical Hashes */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <button
              onClick={() => setShowHashes(!showHashes)}
              className="w-full flex items-center justify-between text-slate-400 hover:text-white transition"
            >
              <div className="flex items-center gap-2 font-medium">
                <Hash className="w-4 h-4 text-cyan-400" />
                <span>Technical Cryptographic Hashes</span>
              </div>
              {showHashes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHashes && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Block Hash (SHA-256):</span>
                    <button
                      onClick={() => copyToClipboard(block.hash, 'hash')}
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {copiedField === 'hash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'hash' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <code className="block w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 break-all select-all">
                    {block.hash}
                  </code>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Previous Parent Hash:</span>
                    <button
                      onClick={() => copyToClipboard(block.previous_hash, 'prev_hash')}
                      className="text-slate-400 hover:underline flex items-center gap-1"
                    >
                      {copiedField === 'prev_hash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'prev_hash' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <code className="block w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all">
                    {block.previous_hash}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Secure Record Block &bull; Permanent Community Ledger</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
