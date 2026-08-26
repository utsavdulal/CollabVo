import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/api.js';
import { ShieldCheck, ArrowRight, UserCheck, Sparkles } from 'lucide-react';

export default function AuthScreen() {
  const { login, register, setToken, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('creator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let user;
      if (mode === 'signin') {
        user = await login(email, password);
      } else {
        user = await register(email, password, role);
      }
      navigate(user.name ? '/home' : '/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleToken = async () => {
    const token = params.get('access_token');
    if (!token) return;
    setToken(token);
    try {
      const { user } = await api('/auth/me');
      setUser(user);
      navigate(user.name ? '/home' : '/setup');
    } catch {
      /* stay on auth */
    }
  };

  useEffect(() => {
    handleGoogleToken();
  }, []);

  const fillDemo = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setBusy(true);
    try {
      const user = await login(demoEmail, demoPass);
      navigate(user.name ? '/home' : '/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#0c0e17] text-zinc-900 dark:text-white">
      <header className="border-b border-zinc-100 dark:border-[#262a3e] px-6 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Collavo" className="h-7 w-7 object-contain" />
            <span className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">Collavo</span>
          </Link>
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            {mode === 'signin' ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {mode === 'signin' ? 'Sign in to Collavo' : 'Create your account'}
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af]">
            {mode === 'signin'
              ? 'Access your proposals, campaigns, and wallet'
              : 'Join verified brands and content creators'}
          </p>
        </div>

        {/* Demo Login Quick Selection */}
        {mode === 'signin' && (
          <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50/70 dark:bg-[#161926]/70 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-zinc-900 dark:text-white" />
              <span>1-Click Demo Login</span>
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('demo.business@collavo.app', 'Demo@1234')}
                className="flex flex-col items-start rounded-xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-2.5 text-left hover:border-zinc-900 dark:hover:border-[#6366f1] hover:shadow-xs transition-all"
              >
                <span className="text-xs font-bold text-zinc-900 dark:text-white">Demo Business</span>
                <span className="text-[10px] text-zinc-400 dark:text-[#8e95af]">Verified · ₹5k balance</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('demo.creator@collavo.app', 'Demo@1234')}
                className="flex flex-col items-start rounded-xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-2.5 text-left hover:border-zinc-900 dark:hover:border-[#6366f1] hover:shadow-xs transition-all"
              >
                <span className="text-xs font-bold text-zinc-900 dark:text-white">Demo Creator</span>
                <span className="text-[10px] text-zinc-400 dark:text-[#8e95af]">Active Creator</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['creator', 'business'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl border py-2 text-xs font-bold capitalize transition-colors ${
                      role === r
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-[#6366f1] dark:bg-[#6366f1] dark:text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#161926] dark:text-zinc-300 dark:hover:border-[#3a4060]'
                    }`}
                  >
                    {r === 'business' ? 'Brand / Business' : 'Creator'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Password</label>
            </div>
            <input
              type="password"
              required
              minLength={mode === 'signup' ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-[#262a3e]" />
          <span className="text-[11px] font-medium text-zinc-400 dark:text-[#8e95af] uppercase">or</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-[#262a3e]" />
        </div>

        <a
          href="/api/auth/google"
          className="btn-secondary w-full py-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-[#8e95af]">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-bold text-zinc-900 dark:text-white hover:underline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </main>
    </div>
  );
}
