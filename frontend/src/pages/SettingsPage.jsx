import React, { useState } from 'react';
import {
  Settings,
  User,
  Shield,
  Key,
  Bell,
  Sliders,
  Download,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Sparkles
} from 'lucide-react';

export default function SettingsPage({ currentUser, onOpenAuthModal, showNotification }) {
  const [showKey, setShowKey] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefreshRate, setAutoRefreshRate] = useState('4');
  const [energyUnit, setEnergyUnit] = useState('kwh');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    if (showNotification) {
      showNotification('Preferences saved successfully.');
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportData = () => {
    const data = {
      user: currentUser?.username || 'Guest',
      role: currentUser?.role || 'USER',
      timestamp: new Date().toISOString(),
      system: 'SecureTwinGrid Microgrid Software Simulation',
      status: 'Active',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securetwingrid-settings-${currentUser?.username || 'user'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (showNotification) {
      showNotification('Settings and profile data exported.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your household profile, notification preferences, and display settings
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Preferences Saved ✓</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Profile & Security Identity */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Profile Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Household Account</span>
            </div>

            <div className="flex items-center gap-3.5 pt-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-cyan-900/40">
                {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="text-base font-bold text-white">
                  {currentUser?.username || 'Guest Household'}
                </div>
                <div className="text-xs text-slate-400">
                  {currentUser?.email || 'participant@securetwingrid.local'}
                </div>
                <span className="inline-block mt-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  {currentUser?.role || 'USER'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Account Status</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active & Verified
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Community Node</span>
                <span className="text-slate-200 font-mono">
                  {currentUser?.household_id || 'Home 14 (Prosumer)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Access Role</span>
                <span className="text-slate-200">
                  {currentUser?.role === 'ADMIN' ? 'Grid Administrator' : 'Community Participant'}
                </span>
              </div>
            </div>

            {!currentUser && (
              <button
                onClick={onOpenAuthModal}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition"
              >
                Sign In to Your Account
              </button>
            )}
          </div>

          {/* Security Identity Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Security Identity</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showKey ? 'Hide' : 'View'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Your energy trades and bids are cryptographically signed using your unique identity key.
            </p>

            {showKey ? (
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-slate-300 break-all space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Public Verification Key</div>
                <div className="text-emerald-400">
                  {currentUser?.public_key || 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7hR... (ECC-P256)'}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Security keys active & protected ✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preferences Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSavePreferences} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Display & Application Preferences</span>
            </div>

            {/* Grid of Settings */}
            <div className="space-y-4">
              {/* Auto-Refresh Rate */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <div className="text-sm font-medium text-white">Live Update Speed</div>
                  <div className="text-xs text-slate-400">How frequently the simulation screen updates with new data</div>
                </div>
                <select
                  value={autoRefreshRate}
                  onChange={(e) => setAutoRefreshRate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 outline-none"
                >
                  <option value="2">2 seconds (Fast)</option>
                  <option value="4">4 seconds (Normal)</option>
                  <option value="8">8 seconds (Relaxed)</option>
                </select>
              </div>

              {/* Energy Measurement Unit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <div className="text-sm font-medium text-white">Measurement Units</div>
                  <div className="text-xs text-slate-400">Display unit for solar generation, consumption, and trades</div>
                </div>
                <select
                  value={energyUnit}
                  onChange={(e) => setEnergyUnit(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 outline-none"
                >
                  <option value="kwh">Kilowatt-hours (kWh / kW)</option>
                  <option value="mwh">Megawatt-hours (MWh / MW)</option>
                </select>
              </div>

              {/* Real-time Notifications */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-950/80 text-cyan-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Trade & Security Alerts</div>
                    <div className="text-xs text-slate-400">Show a notification message when trades execute</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>

            {/* Save Buttons & Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleExportData}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Profile</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </form>

          {/* Privacy Notice */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Participant Privacy</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              In this simulated digital twin community, your household keys are kept securely on your client. Only authorized trade requests are exchanged across the virtual grid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
