import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  User,
  Mail,
  Key,
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  LogIn,
  UserPlus,
  ShieldAlert,
  Building,
  Home,
  Phone,
  Ticket
} from 'lucide-react';
import api from '../services/api';

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
  initialMode = 'login',
}) {
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'register');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [community, setCommunity] = useState('Green Valley Community');
  const [unit, setUnit] = useState('Building A / A-204');
  const [phone, setPhone] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    setIsRegisterMode(initialMode === 'register');
    setError(null);
    setRegistrationResult(null);
    setPendingCredentials(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const payload = {
          full_name: fullName.trim() || undefined,
          username: username.trim(),
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
          community: community.trim(),
          unit: unit.trim(),
          phone: phone.trim() || undefined,
          invitation_code: invitationCode.trim() || undefined,
          role: 'USER',
        };

        const res = await api.register(payload);
        setRegistrationResult(res);
        setPendingCredentials({ username: username.trim(), password });
      } else {
        const res = await api.login({
          username: username.trim() || undefined,
          email: email.trim() || undefined,
          password,
        });
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeKey = async () => {
    if (pendingCredentials) {
      try {
        setLoading(true);
        const loginRes = await api.login(pendingCredentials);
        onAuthSuccess(loginRes.user);
      } catch (err) {
        console.warn('Auto-login after registration:', err);
      } finally {
        setLoading(false);
      }
    }
    setRegistrationResult(null);
    setPendingCredentials(null);
    onClose();
  };

  const copyPrivateKey = () => {
    if (registrationResult?.private_key_pem) {
      navigator.clipboard.writeText(registrationResult.private_key_pem);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // If already authenticated and not viewing new registration result
  if (currentUser && !registrationResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">{currentUser.username}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    {currentUser.role} Role
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    currentUser.status === 'ACTIVE'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {currentUser.status}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Community</span>
              <span className="text-slate-200 font-medium">{currentUser.community || 'Green Valley Community'}</span>
            </div>
            {currentUser.unit && (
              <div>
                <span className="text-slate-500 block mb-0.5">Assigned Unit</span>
                <span className="text-slate-200 font-medium">{currentUser.unit}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 block mb-0.5">Email</span>
              <span className="text-slate-200 font-mono">{currentUser.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Registered Public ECC Key</span>
              <code className="block p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 break-all max-h-20 overflow-y-auto">
                {currentUser.public_key}
              </code>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold transition"
            >
              Sign Out
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Registration Key Display Step
  if (registrationResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Key className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white">Application Submitted & Keypair Generated</h3>
                <p className="text-xs text-slate-400">ECC SECP256R1 (NIST P-256)</p>
              </div>
            </div>
            <button onClick={handleAcknowledgeKey} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-5 h-5 shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <strong>Registration Status: PENDING</strong>. Your membership request has been submitted to the community administrator for approval.
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Your One-Time Private Key (PEM)</span>
              <button
                onClick={copyPrivateKey}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition text-xs font-semibold"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
              </button>
            </div>
            <code className="block p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-200 break-all select-all max-h-32 overflow-y-auto">
              {registrationResult.private_key_pem}
            </code>
          </div>

          <button
            onClick={handleAcknowledgeKey}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Entering Community...' : 'I Have Saved My Key • Continue to Status Page'}
          </button>
        </div>
      </div>
    );
  }

  // Normal Login / Registration Form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isRegisterMode ? 'Community Registration' : 'Sign In to SecureTwinGrid'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRegisterMode ? 'Apply for Local Energy Community Membership' : 'Closed Local Energy Community'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {isRegisterMode && (
            <div>
              <label className="block text-slate-400 font-medium mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Meenakshi Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              {isRegisterMode ? 'Username (Handle)' : 'Email or Username'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder={isRegisterMode ? 'meenakshi_prosumer' : 'user@microgrid.edu or username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="meenakshi@greenvalley.example"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          )}

          {isRegisterMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Community</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-cyan-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-2 py-2 text-cyan-300 text-xs focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Household / Unit</label>
                <div className="relative">
                  <Home className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Building A / A-204"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-2 py-2 text-emerald-300 text-xs focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {isRegisterMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-2 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Invite Code (Optional)</label>
                <div className="relative">
                  <Ticket className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="GV-2026-COMM"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-2 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-slate-400 font-medium mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          )}

          {isRegisterMode && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              🔒 <strong>Closed Community Policy:</strong> Registration places your account into <em>Pending Approval</em>. You will gain access once approved by the administrator.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 active:from-cyan-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
          >
            {isRegisterMode ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'Processing...' : isRegisterMode ? 'Submit Community Application' : 'Sign In'}</span>
          </button>
        </form>

        {/* Toggle Mode & Demo Helper */}
        <div className="pt-3 border-t border-slate-800 space-y-3 text-center text-xs text-slate-400">
          <div>
            {isRegisterMode ? (
              <span>
                Already a member?{' '}
                <button
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError(null);
                  }}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New resident / prosumer?{' '}
                <button
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError(null);
                  }}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Apply for Membership
                </button>
              </span>
            )}
          </div>

          {/* Quick Demo Autofill Bar */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-mono">Demo Auto-Fill:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setUsername('sys_admin');
                  setPassword('AdminStrongPassword999!');
                  setError(null);
                }}
                className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 font-mono"
              >
                Admin (sys_admin)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setUsername('bob_prosumer');
                  setPassword('UserStrongPassword123!');
                  setError(null);
                }}
                className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 font-mono"
              >
                Prosumer (bob)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
