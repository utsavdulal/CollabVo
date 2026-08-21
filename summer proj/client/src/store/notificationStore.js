import { create } from 'zustand';
import { api, getAccessToken } from '../lib/api.js';

export const useNotificationStore = create((set, get) => ({
  unread: 0,
  connected: false,
  _es: null,

  async fetchUnread() {
    try {
      const d = await api('/notifications');
      set({ unread: d.unread || 0 });
    } catch {}
  },

  connect() {
    if (get()._es) return;

    const token = getAccessToken();
    if (!token) return;

    const base = import.meta.env.VITE_API_URL || '/api';
    const es = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(token)}`);

    es.onmessage = (event) => {
      try {
        const data = event.data.trim();
        if (data === ':connected' || !data) return;
        set((s) => ({ unread: s.unread + 1 }));
      } catch {}
    };

    es.onerror = () => {
      es.close();
      set({ _es: null, connected: false });
      setTimeout(() => get().connect(), 5000);
    };

    es.onopen = () => {
      set({ connected: true });
    };

    set({ _es: es });
  },

  disconnect() {
    const es = get()._es;
    if (es) {
      es.close();
      set({ _es: null, connected: false });
    }
  },

  markAllRead() {
    set({ unread: 0 });
    api('/notifications/read', { method: 'POST' }).catch(() => {});
  }
}));
