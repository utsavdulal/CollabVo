import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      {/* Navigation */}
      <header className="border-b border-zinc-100 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Collavo" className="h-8 w-8 object-contain" />
            <span className="text-base font-extrabold tracking-tight text-zinc-900">Collavo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors">
              Sign In
            </Link>
            <Link to="/role" className="btn-primary px-3.5 py-1.5 text-xs">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1 text-xs font-medium text-zinc-700 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-zinc-800" />
          <span>Brand & Creator Collaboration Platform</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-zinc-900 max-w-2xl leading-[1.12]">
          Where brands and creators make real deals happen.
        </h1>

        <p className="mt-5 max-w-lg text-base text-zinc-600 leading-relaxed">
          Connect with verified businesses and creators. Lock deal funds securely into escrow and get paid seamlessly upon confirmed delivery.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md justify-center">
          <Link to="/role" className="btn-primary py-2.5 px-5 text-sm flex-1">
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/auth" className="btn-secondary py-2.5 px-5 text-sm flex-1">
            Sign In to Account
          </Link>
        </div>

        {/* Feature Pillars */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3 text-left w-full border-t border-zinc-100 pt-12">
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-800 shadow-xs mb-3">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900">Verified Businesses</h2>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Every brand submits official trade registrations before posting deals, keeping creators safe from scams.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-800 shadow-xs mb-3">
              <Lock className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900">Virtual Escrow Protection</h2>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Funds lock automatically when a proposal is accepted and release directly to the creator when work is delivered.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-800 shadow-xs mb-3">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900">Nearby Maps & Meetups</h2>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Discover local events and campaigns in your city with radius search and interactive meetup coordinates.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        <p>© {new Date().getFullYear()} Collavo. Clean, trusted collaborations.</p>
      </footer>
    </div>
  );
}

export default Landing;
