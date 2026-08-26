import { NavLink, useNavigate } from 'react-router-dom';
import {
  Compass, FileText, MessageSquare, Bell, Wallet, Briefcase,
  Headphones, Scale, Settings, LogOut, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useNotificationStore } from '../../store/notificationStore.js';
import { Avatar } from '../ui/Avatar.jsx';
import { useState } from 'react';

const navItems = [
  { to: '/home', label: 'Explore', icon: Compass, end: true },
  { to: '/proposals', label: 'Proposals', icon: FileText },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/activity', label: 'Activity', icon: Bell, badge: true },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/work', label: 'Your Work', icon: Briefcase },
  { to: '/settings', label: 'Settings', icon: Settings }
];

const secondaryItems = [
  { to: '/support', label: 'Support', icon: Headphones },
  { to: '/legal', label: 'Legal', icon: Scale }
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { unread } = useNotificationStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onLogout = async () => {
    setBusy(true);
    await logout();
    navigate('/');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] lg:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-zinc-100 dark:border-[#262a3e] px-6">
        <img src="/logo.png" alt="Collavo" className="h-8 w-8 object-contain" />
        <span className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">Collavo</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Navigation</p>
        {navItems.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-[#212538]/70 hover:text-zinc-900 dark:hover:text-white'
              }`
            }
          >
            <div className="relative shrink-0">
              <Icon className="h-4 w-4" />
              {badge && unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}

        <p className="px-3 pt-6 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Company</p>
        {secondaryItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-100 dark:bg-[#202438] text-zinc-900 dark:text-white font-semibold'
                  : 'text-zinc-500 dark:text-[#8e95af] hover:bg-zinc-50 dark:hover:bg-[#161926] hover:text-zinc-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="border-t border-zinc-100 dark:border-[#262a3e] p-3.5">
        {user && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/profile/${user.id || user._id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/profile/${user.id || user._id}`);
              }
            }}
            className="flex cursor-pointer items-center justify-between rounded-xl bg-zinc-50 dark:bg-[#121522] p-2.5 transition-colors hover:bg-zinc-100 dark:hover:bg-[#212538] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            title="Open profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar user={user} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">{user.name || 'Account'}</p>
                  {user.verificationStatus === 'verified' && (
                    <ShieldCheck className="h-3 w-3 text-blue-600 shrink-0" />
                  )}
                </div>
                <p className="truncate text-[10px] text-zinc-500 dark:text-[#8e95af] capitalize">{user.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              disabled={busy}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-[#232542]/70 hover:text-zinc-700 dark:hover:text-white transition-colors"
              title="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
