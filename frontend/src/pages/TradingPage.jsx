import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Search,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Store,
  ShoppingBag,
  Clock,
  Zap,
  DollarSign,
  Blocks,
  FileText,
  UserCheck,
  TrendingUp,
  Info
} from 'lucide-react';
import SimulationControls from '../components/SimulationControls';

import { getNormalizedHouseholdId } from '../utils/householdUtils';

export default function TradingPage({
  simulationStatus,
  tradesData,
  householdsData,
  blockchainBlocks,
  currentUser,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  onStepSimulation,
  onRunTradingAuction,
  isOperating,
  autoPlaying,
  onToggleAutoPlay,
  onSelectHouseholdById,
  onSelectBlock
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeTab, setTradeTab] = useState('all'); // 'all' | 'my'
  const [currentPage, setCurrentPage] = useState(1);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showP2PHelp, setShowP2PHelp] = useState(false);
  const [selectedTradeExplanation, setSelectedTradeExplanation] = useState(null);
  const pageSize = 12;

  // Active user's fixed household ID derived from authentication mapping
  const myHouseholdId = useMemo(() => {
    return getNormalizedHouseholdId(currentUser?.household_id, householdsData?.households);
  }, [currentUser, householdsData]);

  const trades = tradesData?.trades || [];
  const totalCount = tradesData?.total_count || trades.length;
  const totalVolume = tradesData?.total_volume_kwh || trades.reduce((acc, t) => acc + (t.energy_kwh || 0), 0);
  const totalValue = tradesData?.total_value || trades.reduce((acc, t) => acc + (t.total_value || 0), 0);
  const avgPrice = totalVolume > 0 ? totalValue / totalVolume : 0.14;

  // User's own trades
  const myTrades = useMemo(() => {
    return trades.filter((t) => t.seller_id === myHouseholdId || t.buyer_id === myHouseholdId);
  }, [trades, myHouseholdId]);

  const myTradeVolume = useMemo(() => {
    return myTrades.reduce((acc, t) => acc + (t.energy_kwh || 0), 0);
  }, [myTrades]);

  const myTradeValue = useMemo(() => {
    return myTrades.reduce((acc, t) => acc + (t.total_value || 0), 0);
  }, [myTrades]);

  // Blockchain blocks for linking
  const blocks = blockchainBlocks?.blocks || [];

  // Filter trades by search & tab
  const baseList = tradeTab === 'my' ? myTrades : trades;
  const filteredTrades = useMemo(() => {
    return baseList.filter((t) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        t.trade_id?.toLowerCase().includes(term) ||
        t.seller_id?.toLowerCase().includes(term) ||
        t.buyer_id?.toLowerCase().includes(term) ||
        t.timestamp?.toLowerCase().includes(term)
      );
    });
  }, [baseList, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

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
      />

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-800/60">
              SOFTWARE SIMULATION
            </span>
            <span className="text-xs text-slate-400">Green Valley Local Community &bull; P2P Market</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>🔄 Peer-to-Peer Energy Trading</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Households with extra simulated solar electricity sell directly to neighbors who need power.
          </p>
        </div>

        <button
          onClick={onRunTradingAuction}
          disabled={isOperating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-950/40 border border-purple-500/40 transition disabled:opacity-50 self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Match Energy Trades</span>
        </button>
      </div>

      {/* Clear Distinction: 4 Community & User Trade Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Community Trades (Total) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-purple-300">Community Trades</span>
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/50">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {totalCount} <span className="text-xs font-normal text-slate-400 font-sans">Trades</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Completed trades across all 100 participating homes
            </p>
          </div>
        </div>

        {/* 2. My Trades */}
        <div className="bg-slate-900/90 border border-cyan-900/40 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-cyan-300">My Trades ({myHouseholdId.replace('HH-', 'Home ')})</span>
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-300 font-mono">
              {myTrades.length} <span className="text-xs font-normal text-slate-400 font-sans">Trades</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Trades directly involving your simulated home
            </p>
          </div>
        </div>

        {/* 3. Community Volume */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-emerald-300">Total Volume Traded</span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {totalVolume.toFixed(2)} <span className="text-xs font-normal text-slate-400 font-sans">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Total clean solar energy exchanged across the grid
            </p>
          </div>
        </div>

        {/* 4. Average Price */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-amber-300">Market Clearing Price</span>
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/50">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              ${avgPrice.toFixed(2)} <span className="text-xs font-normal text-slate-400 font-sans">/ kWh</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mid-point clearing between seller ask & buyer bid
            </p>
          </div>
        </div>
      </div>

      {/* Explanatory Banner & Legend */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span>Community Energy Trading Guide</span>
            </h2>
            <p className="text-xs text-slate-400">
              These are simulated energy trades between participating homes in your community.
            </p>
          </div>

          <button
            onClick={() => setShowP2PHelp(!showP2PHelp)}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 self-start sm:self-auto"
          >
            <span>What is P2P energy trading?</span>
            {showP2PHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Quick Column Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90">
            <span className="text-emerald-400 font-bold block text-[11px]">Seller</span>
            <span className="text-slate-400 text-[10px]">Home with extra energy</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90">
            <span className="text-rose-400 font-bold block text-[11px]">Buyer</span>
            <span className="text-slate-400 text-[10px]">Home that needs energy</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90">
            <span className="text-cyan-300 font-bold block text-[11px]">Energy</span>
            <span className="text-slate-400 text-[10px]">Amount traded (kWh)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90">
            <span className="text-amber-400 font-bold block text-[11px]">Price</span>
            <span className="text-slate-400 text-[10px]">Simulated price / kWh</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90">
            <span className="text-emerald-300 font-bold block text-[11px]">Status</span>
            <span className="text-slate-400 text-[10px]">Recorded on blockchain</span>
          </div>
        </div>

        {showP2PHelp && (
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/60 text-xs text-slate-300 space-y-1.5 leading-relaxed pt-2">
            <p>
              <strong>Peer-to-Peer (P2P) Energy Trading</strong> allows participating households to share rooftop solar energy directly. When a home generates more electricity than it uses, the extra power is automatically matched with nearby homes experiencing a deficit, lowering costs for buyers and providing revenue for sellers.
            </p>
          </div>
        )}
      </div>

      {/* Selected Trade Breakdown Drawer */}
      {selectedTradeExplanation && (
        <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-800/80 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
            <div className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>How This Trade Happened: {selectedTradeExplanation.trade_id}</span>
            </div>
            <button
              onClick={() => setSelectedTradeExplanation(null)}
              className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Seller Offer</span>
              <span className="text-emerald-400 font-bold">{selectedTradeExplanation.seller_id?.replace('HH-', 'Home ')}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Offered extra solar surplus</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Buyer Demand</span>
              <span className="text-rose-400 font-bold">{selectedTradeExplanation.buyer_id?.replace('HH-', 'Home ')}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Needed power for appliances</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Settled Amount</span>
              <span className="text-cyan-300 font-bold">{Number(selectedTradeExplanation.energy_kwh || 0).toFixed(2)} kWh</span>
              <span className="text-[10px] text-amber-400 block mt-0.5">@ ${Number(selectedTradeExplanation.price_per_kwh || 0).toFixed(2)}/kWh</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Blockchain Record</span>
              <span className="text-purple-300 font-bold">Block #Verified</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Cryptographically sealed</span>
            </div>
          </div>
        </div>
      )}

      {/* Search, Filter & Tabs Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs: [ My Trades ] [ Community Trades ] */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setTradeTab('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              tradeTab === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Community Trades ({trades.length})
          </button>
          <button
            onClick={() => {
              setTradeTab('my');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              tradeTab === 'my'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Trades ({myTrades.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trades by home, trade ID, or time..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      {/* Community Trades Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                <th className="py-3.5 px-4 sm:px-6">Trade</th>
                <th className="py-3.5 px-4">Seller (Extra Solar)</th>
                <th className="py-3.5 px-4">Buyer (Needs Energy)</th>
                <th className="py-3.5 px-4 text-right">Energy</th>
                <th className="py-3.5 px-4 text-right">Price</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Time</th>
                <th className="py-3.5 px-4 text-center">Blockchain Block</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ArrowLeftRight className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium text-slate-400">
                        {tradeTab === 'my'
                          ? `No trades recorded for ${myHouseholdId.replace('HH-', 'Home ')} yet.`
                          : 'No completed community energy trades yet.'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Click <strong>Start Simulation</strong> or <strong>Step (+15m)</strong> in the top bar to run the trading auction.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((trade, idx) => (
                  <tr
                    key={trade.trade_id || idx}
                    onClick={() => setSelectedTradeExplanation(trade)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    {/* Trade ID */}
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-white font-mono">
                      {trade.trade_id}
                    </td>

                    {/* Seller */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHouseholdById && onSelectHouseholdById(trade.seller_id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                          trade.seller_id === myHouseholdId
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/60'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>{trade.seller_id?.replace('HH-', 'Home ')}</span>
                        {trade.seller_id === myHouseholdId && <span className="text-[9px] text-cyan-400 font-mono">(You)</span>}
                      </button>
                    </td>

                    {/* Buyer */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHouseholdById && onSelectHouseholdById(trade.buyer_id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                          trade.buyer_id === myHouseholdId
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{trade.buyer_id?.replace('HH-', 'Home ')}</span>
                        {trade.buyer_id === myHouseholdId && <span className="text-[9px] text-cyan-400 font-mono">(You)</span>}
                      </button>
                    </td>

                    {/* Energy (kWh) */}
                    <td className="py-3.5 px-4 text-right font-bold text-cyan-300 font-mono">
                      {Number(trade.energy_kwh || 0).toFixed(2)} kWh
                    </td>

                    {/* Price ($/kWh) */}
                    <td className="py-3.5 px-4 text-right text-amber-400 font-mono">
                      ${Number(trade.price_per_kwh || 0).toFixed(2)}/kWh
                    </td>

                    {/* Total Value */}
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                      ${Number(trade.total_value || 0).toFixed(2)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {trade.timestamp || 'Settled'}
                    </td>

                    {/* Blockchain Block link */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectBlock && blocks.length > 0) {
                            const matchedBlock = blocks.find((b) =>
                              b.transactions?.some((tx) => tx.trade_id === trade.trade_id)
                            ) || blocks[blocks.length - 1];
                            onSelectBlock(matchedBlock);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 hover:bg-purple-900 transition text-[11px] font-mono"
                      >
                        <Blocks className="w-3 h-3" />
                        <span>Block #Verified</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 sm:px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/80">
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

        {/* Pagination */}
        {filteredTrades.length > pageSize && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({filteredTrades.length} trades)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Technical Details Accordion */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>Technical Trading Details (Auction Algorithm & Clearing)</span>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs text-slate-400 leading-relaxed">
            <p>
              Peer-to-peer trades are cleared through a periodic discrete double auction mechanism. Sellers submit surplus energy ask prices (benchmark $0.10/kWh) and buyers submit deficit bid prices (benchmark $0.18/kWh).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Market Mechanism</span>
                <span className="text-purple-300 font-bold">Continuous Double Auction</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Settlement Price Rule</span>
                <span className="text-emerald-400 font-bold">Mid-point Clearing (k = 0.5)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Ledger Storage</span>
                <span className="text-cyan-300 font-bold">Proof-of-Authority Block</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
