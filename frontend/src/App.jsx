import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import SuspendedPage from './pages/SuspendedPage';
import DashboardPage from './pages/DashboardPage';
import EnergyPage from './pages/EnergyPage';
import TradingPage from './pages/TradingPage';
import BlockchainPage from './pages/BlockchainPage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import HouseholdModal from './components/HouseholdModal';
import BlockModal from './components/BlockModal';
import AuthModal from './components/AuthModal';
import api from './services/api';
import {
  AlertCircle,
  CheckCircle2,
  Terminal
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || hash === '#admin') return 'admin';
    }
    return 'home';
  });

  const [simulationStatus, setSimulationStatus] = useState(null);
  const [energySummary, setEnergySummary] = useState(null);
  const [energyHistory, setEnergyHistory] = useState(null);
  const [householdsData, setHouseholdsData] = useState(null);
  const [tradesData, setTradesData] = useState(null);
  const [blockchainSummary, setBlockchainSummary] = useState(null);
  const [blockchainBlocks, setBlockchainBlocks] = useState(null);

  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [notification, setNotification] = useState(null);

  const autoPlayRef = useRef(null);

  // Check existing user session on mount
  useEffect(() => {
    api.getMe()
      .then((user) => {
        setCurrentUser(user);
        if (user.role?.toUpperCase() === 'ADMIN' && activeTab === 'home') {
          setActiveTab('admin');
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    showNotification('Signed out of SecureTwinGrid.');
    setActiveTab('home');
  };

  const handleRefreshUserStatus = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      if (user.approval_status === 'APPROVED' && user.status === 'ACTIVE') {
        showNotification('Account approved! Welcome to the energy community.');
      } else {
        showNotification(`Current status: ${user.status} (${user.approval_status})`);
      }
    } catch {
      showNotification('Failed to refresh status', 'error');
    }
  };

  const handleOpenLogin = () => {
    setAuthInitialMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthInitialMode('register');
    setIsAuthModalOpen(true);
  };

  // Fetch all core microgrid & blockchain data from backend
  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    const status = (currentUser.status || 'ACTIVE').toUpperCase();
    const approval = (currentUser.approval_status || 'APPROVED').toUpperCase();
    const role = (currentUser.role || 'USER').toUpperCase();

    // Only authorized active users and admins fetch telemetry
    if (role !== 'ADMIN' && (status !== 'ACTIVE' || approval !== 'APPROVED')) {
      return;
    }

    try {
      const [
        healthRes,
        statusRes,
        energyRes,
        historyRes,
        housesRes,
        tradesRes,
        bcSummaryRes,
        bcBlocksRes
      ] = await Promise.allSettled([
        api.getHealth(),
        api.getSimulationStatus(),
        api.getEnergySummary(),
        api.getEnergyHistory(),
        api.getHouseholds(),
        api.getTrades({ limit: 500 }),
        api.getBlockchainSummary(),
        api.getBlockchainBlocks(),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value?.status === 'healthy') {
        setIsBackendOnline(true);
      } else {
        setIsBackendOnline(false);
      }

      if (statusRes.status === 'fulfilled') setSimulationStatus(statusRes.value);
      if (energyRes.status === 'fulfilled') setEnergySummary(energyRes.value);
      if (historyRes.status === 'fulfilled') setEnergyHistory(historyRes.value);
      if (housesRes.status === 'fulfilled') setHouseholdsData(housesRes.value);
      if (tradesRes.status === 'fulfilled') setTradesData(tradesRes.value);
      if (bcSummaryRes.status === 'fulfilled') setBlockchainSummary(bcSummaryRes.value);
      if (bcBlocksRes.status === 'fulfilled') setBlockchainBlocks(bcBlocksRes.value);
    } catch (err) {
      console.error('Error fetching dashboard state:', err);
      setIsBackendOnline(false);
    }
  }, [currentUser]);

  // Initial load & periodic poll
  useEffect(() => {
    if (currentUser) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchAllData]);

  // Start / Advance Simulation
  const handleStartSimulation = async (steps = null) => {
    setIsOperating(true);
    try {
      const res = await api.startSimulation({ steps, run_trading: true });
      await fetchAllData();
      showNotification(res.message || 'Simulation advanced successfully.');
    } catch (err) {
      showNotification(err.message || 'Failed to start simulation', 'error');
    } finally {
      setIsOperating(false);
    }
  };

  // Step Simulation by 1 interval (+15m)
  const handleStepSimulation = async (steps = 1) => {
    setIsOperating(true);
    try {
      const res = await api.startSimulation({ steps, run_trading: true });
      await fetchAllData();
      showNotification(`Advanced +${steps * 15}m to ${res.current_time}`);
    } catch (err) {
      showNotification(err.message || 'Failed to step simulation', 'error');
    } finally {
      setIsOperating(false);
    }
  };

  // Stop / Pause Simulation
  const handleStopSimulation = async () => {
    setAutoPlaying(false);
    try {
      const res = await api.stopSimulation();
      await fetchAllData();
      showNotification(res.message || 'Simulation paused.');
    } catch (err) {
      showNotification(err.message || 'Failed to stop simulation', 'error');
    }
  };

  // Reset Simulation to 00:00
  const handleResetSimulation = async (numHouseholds = 100, randomSeed = 42) => {
    setAutoPlaying(false);
    setIsOperating(true);
    try {
      const res = await api.resetSimulation(numHouseholds, randomSeed);
      await fetchAllData();
      showNotification(`Microgrid reset to 00:00 (${numHouseholds} homes).`);
    } catch (err) {
      showNotification(err.message || 'Failed to reset simulation', 'error');
    } finally {
      setIsOperating(false);
    }
  };

  // Run double auction manually
  const handleRunTradingAuction = async () => {
    setIsOperating(true);
    try {
      const res = await api.runTradingAuction({ default_seller_ask: 0.10, default_buyer_bid: 0.18, price_noise: true });
      await fetchAllData();
      showNotification(`Auction cleared ${res.trades_executed} trades on blockchain.`);
    } catch (err) {
      showNotification(err.message || 'Failed to run trading auction', 'error');
    } finally {
      setIsOperating(false);
    }
  };

  // Validate Blockchain Cryptographic Integrity
  const handleValidateBlockchain = async () => {
    setIsOperating(true);
    try {
      const res = await api.validateBlockchain();
      await fetchAllData();
      if (res.is_valid) {
        showNotification(`Cryptographic Audit PASSED: All ${res.details?.total_blocks || ''} blocks valid.`);
      } else {
        showNotification(`Audit FAILED: Block #${res.invalid_block_index} corrupted (${res.error_type})`, 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Blockchain validation failed', 'error');
    } finally {
      setIsOperating(false);
    }
  };

  // Auto-Play step loop
  useEffect(() => {
    if (autoPlaying) {
      autoPlayRef.current = setInterval(async () => {
        if (simulationStatus && simulationStatus.current_step >= simulationStatus.total_steps) {
          setAutoPlaying(false);
          showNotification('24-Hour simulation completed.');
          return;
        }
        try {
          await api.startSimulation({ steps: 1, run_trading: true });
          await fetchAllData();
        } catch {
          setAutoPlaying(false);
        }
      }, 750);
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlaying, simulationStatus, fetchAllData]);

  const handleToggleAutoPlay = () => {
    setAutoPlaying((prev) => !prev);
  };

  // Handle selecting household by ID from trades or table
  const handleSelectHouseholdById = async (householdId) => {
    try {
      const hh = await api.getHousehold(householdId);
      setSelectedHousehold(hh);
    } catch {
      const found = householdsData?.households?.find((h) => h.household_id === householdId);
      if (found) setSelectedHousehold(found);
    }
  };

  // Initial loading splash while checking token
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070c18] flex items-center justify-center font-mono text-cyan-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying SecureTwinGrid authorization...</span>
        </div>
      </div>
    );
  }

  // 1. UNRECOGNIZED / UNAUTHENTICATED VISITOR -> Landing Page ONLY
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
        <LandingPage
          onOpenLogin={handleOpenLogin}
          onOpenRegister={handleOpenRegister}
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          initialMode={authInitialMode}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            showNotification(`Signed in as ${user.username} (${user.role})`);
            if (user.role?.toUpperCase() === 'ADMIN') {
              setActiveTab('admin');
            } else {
              setActiveTab('home');
            }
          }}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  const userStatus = (currentUser.status || 'ACTIVE').toUpperCase();
  const userApproval = (currentUser.approval_status || 'APPROVED').toUpperCase();
  const userRole = (currentUser.role || 'USER').toUpperCase();

  // 2. SUSPENDED ACCOUNT
  if (userStatus === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans">
        <SuspendedPage onLogout={handleLogout} />
      </div>
    );
  }

  // 3. REJECTED ACCOUNT
  if (userStatus === 'REJECTED' || userApproval === 'REJECTED') {
    return (
      <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans">
        <AccessDeniedPage onLogout={handleLogout} />
      </div>
    );
  }

  // 4. PENDING APPROVAL (USER ROLE)
  if (userRole !== 'ADMIN' && (userStatus === 'PENDING' || userApproval === 'PENDING')) {
    return (
      <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans">
        <PendingApprovalPage
          currentUser={currentUser}
          onLogout={handleLogout}
          onRefreshStatus={handleRefreshUserStatus}
        />
      </div>
    );
  }

  // 5. APPROVED USER OR ADMIN -> Access to Application
  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        simulationStatus={simulationStatus}
        onStart={() => handleStartSimulation()}
        onReset={() => handleResetSimulation()}
        isOperating={isOperating}
        isBackendOnline={isBackendOnline}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium ${
              notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-rose-200 shadow-rose-950/50'
                : 'bg-slate-900/95 border-cyan-800 text-cyan-200 shadow-cyan-950/50'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {(activeTab === 'home' || activeTab === 'dashboard') && (
          <DashboardPage
            simulationStatus={simulationStatus}
            energySummary={energySummary}
            energyHistory={energyHistory}
            householdsData={householdsData}
            tradesData={tradesData}
            blockchainSummary={blockchainSummary}
            blockchainBlocks={blockchainBlocks}
            currentUser={currentUser}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
            onResetSimulation={handleResetSimulation}
            onStepSimulation={handleStepSimulation}
            isOperating={isOperating}
            autoPlaying={autoPlaying}
            onToggleAutoPlay={handleToggleAutoPlay}
            setActiveTab={setActiveTab}
            onSelectHouseholdById={handleSelectHouseholdById}
            onSelectBlock={(b) => setSelectedBlock(b)}
          />
        )}

        {activeTab === 'energy' && (
          <EnergyPage
            simulationStatus={simulationStatus}
            energySummary={energySummary}
            energyHistory={energyHistory}
            householdsData={householdsData}
            currentUser={currentUser}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
            onResetSimulation={handleResetSimulation}
            onStepSimulation={handleStepSimulation}
            isOperating={isOperating}
            autoPlaying={autoPlaying}
            onToggleAutoPlay={handleToggleAutoPlay}
            onSelectHouseholdById={handleSelectHouseholdById}
          />
        )}

        {activeTab === 'trading' && (
          <TradingPage
            simulationStatus={simulationStatus}
            tradesData={tradesData}
            householdsData={householdsData}
            blockchainBlocks={blockchainBlocks}
            currentUser={currentUser}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
            onResetSimulation={handleResetSimulation}
            onStepSimulation={handleStepSimulation}
            onRunTradingAuction={handleRunTradingAuction}
            isOperating={isOperating}
            autoPlaying={autoPlaying}
            onToggleAutoPlay={handleToggleAutoPlay}
            onSelectHouseholdById={handleSelectHouseholdById}
            onSelectBlock={(b) => setSelectedBlock(b)}
          />
        )}

        {(activeTab === 'records' || activeTab === 'blockchain') && (
          <BlockchainPage
            simulationStatus={simulationStatus}
            blockchainSummary={blockchainSummary}
            blockchainBlocks={blockchainBlocks}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
            onResetSimulation={handleResetSimulation}
            onStepSimulation={handleStepSimulation}
            onValidateBlockchain={handleValidateBlockchain}
            isOperating={isOperating}
            autoPlaying={autoPlaying}
            onToggleAutoPlay={handleToggleAutoPlay}
            onSelectHouseholdById={handleSelectHouseholdById}
          />
        )}

        {activeTab === 'security' && (
          <SecurityPage />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            showNotification={showNotification}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
            onSwitchToParticipant={() => setActiveTab('home')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            showNotification={showNotification}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        initialMode={authInitialMode}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          showNotification(`Signed in as ${user.username} (${user.role})`);
          if (user.role?.toUpperCase() === 'ADMIN') {
            setActiveTab('admin');
          }
        }}
        onLogout={handleLogout}
      />

      {/* Modal if a household is selected in any view */}
      {selectedHousehold && (
        <HouseholdModal
          household={selectedHousehold}
          onClose={() => setSelectedHousehold(null)}
        />
      )}

      {/* Modal if a blockchain block is selected in any view */}
      {selectedBlock && (
        <BlockModal
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          onSelectHouseholdById={handleSelectHouseholdById}
        />
      )}

      {/* Platform Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060a14] py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-semibold text-slate-400">SecureTwinGrid Microgrid Software Simulation</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>P2P Clean Energy Community</span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-medium">Digital Twin Simulation</span>
            <span>&bull;</span>
            <span className="text-slate-500">Pure Emulation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
