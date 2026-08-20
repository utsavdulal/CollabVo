import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

export default function RoleSelect() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [pendingRole, setPendingRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await register(email, password, pendingRole);
      navigate(user.name ? '/home' : '/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <header className="border-b border-zinc-100 px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button
            type="button"
            onClick={() => (pendingRole ? setPendingRole(null) : navigate('/'))}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Collavo" className="h-6 w-6 object-contain" />
            <span className="text-sm font-bold text-zinc-900">Collavo</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
        {!pendingRole ? (
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight text-center">
              How do you plan to use Collavo?
            </h1>
            <p className="mt-2 text-center text-xs text-zinc-500">
              Select the account type that best describes your goals.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPendingRole('creator')}
                className="group relative flex flex-col justify-between rounded-2xl border-2 border-zinc-200 bg-white p-5 text-left hover:border-zinc-900 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    <Camera className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-bold text-zinc-900">I'm a Creator</h2>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                    Collaborate with brands, get hired for campaigns, and receive verified escrow payouts.
                  </p>
                </div>
                <span className="mt-4 flex items-center gap-1 text-xs font-bold text-zinc-900 group-hover:underline">
                  Continue as Creator <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPendingRole('business')}
                className="group relative flex flex-col justify-between rounded-2xl border-2 border-zinc-200 bg-white p-5 text-left hover:border-zinc-900 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-bold text-zinc-900">I'm a Business</h2>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                    Post collaboration campaigns, discover creators by category/location, and manage deals.
                  </p>
                </div>
                <span className="mt-4 flex items-center gap-1 text-xs font-bold text-zinc-900 group-hover:underline">
                  Continue as Brand <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>

            <p className="mt-8 text-center text-xs text-zinc-500">
              Already have an account?{' '}
              <Link to="/auth" className="font-bold text-zinc-900 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <div>
            <div className="text-center">
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold text-zinc-700 capitalize">
                {pendingRole} Account
              </span>
              <h1 className="mt-3 text-2xl font-extrabold text-zinc-900 tracking-tight">
                Create your account
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                Enter your details to get started on Collavo.
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="At least 8 characters"
                />
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
                {busy ? 'Creating account...' : `Create ${pendingRole === 'creator' ? 'Creator' : 'Business'} Account`}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
