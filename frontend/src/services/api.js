const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

let authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('securetwingrid_token') : null;

export const setAuthToken = (token) => {
  authToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('securetwingrid_token', token);
    else localStorage.removeItem('securetwingrid_token');
  }
};

export const getStoredToken = () => authToken;

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.detail) {
          errorMsg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
        }
      } catch {
        if (errorBody) errorMsg += ` - ${errorBody}`;
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (err) {
    console.error(`API error for [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => fetchJson('/health'),

  // Simulation
  getSimulationStatus: () => fetchJson('/api/v1/simulation/status'),
  startSimulation: (params = {}) =>
    fetchJson('/api/v1/simulation/start', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  stopSimulation: () =>
    fetchJson('/api/v1/simulation/stop', {
      method: 'POST',
    }),
  resetSimulation: (numHouseholds = 100, randomSeed = 42) =>
    fetchJson(`/api/v1/simulation/reset?num_households=${numHouseholds}&random_seed=${randomSeed}`, {
      method: 'POST',
    }),

  // Households
  getHouseholds: (status = null) => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return fetchJson(`/api/v1/houses${query}`);
  },
  getHousehold: (householdId) => fetchJson(`/api/v1/houses/${encodeURIComponent(householdId)}`),

  // Energy
  getEnergySummary: () => fetchJson('/api/v1/energy/summary'),
  getEnergyHistory: () => fetchJson('/api/v1/energy/history'),

  // Trading & Trades
  getTrades: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.seller_id) queryParams.append('seller_id', params.seller_id);
    if (params.buyer_id) queryParams.append('buyer_id', params.buyer_id);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    const qs = queryParams.toString();
    return fetchJson(`/api/v1/trades${qs ? `?${qs}` : ''}`);
  },
  getTrade: (tradeId) => fetchJson(`/api/v1/trades/${encodeURIComponent(tradeId)}`),
  runTradingAuction: (params = {}) =>
    fetchJson('/api/v1/trading/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Blockchain Ledger & Explorer
  getBlockchainSummary: () => fetchJson('/api/v1/blockchain'),
  getBlockchainBlocks: () => fetchJson('/api/v1/blockchain/blocks'),
  getBlockchainBlock: (index) => fetchJson(`/api/v1/blockchain/blocks/${index}`),
  validateBlockchain: () => fetchJson('/api/v1/blockchain/validate'),

  // Authentication & Cryptographic Identity
  register: (payload) =>
    fetchJson('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: async (payload) => {
    const res = await fetchJson('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },
  getMe: () => fetchJson('/api/v1/auth/me'),
  logout: () => {
    setAuthToken(null);
  },

  // Security, Replay Defense & Attack Simulation
  getSecurityEvents: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.event_type) queryParams.append('event_type', params.event_type);
    if (params.sender_id) queryParams.append('sender_id', params.sender_id);
    if (params.status) queryParams.append('status', params.status);
    if (params.severity) queryParams.append('severity', params.severity);
    const qs = queryParams.toString();
    return fetchJson(`/api/v1/security/events${qs ? `?${qs}` : ''}`);
  },
  getSecurityStats: () => fetchJson('/api/v1/security/stats'),
  getReplayProtectionStatus: () => fetchJson('/api/v1/security/replay-protection/status'),
  validateSignedTransaction: (payload) =>
    fetchJson('/api/v1/security/validate-transaction', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  simulateReplayAttack: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.sender_id) queryParams.append('sender_id', params.sender_id);
    if (params.recipient_id) queryParams.append('recipient_id', params.recipient_id);
    if (params.energy_kwh) queryParams.append('energy_kwh', params.energy_kwh);
    if (params.price_per_kwh) queryParams.append('price_per_kwh', params.price_per_kwh);
    const qs = queryParams.toString();
    return fetchJson(`/api/v1/security/simulate-replay-attack${qs ? `?${qs}` : ''}`, {
      method: 'POST',
    });
  },
  resetSecurity: () =>
    fetchJson('/api/v1/security/reset', {
      method: 'POST',
    }),

  // Local Energy Community & Microgrid
  getCommunity: () => fetchJson('/api/v1/community'),
  getCommunitySummary: () => fetchJson('/api/v1/community/summary'),
  getCommunityHouseholds: (status = null) => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return fetchJson(`/api/v1/community/households${query}`);
  },
  getCommunityEnergySummary: () => fetchJson('/api/v1/community/energy-summary'),
  getCommunityTrades: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.seller_id) queryParams.append('seller_id', params.seller_id);
    if (params.buyer_id) queryParams.append('buyer_id', params.buyer_id);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    const qs = queryParams.toString();
    return fetchJson(`/api/v1/community/trades${qs ? `?${qs}` : ''}`);
  },

  // Admin & Platform Management Endpoints (RBAC Protected)
  getAdminDashboard: () => fetchJson('/api/v1/admin/dashboard'),
  getAdminUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.approval_status) queryParams.append('approval_status', params.approval_status);
    const qs = queryParams.toString();
    return fetchJson(`/api/v1/admin/users${qs ? `?${qs}` : ''}`);
  },
  getPendingRegistrations: () => fetchJson('/api/v1/admin/pending-registrations'),
  approveUser: (userId, reason = 'Administrator community admission approval') =>
    fetchJson(`/api/v1/admin/users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  rejectUser: (userId, reason = 'Administrator rejection') =>
    fetchJson(`/api/v1/admin/users/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  updateUserStatus: (userId, status, reason = '') =>
    fetchJson(`/api/v1/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    }),
  getAdminCommunity: () => fetchJson('/api/v1/admin/community'),
  updateAdminCommunityConfig: (configPayload) =>
    fetchJson('/api/v1/admin/community/config', {
      method: 'POST',
      body: JSON.stringify(configPayload),
    }),
  getAdminEnergy: () => fetchJson('/api/v1/admin/energy'),
  getAdminTrades: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.seller_id) queryParams.append('seller_id', params.seller_id);
    if (params.buyer_id) queryParams.append('buyer_id', params.buyer_id);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    const qs = queryParams.toString();
    return fetchJson(`/api/v1/admin/trades${qs ? `?${qs}` : ''}`);
  },
  getAdminBlockchain: () => fetchJson('/api/v1/admin/blockchain'),
  validateBlockchainAdmin: () =>
    fetchJson('/api/v1/admin/blockchain/validate', {
      method: 'POST',
    }),
  getAdminSecurity: () => fetchJson('/api/v1/admin/security'),
  simulateAttackAdmin: (attackType = 'REPLAY', targetId = null, parameters = {}) =>
    fetchJson('/api/v1/admin/security/simulate-attack', {
      method: 'POST',
      body: JSON.stringify({
        attack_type: attackType,
        target_id: targetId,
        parameters,
      }),
    }),
  getAdminPrivacy: () => fetchJson('/api/v1/admin/privacy'),
  getAdminAnalytics: () => fetchJson('/api/v1/admin/analytics'),
  getAdminAuditLogs: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.action) queryParams.append('action', params.action);
    if (params.admin_id) queryParams.append('admin_id', params.admin_id);
    if (params.result) queryParams.append('result', params.result);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    const qs = queryParams.toString();
    return fetchJson(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },
  adminStartSimulation: (params = null) => {
    let query = '';
    if (typeof params === 'number') {
      query = `?steps=${params}`;
    } else if (params && typeof params === 'object') {
      const qp = new URLSearchParams();
      if (params.steps !== undefined && params.steps !== null) qp.append('steps', params.steps);
      if (params.continuous !== undefined) qp.append('continuous', params.continuous);
      if (params.speed_ms !== undefined) qp.append('speed_ms', params.speed_ms);
      const qs = qp.toString();
      if (qs) query = `?${qs}`;
    }
    return fetchJson(`/api/v1/admin/simulation/start${query}`, { method: 'POST' });
  },
  adminStopSimulation: () => fetchJson('/api/v1/admin/simulation/stop', { method: 'POST' }),
  adminResetSimulation: (numHouseholds = null, randomSeed = null) => {
    const params = new URLSearchParams();
    if (numHouseholds) params.append('num_households', numHouseholds);
    if (randomSeed) params.append('random_seed', randomSeed);
    const qs = params.toString();
    return fetchJson(`/api/v1/admin/simulation/reset${qs ? `?${qs}` : ''}`, { method: 'POST' });
  },
};

export default api;



