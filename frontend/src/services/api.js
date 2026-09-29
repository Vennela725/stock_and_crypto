const rawBaseUrl = (import.meta.env.VITE_API_URL || '/api').trim();
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const getAuthHeader = () => {
  const token = localStorage.getItem('marketboard_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('marketboard_token');
    }
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Assets
  getAssets: (type = 'all', search = '') => {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (search) params.append('search', search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/assets${queryString}`);
  },
  getAssetBySymbol: (symbol) => request(`/assets/symbol/${symbol}`),

  // Portfolio
  getPortfolio: () => request('/portfolio'),
  addOrUpdateHolding: (data) => request('/portfolio/holdings', { method: 'POST', body: JSON.stringify(data) }),
  updateHolding: (assetId, data) => request(`/portfolio/holdings/${assetId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeHolding: (assetId) => request(`/portfolio/holdings/${assetId}`, { method: 'DELETE' }),

  // Orders
  createOrder: (orderData) => request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  getOrders: () => request('/orders'),

  // Watchlist
  getWatchlist: () => request('/watchlist'),
  addToWatchlist: (assetId) => request(`/watchlist/${assetId}`, { method: 'POST' }),
  removeFromWatchlist: (assetId) => request(`/watchlist/${assetId}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: () => request('/alerts'),
  createAlert: (alertData) => request('/alerts', { method: 'POST', body: JSON.stringify(alertData) }),
  updateAlert: (id, data) => request(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAlert: (id) => request(`/alerts/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  // Wallet
  getWallet: () => request('/wallet'),
  deposit: (data) => request('/wallet/deposit', { method: 'POST', body: JSON.stringify(data) }),
  withdraw: (data) => request('/wallet/withdraw', { method: 'POST', body: JSON.stringify(data) }),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  updateAdminUserStatus: (id, status) => request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getAdminOrders: () => request('/admin/orders'),
};
