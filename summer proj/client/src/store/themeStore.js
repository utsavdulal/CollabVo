import { create } from 'zustand';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('collavo-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark'; // Default to dark mode
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  initTheme() {
    const current = get().theme;
    if (current === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleTheme() {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('collavo-theme', next);
    } catch {}
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  }
}));
