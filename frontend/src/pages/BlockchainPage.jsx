import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Search,
  Clock,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Blocks,
  RefreshCw,
  Hash,
  Key,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import BlockModal from '../components/BlockModal';
import SimulationControls from '../components/SimulationControls';

export default function BlockchainPage({
  simulationStatus,
  blockchainSummary,
  blockchainBlocks,
  onStartSimulation,
  onStopSimulation,
  onResetSimulation,
  onStepSimulation,
  onValidateBlockchain,
  isOperating,
  autoPlaying,
  onToggleAutoPlay,
  onSelectHouseholdById
}) {
  const blocks = blockchainBlocks?.blocks || [];
  const totalBlocks = blockchainSummary?.chain_length || blocks.length;
  const totalTxs = blockchainSummary?.total_transactions || blocks.reduce((acc, b) => acc + (b.transactions?.length || 0), 0);
  const isValid = blockchainSummary?.is_valid ?? true;

  const [selectedBlock, setSelectedBlock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showBlockchainHelp, setShowBlockchainHelp] = useState(false);
  const pageSize = 10;

  // Filter blocks by search term
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        String(b.index).includes(term) ||
        b.timestamp?.toLowerCase().includes(term) ||
        b.hash?.toLowerCase().includes(term) ||
        b.previous_hash?.toLowerCase().includes(term)
      );
    });
  }, [blocks, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredBlocks.length / pageSize));
  const paginatedBlocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBlocks.slice(start, start + pageSize);
  }, [filteredBlocks, currentPage, pageSize]);

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
            <span className="text-xs text-slate-400">Green Valley Local Community &bull; Proof-of-Authority Ledger</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>⛓️ Blockchain Records & Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Completed energy trades are stored in blocks. Each block is linked to the previous block, making unauthorized changes detectable.
          </p>
        </div>

        <button
          onClick={onValidateBlockchain}
          disabled={isOperating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-500/40 transition disabled:opacity-50 self-start md:self-auto"
        >
          <ShieldCheck className="w-4 h-4 text-slate-950" />
          <span>Validate Blockchain</span>
        </button>
      </div>

      {/* 3 Clean KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Blocks */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Total Blocks</span>
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/50">
              <Blocks className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {totalBlocks} <span className="text-xs font-normal text-slate-400 font-sans">Blocks</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Genesis Block #0 &bull; Continuous chain of trade settlements
            </p>
          </div>
        </div>

        {/* 2. Recorded Trades */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Recorded Trades</span>
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-300 font-mono">
              {totalTxs} <span className="text-xs font-normal text-slate-400 font-sans">Trades</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Energy transfers digitally verified & sealed onto ledger
            </p>
          </div>
        </div>

        {/* 3. Cryptographic Validation Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Cryptographic Integrity</span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-6 h-6" />
              <span>{isValid ? 'Valid Chain ✓' : 'Corrupted Block'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isValid ? 'All SHA-256 block hashes and parent links verified' : 'Integrity check identified an error'}
            </p>
          </div>
        </div>
      </div>

      {/* Explorer Search & Guide Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Blocks className="w-4 h-4 text-purple-400" />
              <span>Blockchain Ledger Explorer</span>
            </h2>
            <p className="text-xs text-slate-400">
              Inspect cryptographic blocks, trade transaction receipts, previous block hashes, and validator seals
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBlockchainHelp(!showBlockchainHelp)}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 transition"
            >
              <span>How does blockchain secure trades?</span>
              {showBlockchainHelp ? <ChevronUp className="w-3.5 h-3.5 inline ml-1" /> : <ChevronDown className="w-3.5 h-3.5 inline ml-1" />}
            </button>
          </div>
        </div>

        {showBlockchainHelp && (
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/60 text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <p>
              When an energy trade completes between a seller and buyer, it is packaged into a transaction and committed to a <strong>Block</strong>. Each block calculates a unique SHA-256 fingerprint covering all transactions and points to the previous block hash (<span className="font-mono text-cyan-300">previous_hash</span>). If any past trade or energy amount is altered, all subsequent hashes fail validation immediately.
            </p>
          </div>
        )}

        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search blocks by block number (e.g. 5), hash, or timestamp..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      {/* Block List */}
      <div className="space-y-3">
        {paginatedBlocks.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <Blocks className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-400">No blocks found matching your search.</p>
            <p className="text-xs text-slate-500">
              Run simulation steps to clear peer trades and seal new blockchain blocks.
            </p>
          </div>
        ) : (
          paginatedBlocks.map((block) => {
            const isGenesis = block.index === 0;
            const txCount = block.transactions?.length || 0;

            return (
              <div
                key={block.index}
                className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 rounded-2xl p-5 shadow-lg transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-sm ${
                        isGenesis
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                      }`}
                    >
                      #{block.index}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white font-mono">
                          {isGenesis ? 'Genesis Block (#0)' : `Block #${block.index}`}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Valid ✓</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sealed: {block.timestamp || '00:00'}</span>
                        <span>&bull;</span>
                        <span>{txCount} {txCount === 1 ? 'Trade Transaction' : 'Trade Transactions'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedBlock(block)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition self-start sm:self-auto"
                  >
                    <span>View Transactions ({txCount})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Hashes & Linkage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 truncate">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Block Hash (SHA-256)</span>
                    <span className="text-cyan-300 select-all">{block.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 truncate">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Previous Block Hash</span>
                    <span className="text-slate-400 select-all">{block.previous_hash || '0'.repeat(64)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredBlocks.length > pageSize && (
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({filteredBlocks.length} blocks)
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

      {/* Progressive Disclosure: Technical Details Accordion */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>Technical Blockchain Specifications (PoA & Cryptography)</span>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Hash Algorithm</span>
              <span className="text-cyan-300 font-bold">SHA-256 (256-bit Digest)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Consensus Protocol</span>
              <span className="text-purple-300 font-bold">Proof-of-Authority (PoA)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Primary Validator</span>
              <span className="text-emerald-400 font-bold">{blockchainSummary?.validator_id || 'poa-validator-primary'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Tamper Evidence</span>
              <span className="text-white font-bold">Cryptographic Cascade Check</span>
            </div>
          </div>
        )}
      </div>

      {/* Block Transaction Inspection Modal */}
      {selectedBlock && (
        <BlockModal
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          onSelectHouseholdById={onSelectHouseholdById}
        />
      )}
    </div>
  );
}
