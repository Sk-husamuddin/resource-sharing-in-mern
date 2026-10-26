import axios from 'axios';

/**
 * Axios instance — uses Vite proxy so no hard-coded URL needed.
 * withCredentials: true ensures session cookies are sent on every request.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor: surface server error messages automatically ──────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const resourceApi = {
  getAll: (params) => api.get('/resources', { params }),
  getOne: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.patch(`/resources/${id}`, data),
  remove: (id) => api.delete(`/resources/${id}`),
};

// ── Lost & Found ──────────────────────────────────────────────────────────────
export const lostFoundApi = {
  getAll: (params) => api.get('/lost-found', { params }),
  getOne: (id) => api.get(`/lost-found/${id}`),
  create: (data) => api.post('/lost-found', data),
  update: (id, data) => api.patch(`/lost-found/${id}`, data),
  remove: (id) => api.delete(`/lost-found/${id}`),
};

// ── Claims ────────────────────────────────────────────────────────────────────
export const claimApi = {
  getAll: (params) => api.get('/claims', { params }),
  create: (data) => api.post('/claims', data),
  updateStatus: (id, data) => api.patch(`/claims/${id}`, data),
  remove: (id) => api.delete(`/claims/${id}`),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messageApi = {
  getAll: () => api.get('/messages'),
  getUnreadCount: () => api.get('/messages/unread-count'),
  send: (data) => api.post('/messages', data),
  markRead: (id) => api.patch(`/messages/${id}/read`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteResource: (id) => api.delete(`/admin/resources/${id}`),
  deleteLostFound: (id) => api.delete(`/admin/lost-found/${id}`),
  getClaims: () => api.get('/admin/claims'),
};

export default api;
