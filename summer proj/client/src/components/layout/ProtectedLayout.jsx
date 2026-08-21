import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import { useNotificationStore } from '../../store/notificationStore.js';
import { TopBar } from './TopBar.jsx';
import { BottomNav } from './BottomNav.jsx';
import { Sidebar } from './Sidebar.jsx';
import { ProfilePanel } from './ProfilePanel.jsx';
import { MenuPanel } from './MenuPanel.jsx';

export function ProtectedLayout() {
  const { user } = useAuthStore();
  const { initTheme } = useThemeStore();
  const { fetchUnread, connect, disconnect } = useNotificationStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initTheme();
    fetchUnread();
    connect();
    return () => disconnect();
  }, [initTheme, fetchUnread, connect, disconnect]);

  if (!user) {
    navigate('/auth', { replace: true });
    return null;
  }

  const userId = user.id || user._id;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0c0e17] text-zinc-900 dark:text-white pb-20 md:pb-0 transition-colors duration-150">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar
          onProfileClick={() => navigate(`/profile/${userId}`)}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="mx-auto w-full max-w-5xl px-4 pt-4 md:px-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      <MenuPanel open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
