import React, { useState } from 'react';
import {
  Clock,
  ShieldCheck,
  Building,
  Home,
  User,
  LogOut,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

export default function PendingApprovalPage({
  currentUser,
  onLogout,
  onUserUpdated,
  showNotification,
}) {
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const user = await api.getMe();
      if (onUserUpdated) onUserUpdated(user);
      if (user.status === 'ACTIVE' && user.approval_status === 'APPROVED') {
        if (showNotification) showNotification('Your account has been approved! Redirecting to dashboard...');
      } else {
        if (showNotification) showNotification('Account is still awaiting administrator review.');
      }
    } catch (err) {
      if (showNotification) showNotification('Could not refresh status.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const communityName = currentUser?.community || 'Green Valley Community';
  const unitName = currentUser?.unit || 'Building A / A-204';
  const fullName = currentUser?.full_name || currentUser?.username || 'Applicant';

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#090e1a]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                SecureTwinGrid
              </span>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Local Energy Community
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 max-w-xl mx-auto w-full animate-in fade-in duration-300">
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
          {/* Header Icon & Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-950/40">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Account Under Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your registration has been received and is waiting for community administrator approval.
            </p>
          </div>

          {/* Details Box */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/90 p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Applicant Name
              </span>
              <span className="font-semibold text-white">{fullName}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Email Address
              </span>
              <span className="font-mono text-slate-200">{currentUser?.email}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                Community
              </span>
              <span className="font-medium text-cyan-300">{communityName}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                Assigned Unit
              </span>
              <span className="font-semibold text-emerald-300">{unitName}</span>
            </div>

            <div className="flex items-center justify-between pt-1.5">
              <span className="text-slate-400">Account Status</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Pending Approval
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-center text-xs text-slate-400 leading-relaxed">
            Please try again after administrator approval. Once approved, your account will gain access to the energy dashboard.
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={checkStatus}
              disabled={isChecking}
              className="w-full sm:w-1/2 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full sm:w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060a14] py-4 text-xs text-slate-500 text-center mt-auto">
        Software Simulation • Research Project • SecureTwinGrid
      </footer>
    </div>
  );
}
