import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Zap,
  ArrowLeftRight,
  Blocks,
  ShieldCheck,
  EyeOff,
  BarChart3,
  ScrollText,
  Sliders,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
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
  Info
} from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard({
  currentUser,
  onSwitchToParticipant,
  onOpenAuthModal,
  showNotification
}) {
  const [adminSection, setAdminSection] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [communityData, setCommunityData] = useState(null);
  const [energyData, setEnergyData] = useState(null);
  const [tradesData, setTradesData] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [privacyData, setPrivacyData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [auditLogsData, setAuditLogsData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [attackSimulationReport, setAttackSimulationReport] = useState(null);

  // User management search/filter state
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  // Trade search
  const [tradeSearch, setTradeSearch] = useState('');

  // Audit log search
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Security Center Sub-sections & Simulator state
  const [securitySubTab, setSecuritySubTab] = useState('overview'); // 'overview' | 'simulator' | 'events' | 'analytics'
  const [selectedSecurityEvent, setSelectedSecurityEvent] = useState(null);
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [eventStatusFilter, setEventStatusFilter] = useState('ALL');

  // Attack Simulator Parameter Inputs
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

  const isAdmin = currentUser && currentUser.role?.toUpperCase() === 'ADMIN';

  // Fetch admin dashboard overview
  const fetchDashboardData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [data, pending] = await Promise.all([
        api.getAdminDashboard(),
        api.getPendingRegistrations().catch(() => [])
      ]);
      setDashboardData(data);
      if (Array.isArray(pending)) setPendingRegistrations(pending);
    } catch (err) {
      console.error('Failed to load admin dashboard overview:', err);
    }
  }, [isAdmin]);

  // Fetch all admin datasets depending on current section
  const fetchSectionData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      if (adminSection === 'overview') {
        const [data, pending] = await Promise.all([
          api.getAdminDashboard(),
          api.getPendingRegistrations().catch(() => [])
        ]);
        setDashboardData(data);
        if (Array.isArray(pending)) setPendingRegistrations(pending);
      } else if (adminSection === 'pending_registrations') {
        const [pending, uData] = await Promise.all([
          api.getPendingRegistrations(),
          api.getAdminUsers().catch(() => null)
        ]);
        setPendingRegistrations(pending || []);
        if (uData) setUsersData(uData);
      } else if (adminSection === 'users') {
        const [data, pending] = await Promise.all([
          api.getAdminUsers(),
          api.getPendingRegistrations().catch(() => [])
        ]);
        setUsersData(data);
        if (Array.isArray(pending)) setPendingRegistrations(pending);
      } else if (adminSection === 'community' || adminSection === 'config') {
        const data = await api.getAdminCommunity();
        setCommunityData(data);
        if (data?.configuration) {
          setConfigForm((prev) => ({
            ...prev,
            ...data.configuration,
            solar_penetration: data.configuration.solar_penetration ?? 0.65,
            battery_penetration: data.configuration.battery_penetration ?? 0.35,
            ev_penetration: data.configuration.ev_penetration ?? 0.25,
          }));
        }
      } else if (adminSection === 'energy') {
        const data = await api.getAdminEnergy();
        setEnergyData(data);
      } else if (adminSection === 'trading') {
        const data = await api.getAdminTrades({ limit: 200 });
        setTradesData(data);
      } else if (adminSection === 'blockchain') {
        const data = await api.getAdminBlockchain();
        setBlockchainData(data);
      } else if (adminSection === 'security') {
        const data = await api.getAdminSecurity();
        setSecurityData(data);
      } else if (adminSection === 'privacy') {
        const data = await api.getAdminPrivacy();
        setPrivacyData(data);
      } else if (adminSection === 'analytics') {
        const data = await api.getAdminAnalytics();
        setAnalyticsData(data);
      } else if (adminSection === 'audit_logs') {
        const data = await api.getAdminAuditLogs({ limit: 100 });
        setAuditLogsData(data);
      }
    } catch (err) {
      console.error(`Error loading section ${adminSection}:`, err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, adminSection]);

  useEffect(() => {
    fetchDashboardData();
    fetchSectionData();
    const interval = setInterval(fetchSectionData, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchSectionData]);

  // Handle Simulation Start from Admin
  const handleAdminStartSimulation = async (steps = null) => {
    setOperating(true);
    try {
      const res = await api.adminStartSimulation(steps);
      await fetchSectionData();
      showNotification?.(res.message || 'Simulation advanced by Admin.');
    } catch (err) {
      showNotification?.(err.message || 'Simulation start failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle Simulation Stop from Admin
  const handleAdminStopSimulation = async () => {
    setOperating(true);
    try {
      const res = await api.adminStopSimulation();
      await fetchSectionData();
      showNotification?.(res.message || 'Simulation paused by Admin.');
    } catch (err) {
      showNotification?.(err.message || 'Simulation stop failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle Simulation Reset from Admin
  const handleAdminResetSimulation = async () => {
    setOperating(true);
    try {
      const res = await api.adminResetSimulation(configForm.num_households, configForm.random_seed);
      await fetchSectionData();
      showNotification?.('Simulation reset with configured parameters.');
    } catch (err) {
      showNotification?.(err.message || 'Simulation reset failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle User Approval
  const handleApproveUser = async (userId, username, reason = 'Administrator community admission approval') => {
    setOperating(true);
    try {
      await api.approveUser(userId, reason);
      showNotification?.(`Approved community registration for ${username}. Account is now ACTIVE.`);
      await fetchSectionData();
      await fetchDashboardData();
    } catch (err) {
      showNotification?.(err.message || `Failed to approve ${username}`, 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle User Rejection
  const handleRejectUser = async (userId, username, reason = 'Administrator rejection') => {
    setOperating(true);
    try {
      await api.rejectUser(userId, reason);
      showNotification?.(`Rejected registration application for ${username}.`, 'error');
      await fetchSectionData();
      await fetchDashboardData();
    } catch (err) {
      showNotification?.(err.message || `Failed to reject ${username}`, 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle User Suspension / Reactivation
  const handleToggleUserStatus = async (userId, currentStatus, username) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.updateUserStatus(userId, newStatus, `Admin toggle for ${username}`);
      showNotification?.(`User ${username} status changed to ${newStatus}`);
      await fetchSectionData();
      await fetchDashboardData();
    } catch (err) {
      showNotification?.(err.message || `Failed to update user ${username}`, 'error');
    }
  };

  // Handle Community Config Update
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
      showNotification?.('Future simulation configuration saved and audited.');
    } catch (err) {
      showNotification?.(err.message || 'Failed to update configuration', 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle Blockchain Cryptographic Validation
  const handleValidateBlockchain = async () => {
    setOperating(true);
    try {
      const res = await api.validateBlockchainAdmin();
      setValidationResult(res);
      if (res.is_valid) {
        showNotification?.(`Blockchain Validation PASSED: ${res.details?.total_blocks || ''} blocks verified.`);
      } else {
        showNotification?.(`Blockchain Validation FAILED: Corrupted Block #${res.invalid_block_index}`, 'error');
      }
      fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || 'Validation request failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle Attack Simulation
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
      showNotification?.(`Simulated ${type} attack completed. Vectors evaluated.`);
      fetchSectionData();
    } catch (err) {
      showNotification?.(err.message || `Failed to execute ${type} attack`, 'error');
    } finally {
      setOperating(false);
    }
  };

  // Handle Reset Security Counters & Logs
  const handleResetSecurity = async () => {
    if (!window.confirm('Reset all security logs and replay transaction counters?')) return;
    setOperating(true);
    try {
      await api.resetSecurity();
      setAttackSimulationReport(null);
      await fetchSectionData();
      showNotification?.('Security audit logs and replay counters reset successfully.');
    } catch (err) {
      showNotification?.(err.message || 'Reset failed', 'error');
    } finally {
      setOperating(false);
    }
  };

  // -------------------------------------------------------------
  // RBAC Barrier View if Non-Admin
  // -------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center animate-in fade-in duration-300">
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              You don't have permission to view this page.
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              The Admin & Operator Control Panel is restricted to authorized platform operators.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 text-left space-y-2 font-mono">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <Info className="w-4 h-4" />
              <span>University Research Demo Mode</span>
            </div>
            <p className="text-slate-400">
              To test the Admin role, log in with an administrative account or register with Role: <code>ADMIN</code>.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:opacity-95 transition"
            >
              Sign In as Admin
            </button>
            <button
              onClick={onSwitchToParticipant}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm border border-slate-700 transition"
            >
              Return to Participant View
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = pendingRegistrations?.length || usersData?.pending_users || 0;

  // Sidebar navigation menu items
  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pending_registrations', label: 'Pending Registrations', icon: UserCheck, badge: pendingCount },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'community', label: 'Community', icon: Building2 },
    { id: 'energy', label: 'Energy', icon: Zap },
    { id: 'trading', label: 'Trading', icon: ArrowLeftRight },
    { id: 'blockchain', label: 'Blockchain', icon: Blocks },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'privacy', label: 'Privacy', icon: EyeOff },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'audit_logs', label: 'Audit Logs', icon: ScrollText },
    { id: 'config', label: 'Configuration', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0a1224] to-slate-900 border border-cyan-800/40 shadow-xl shadow-cyan-950/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-900/40 border border-cyan-400/40 text-slate-950">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Admin & Operator Control Panel</h1>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                ROLE: {currentUser?.role}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Microgrid Digital Twin Management &bull; Pure Emulation (No Physical Electricity Control)
            </p>
          </div>
        </div>

        {/* Top Action Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAdminStartSimulation(4)}
            disabled={operating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold border border-emerald-400/40 shadow-md transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>+1 Hour</span>
          </button>
          <button
            onClick={handleAdminStopSimulation}
            disabled={operating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
          <button
            onClick={handleAdminResetSimulation}
            disabled={operating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleValidateBlockchain}
            disabled={operating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-xs font-medium transition disabled:opacity-50"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Audit Blockchain</span>
          </button>
          <button
            onClick={onSwitchToParticipant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <span>Participant View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Admin Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 shadow-lg space-y-1 sticky top-20">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Platform Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = adminSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAdminSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-slate-950 text-amber-300 font-mono'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/60 font-mono animate-pulse'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.id === 'security' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-rose-950 text-rose-300'}`}>
                    Active
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800 px-3 py-2">
            <div className="text-[11px] text-slate-400 font-medium">Logged in Admin:</div>
            <div className="text-xs font-mono font-bold text-cyan-300 truncate">{currentUser?.username}</div>
            <div className="text-[10px] text-slate-400 font-mono">{currentUser?.email}</div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* SECTION 1: OVERVIEW DASHBOARD */}
          {adminSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* SYSTEM OVERVIEW */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">System Overview</h2>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">Green Valley Community</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Total Users</span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {dashboardData?.system_overview?.total_households || 100}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Total Households</span>
                    <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                      {dashboardData?.system_overview?.total_households || 100} / {dashboardData?.system_overview?.household_capacity || 500}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/50">
                    <span className="text-[11px] text-emerald-400 font-medium">Active Users</span>
                    <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                      {dashboardData?.system_overview?.active_users_count || 100}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Suspended Users</span>
                    <div className="text-xl font-bold font-mono text-slate-400 mt-1">
                      {dashboardData?.system_overview?.suspended_users_count || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* ENERGY OVERVIEW */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Energy Overview</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Current Interval Metrics</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-900/40">
                    <span className="text-[11px] text-amber-400 font-medium">Current Generation</span>
                    <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                      {dashboardData?.energy_overview?.current_generation_kwh?.toFixed(2) || '0.00'} <span className="text-xs text-slate-500">kWh</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-900/40">
                    <span className="text-[11px] text-cyan-400 font-medium">Current Consumption</span>
                    <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                      {dashboardData?.energy_overview?.current_consumption_kwh?.toFixed(2) || '0.00'} <span className="text-xs text-slate-500">kWh</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                    <span className="text-[11px] text-emerald-400 font-medium">Current Surplus</span>
                    <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                      {dashboardData?.energy_overview?.current_surplus_kwh?.toFixed(2) || '0.00'} <span className="text-xs text-slate-500">kWh</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40">
                    <span className="text-[11px] text-rose-400 font-medium">Current Deficit</span>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                      {dashboardData?.energy_overview?.current_deficit_kwh?.toFixed(2) || '0.00'} <span className="text-xs text-slate-500">kWh</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-slate-400">Solar Producers:</span>{' '}
                    <strong className="text-amber-400 font-mono">{dashboardData?.energy_overview?.solar_producers || 0}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-slate-400">Battery Homes:</span>{' '}
                    <strong className="text-teal-400 font-mono">{dashboardData?.energy_overview?.battery_homes || 0}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="text-slate-400">EV Homes:</span>{' '}
                    <strong className="text-cyan-400 font-mono">{dashboardData?.energy_overview?.ev_homes || 0}</strong>
                  </div>
                </div>
              </div>

              {/* TRADING & BLOCKCHAIN SPLIT ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TRADING OVERVIEW */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">Trading Overview</h2>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">P2P Double Auction</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Active Buyers / Sellers</span>
                      <span className="font-bold font-mono text-cyan-300">
                        {dashboardData?.trading_overview?.active_buyers || 0} / {dashboardData?.trading_overview?.active_sellers || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Completed Trades</span>
                      <span className="font-bold font-mono text-emerald-300">
                        {dashboardData?.trading_overview?.completed_trades || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Total Energy Traded</span>
                      <span className="font-bold font-mono text-amber-300">
                        {dashboardData?.trading_overview?.total_energy_traded_kwh || 0} kWh
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Average Trading Price</span>
                      <span className="font-bold font-mono text-teal-300">
                        ${dashboardData?.trading_overview?.average_trading_price_usd?.toFixed(4) || '0.1400'} / kWh
                      </span>
                    </div>
                  </div>
                </div>

                {/* BLOCKCHAIN OVERVIEW */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Blocks className="w-4 h-4 text-teal-400" />
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">Blockchain Ledger</h2>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      <CheckCircle2 className="w-3 h-3" />
                      {dashboardData?.blockchain?.blockchain_status || 'VALID'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono">
                      <span className="text-slate-400">Total Blocks:</span>
                      <span className="text-white font-bold">{dashboardData?.blockchain?.total_blocks || 1}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono">
                      <span className="text-slate-400">Total Transactions:</span>
                      <span className="text-white font-bold">{dashboardData?.blockchain?.total_transactions || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono">
                      <span className="text-slate-400">Latest Block Hash:</span>
                      <span className="text-cyan-400 text-[11px] truncate max-w-[200px]" title={dashboardData?.blockchain?.latest_block_hash}>
                        {dashboardData?.blockchain?.latest_block_hash ? `${dashboardData.blockchain.latest_block_hash.slice(0, 16)}...` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 font-mono">
                      <span className="text-slate-400">Consensus:</span>
                      <span className="text-emerald-400">Proof-of-Authority (PoA)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECURITY & SYSTEM STATUS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SECURITY OVERVIEW */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">Security & Defense</h2>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">100% Defense Rate</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-rose-900/40">
                      <span className="text-slate-400 block text-[10px]">Replay Attacks</span>
                      <span className="font-bold font-mono text-rose-300">
                        {dashboardData?.security?.replay_attempts || 0} Blocked
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-900/40">
                      <span className="text-slate-400 block text-[10px]">FDI Attempts</span>
                      <span className="font-bold font-mono text-amber-300">
                        {dashboardData?.security?.false_data_injection_attempts || 0} Blocked
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-purple-900/40">
                      <span className="text-slate-400 block text-[10px]">Sybil Attempts</span>
                      <span className="font-bold font-mono text-purple-300">
                        {dashboardData?.security?.sybil_attempts || 0} Blocked
                      </span>
                    </div>
                  </div>
                </div>

                {/* SYSTEM HEALTH */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider">System State</h2>
                    </div>
                    <span className="text-[11px] text-cyan-400 font-mono">{dashboardData?.system?.simulation_time || '00:00'}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono">
                      <span className="text-slate-400">Simulation Status:</span>
                      <span className="text-cyan-400 font-bold">{dashboardData?.system?.simulation_status || 'INITIALIZED'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60 font-mono">
                      <span className="text-slate-400">FastAPI Backend:</span>
                      <span className="text-emerald-400">{dashboardData?.system?.api_status || 'ONLINE'}</span>
                    </div>
                    <div className="flex justify-between py-1 font-mono">
                      <span className="text-slate-400">Database Engine:</span>
                      <span className="text-emerald-400">{dashboardData?.system?.database_status || 'CONNECTED'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: PENDING REGISTRATIONS */}
          {adminSection === 'pending_registrations' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pending Community Registrations</h2>
                    <p className="text-xs text-slate-400">Review, approve, or reject closed energy community membership applications.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-300 font-mono text-xs font-bold">
                    {pendingRegistrations.length} Pending Application{pendingRegistrations.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={fetchSectionData}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Refresh List"
                  >
                    <RefreshCw className={`w-4 h-4 ${operating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {pendingRegistrations.length === 0 ? (
                <div className="p-10 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">All Caught Up</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    There are no pending registrations requiring administrator approval at this time.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5">Applicant</th>
                        <th className="px-3.5 py-2.5">Email</th>
                        <th className="px-3.5 py-2.5">Community</th>
                        <th className="px-3.5 py-2.5">Assigned Unit</th>
                        <th className="px-3.5 py-2.5">Registered At</th>
                        <th className="px-3.5 py-2.5">Public Key</th>
                        <th className="px-3.5 py-2.5 text-right">Decision Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {pendingRegistrations.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-3.5 py-2.5">
                            <div className="font-bold text-white font-sans">{u.full_name || u.username}</div>
                            <div className="text-[10px] text-slate-400 font-mono">@{u.username} (ID: #{u.id})</div>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-300">{u.email}</td>
                          <td className="px-3.5 py-2.5 text-cyan-300 font-sans">{u.community || 'Green Valley Community'}</td>
                          <td className="px-3.5 py-2.5">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-teal-800/40 text-[10px] font-bold">
                              {u.unit || u.household_id || 'A-101'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-400 text-[11px]">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-400 text-[10px] truncate max-w-[120px]" title={u.public_key}>
                            {u.public_key ? `${u.public_key.slice(0, 10)}...` : 'ECC NIST P-256'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedUserDetail(u)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            >
                              Details
                            </button>
                            <button
                              disabled={operating}
                              onClick={() => handleApproveUser(u.id, u.username)}
                              className="px-3 py-1 rounded-lg text-[11px] font-sans font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 shadow-sm transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={operating}
                              onClick={() => handleRejectUser(u.id, u.username)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: USER MANAGEMENT */}
          {adminSection === 'users' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">User Directory & Community Access</h2>
                    <p className="text-xs text-slate-400">Manage participant credentials, roles, unit assignments, and access statuses.</p>
                  </div>
                </div>

                {/* Filter / Search Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search user / email / unit..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">User</th>
                      <th className="px-3.5 py-2.5">Email</th>
                      <th className="px-3.5 py-2.5">Community / Unit</th>
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
                            (u.full_name && u.full_name.toLowerCase().includes(s)) ||
                            (u.unit && u.unit.toLowerCase().includes(s))
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
                          <td className="px-3.5 py-2.5">
                            <div className="text-slate-300">{u.community || 'Green Valley'}</div>
                            <div className="text-[10px] text-teal-400 font-bold">{u.unit || u.household_id || 'H001'}</div>
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
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                  : (u.status || 'ACTIVE') === 'PENDING'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                  : (u.status || 'ACTIVE') === 'REJECTED'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800/60'
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
                              className="px-2 py-1 rounded-lg text-[10px] font-sans font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            >
                              View
                            </button>
                            {u.approval_status === 'PENDING' && (
                              <button
                                onClick={() => handleApproveUser(u.id, u.username)}
                                className="px-2 py-1 rounded-lg text-[10px] font-sans font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition"
                              >
                                Approve
                              </button>
                            )}
                            {u.id !== currentUser?.id ? (
                              <button
                                onClick={() => handleToggleUserStatus(u.id, u.status || 'ACTIVE', u.username)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium transition ${
                                  (u.status || 'ACTIVE') === 'ACTIVE'
                                    ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60'
                                    : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
                                }`}
                              >
                                {(u.status || 'ACTIVE') === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[10px] italic font-sans">(Self Admin)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: COMMUNITY & CONFIGURATION */}
          {(adminSection === 'community' || adminSection === 'config') && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Community Management & Simulation Parameters
                    </h2>
                    <p className="text-xs text-slate-400">
                      Changes staged here configure FUTURE simulation runs without mutating historical trade ledgers.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                  Status: ACTIVE
                </span>
              </div>

              {/* Community Parameters Profile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Community Name</span>
                  <div className="font-bold text-white mt-1">{communityData?.community_name || 'Green Valley Community'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Network Topology</span>
                  <div className="font-bold text-cyan-300 mt-1">{communityData?.network_type || 'Virtual Microgrid'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Fleet Capacity</span>
                  <div className="font-bold text-white mt-1">{communityData?.household_capacity || 500} Households</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Current Node Count</span>
                  <div className="font-bold text-emerald-400 mt-1">{communityData?.current_household_count || 100} Virtual Nodes</div>
                </div>
              </div>

              {/* Configuration Form */}
              <form onSubmit={handleSaveConfig} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span>Configure Future Simulation Runs</span>
                </h3>

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
                    Administrative changes are recorded to the append-only Audit Log.
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

          {/* SECTION 4: TRADING MONITORING */}
          {adminSection === 'trading' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Trading Monitoring (P2P Double Auction)</h2>
                    <p className="text-xs text-slate-400">Audited view of all matched energy trades. Historical settlements are immutable.</p>
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Total Trades: <strong className="text-emerald-400">{tradesData?.total_count || 0}</strong>
                </div>
              </div>

              {/* Trades Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[500px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Trade ID</th>
                      <th className="px-3 py-2.5">Time</th>
                      <th className="px-3 py-2.5">Seller</th>
                      <th className="px-3 py-2.5">Buyer</th>
                      <th className="px-3 py-2.5 text-right">Energy (kWh)</th>
                      <th className="px-3 py-2.5 text-right">Price ($/kWh)</th>
                      <th className="px-3 py-2.5 text-right">Total ($)</th>
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
                        <td className="px-3 py-2 text-right font-bold text-white">{t.energy_kwh.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">${t.price_per_kwh.toFixed(4)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-400">${t.total_value.toFixed(4)}</td>
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

          {/* SECTION 5: BLOCKCHAIN MONITORING */}
          {adminSection === 'blockchain' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Blocks className="w-5 h-5 text-teal-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Blockchain Ledger Explorer & Cryptographic Audit</h2>
                    <p className="text-xs text-slate-400">Inspect hash linkages and trigger full diagnostic validation.</p>
                  </div>
                </div>
                <button
                  onClick={handleValidateBlockchain}
                  disabled={operating}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md hover:opacity-95 transition disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Validate Blockchain</span>
                </button>
              </div>

              {/* Validation Result Banner if present */}
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
                          ? 'CRYPTOGRAPHIC AUDIT PASSED: Ledger Integrity 100% Intact'
                          : `AUDIT FAILED: Corrupted Block #${validationResult.invalid_block_index} (${validationResult.error_type})`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Audited {validationResult.details?.total_blocks || 0} blocks &bull; Consensus: PoA Validator
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

          {/* SECTION 6: SECURITY CENTER (ADMIN ONLY) */}
          {adminSection === 'security' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/60">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">Security Center</h2>
                    <p className="text-xs text-slate-400">Intrusion detection, active cryptographic defenses, and attack simulation suite</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetSecurity}
                    disabled={operating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Security State</span>
                  </button>
                </div>
              </div>

              {/* Security Center Sub-Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setSecuritySubTab('overview')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition ${
                    securitySubTab === 'overview'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSecuritySubTab('simulator')}
                  className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg font-medium transition ${
                    securitySubTab === 'simulator'
                      ? 'bg-rose-500 text-slate-950 font-bold shadow-md shadow-rose-500/20'
                      : 'text-rose-300 hover:text-rose-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Attack Simulator</span>
                </button>
                <button
                  onClick={() => setSecuritySubTab('events')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition ${
                    securitySubTab === 'events'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Security Events
                </button>
                <button
                  onClick={() => setSecuritySubTab('analytics')}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition ${
                    securitySubTab === 'analytics'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Attack Analytics
                </button>
              </div>

              {/* Sub-Tab 1: OVERVIEW */}
              {securitySubTab === 'overview' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold">
                        <Key className="w-4 h-4" />
                        <span>ECDSA SECP256R1 Verification</span>
                      </div>
                      <p className="text-slate-400">Canonical transaction payloads verified against NIST P-256 ECC public keys.</p>
                      <div className="pt-2 text-[11px] font-mono text-emerald-400">Status: Enforced & Active</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold">
                        <Radio className="w-4 h-4" />
                        <span>Monotonic Nonce Sequence</span>
                      </div>
                      <p className="text-slate-400">Strict incremental sequence enforcement prevents captured message replays.</p>
                      <div className="pt-2 text-[11px] font-mono text-cyan-300">
                        Tracked Nodes: {securityData?.stats?.by_status?.ACCEPTED ?? 100}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Clock className="w-4 h-4" />
                        <span>Timestamp Freshness Guard</span>
                      </div>
                      <p className="text-slate-400">Enforces a &plusmn;300-second maximum drift window, rejecting future or stale trades.</p>
                      <div className="pt-2 text-[11px] font-mono text-emerald-300">Drift Limit: &plusmn;300s</div>
                    </div>
                  </div>

                  {/* System Defense Summary */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">Continuous Intrusion Defense Status</span>
                      <span className="text-slate-400">All security hooks and signature validators are operational.</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                      PROTECTED
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: ATTACK SIMULATOR */}
              {securitySubTab === 'simulator' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1 text-xs">
                    <span className="font-bold text-rose-300 uppercase tracking-wider">
                      Research Demonstration & Attack Simulation Suite
                    </span>
                    <p className="text-slate-400">
                      Select an adversarial attack vector below to inject simulated malicious transactions and observe server-side cryptographic and behavioral defenses.
                    </p>
                  </div>

                  {/* 3 Attack Vector Launchers */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Vector 1: Replay Attack */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/50 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-300 text-xs uppercase tracking-wider">1. Replay Attack</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                            Nonce Defense
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Captures a valid signed prosumer trade and re-submits duplicate payloads to test anti-replay rejection.
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
                        <p className="text-[11px] text-slate-400 leading-relaxed">
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
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Spawns unregistered fake node identities attempting to manipulate double auction market clearing.
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

                  {/* Live Simulation Outcome Report Card */}
                  {attackSimulationReport && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-800/80 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white uppercase tracking-wider">Simulation Report:</span>
                          <span className="text-xs font-mono text-cyan-400">
                            {attackSimulationReport.attack_type || attackSimulationReport.simulation_id}
                          </span>
                        </div>
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
                            <div className="space-y-0.5">
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

              {/* Sub-Tab 3: SECURITY EVENTS */}
              {securitySubTab === 'events' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search events/actors..."
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={eventTypeFilter}
                        onChange={(e) => setEventTypeFilter(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="ALL">All Event Types</option>
                        <option value="REPLAY_ATTACK_DETECTED">Replay Attacks</option>
                        <option value="REUSED_NONCE_BLOCKED">Reused Nonces</option>
                        <option value="EXPIRED_TIMESTAMP_BLOCKED">Expired Timestamps</option>
                        <option value="INVALID_SIGNATURE_BLOCKED">Invalid Signatures</option>
                        <option value="TRANSACTION_VALIDATED">Validated Transactions</option>
                      </select>

                      <select
                        value={eventStatusFilter}
                        onChange={(e) => setEventStatusFilter(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="ACCEPTED">ACCEPTED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                  </div>

                  {/* Events Table */}
                  <div className="max-h-[450px] overflow-y-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Timestamp</th>
                          <th className="px-3 py-2">Event ID / Type</th>
                          <th className="px-3 py-2">Target / Actor</th>
                          <th className="px-3 py-2">Severity</th>
                          <th className="px-3 py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {securityData?.events
                          ?.filter((ev) => {
                            if (eventTypeFilter !== 'ALL' && ev.event_type !== eventTypeFilter) return false;
                            if (eventStatusFilter !== 'ALL' && ev.status !== eventStatusFilter) return false;
                            if (eventSearch) {
                              const q = eventSearch.toLowerCase();
                              const matchId = (ev.event_id || '').toLowerCase().includes(q);
                              const matchActor = (ev.sender_id || ev.transaction_id || '').toLowerCase().includes(q);
                              const matchType = (ev.event_type || '').toLowerCase().includes(q);
                              if (!matchId && !matchActor && !matchType) return false;
                            }
                            return true;
                          })
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
              )}

              {/* Sub-Tab 4: ATTACK ANALYTICS */}
              {securitySubTab === 'analytics' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Total Audited Operations</span>
                      <div className="text-2xl font-bold text-white mt-1">
                        {securityData?.stats?.total_events || securityData?.events?.length || 0}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-900/40">
                      <span className="text-rose-400 block text-[11px]">Replay Attacks Blocked</span>
                      <div className="text-2xl font-bold text-rose-300 mt-1">
                        {securityData?.stats?.replay_attacks_blocked || 0}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-900/40">
                      <span className="text-amber-400 block text-[11px]">Reused Nonces Rejected</span>
                      <div className="text-2xl font-bold text-amber-300 mt-1">
                        {securityData?.stats?.reused_nonces_blocked || 0}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-900/40">
                      <span className="text-emerald-400 block text-[11px]">Valid ECDSA Signatures</span>
                      <div className="text-2xl font-bold text-emerald-300 mt-1">
                        {securityData?.stats?.by_status?.ACCEPTED || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 7: PRIVACY MONITORING */}
          {adminSection === 'privacy' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-purple-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Privacy Baseline & Granular Access Control Matrix
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enforces data minimization so that neither trading peers nor administrators can observe private household appliance telemetry.
                </p>
              </div>

              {/* Privacy Categories Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Owner</th>
                      <th className="px-3 py-2.5">Peer / Buyer</th>
                      <th className="px-3 py-2.5">Platform</th>
                      <th className="px-3 py-2.5">Blockchain Observer</th>
                      <th className="px-3 py-2.5">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {privacyData?.categories?.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2.5 font-bold text-cyan-300 font-sans">
                          {cat.category}
                          <span className="block text-[10px] font-normal text-slate-400">{cat.description}</span>
                        </td>
                        <td className="px-3 py-2.5 text-emerald-400">{cat.owner}</td>
                        <td className="px-3 py-2.5 text-slate-300">{cat.buyer}</td>
                        <td className="px-3 py-2.5 text-slate-400">{cat.platform}</td>
                        <td className="px-3 py-2.5 text-slate-400">{cat.blockchain_observer}</td>
                        <td className="px-3 py-2.5 text-amber-300 font-semibold">{cat.admin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Guarantees Box */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-cyan-400">Cryptographic Privacy Guarantees:</span>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  {privacyData?.privacy_guarantees?.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 8: SYSTEM ANALYTICS */}
          {adminSection === 'analytics' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Microgrid System Analytics & Market KPIs
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-900/40">
                  <span className="text-slate-400">Self-Consumption Rate</span>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                    {analyticsData?.self_consumption_rate_pct || 0}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                  <span className="text-slate-400">Community Self-Sufficiency</span>
                  <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                    {analyticsData?.community_self_sufficiency_pct || 0}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-900/40">
                  <span className="text-slate-400">Peak Demand Shaving</span>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                    {analyticsData?.peak_demand_shaved_kw || 0} kW
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

          {/* SECTION 9: AUDIT LOGS */}
          {adminSection === 'audit_logs' && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Immutable Administrative Audit Trail
                    </h2>
                    <p className="text-xs text-slate-400">Append-only operational history of all operator actions.</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter by action..."
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
                      <th className="px-3 py-2.5">Admin Operator</th>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Target</th>
                      <th className="px-3 py-2.5 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogsData?.logs
                      ?.filter((l) => (auditActionFilter ? l.action.toLowerCase().includes(auditActionFilter.toLowerCase()) : true))
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
        </div>
      </div>

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
                  <span className="text-slate-500 block">Event Classification:</span>
                  <span className="text-white font-bold">{selectedSecurityEvent.event_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status / Action:</span>
                  <span
                    className={`font-bold ${
                      selectedSecurityEvent.status === 'BLOCKED' || selectedSecurityEvent.status === 'REJECTED'
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedSecurityEvent.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-1">Diagnostic Rationale:</span>
                <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200">
                  {selectedSecurityEvent.reason || selectedSecurityEvent.diagnostic_reason || 'Verified ECDSA cryptographic signature against public key.'}
                </p>
              </div>

              {selectedSecurityEvent.details && Object.keys(selectedSecurityEvent.details).length > 0 && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Forensic Metadata & Violation Rule:</span>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 text-[11px] overflow-x-auto font-mono">
                    {JSON.stringify(selectedSecurityEvent.details, null, 2)}
                  </pre>
                </div>
              )}
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
                <h3 className="font-bold text-white text-base">Community Participant Profile</h3>
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
                  <span className="text-slate-500 block text-[11px]">Full Legal Name:</span>
                  <span className="text-white font-bold font-sans text-sm">{selectedUserDetail.full_name || selectedUserDetail.username}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Username & ID:</span>
                  <span className="text-cyan-300 font-bold">@{selectedUserDetail.username} (#{selectedUserDetail.id})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Email Address:</span>
                  <span className="text-slate-300 truncate">{selectedUserDetail.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Phone / Mobile:</span>
                  <span className="text-slate-300">{selectedUserDetail.phone || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Community:</span>
                  <span className="text-teal-300 font-sans font-bold">{selectedUserDetail.community || 'Green Valley Community'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Assigned Household Unit:</span>
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
                <span className="text-slate-400 font-semibold block mb-1">ECDSA NIST P-256 Public Key (Hardware Identity):</span>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 font-mono text-[11px] break-all">
                  {selectedUserDetail.public_key || 'ECDSA_P256_PUBLIC_KEY_AUTOGENERATED'}
                </div>
              </div>

              {selectedUserDetail.approval_status === 'PENDING' && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs">
                  This participant is awaiting administrator sign-off before receiving access to virtual energy trading and telemetry dashboards.
                </div>
              )}
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
                      Approve Membership
                    </button>
                    <button
                      disabled={operating}
                      onClick={async () => {
                        await handleRejectUser(selectedUserDetail.id, selectedUserDetail.username);
                        setSelectedUserDetail(null);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition disabled:opacity-50"
                    >
                      Reject Application
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

