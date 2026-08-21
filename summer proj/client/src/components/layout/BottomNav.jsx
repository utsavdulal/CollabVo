import { NavLink } from 'react-router-dom';
import { Home, Briefcase, FileText, MessageSquare, Bell, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useNotificationStore } from '../../store/notificationStore.js';
import { useState } from 'react';
import { PostEventModal } from '../ui/PostEventModal.jsx';

export function BottomNav() {
  const { user } = useAuthStore();
  const { unread } = useNotificationStore();
  const isBusiness = user?.role === 'business';
  const [postOpen, setPostOpen] = useState(false);

  if (isBusiness) {
    return (
      <>
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-zinc-200 bg-white/95 px-2 backdrop-blur-lg dark:border-[#262a3e] dark:bg-[#121522]/95 lg:hidden">
          {/* Home */}
          <NavLink
            to="/home"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative ${
                isActive ? 'text-[#6366f1] dark:text-[#818cf8]' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className="h-5 w-5" />
                <span className="text-[10px] font-bold">Home</span>
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#6366f1] dark:bg-[#818cf8]" />
                )}
              </>
            )}
          </NavLink>

          {/* Events */}
          <NavLink
            to="/proposals"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative ${
                isActive ? 'text-[#6366f1] dark:text-[#818cf8]' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Briefcase className="h-5 w-5" />
                <span className="text-[10px] font-bold">Events</span>
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#6366f1] dark:bg-[#818cf8]" />
                )}
              </>
            )}
          </NavLink>

          {/* Center Floating Plus FAB */}
          <div className="relative -top-5 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setPostOpen(true)}
              className="flex h-13 w-13 items-center justify-center rounded-full bg-[#6366f1] text-white shadow-xl shadow-indigo-950/40 border-4 border-white dark:border-[#121522] hover:bg-[#4f46e5] transition-transform active:scale-95"
              aria-label="Create Event"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Messages */}
          <NavLink
            to="/messages"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative ${
                isActive ? 'text-[#6366f1] dark:text-[#818cf8]' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <MessageSquare className="h-5 w-5" />
                <span className="text-[10px] font-bold">Messages</span>
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#6366f1] dark:bg-[#818cf8]" />
                )}
              </>
            )}
          </NavLink>

          {/* Activity */}
          <NavLink
            to="/activity"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative ${
                isActive ? 'text-[#6366f1] dark:text-[#818cf8]' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold">Activity</span>
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#6366f1] dark:bg-[#818cf8]" />
                )}
              </>
            )}
          </NavLink>
        </nav>

        <PostEventModal
          open={postOpen}
          onClose={() => setPostOpen(false)}
          onCreated={() => window.location.reload()}
        />
      </>
    );
  }

  // Creator Bottom Nav
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-zinc-200 bg-white/95 px-4 backdrop-blur-lg dark:border-[#262a3e] dark:bg-[#121522]/95 lg:hidden">
      {[
        { to: '/home', label: 'Home', icon: Home },
        { to: '/proposals', label: 'Proposals', icon: FileText },
        { to: '/messages', label: 'Messages', icon: MessageSquare },
        { to: '/activity', label: 'Activity', icon: Bell, hasBadge: true }
      ].map(({ to, label, icon: Icon, hasBadge }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative ${
              isActive ? 'text-[#6366f1] dark:text-[#818cf8]' : 'text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <Icon className="h-5 w-5" />
                {hasBadge && unread > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold">{label}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#6366f1] dark:bg-[#818cf8]" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
