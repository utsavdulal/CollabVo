import { useState } from 'react';
import { api, setAdminToken } from './api.js';

export function useAdminAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('collavo-admin-token'));
  const [admin, setAdmin] = useState(() => {
    const raw = localStorage.getItem('collavo-admin-info');
    return raw ? JSON.parse(raw) : null;
  });

  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setAdminToken(data.accessToken);
    localStorage.setItem('collavo-admin-info', JSON.stringify(data.admin));
    setToken(data.accessToken);
    setAdmin(data.admin);
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setAdminToken(null);
    localStorage.removeItem('collavo-admin-info');
    setToken(null);
    setAdmin(null);
  };

  const checkSession = async () => {
    if (!localStorage.getItem('collavo-admin-token')) return false;
    try {
      const d = await api('/auth/me');
      setAdmin(d.admin);
      localStorage.setItem('collavo-admin-info', JSON.stringify(d.admin));
      return true;
    } catch {
      setAdminToken(null);
      localStorage.removeItem('collavo-admin-info');
      setToken(null);
      setAdmin(null);
      return false;
    }
  };

  return { token, admin, login, logout, checkSession, authed: !!token };
}
