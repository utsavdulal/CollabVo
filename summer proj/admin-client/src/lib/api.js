const BASE = import.meta.env.VITE_ADMIN_BASE;

if (!BASE) {
  throw new Error('VITE_ADMIN_BASE must be set in admin-client/.env');
}

let accessToken = localStorage.getItem('collavo-admin-token') || null;
let refreshPromise = null;

export function getAdminToken() {
  return accessToken;
}

export function setAdminToken(token) {
  accessToken = token;
  if (token) localStorage.setItem('collavo-admin-token', token);
  else localStorage.removeItem('collavo-admin-token');
}

async function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed');
        const data = await res.json();
        setAdminToken(data.accessToken);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res = await fetch(`${BASE}${path}`, { method, headers, body: payload, credentials: 'include' });

  if (res.status === 401 && accessToken) {
    const refreshed = await refreshTokens().catch(() => null);
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${BASE}${path}`, { method, headers, body: payload, credentials: 'include' });
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}
