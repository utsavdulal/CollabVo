import { useState, useEffect } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ShieldCheck, FileSearch, Users, Wallet, Lock, BarChart3, LogOut, Flag, Shield } from 'lucide-react';
import { useAdminAuth } from './lib/useAdminAuth.js';
import AdminLogin from './pages/AdminLogin.jsx';
import VerificationQueue from './pages/VerificationQueue.jsx';
import UserManagement from './pages/UserManagement.jsx';
import WalletManagement from './pages/WalletManagement.jsx';
import ProposalOverview from './pages/ProposalOverview.jsx';
import ReportsQueue from './pages/ReportsQueue.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Analytics from './pages/Analytics.jsx';

const NAV = [
  { to: '/verifications', label: 'Verification Queue', icon: FileSearch },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/escrows', label: 'Escrows', icon: Lock },
  { to: '/reports', label: 'Reports & Flags', icon: Flag },
  { to: '/audit-logs', label: 'Audit Logs', icon: Shield },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 }
];

function Shell({ onLogout }) {
  const { logout } = useAdminAuth();
  const location = useLocation();
  const current = NAV.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <ShieldCheck className="h-6 w-6 text-brand" />
          <div>
            <span className="font-extrabold text-gray-900">Collavo Ops</span>
            <p className="text-[10px] text-gray-400 font-mono">Developer Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 py-3 px-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={async () => { await logout(); onLogout?.(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
          {current?.label || 'Operations'}
        </p>
        <Routes>
          <Route path="/verifications" element={<VerificationQueue />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/wallet" element={<WalletManagement />} />
          <Route path="/escrows" element={<ProposalOverview />} />
          <Route path="/reports" element={<ReportsQueue />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/verifications" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { authed, checkSession } = useAdminAuth();
  const [freshAuthed, setFreshAuthed] = useState(authed);
  const [checking, setChecking] = useState(authed);

  useEffect(() => {
    if (!authed) return;
    checkSession().then((valid) => {
      setFreshAuthed(valid);
      setChecking(false);
    });
  }, [authed, checkSession]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Restoring session...</p>
      </div>
    );
  }

  if (!freshAuthed) {
    return <AdminLogin onLogin={() => setFreshAuthed(true)} />;
  }

  return <Shell onLogout={() => setFreshAuthed(false)} />;
}
