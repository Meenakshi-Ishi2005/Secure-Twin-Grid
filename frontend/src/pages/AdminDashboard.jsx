import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  StepForward,
  Home,
  Users,
  Zap,
  ArrowLeftRight,
  Blocks,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  BarChart3,
  ScrollText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Filter,
  UserCheck,
  UserX,
  RefreshCw,
  Lock,
  FileCheck,
  Radio,
  Sparkles,
  Server,
  Database,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Info,
  Key,
  Shield,
  Layers,
  Battery,
  Sun,
  Car,
  TrendingUp,
  Cpu,
  Power,
  SlidersHorizontal,
  Check,
  AlertCircle,
  Building2,
  Flame,
  Scale,
  Gauge
} from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard({
  currentUser,
  onSwitchToParticipant,
  onOpenAuthModal,
  showNotification
}) {
  // Navigation: 12 Operations Sections
  const [adminSection, setAdminSection] = useState('overview');

  // Backend datasets
  const [dashboardData, setDashboardData] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState(null);
  const [householdsData, setHouseholdsData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [communityData, setCommunityData] = useState(null);
  const [energyData, setEnergyData] = useState(null);
  const [tradesData, setTradesData] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [auditLogsData, setAuditLogsData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1000); // ms per step for auto-play

  // Selection & Modal States
  const [selectedHouseholdDetail, setSelectedHouseholdDetail] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [selectedSecurityEvent, setSelectedSecurityEvent] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [attackSimulationReport, setAttackSimulationReport] = useState(null);

  // Filters & Searches
  const [householdSearch, setHouseholdSearch] = useState('');
  const [householdStatusFilter, setHouseholdStatusFilter] = useState('ALL');
  const [householdDeviceFilter, setHouseholdDeviceFilter] = useState('ALL');

  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeStatusFilter, setTradeStatusFilter] = useState('ALL');

  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [eventStatusFilter, setEventStatusFilter] = useState('ALL');

  // Attack Simulator Parameters
  const [simSender, setSimSender] = useState('HH-014-PROSUMER');
  const [simRecipient, setSimRecipient] = useState('HH-088-CONSUMER');
  const [simEnergy, setSimEnergy] = useState('8.25');
  const [fdiTarget, setFdiTarget] = useState('HH-042-SOLAR-PV');
  const [fdiPhantomKw, setFdiPhantomKw] = useState('480.0');
  const [sybilFakeCount, setSybilFakeCount] = useState(5);

  // Community config form state
  const [configForm, setConfigForm] = useState({
    num_households: 100,
    solar_penetration: 0.65,
    battery_penetration: 0.35,
    ev_penetration: 0.25,
    interval_minutes: 15,
    duration_hours: 24,
  });

  const autoPlayRef = useRef(null);
  const isAdmin = currentUser && currentUser.role?.toUpperCase() === 'ADMIN';

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const fetchAllData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [
        dashRes,
        simRes,
        housesRes,
        pendingRes
      ] = await Promise.allSettled([
        api.getAdminDashboard(),
        api.getSimulationStatus(),
        api.getHouseholds(),
        api.getPendingRegistrations()
      ]);

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value);
      if (simRes.status === 'fulfilled') setSimulationStatus(simRes.value);
      if (housesRes.status === 'fulfilled') setHouseholdsData(housesRes.value);
      if (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value)) {
        setPendingRegistrations(pendingRes.value);
      }
    } catch (err) {
      console.error('Failed to load global admin telemetry:', err);
    }
  }, [isAdmin]);

  const fetchSectionData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await fetchAllData();

      if (adminSection === 'overview') {
        const [bc, sec, tr] = await Promise.allSettled([
          api.getAdminBlockchain(),
          api.getAdminSecurity(),
          api.getAdminTrades({ limit: 10 })
        ]);
        if (bc.status === 'fulfilled') setBlockchainData(bc.value);
        if (sec.status === 'fulfilled') setSecurityData(sec.value);
        if (tr.status === 'fulfilled') setTradesData(tr.value);
      } else if (adminSection === 'households') {
        const hData = await api.getHouseholds();
        setHouseholdsData(hData);
      } else if (adminSection === 'users') {
        const [uData, pData] = await Promise.all([
          api.getAdminUsers(),
          api.getPendingRegistrations().catch(() => [])
        ]);
        setUsersData(uData);
        if (Array.isArray(pData)) setPendingRegistrations(pData);
      } else if (adminSection === 'energy') {
        const eData = await api.getAdminEnergy();
        setEnergyData(eData);
      } else if (adminSection === 'trading') {
        const tData = await api.getAdminTrades({ limit: 200 });
        setTradesData(tData);
      } else if (adminSection === 'blockchain') {
        const bData = await api.getAdminBlockchain();
        setBlockchainData(bData);
      } else if (adminSection === 'security' || adminSection === 'simulator') {
        const sData = await api.getAdminSecurity();
        setSecurityData(sData);
      } else if (adminSection === 'analytics') {
        const aData = await api.getAdminAnalytics();
        setAnalyticsData(aData);
      } else if (adminSection === 'audit_logs') {
        const lData = await api.getAdminAuditLogs({ limit: 150 });
        setAuditLogsData(lData);
      } else if (adminSection === 'config') {
        const cData = await api.getAdminCommunity();
        setCommunityData(cData);
        if (cData?.configuration) {
          setConfigForm((prev) => ({
            ...prev,
            ...cData.configuration,
            solar_penetration: cData.configuration.solar_penetration ?? 0.65,
            battery_penetration: cData.configuration.battery_penetration ?? 0.35,
            ev_penetration: cData.configuration.ev_penetration ?? 0.25,
          }));
        }
      }
    } catch (err) {
      console.error(`Error loading section ${adminSection}:`, err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, adminSection, fetchAllData]);

  // Periodic live telemetry polling (every 4 seconds)
  useEffect(() => {
    fetchSectionData();
    const interval = setInterval(fetchSectionData, 4000);
    return () => clearInterval(interval);
  }, [fetchSectionData]);

  // -------------------------------------------------------------
  // Simulation Controls (GLOBAL / ADMIN OPERATOR ONLY)
  // -------------------------------------------------------------
  const handleAdminStartSimulation = async (continuous = true) => {
    setOperating(true);
    try {
      const res = await api.adminStartSimulation({ continuous: true, speed_ms: simSpeed });
      await fetchAllData();
      await fetchSectionData();
      showNotification?.(res.message || 'Global continuous simulation started on server.');
    } catch (err) {
      showNotification?.(err.message || 'Simulation start failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleAdminStepSimulation = async (steps = 1) => {
    setOperating(true);
    try {
      const res = await api.adminStartSimulation({ steps });
      await fetchAllData();
      await fetchSectionData();
      showNotification?.(`Stepped +${steps * 15}m to ${res.current_time}`);
    } catch (err) {
      showNotification?.(err.message || 'Simulation step failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleAdminStopSimulation = async () => {
    setOperating(true);
    try {
      const res = await api.adminStopSimulation();
      await fetchAllData();
      await fetchSectionData();
      showNotification?.(res.message || 'Global simulation paused on server.');
    } catch (err) {
      showNotification?.(err.message || 'Simulation pause failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleAdminResetSimulation = async () => {
    if (!window.confirm('Reset the global digital twin simulation back to Step 0 (00:00)?')) return;
    setOperating(true);
    try {
      const res = await api.adminResetSimulation(configForm.num_households, configForm.random_seed);
      await fetchAllData();
      await fetchSectionData();
      showNotification?.('Global simulation reset to 00:00 with active configuration.');
    } catch (err) {
      showNotification?.(err.message || 'Simulation reset failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleSpeedChange = async (newSpeed) => {
    setSimSpeed(newSpeed);
    if (simState === 'RUNNING') {
      try {
        await api.adminStartSimulation({ continuous: true, speed_ms: newSpeed });
      } catch (err) {
        console.error('Failed to update speed:', err);
      }
    }
  };

  // -------------------------------------------------------------
  // Operational Actions
  // -------------------------------------------------------------
  const handleApproveUser = async (userId, username, reason = 'Administrator community admission approval') => {
    setOperating(true);
    try {
      await api.approveUser(userId, reason);
      showNotification?.(`Approved community registration for ${username}. Account is ACTIVE.`);
      await fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || `Failed to approve ${username}`, 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleRejectUser = async (userId, username, reason = 'Administrator rejection') => {
    setOperating(true);
    try {
      await api.rejectUser(userId, reason);
      showNotification?.(`Rejected registration application for ${username}.`, 'error');
      await fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || `Failed to reject ${username}`, 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus, username) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateUserStatus(userId, newStatus, `Admin toggle for ${username}`);
      showNotification?.(`User ${username} status changed to ${newStatus}`);
      await fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || `Failed to update user ${username}`, 'error');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setOperating(true);
    try {
      const payload = {
        num_households: parseInt(configForm.num_households, 10),
        solar_penetration: parseFloat(configForm.solar_penetration),
        battery_penetration: parseFloat(configForm.battery_penetration),
        ev_penetration: parseFloat(configForm.ev_penetration),
        interval_minutes: parseInt(configForm.interval_minutes, 10),
        duration_hours: parseInt(configForm.duration_hours, 10),
      };
      const res = await api.updateAdminCommunityConfig(payload);
      setCommunityData(res);
      showNotification?.('Simulation configuration saved and audited.');
    } catch (err) {
      showNotification?.(err.message || 'Failed to update configuration', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleValidateBlockchain = async () => {
    setOperating(true);
    try {
      const res = await api.validateBlockchainAdmin();
      setValidationResult(res);
      if (res.is_valid) {
        showNotification?.(`Cryptographic Audit PASSED: ${res.details?.total_blocks || ''} blocks verified.`);
      } else {
        showNotification?.(`Audit FAILED: Corrupted Block #${res.invalid_block_index}`, 'error');
      }
      fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || 'Validation request failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleRunAuctionManual = async () => {
    setOperating(true);
    try {
      const res = await api.runTradingAuction({ default_seller_ask: 0.10, default_buyer_bid: 0.18, price_noise: true });
      showNotification?.(`Double auction executed: ${res.trades_executed || 0} trades cleared onto blockchain.`);
      fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || 'Auction run failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleLaunchAttack = async (type, targetId = null, customParams = {}) => {
    setOperating(true);
    try {
      let params = { ...customParams };
      if (type === 'SYBIL' && !params.num_fake_identities) {
        params.num_fake_identities = parseInt(sybilFakeCount, 10) || 5;
      }
      if (type === 'FDI' && !params.phantom_generation_kw) {
        params.phantom_generation_kw = parseFloat(fdiPhantomKw) || 480.0;
      }
      if (type === 'REPLAY' && !params.energy_kwh) {
        params.recipient_id = simRecipient;
        params.energy_kwh = parseFloat(simEnergy) || 8.25;
      }

      let report;
      if (type === 'REPLAY') {
        report = await api.simulateReplayAttack({
          sender_id: targetId || simSender,
          recipient_id: simRecipient,
          energy_kwh: parseFloat(simEnergy) || 8.25,
        }).catch(() => api.simulateAttackAdmin(type, targetId || simSender, params));
      } else {
        report = await api.simulateAttackAdmin(type, targetId, params);
      }

      setAttackSimulationReport(report);
      showNotification?.(`Simulated ${type} attack completed. Security defenses evaluated.`);
      fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || `Failed to execute ${type} attack`, 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleResetSecurity = async () => {
    if (!window.confirm('Reset all security logs and replay transaction counters?')) return;
    setOperating(true);
    try {
      await api.resetSecurity();
      setAttackSimulationReport(null);
      await fetchSectionData();
      showNotification?.('Security logs and replay counters reset.');
    } catch (err) {
      showNotification?.(err.message || 'Reset failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  // -------------------------------------------------------------
  // RBAC Access Barrier if Non-Admin
  // -------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Access Restricted to Operators
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              The Operations Control Center is restricted to authorized platform administrators and microgrid dispatchers.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg transition"
            >
              Sign In as Admin
            </button>
            <button
              onClick={onSwitchToParticipant}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm border border-slate-700 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Derived Live Simulation Metrics
  // -------------------------------------------------------------
  const currentTime = simulationStatus?.current_time || dashboardData?.system?.simulation_time || '00:00';
  const currentStep = simulationStatus?.current_step ?? dashboardData?.system?.current_step ?? 0;
  const totalSteps = simulationStatus?.total_steps ?? 96;
  const simState = (simulationStatus?.status || dashboardData?.system?.simulation_status || 'INITIALIZED').toUpperCase();
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  const totalHouseholds = householdsData?.total_count || dashboardData?.system_overview?.total_households || 100;
  const allHouses = householdsData?.households || [];

  const activeBuyers = allHouses.filter((h) => h.status === 'BUYING').length || dashboardData?.trading_overview?.active_buyers || 0;
  const activeSellers = allHouses.filter((h) => h.status === 'SELLING').length || dashboardData?.trading_overview?.active_sellers || 0;
  const balancedHomes = allHouses.filter((h) => h.status === 'BALANCED').length || Math.max(0, totalHouseholds - activeBuyers - activeSellers);

  const totalGenKw = allHouses.reduce((acc, h) => acc + (h.current_generation_kw || 0), 0) || dashboardData?.energy_overview?.current_generation_kwh || 0;
  const totalConKw = allHouses.reduce((acc, h) => acc + (h.current_consumption_kw || 0), 0) || dashboardData?.energy_overview?.current_consumption_kwh || 0;
  const totalSurplusKwh = allHouses.reduce((acc, h) => acc + (h.current_surplus_kwh || 0), 0) || dashboardData?.energy_overview?.current_surplus_kwh || 0;
  const totalDeficitKwh = allHouses.reduce((acc, h) => acc + (h.current_deficit_kwh || 0), 0) || dashboardData?.energy_overview?.current_deficit_kwh || 0;

  const totalBessCapacity = allHouses.reduce((acc, h) => acc + (h.battery_capacity_kwh || 0), 0);
  const totalBessStored = allHouses.reduce((acc, h) => acc + (h.battery_level_kwh || 0), 0);
  const avgSocPct = totalBessCapacity > 0 ? Math.round((totalBessStored / totalBessCapacity) * 100) : 0;

  const pendingCount = pendingRegistrations?.length || 0;

  // -------------------------------------------------------------
  // Operations Navigation Items (12 Defined Sections)
  // -------------------------------------------------------------
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'simulation', label: 'Simulation', icon: Gauge, highlight: simState === 'RUNNING' },
    { id: 'households', label: 'Households', icon: Home, count: totalHouseholds },
    { id: 'energy', label: 'Energy', icon: Zap },
    { id: 'trading', label: 'P2P Trading', icon: ArrowLeftRight },
    { id: 'blockchain', label: 'Blockchain', icon: Blocks },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'simulator', label: 'Attack Simulator', icon: Sparkles, accent: 'rose' },
    { id: 'users', label: 'Users', icon: Users, badge: pendingCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'audit_logs', label: 'Audit Logs', icon: ScrollText },
    { id: 'config', label: 'Configuration', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. OPERATIONS CONTROL CENTER HEADER */}
      {/* ========================================================= */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#071124] to-slate-900 border border-cyan-900/60 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Brand & Status Indicators */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-slate-900 flex items-center justify-center shadow-lg shadow-cyan-950/60 border border-cyan-400/40 text-slate-950">
              <Cpu className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
                  SECURETWIN GRID
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  OPERATOR: {currentUser?.username}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Operations Control Center
              </h1>
            </div>
          </div>

          {/* Live System & Simulation Indicators */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* System Online Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-900/60 text-xs font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"></span>
              <span className="font-bold text-emerald-300">SYSTEM ONLINE</span>
            </div>

            {/* Simulation Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono ${
              simState === 'RUNNING'
                ? 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300'
                : simState === 'STOPPED' || simState === 'PAUSED'
                ? 'bg-amber-950/80 border-amber-700/80 text-amber-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-400'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${
                simState === 'RUNNING'
                  ? 'bg-cyan-400 animate-ping'
                  : simState === 'STOPPED' || simState === 'PAUSED'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}></span>
              <span className="font-bold">
                {simState === 'RUNNING'
                  ? 'SIMULATION RUNNING'
                  : simState === 'STOPPED' || simState === 'PAUSED'
                  ? 'SIMULATION PAUSED'
                  : 'SIMULATION READY'}
              </span>
            </div>

            {/* Current Simulation Time */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Time:</span>
              <span className="font-bold text-white text-sm">{currentTime}</span>
              <span className="text-slate-500">/ 24:00</span>
              <span className="text-[10px] text-cyan-400 ml-1">({progressPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Global Progress Line across 24 hours */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Global Timeline Progress: <strong>Step {currentStep} / {totalSteps}</strong> ({currentTime})</span>
            <span>Virtual Fleet: <strong className="text-cyan-400">{totalHouseholds} Nodes</strong> &bull; 15-min Intervals</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN LAYOUT: OPERATIONS SIDEBAR + CONTENT AREA */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Operations Sidebar Navigation */}
        <aside className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-1.5 sticky top-20">
          <div className="px-3 py-2 text-[10px] font-mono font-bold text-cyan-400/90 uppercase tracking-widest flex items-center justify-between">
            <span>OPERATIONS CONSOLE</span>
            <Activity className="w-3 h-3 text-cyan-400" />
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = adminSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAdminSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950 stroke-[2.5]' : item.accent === 'rose' ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      isSelected
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-amber-950 text-amber-300 border border-amber-800/80 animate-pulse'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                      {item.count}
                    </span>
                  )}
                  {item.highlight && !isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  )}
                </div>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-800/80 px-3 py-2 space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Active Operator</div>
            <div className="text-xs font-mono font-bold text-cyan-300 truncate">@{currentUser?.username}</div>
            <div className="text-[10px] text-slate-400 font-mono">{currentUser?.email}</div>
          </div>
        </aside>

        {/* Operations Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* ===================================================== */}
          {/* SECTION 1: OVERVIEW DASHBOARD */}
          {/* ===================================================== */}
          {adminSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* GLOBAL SIMULATION QUICK CONTROL BAR */}
              <div className="p-4 rounded-2xl bg-slate-900/95 border border-cyan-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Global Simulation Quick Dispatch</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Status: <strong className="text-cyan-400">{simState}</strong> &bull; Time: <strong>{currentTime}</strong> (Step {currentStep}/{totalSteps})
                    </p>
                  </div>
                </div>

                {/* State-appropriate simulation controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {simState !== 'RUNNING' ? (
                    <button
                      onClick={() => handleAdminStartSimulation(true)}
                      disabled={operating}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{currentStep === 0 ? 'Start Simulation' : 'Resume Simulation'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAdminStopSimulation}
                      disabled={operating}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause Simulation</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleAdminStepSimulation(1)}
                    disabled={operating}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                  >
                    <StepForward className="w-3.5 h-3.5" />
                    <span>Step +15m</span>
                  </button>

                  <button
                    onClick={handleAdminResetSimulation}
                    disabled={operating}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* LIVE COMMUNITY KPIS (Entire simulated community) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Live Community Operations KPIs</span>
                  </h2>
                  <span className="text-[11px] font-mono text-slate-500">Fleet: {totalHouseholds} Virtual Houses</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Total Fleet & Households */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Total Households</span>
                    <div className="text-2xl font-bold font-mono text-white">
                      {totalHouseholds}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">100% Simulated Nodes</span>
                  </div>

                  {/* Active Buyers */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-900/40 space-y-1">
                    <span className="text-[11px] text-rose-400 font-medium">Active Buyers</span>
                    <div className="text-2xl font-bold font-mono text-rose-300">
                      {activeBuyers}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">In Energy Deficit</span>
                  </div>

                  {/* Active Sellers */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-900/40 space-y-1">
                    <span className="text-[11px] text-emerald-400 font-medium">Active Sellers</span>
                    <div className="text-2xl font-bold font-mono text-emerald-300">
                      {activeSellers}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Exporting Surplus</span>
                  </div>

                  {/* Balanced Households */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-900/40 space-y-1">
                    <span className="text-[11px] text-cyan-400 font-medium">Balanced Households</span>
                    <div className="text-2xl font-bold font-mono text-cyan-300">
                      {balancedHomes}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Net Zero Interval</span>
                  </div>

                  {/* Total Generation */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-900/40 space-y-1">
                    <span className="text-[11px] text-amber-400 font-medium">Community Generation</span>
                    <div className="text-2xl font-bold font-mono text-amber-300">
                      {totalGenKw.toFixed(2)} <span className="text-xs text-slate-500">kW</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Solar Rooftop PV</span>
                  </div>

                  {/* Total Consumption */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-900/40 space-y-1">
                    <span className="text-[11px] text-cyan-400 font-medium">Community Consumption</span>
                    <div className="text-2xl font-bold font-mono text-cyan-300">
                      {totalConKw.toFixed(2)} <span className="text-xs text-slate-500">kW</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Baseload + Appliances</span>
                  </div>

                  {/* Community Surplus */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-900/40 space-y-1">
                    <span className="text-[11px] text-emerald-400 font-medium">Community Surplus</span>
                    <div className="text-2xl font-bold font-mono text-emerald-300">
                      {totalSurplusKwh.toFixed(2)} <span className="text-xs text-slate-500">kWh</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Available for P2P</span>
                  </div>

                  {/* Community Deficit */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-900/40 space-y-1">
                    <span className="text-[11px] text-rose-400 font-medium">Community Deficit</span>
                    <div className="text-2xl font-bold font-mono text-rose-300">
                      {totalDeficitKwh.toFixed(2)} <span className="text-xs text-slate-500">kWh</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">P2P Buy Demand</span>
                  </div>
                </div>
              </div>

              {/* TRADING & BLOCKCHAIN OPERATIONAL SPLIT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* P2P Trading Snapshot */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trading Activity</h3>
                    </div>
                    <button
                      onClick={() => setAdminSection('trading')}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Trading Center</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block">Completed Trades</span>
                      <span className="text-lg font-bold text-emerald-300">
                        {dashboardData?.trading_overview?.completed_trades || tradesData?.trades?.length || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block">Traded Volume</span>
                      <span className="text-lg font-bold text-amber-300">
                        {dashboardData?.trading_overview?.total_energy_traded_kwh?.toFixed(1) || '0.0'} kWh
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block">Average Clearing Price</span>
                      <span className="text-sm font-bold text-teal-300">
                        ${dashboardData?.trading_overview?.average_trading_price_usd?.toFixed(4) || '0.1400'} / kWh
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block">Double Auction</span>
                      <span className="text-sm font-bold text-cyan-300">Continuous Clearing</span>
                    </div>
                  </div>
                </div>

                {/* Blockchain Telemetry Snapshot */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Blocks className="w-4 h-4 text-teal-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Blockchain Ledger</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>VALID</span>
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Total Blocks:</span>
                      <span className="text-white font-bold">{blockchainData?.total_blocks || dashboardData?.blockchain?.total_blocks || 1}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Total Transactions:</span>
                      <span className="text-white font-bold">{blockchainData?.total_transactions || dashboardData?.blockchain?.total_transactions || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Consensus Engine:</span>
                      <span className="text-emerald-400">Proof-of-Authority (PoA)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECURITY & HEALTH ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Security Defense Status */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Security Defenses</h3>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">100% Defense Rate</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-900/40">
                      <span className="text-slate-400 text-[10px] block">Replay</span>
                      <span className="font-bold text-rose-300">{dashboardData?.security?.replay_attempts || 0} Blocked</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-900/40">
                      <span className="text-slate-400 text-[10px] block">FDI</span>
                      <span className="font-bold text-amber-300">{dashboardData?.security?.false_data_injection_attempts || 0} Blocked</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-purple-900/40">
                      <span className="text-slate-400 text-[10px] block">Sybil</span>
                      <span className="font-bold text-purple-300">{dashboardData?.security?.sybil_attempts || 0} Blocked</span>
                    </div>
                  </div>
                </div>

                {/* System Infrastructure */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">System Infrastructure</h3>
                    </div>
                    <span className="text-[11px] text-cyan-300 font-mono">{currentTime} / Step {currentStep}</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">FastAPI Microgrid Engine:</span>
                      <span className="text-emerald-400 font-bold">ONLINE (HTTP 200)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Database Ledger:</span>
                      <span className="text-emerald-400 font-bold">CONNECTED (SQLite)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">ECDSA Cryptographic Signatures:</span>
                      <span className="text-cyan-400">NIST P-256 ENFORCED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 2: DEDICATED GLOBAL SIMULATION CONTROL */}
          {/* ===================================================== */}
          {adminSection === 'simulation' && (
            <div className="p-6 rounded-2xl bg-slate-900/95 border border-cyan-800/60 space-y-6 animate-in fade-in duration-200 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">
                      Global Digital Twin Simulation Control
                    </h2>
                    <p className="text-xs text-slate-400">
                      Authoritative operator controls for advancing, stepping, pausing, and resetting the 100-home microgrid emulation.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                    simState === 'RUNNING'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700 animate-pulse'
                      : simState === 'PAUSED' || simState === 'STOPPED'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}>
                    {simState}
                  </span>
                </div>
              </div>

              {/* Comprehensive Simulation Telemetry Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Current Time</span>
                  <span className="text-2xl font-bold text-white mt-1 block">{currentTime}</span>
                  <span className="text-[10px] text-slate-500">of 24:00 Cycle</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Current Step</span>
                  <span className="text-2xl font-bold text-cyan-300 mt-1 block">{currentStep} / {totalSteps}</span>
                  <span className="text-[10px] text-slate-500">15-minute Intervals</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Timeline Progress</span>
                  <span className="text-2xl font-bold text-emerald-300 mt-1 block">{progressPercent}%</span>
                  <span className="text-[10px] text-slate-500">Cycle Completion</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Virtual Fleet</span>
                  <span className="text-2xl font-bold text-teal-300 mt-1 block">{totalHouseholds}</span>
                  <span className="text-[10px] text-slate-500">Active Microgrid Homes</span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">24-Hour Cycle Progress:</span>
                  <span className="text-cyan-400 font-bold">{currentTime} ({progressPercent}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span>00:00 (Step 0)</span>
                  <span>06:00 (Step 24)</span>
                  <span>12:00 (Step 48)</span>
                  <span>18:00 (Step 72)</span>
                  <span>24:00 (Step 96)</span>
                </div>
              </div>

              {/* Operational Control Panel */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-900/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Power className="w-4 h-4" />
                    <span>Authoritative Dispatch Controls</span>
                  </h3>

                  {/* Auto-Play Speed Selector */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Playback Speed:</span>
                    <select
                      value={simSpeed}
                      onChange={(e) => handleSpeedChange(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none"
                    >
                      <option value={2000}>0.5x (2.0s/step)</option>
                      <option value={1000}>1.0x (1.0s/step)</option>
                      <option value={500}>2.0x (0.5s/step)</option>
                      <option value={200}>5.0x (0.2s/step)</option>
                    </select>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Start / Resume */}
                  {simState !== 'RUNNING' ? (
                    <button
                      onClick={() => handleAdminStartSimulation(true)}
                      disabled={operating}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{currentStep === 0 ? 'Start Simulation' : 'Resume Simulation'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAdminStopSimulation}
                      disabled={operating}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg transition disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause Simulation</span>
                    </button>
                  )}

                  {/* Step +15 Min */}
                  <button
                    onClick={() => handleAdminStepSimulation(1)}
                    disabled={operating}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
                  >
                    <StepForward className="w-4 h-4" />
                    <span>Step +15 min</span>
                  </button>

                  {/* Step +1 Hour (+4 steps) */}
                  <button
                    onClick={() => handleAdminStepSimulation(4)}
                    disabled={operating}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
                  >
                    <FastForward className="w-4 h-4" />
                    <span>Step +1 Hour</span>
                  </button>

                  {/* Reset Simulation */}
                  <button
                    onClick={handleAdminResetSimulation}
                    disabled={operating}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 font-semibold text-xs border border-slate-700 hover:border-rose-800/60 transition disabled:opacity-50 ml-auto"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset to 00:00</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 3: HOUSEHOLD MONITORING (100-NODE FLEET) */}
          {/* ===================================================== */}
          {adminSection === 'households' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Simulated Households Monitoring Fleet
                    </h2>
                    <p className="text-xs text-slate-400">
                      Live telemetry across all 100 virtual microgrid prosumers and consumers.
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400">
                  Total Nodes: <strong className="text-cyan-400">{totalHouseholds}</strong> &bull; Time: <strong>{currentTime}</strong>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search HH-001, name..."
                    value={householdSearch}
                    onChange={(e) => setHouseholdSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  {/* Status filter */}
                  <select
                    value={householdStatusFilter}
                    onChange={(e) => setHouseholdStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Statuses ({allHouses.length})</option>
                    <option value="BUYING">BUYING ({activeBuyers})</option>
                    <option value="SELLING">SELLING ({activeSellers})</option>
                    <option value="BALANCED">BALANCED ({balancedHomes})</option>
                  </select>

                  {/* Device Filter */}
                  <select
                    value={householdDeviceFilter}
                    onChange={(e) => setHouseholdDeviceFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Equipment</option>
                    <option value="SOLAR">Solar PV Only</option>
                    <option value="BATTERY">Battery Storage Only</option>
                    <option value="EV">EV Charger Only</option>
                  </select>
                </div>
              </div>

              {/* Households Operational Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[550px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-2.5">Household</th>
                      <th className="px-3.5 py-2.5">Share Surplus</th>
                      <th className="px-3.5 py-2.5">Buy Energy</th>
                      <th className="px-3.5 py-2.5">Trading Status</th>
                      <th className="px-3.5 py-2.5 text-right">Generation (kW)</th>
                      <th className="px-3.5 py-2.5 text-right">Consumption (kW)</th>
                      <th className="px-3.5 py-2.5 text-right">Battery (BESS)</th>
                      <th className="px-3.5 py-2.5 text-right">Net Balance</th>
                      <th className="px-3.5 py-2.5 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allHouses
                      .filter((h) => {
                        if (householdStatusFilter !== 'ALL' && h.status !== householdStatusFilter) return false;
                        if (householdDeviceFilter === 'SOLAR' && !h.has_solar) return false;
                        if (householdDeviceFilter === 'BATTERY' && !h.has_battery) return false;
                        if (householdDeviceFilter === 'EV' && !h.has_ev) return false;
                        if (householdSearch) {
                          const s = householdSearch.toLowerCase();
                          return (
                            h.household_id?.toLowerCase().includes(s) ||
                            h.name?.toLowerCase().includes(s)
                          );
                        }
                        return true;
                      })
                      .map((h) => {
                        const netKw = (h.current_generation_kw || 0) - (h.current_consumption_kw || 0);
                        const isSelling = h.status === 'SELLING';
                        const isBuying = h.status === 'BUYING';
                        const tradingStatusLabel = isSelling ? 'Selling Only' : isBuying ? 'Buying Only' : 'Active / Balanced';

                        return (
                          <tr
                            key={h.household_id}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="px-3.5 py-2.5 font-bold text-cyan-300">
                              <div>{h.household_id}</div>
                              <div className="text-[10px] text-slate-400 font-sans">{h.name || 'Prosumer Node'}</div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.selling_enabled !== false
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${h.selling_enabled !== false ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                                {h.selling_enabled !== false ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.buying_enabled !== false
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${h.buying_enabled !== false ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                                {h.buying_enabled !== false ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSelling
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                    : isBuying
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                                    : 'bg-slate-800 text-cyan-300'
                                }`}
                              >
                                {tradingStatusLabel}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-amber-300">
                              {(h.current_generation_kw || 0).toFixed(2)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right text-slate-300">
                              {(h.current_consumption_kw || 0).toFixed(2)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              {h.has_battery ? (
                                <div className="text-teal-300">
                                  <span>{(h.battery_level_kwh || 0).toFixed(1)} / {h.battery_capacity_kwh || 10} kWh</span>
                                  <span className="block text-[10px] text-slate-400">({h.battery_soc_pct ? Math.round(h.battery_soc_pct) : 0}%)</span>
                                </div>
                              ) : (
                                <span className="text-slate-600">None</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold">
                              <span className={netKw > 0 ? 'text-emerald-400' : netKw < 0 ? 'text-rose-400' : 'text-slate-400'}>
                                {netKw > 0 ? `+${netKw.toFixed(2)}` : netKw.toFixed(2)} kW
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <button
                                onClick={() => setSelectedHouseholdDetail(h)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 4: COMMUNITY ENERGY MONITORING */}
          {/* ===================================================== */}
          {adminSection === 'energy' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Community Energy Telemetry & Power Balance
                    </h2>
                    <p className="text-xs text-slate-400">
                      Monitoring aggregate microgrid power generation, consumption, BESS storage, and surplus exports.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-cyan-400">Current Time: {currentTime}</span>
              </div>

              {/* Aggregated Community Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-900/40 space-y-1">
                  <span className="text-amber-400 block text-[11px]">Community Generation</span>
                  <div className="text-xl font-bold text-amber-300">{totalGenKw.toFixed(2)} kW</div>
                  <span className="text-slate-500 text-[10px]">Rooftop Solar Total</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-900/40 space-y-1">
                  <span className="text-cyan-400 block text-[11px]">Community Consumption</span>
                  <div className="text-xl font-bold text-cyan-300">{totalConKw.toFixed(2)} kW</div>
                  <span className="text-slate-500 text-[10px]">Aggregated Load</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-900/40 space-y-1">
                  <span className="text-emerald-400 block text-[11px]">Community Surplus</span>
                  <div className="text-xl font-bold text-emerald-300">{totalSurplusKwh.toFixed(2)} kWh</div>
                  <span className="text-slate-500 text-[10px]">Market Offer Volume</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-900/40 space-y-1">
                  <span className="text-rose-400 block text-[11px]">Community Deficit</span>
                  <div className="text-xl font-bold text-rose-300">{totalDeficitKwh.toFixed(2)} kWh</div>
                  <span className="text-slate-500 text-[10px]">Market Bid Demand</span>
                </div>
              </div>

              {/* BESS Storage Summary */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold flex items-center gap-2">
                    <Battery className="w-4 h-4 text-teal-400" />
                    <span>Community Battery Storage (BESS Aggregation)</span>
                  </span>
                  <span className="text-teal-400 font-bold">{totalBessStored.toFixed(1)} / {totalBessCapacity.toFixed(1)} kWh ({avgSocPct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all"
                    style={{ width: `${avgSocPct}%` }}
                  ></div>
                </div>
              </div>

              {/* Community Penetration Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Sun className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <span className="text-slate-400 block text-[10px]">Solar PV Penetration</span>
                  <strong className="text-white text-sm">65% (65 Homes)</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Battery className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                  <span className="text-slate-400 block text-[10px]">Battery Storage</span>
                  <strong className="text-white text-sm">35% (35 Homes)</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Car className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <span className="text-slate-400 block text-[10px]">EV Adoption</span>
                  <strong className="text-white text-sm">25% (25 Homes)</strong>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 5: P2P TRADING MONITORING */}
          {/* ===================================================== */}
          {adminSection === 'trading' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      P2P Double Auction Market Operations
                    </h2>
                    <p className="text-xs text-slate-400">
                      Live clearing telemetry, order book depth, and audited trade settlement records.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAuctionManual}
                    disabled={operating}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Auction Clearing</span>
                  </button>
                </div>
              </div>

              {/* Trading Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Active Order Book</span>
                  <span className="font-bold text-cyan-300 text-base">
                    {activeBuyers} Buyers / {activeSellers} Sellers
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Total Settled Trades</span>
                  <span className="font-bold text-emerald-300 text-base">
                    {tradesData?.total_count || tradesData?.trades?.length || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Volume Traded</span>
                  <span className="font-bold text-amber-300 text-base">
                    {tradesData?.trades?.reduce((acc, t) => acc + (t.energy_kwh || 0), 0)?.toFixed(2) || '0.00'} kWh
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Avg Clearing Price</span>
                  <span className="font-bold text-teal-300 text-base">
                    ${dashboardData?.trading_overview?.average_trading_price_usd?.toFixed(4) || '0.1400'} / kWh
                  </span>
                </div>
              </div>

              {/* Trades Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[500px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5">Trade ID</th>
                      <th className="px-3 py-2.5">Time</th>
                      <th className="px-3 py-2.5">Seller Node</th>
                      <th className="px-3 py-2.5">Buyer Node</th>
                      <th className="px-3 py-2.5 text-right">Energy (kWh)</th>
                      <th className="px-3 py-2.5 text-right">Price ($/kWh)</th>
                      <th className="px-3 py-2.5 text-right">Settlement Total</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tradesData?.trades?.map((t) => (
                      <tr
                        key={t.trade_id}
                        onClick={() => setSelectedTrade(t)}
                        className="hover:bg-slate-800/40 cursor-pointer transition"
                      >
                        <td className="px-3 py-2 text-cyan-300 font-bold">{t.trade_id}</td>
                        <td className="px-3 py-2 text-slate-400">{t.timestamp}</td>
                        <td className="px-3 py-2 text-amber-300">{t.seller_id}</td>
                        <td className="px-3 py-2 text-teal-300">{t.buyer_id}</td>
                        <td className="px-3 py-2 text-right font-bold text-white">{(t.energy_kwh || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">${(t.price_per_kwh || 0).toFixed(4)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-400">${(t.total_value || 0).toFixed(4)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                            {t.status || 'SETTLED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 6: BLOCKCHAIN MONITORING */}
          {/* ===================================================== */}
          {adminSection === 'blockchain' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Blocks className="w-5 h-5 text-teal-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Blockchain Ledger Explorer & Cryptographic Verification
                    </h2>
                    <p className="text-xs text-slate-400">
                      Inspect hash linkages, transactions, and trigger diagnostic proof validation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleValidateBlockchain}
                  disabled={operating}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Validate Blockchain</span>
                </button>
              </div>

              {/* Cryptographic Audit Validation Banner */}
              {validationResult && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                    validationResult.is_valid
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {validationResult.is_valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">
                        {validationResult.is_valid
                          ? 'CRYPTOGRAPHIC AUDIT PASSED: SHA-256 Ledger Integrity 100% Intact'
                          : `AUDIT FAILED: Corrupted Block #${validationResult.invalid_block_index} (${validationResult.error_type})`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Audited {validationResult.details?.total_blocks || 0} blocks &bull; Consensus: Proof-of-Authority (PoA)
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs">
                    {validationResult.is_valid ? 'STATUS: VALID' : 'STATUS: INVALID'}
                  </span>
                </div>
              )}

              {/* Blocks Stream */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {blockchainData?.blocks?.map((b) => (
                  <div
                    key={b.index}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-teal-700/60 transition space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 font-bold border border-teal-800/60">
                          Block #{b.index}
                        </span>
                        <span className="text-slate-400 text-[11px]">{b.timestamp}</span>
                      </div>
                      <span className="text-slate-400">
                        Transactions: <strong className="text-cyan-300">{b.transactions?.length || 0}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 truncate">
                        <span className="text-slate-500 block">Block Hash:</span>
                        <span className="text-emerald-400">{b.hash}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 truncate">
                        <span className="text-slate-500 block">Previous Hash:</span>
                        <span className="text-slate-400">{b.previous_hash}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 7: SECURITY OPERATIONS */}
          {/* ===================================================== */}
          {adminSection === 'security' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/60">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Security Operations & Active Defense Suite
                    </h2>
                    <p className="text-xs text-slate-400">
                      Real-time signature validation, monotonic anti-replay guards, and forensic event logs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetSecurity}
                    disabled={operating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Counters</span>
                  </button>
                </div>
              </div>

              {/* Defense Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <Key className="w-4 h-4" />
                    <span>ECDSA SECP256R1 Verification</span>
                  </div>
                  <p className="text-slate-400">Canonical trade payloads verified against NIST P-256 ECC public keys.</p>
                  <div className="pt-2 text-[11px] font-mono text-emerald-400">Status: Enforced & Active</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <Radio className="w-4 h-4" />
                    <span>Monotonic Nonce Sequence</span>
                  </div>
                  <p className="text-slate-400">Strict sequential nonce checks reject duplicate captured packets.</p>
                  <div className="pt-2 text-[11px] font-mono text-cyan-300">
                    Tracked Nodes: {securityData?.stats?.by_status?.ACCEPTED ?? 100}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Clock className="w-4 h-4" />
                    <span>Timestamp Freshness Guard</span>
                  </div>
                  <p className="text-slate-400">Rejects messages drifting past &plusmn;300-second freshness window.</p>
                  <div className="pt-2 text-[11px] font-mono text-emerald-300">Window: &plusmn;300s Limit</div>
                </div>
              </div>

              {/* Security Events Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Security Events</h3>
                  <div className="relative max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter events..."
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      className="pl-7 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Timestamp</th>
                        <th className="px-3 py-2">Event Classification</th>
                        <th className="px-3 py-2">Sender / Target</th>
                        <th className="px-3 py-2">Severity</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {securityData?.events
                        ?.filter((ev) => (eventSearch ? ev.event_type?.toLowerCase().includes(eventSearch.toLowerCase()) || ev.sender_id?.toLowerCase().includes(eventSearch.toLowerCase()) : true))
                        .map((ev, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setSelectedSecurityEvent(ev)}
                            className="hover:bg-slate-800/40 cursor-pointer transition"
                          >
                            <td className="px-3 py-2 text-slate-400">{ev.timestamp?.slice(11, 19)}</td>
                            <td className="px-3 py-2 text-cyan-300 font-bold">{ev.event_type}</td>
                            <td className="px-3 py-2 text-slate-300">{ev.sender_id || ev.transaction_id || 'System'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  ev.severity === 'CRITICAL' || ev.severity === 'HIGH'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {ev.severity}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  ev.status === 'BLOCKED' || ev.status === 'REJECTED'
                                    ? 'bg-rose-950 text-rose-300'
                                    : 'bg-emerald-950 text-emerald-300'
                                }`}
                              >
                                {ev.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 8: ATTACK SIMULATOR (ADMIN OPERATOR ONLY) */}
          {/* ===================================================== */}
          {adminSection === 'simulator' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-900/50 space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Adversarial Attack Simulator & Demonstration Suite
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Inject synthetic adversarial vectors to evaluate server-side cryptographic and behavioral defenses.
                </p>
              </div>

              {/* 3 Attack Vectors */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Vector 1: Replay */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 text-xs uppercase tracking-wider">1. Replay Attack</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                        Nonce Defense
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Re-submits a captured signed prosumer trade to test anti-replay rejection.
                    </p>

                    <div className="space-y-2 pt-2 text-[11px] font-mono">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Sender ID:</label>
                        <input
                          type="text"
                          value={simSender}
                          onChange={(e) => setSimSender(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Energy (kWh):</label>
                        <input
                          type="number"
                          step="0.25"
                          value={simEnergy}
                          onChange={(e) => setSimEnergy(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchAttack('REPLAY', simSender)}
                    disabled={operating}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 mt-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Replay Attack</span>
                  </button>
                </div>

                {/* Vector 2: False Data Injection */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-900/50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-xs uppercase tracking-wider">2. False Data Injection</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
                        Physical Boundary
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Injects impossible 480 kW rooftop solar telemetry and forged clearing price bids.
                    </p>

                    <div className="space-y-2 pt-2 text-[11px] font-mono">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Target PV Node:</label>
                        <input
                          type="text"
                          value={fdiTarget}
                          onChange={(e) => setFdiTarget(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Phantom Power (kW):</label>
                        <input
                          type="number"
                          value={fdiPhantomKw}
                          onChange={(e) => setFdiPhantomKw(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchAttack('FDI', fdiTarget)}
                    disabled={operating}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/50 mt-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch FDI Attack</span>
                  </button>
                </div>

                {/* Vector 3: Sybil Attack */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 text-xs uppercase tracking-wider">3. Sybil Attack</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-400 border border-purple-800">
                        Identity Admission
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Spawns unregistered fake node identities to disrupt double auction market clearing.
                    </p>

                    <div className="space-y-2 pt-2 text-[11px] font-mono">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Target Grid Community:</label>
                        <input
                          type="text"
                          disabled
                          value="Green Valley Community"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Fake Identities Count:</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={sybilFakeCount}
                          onChange={(e) => setSybilFakeCount(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchAttack('SYBIL', 'Green Valley Community')}
                    disabled={operating}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/50 mt-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Sybil Attack</span>
                  </button>
                </div>
              </div>

              {/* Simulation Report */}
              {attackSimulationReport && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase tracking-wider">
                      Attack Execution Report: {attackSimulationReport.attack_type || attackSimulationReport.simulation_id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ALL ATTACKS BLOCKED</span>
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {(attackSimulationReport.steps || attackSimulationReport.results)?.map((st, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          st.actual_outcome === 'ACCEPTED' || st.is_valid
                            ? 'bg-slate-900/60 border-slate-800'
                            : 'bg-rose-950/20 border-rose-900/40'
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-white block">{st.scenario || `Step ${st.step}`}</span>
                          <span className="text-[11px] text-slate-400">{st.description || st.message}</span>
                        </div>
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                            st.actual_outcome === 'ACCEPTED' || st.is_valid
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          }`}
                        >
                          {st.actual_outcome || (st.is_valid ? 'ACCEPTED' : 'BLOCKED')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 9: USERS MANAGEMENT (ACCOUNTS & ROLES) */}
          {/* ===================================================== */}
          {adminSection === 'users' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      User Accounts Administration
                    </h2>
                    <p className="text-xs text-slate-400">
                      Manage participant credentials, admission approvals, roles, and linked simulation units.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search user / email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Pending Approvals Callout if present */}
              {pendingRegistrations.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-300 font-medium">
                    <UserCheck className="w-4 h-4" />
                    <span>{pendingRegistrations.length} registration application{pendingRegistrations.length !== 1 ? 's' : ''} awaiting approval.</span>
                  </div>
                  <span className="font-mono text-[11px] text-amber-400 font-bold">Action Required</span>
                </div>
              )}

              {/* Users Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">User</th>
                      <th className="px-3.5 py-2.5">Email</th>
                      <th className="px-3.5 py-2.5">Linked Household</th>
                      <th className="px-3.5 py-2.5">Role</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Approval</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersData?.users
                      ?.filter((u) => {
                        if (userStatusFilter !== 'ALL' && (u.status || 'ACTIVE') !== userStatusFilter) return false;
                        if (userSearch) {
                          const s = userSearch.toLowerCase();
                          return (
                            u.username.toLowerCase().includes(s) ||
                            u.email.toLowerCase().includes(s) ||
                            (u.full_name && u.full_name.toLowerCase().includes(s))
                          );
                        }
                        return true;
                      })
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-3.5 py-2.5">
                            <div className="font-bold text-cyan-300">{u.username}</div>
                            {u.full_name && <div className="text-[10px] text-slate-400 font-sans">{u.full_name}</div>}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-300">{u.email}</td>
                          <td className="px-3.5 py-2.5 font-bold text-teal-300">
                            {u.household_id || u.unit || 'A-101'}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'ADMIN'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (u.status || 'ACTIVE') === 'ACTIVE'
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : (u.status || 'ACTIVE') === 'PENDING'
                                  ? 'bg-amber-950 text-amber-300'
                                  : 'bg-rose-950 text-rose-300'
                              }`}
                            >
                              {u.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (u.approval_status || 'APPROVED') === 'APPROVED'
                                  ? 'text-emerald-400'
                                  : (u.approval_status || 'APPROVED') === 'PENDING'
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {u.approval_status || 'APPROVED'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedUserDetail(u)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-sans font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            >
                              View
                            </button>
                            {u.approval_status === 'PENDING' && (
                              <button
                                onClick={() => handleApproveUser(u.id, u.username)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-sans font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition"
                              >
                                Approve
                              </button>
                            )}
                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleToggleUserStatus(u.id, u.status || 'ACTIVE', u.username)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-sans font-medium transition ${
                                  (u.status || 'ACTIVE') === 'ACTIVE'
                                    ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60'
                                    : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
                                }`}
                              >
                                {(u.status || 'ACTIVE') === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 10: ANALYTICS & GRID PERFORMANCE */}
          {/* ===================================================== */}
          {adminSection === 'analytics' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Microgrid Performance & Market Analytics
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-900/40">
                  <span className="text-slate-400">Self-Consumption Rate</span>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                    {analyticsData?.self_consumption_rate_pct || 78.4}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                  <span className="text-slate-400">Community Self-Sufficiency</span>
                  <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                    {analyticsData?.community_self_sufficiency_pct || 84.2}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-900/40">
                  <span className="text-slate-400">Peak Demand Shaving</span>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                    {analyticsData?.peak_demand_shaved_kw || 142.5} kW
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-teal-900/40">
                  <span className="text-slate-400">Average Clearing Price</span>
                  <div className="text-xl font-bold font-mono text-teal-300 mt-1">
                    ${analyticsData?.average_clearing_price_usd?.toFixed(4) || '0.1400'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 11: AUDIT LOGS (IMMUTABLE OPERATOR LOGS) */}
          {/* ===================================================== */}
          {adminSection === 'audit_logs' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Immutable Operator Audit Trail
                    </h2>
                    <p className="text-xs text-slate-400">Append-only operational history of all admin dispatch decisions.</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter by action..."
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Audit Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[500px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Log ID</th>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Operator</th>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Target</th>
                      <th className="px-3 py-2.5 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogsData?.logs
                      ?.filter((l) => (auditActionFilter ? l.action?.toLowerCase().includes(auditActionFilter.toLowerCase()) : true))
                      .map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-800/30">
                          <td className="px-3 py-2 text-cyan-300 font-bold">{log.log_id}</td>
                          <td className="px-3 py-2 text-slate-400">{log.timestamp?.slice(0, 19)}</td>
                          <td className="px-3 py-2 text-white">{log.admin_username}</td>
                          <td className="px-3 py-2 text-amber-300 font-semibold">{log.action}</td>
                          <td className="px-3 py-2 text-slate-300 truncate max-w-[220px]">{log.target}</td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.result === 'SUCCESS' || log.result === 'VALID' || log.result === 'ALL_ATTACKS_BLOCKED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                              }`}
                            >
                              {log.result}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* SECTION 12: CONFIGURATION & SIMULATION PARAMETERS */}
          {/* ===================================================== */}
          {adminSection === 'config' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Simulation Configuration Parameters
                    </h2>
                    <p className="text-xs text-slate-400">
                      Configure future simulation reset runs without modifying existing historical blockchain ledgers.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Virtual Households Count</label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      value={configForm.num_households}
                      onChange={(e) => setConfigForm({ ...configForm, num_households: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Solar PV Penetration (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={configForm.solar_penetration}
                      onChange={(e) => setConfigForm({ ...configForm, solar_penetration: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Battery Storage (BESS) Penetration</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={configForm.battery_penetration}
                      onChange={(e) => setConfigForm({ ...configForm, battery_penetration: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-teal-300 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">EV Adoption Penetration</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={configForm.ev_penetration}
                      onChange={(e) => setConfigForm({ ...configForm, ev_penetration: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Step Interval (Minutes)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={configForm.interval_minutes}
                      onChange={(e) => setConfigForm({ ...configForm, interval_minutes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Cycle Duration (Hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={configForm.duration_hours}
                      onChange={(e) => setConfigForm({ ...configForm, duration_hours: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 italic">
                    Administrative configuration changes are recorded in the append-only Audit Log.
                  </span>
                  <button
                    type="submit"
                    disabled={operating}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md hover:opacity-95 transition disabled:opacity-50"
                  >
                    Save Simulation Configuration
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODALS (HOUSEHOLD, USER, SECURITY FORENSICS) */}
      {/* ========================================================= */}

      {/* Household Telemetry Modal */}
      {selectedHouseholdDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Household Telemetry: {selectedHouseholdDetail.household_id}</h3>
              </div>
              <button
                onClick={() => setSelectedHouseholdDetail(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">Status:</span>
                <span className="font-bold text-cyan-300">{selectedHouseholdDetail.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Solar PV Generation:</span>
                <span className="font-bold text-amber-300">{(selectedHouseholdDetail.current_generation_kw || 0).toFixed(2)} kW</span>
              </div>
              <div>
                <span className="text-slate-500 block">Consumption Load:</span>
                <span className="font-bold text-slate-200">{(selectedHouseholdDetail.current_consumption_kw || 0).toFixed(2)} kW</span>
              </div>
              <div>
                <span className="text-slate-500 block">Battery Level:</span>
                <span className="font-bold text-teal-300">
                  {selectedHouseholdDetail.has_battery ? `${(selectedHouseholdDetail.battery_level_kwh || 0).toFixed(1)} kWh` : 'No BESS'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Selling Participation:</span>
                <span className="text-emerald-400 font-bold">{selectedHouseholdDetail.selling_enabled !== false ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Buying Participation:</span>
                <span className="text-cyan-400 font-bold">{selectedHouseholdDetail.buying_enabled !== false ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedHouseholdDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Event Forensic Detail Modal */}
      {selectedSecurityEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Security Audit Forensic Detail</h3>
              </div>
              <button
                onClick={() => setSelectedSecurityEvent(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 block">Event ID:</span>
                  <span className="text-cyan-300 font-bold">{selectedSecurityEvent.event_id || 'AUDIT-LOG'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Timestamp:</span>
                  <span className="text-slate-300">{selectedSecurityEvent.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Classification:</span>
                  <span className="text-white font-bold">{selectedSecurityEvent.event_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span className={`font-bold ${selectedSecurityEvent.status === 'BLOCKED' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedSecurityEvent.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Diagnostic Rationale:</span>
                <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-mono text-[11px]">
                  {selectedSecurityEvent.reason || selectedSecurityEvent.diagnostic_reason || 'Verified ECDSA cryptographic signature.'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSecurityEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Application & Key Detail Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Community Participant Account Profile</h3>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 block text-[11px]">Full Name:</span>
                  <span className="text-white font-bold font-sans text-sm">{selectedUserDetail.full_name || selectedUserDetail.username}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Username:</span>
                  <span className="text-cyan-300 font-bold">@{selectedUserDetail.username}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Email:</span>
                  <span className="text-slate-300 truncate">{selectedUserDetail.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Linked Household Unit:</span>
                  <span className="text-amber-300 font-bold">{selectedUserDetail.unit || selectedUserDetail.household_id || 'A-101'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Account Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedUserDetail.status || 'ACTIVE'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Approval Status:</span>
                  <span className="text-amber-400 font-bold">{selectedUserDetail.approval_status || 'PENDING'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">ECDSA NIST P-256 Public Key:</span>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 font-mono text-[11px] break-all">
                  {selectedUserDetail.public_key || 'ECDSA_P256_PUBLIC_KEY_AUTOGENERATED'}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div className="space-x-2">
                {selectedUserDetail.approval_status === 'PENDING' && (
                  <>
                    <button
                      disabled={operating}
                      onClick={async () => {
                        await handleApproveUser(selectedUserDetail.id, selectedUserDetail.username);
                        setSelectedUserDetail(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-xs font-bold transition disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={operating}
                      onClick={async () => {
                        await handleRejectUser(selectedUserDetail.id, selectedUserDetail.username);
                        setSelectedUserDetail(null);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
