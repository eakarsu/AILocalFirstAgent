const API_BASE = 'http://localhost:4051/api';
const TOKEN_KEY = 'local_first_agent_token';
const USER_KEY = 'local_first_agent_user';

export { API_BASE };
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };
export const getStoredUser = () => { try { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
export const setStoredUser = (u) => { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} };
export function logout() { setToken(null); setStoredUser(null); if (typeof window !== 'undefined') window.location.assign('/login'); }
export function getRole() { return (getStoredUser()?.role || 'viewer').toLowerCase(); }
export function canWrite() { return ['commander', 'analyst'].includes(getRole()); }
export function isCommander() { return getRole() === 'commander'; }

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (res.status === 401 && !url.startsWith('/auth/login')) { logout(); throw new Error('Session expired'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function crud(base) {
  return {
    list: () => request(`/${base}`),
    get: (id) => request(`/${base}/${id}`),
    create: (data) => request(`/${base}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d) => request(`/${base}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id) => request(`/${base}/${id}`, { method: 'DELETE' }),
    bulkImport: (csv) => request(`/${base}/bulk-import`, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csv }),
    listAttachments: (id) => request(`/${base}/${id}/attachments`),
    uploadAttachment: async (id, file) => {
      const token = getToken();
      const form = new FormData(); form.append('file', file);
      const res = await fetch(`${API_BASE}/${base}/${id}/attachments`, {
        method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      return data;
    },
  };
}

export const login = (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/auth/me');

export const indexed_sourcesApi = crud('indexed-sources');
export const scheduled_macrosApi = crud('scheduled-macros');
export const agent_runsApi = crud('agent-runs');
export const on_device_modelsApi = crud('on-device-models');
export const privacy_audit_logApi = crud('privacy-audit-log');
export const file_index_entriesApi = crud('file-index-entries');

export const aiLocalTaskPlan = (body) => request('/ai/local-task-plan', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiFileSemanticSearch = (body) => request('/ai/file-semantic-search', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiScheduledMacro = (body) => request('/ai/scheduled-macro', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDraftReply = (body) => request('/ai/draft-reply', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiWeeklySummary = (body) => request('/ai/weekly-summary', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPrivacyClassifier = (body) => request('/ai/privacy-classifier', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiModelRouterSelect = (body) => request('/ai/model-router-select', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiConflictFinder = (body) => request('/ai/conflict-finder', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDailyDigest = (body) => request('/ai/daily-digest', { method: 'POST', body: JSON.stringify(body || {}) });

export const getAIHistory = (feature, limit = 25) => {
  const qs = new URLSearchParams({ ...(feature ? { feature } : {}), limit: String(limit) }).toString();
  return request(`/ai/history?${qs}`);
};
export const getAISamples = (feature) => {
  const qs = new URLSearchParams({ feature: feature || '' }).toString();
  return request(`/ai/samples?${qs}`);
};

export const getDashboardStats = () => request('/dashboard');

export const getNotifications = () => request('/notifications');
export const getUnreadNotifications = () => request('/notifications/unread');
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsRead = () => request('/notifications/mark-all-read', { method: 'POST' });

// ---- Custom Views (Sync) ----
export const getSyncTimeline = (hours = 48) => request(`/custom-views/sync-timeline?hours=${hours}`);
export const getConflictHeatmap = () => request('/custom-views/conflict-heatmap');
export const syncLogPdfUrl = (limit = 100) => `${API_BASE}/custom-views/sync-log.pdf?limit=${limit}`;
export async function downloadSyncLogPdf(limit = 100) {
  const token = getToken();
  const res = await fetch(syncLogPdfUrl(limit), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`PDF failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sync-log.pdf'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export const syncRulesApi = {
  list: () => request('/custom-views/rules'),
  create: (d) => request('/custom-views/rules', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/custom-views/rules/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/custom-views/rules/${id}`, { method: 'DELETE' }),
};

export const webhooksApi = {
  list: () => request('/webhooks'),
  create: (d) => request('/webhooks', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  test: (event, payload) => request('/webhooks/test', { method: 'POST', body: JSON.stringify({ event, payload }) }),
  deliveries: (id) => request(`/webhooks/${id}/deliveries`),
};
