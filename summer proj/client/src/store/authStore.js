import { create } from 'zustand';
import { api, setAccessToken, getAccessToken } from '../lib/api.js';

function getStoredSession() {
  try {
    const raw = localStorage.getItem('collavo-auth');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const stored = getStoredSession();

export const useAuthStore = create((set, get) => ({
  user: stored?.user || null,
  token: stored?.token || null,
  tokenLoaded: false,

  setToken(token) {
    setAccessToken(token);
    const user = get().user;
    const next = { user, token };
    try {
      localStorage.setItem('collavo-auth', JSON.stringify(next));
    } catch {}
    set(next);
  },

  setUser(user) {
    const token = get().token || getAccessToken();
    const next = { user, token };
    try {
      localStorage.setItem('collavo-auth', JSON.stringify(next));
    } catch {}
    set(next);
  },

  setSession(user, token) {
    setAccessToken(token);
    const next = { user, token };
    try {
      localStorage.setItem('collavo-auth', JSON.stringify(next));
    } catch {}
    set(next);
  },

  async bootstrap() {
    const current = getStoredSession();
    const token = current?.token || null;
    const user = current?.user || null;

    if (token) {
      setAccessToken(token);
      set({ token, user });
    }

    if (!token) {
      set({ tokenLoaded: true, user: null, token: null });
      return;
    }

    try {
      const { user: freshUser } = await api('/auth/me');
      get().setSession(freshUser, token);
    } catch {
      try {
        const { user: freshUser } = await api('/auth/me');
        get().setSession(freshUser, token);
      } catch {
        localStorage.removeItem('collavo-auth');
        setAccessToken(null);
        set({ user: null, token: null });
      }
    } finally {
      set({ tokenLoaded: true });
    }
  },

  async login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    get().setSession(data.user, data.accessToken);
    return data.user;
  },

  async register(email, password, role) {
    const data = await api('/auth/register', { method: 'POST', body: { email, password, role } });
    get().setSession(data.user, data.accessToken);
    return data.user;
  },

  async logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('collavo-auth');
    setAccessToken(null);
    set({ user: null, token: null });
  },

  isAuthed() {
    const state = get();
    return (!!state.token || !!getAccessToken()) && !!state.user;
  }
}));
