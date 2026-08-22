import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useThemeStore } from './store/themeStore.js';
import { ProtectedLayout } from './components/layout/ProtectedLayout.jsx';
import Landing from './pages/Landing.jsx';
import RoleSelect from './pages/RoleSelect.jsx';
import AuthScreen from './pages/AuthScreen.jsx';
import ProfileSetup from './pages/ProfileSetup.jsx';
import VerifyBusiness from './pages/VerifyBusiness.jsx';
import Home from './pages/Home.jsx';
import Proposals from './pages/Proposals.jsx';
import ProposalDetail from './pages/ProposalDetail.jsx';
import Messages from './pages/Messages.jsx';
import ChatDetail from './pages/ChatDetail.jsx';
import Activity from './pages/Activity.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Wallet from './pages/Wallet.jsx';
import YourWork from './pages/YourWork.jsx';
import Support from './pages/Support.jsx';
import Legal from './pages/Legal.jsx';
import Settings from './pages/Settings.jsx';
import ProfileView from './pages/ProfileView.jsx';
import { Spinner } from './components/ui/Spinner.jsx';

function RequireAuth({ children }) {
  const { user, tokenLoaded, isAuthed } = useAuthStore();
  const location = useLocation();

  if (!tokenLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-[#0c0e17]">
        <Spinner />
      </div>
    );
  }

  if (!user || !isAuthed()) {
    return <Navigate to="/auth" state={{ redirect: location.pathname }} replace />;
  }

  if (!user.name && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

function PublicOnly({ children }) {
  const { user, tokenLoaded, isAuthed } = useAuthStore();

  if (!tokenLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-[#0c0e17]">
        <Spinner />
      </div>
    );
  }

  if (user && isAuthed() && user.name) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
    bootstrap();
  }, [bootstrap, initTheme]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicOnly>
            <Landing />
          </PublicOnly>
        }
      />
      <Route
        path="/role"
        element={
          <PublicOnly>
            <RoleSelect />
          </PublicOnly>
        }
      />
      <Route
        path="/auth"
        element={
          <PublicOnly>
            <AuthScreen />
          </PublicOnly>
        }
      />
      <Route
        path="/setup"
        element={
          <RequireAuth>
            <ProfileSetup />
          </RequireAuth>
        }
      />
      <Route
        path="/verify"
        element={
          <RequireAuth>
            <VerifyBusiness />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <ProtectedLayout />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/proposal/:id" element={<ProposalDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/work" element={<YourWork />} />
        <Route path="/support" element={<Support />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile/:id" element={<ProfileView />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
