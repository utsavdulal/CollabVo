import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../lib/useAdminAuth.js';

export default function AdminLogin({ onLogin }) {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl bg-brand-50 p-3 text-brand-600"><ShieldCheck className="h-8 w-8" /></div>
          <h1 className="mt-3 text-lg font-bold">Collavo Ops</h1>
          <p className="text-xs text-gray-500">Restricted admin access</p>
        </div>
        <div className="mt-6 space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="Admin email" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Password" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
