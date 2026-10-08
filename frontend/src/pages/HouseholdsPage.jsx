import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Home,
  Sun,
  Battery,
  Car,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ChevronRight,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import HouseholdModal from '../components/HouseholdModal';

export default function HouseholdsPage({
  householdsData,
  onSelectHousehold,
  selectedHousehold,
  onCloseModal
}) {
  const households = householdsData?.households || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter and search logic
  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      // Search term
      const matchesSearch =
        searchTerm.trim() === '' ||
        h.household_id.toLowerCase().includes(searchTerm.toLowerCase().trim());

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' || h.status.toUpperCase() === statusFilter.toUpperCase();

      // Asset filter
      let matchesAsset = true;
      if (assetFilter === 'SOLAR') matchesAsset = h.has_solar;
      else if (assetFilter === 'BATTERY') matchesAsset = h.has_battery;
      else if (assetFilter === 'EV') matchesAsset = h.has_ev;

      return matchesSearch && matchesStatus && matchesAsset;
    });
  }, [households, searchTerm, statusFilter, assetFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredHouseholds.length / pageSize));
  const paginatedHouseholds = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHouseholds.slice(start, start + pageSize);
  }, [filteredHouseholds, currentPage, pageSize]);

  const counts = {
    total: households.length,
    sellers: households.filter((h) => h.status === 'SELLING').length,
    buyers: households.filter((h) => h.status === 'BUYING').length,
    balanced: households.filter((h) => h.status === 'BALANCED').length,
    solar: households.filter((h) => h.has_solar).length,
    battery: households.filter((h) => h.has_battery).length,
    ev: households.filter((h) => h.has_ev).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Home className="w-5 h-5 text-cyan-400" />
            <span>Microgrid Prosumer Fleet</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Searchable registry of all {counts.total} virtual residential households. Click any row to inspect DER specs and real-time flows.
          </p>
        </div>

        {/* Quick Fleet Metrics Pill */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            Total: <strong className="text-white">{counts.total}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            Sellers: <strong>{counts.sellers}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-400">
            Buyers: <strong>{counts.buyers}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
            Balanced: <strong>{counts.balanced}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search House ID (e.g. HH-014)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'SELLING', 'BUYING', 'BALANCED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === st
                    ? st === 'SELLING'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : st === 'BUYING'
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Asset filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={assetFilter}
              onChange={(e) => {
                setAssetFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Assets</option>
              <option value="SOLAR" className="bg-slate-900">Solar PV Only ({counts.solar})</option>
              <option value="BATTERY" className="bg-slate-900">Battery BESS Only ({counts.battery})</option>
              <option value="EV" className="bg-slate-900">Electric Vehicle Only ({counts.ev})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Households Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                <th className="py-3.5 px-4 sm:px-6">House ID</th>
                <th className="py-3.5 px-4 text-center">Solar</th>
                <th className="py-3.5 px-4 text-center">Battery</th>
                <th className="py-3.5 px-4 text-center">EV</th>
                <th className="py-3.5 px-4 text-right">Generation</th>
                <th className="py-3.5 px-4 text-right">Consumption</th>
                <th className="py-3.5 px-4 text-right">Energy Balance</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {paginatedHouseholds.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No households found matching the current search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedHouseholds.map((hh) => {
                  const batterySoC =
                    hh.has_battery && hh.battery_capacity_kwh > 0
                      ? Math.round((hh.battery_level_kwh / hh.battery_capacity_kwh) * 100)
                      : 0;
                  const evSoC =
                    hh.has_ev && hh.ev_battery_capacity_kwh > 0
                      ? Math.round((hh.ev_charge_level_kwh / hh.ev_battery_capacity_kwh) * 100)
                      : 0;
                  const netPower = (hh.current_generation_kw - hh.current_consumption_kw).toFixed(2);
                  const isNetPositive = hh.current_generation_kw >= hh.current_consumption_kw;

                  return (
                    <tr
                      key={hh.household_id}
                      onClick={() => onSelectHousehold(hh)}
                      className="hover:bg-slate-800/60 cursor-pointer transition group"
                    >
                      {/* House ID */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-white group-hover:text-cyan-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-600 group-hover:bg-cyan-400 transition" />
                        <span>{hh.household_id}</span>
                      </td>

                      {/* Solar */}
                      <td className="py-3.5 px-4 text-center">
                        {hh.has_solar ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono text-[11px]"
                            title={`${hh.solar_capacity_kw} kW Nameplate Solar PV`}
                          >
                            <Sun className="w-3 h-3" />
                            <span>{hh.solar_capacity_kw} kW</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* Battery */}
                      <td className="py-3.5 px-4 text-center">
                        {hh.has_battery ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono text-[11px]"
                              title={`${hh.battery_level_kwh.toFixed(1)} / ${hh.battery_capacity_kwh} kWh (${batterySoC}%)`}
                            >
                              <Battery className="w-3 h-3" />
                              <span>{batterySoC}%</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {hh.battery_capacity_kwh} kWh
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* EV */}
                      <td className="py-3.5 px-4 text-center">
                        {hh.has_ev ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono text-[11px]"
                              title={`${hh.ev_charge_level_kwh.toFixed(1)} / ${hh.ev_battery_capacity_kwh} kWh (${evSoC}%)`}
                            >
                              <Car className="w-3 h-3" />
                              <span>{evSoC}%</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {hh.ev_battery_capacity_kwh} kWh
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* Generation */}
                      <td className="py-3.5 px-4 text-right font-mono text-white font-medium">
                        {hh.current_generation_kw.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 font-sans">kW</span>
                      </td>

                      {/* Consumption */}
                      <td className="py-3.5 px-4 text-right font-mono text-white font-medium">
                        {hh.current_consumption_kw.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 font-sans">kW</span>
                      </td>

                      {/* Energy Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            isNetPositive
                              ? 'text-emerald-400 flex items-center justify-end gap-1'
                              : 'text-rose-400 flex items-center justify-end gap-1'
                          }
                        >
                          {isNetPositive ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          <span>{isNetPositive ? `+${netPower}` : netPower} kW</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {hh.status === 'SELLING'
                            ? `+${hh.current_surplus_kwh.toFixed(2)} kWh`
                            : hh.status === 'BUYING'
                            ? `-${hh.current_deficit_kwh.toFixed(2)} kWh`
                            : '0.00 kWh'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider font-mono ${
                            hh.status === 'SELLING'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : hh.status === 'BUYING'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              hh.status === 'SELLING'
                                ? 'bg-emerald-400'
                                : hh.status === 'BUYING'
                                ? 'bg-rose-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{hh.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredHouseholds.length > pageSize && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-white">
                {Math.min(currentPage * pageSize, filteredHouseholds.length)}
              </strong>{' '}
              of <strong className="text-white">{filteredHouseholds.length}</strong> households
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 font-mono text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal when a house is selected */}
      {selectedHousehold && (
        <HouseholdModal household={selectedHousehold} onClose={onCloseModal} />
      )}
    </div>
  );
}
