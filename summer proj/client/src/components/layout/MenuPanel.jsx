import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Link2, Wallet, Briefcase, Bell, Headphones, Scale, Settings, LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

export function MenuPanel({ open, onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!open || !user) return null;

  const items = [
    { label: 'Connected Socials', icon: Link2, path: '/settings#socials' },
    { label: 'Wallet & Escrow', icon: Wallet, path: '/wallet' },
    { label: 'Your Work', icon: Briefcase, path: '/work' },
    { label: 'Notifications', icon: Bell, path: '/activity' },
    { label: 'Support & FAQs', icon: Headphones, path: '/support' },
    { label: 'Legal & Terms', icon: Scale, path: '/legal' },
    { label: 'Settings', icon: Settings, path: '/settings' }
  ];

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const onLogout = async () => {
    setBusy(true);
    await logout();
    onClose();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-white dark:bg-[#1a1d2d] shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-[#262a3e]">
            <p className="font-bold text-sm text-zinc-900 dark:text-white">{user.name || 'Account Menu'}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#212538] hover:text-zinc-700 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="py-2 px-2">
            {items.map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                type="button"
                onClick={() => go(path)}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-[#161926] hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <Icon className="h-4 w-4 text-zinc-400" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-[#262a3e] p-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={busy}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{busy ? 'Logging out...' : 'Log out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
