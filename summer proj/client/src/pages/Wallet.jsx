import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, Lock, ArrowDownLeft, ArrowUpRight, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Spinner } from '../components/ui/Spinner.jsx';

export default function WalletPage() {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpRef, setTopUpRef] = useState('');
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpError, setTopUpError] = useState('');
  const [topUpSuccess, setTopUpSuccess] = useState('');

  const load = () => {
    api('/wallet')
      .then((d) => {
        setWallet(d.wallet);
        setTransactions(d.transactions || []);
      })
      .catch(() => {});
  };

  useEffect(load, []);

  const requestPayout = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!amount || Number(amount) <= 0) return setError('Please enter a valid payout amount');
    setBusy(true);
    try {
      await api('/wallet/payout', { method: 'POST', body: { amount: Number(amount) } });
      setSuccess('Payout request submitted. The admin team will verify and process your payment.');
      setAmount('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const requestTopUp = async (e) => {
    e.preventDefault();
    setTopUpError('');
    setTopUpSuccess('');
    if (!topUpAmount || Number(topUpAmount) <= 0) return setTopUpError('Please enter a valid amount');
    setTopUpBusy(true);
    try {
      await api('/wallet/topup-request', {
        method: 'POST',
        body: { amount: Number(topUpAmount), referenceNote: topUpRef }
      });
      setTopUpSuccess('Top-up request submitted. Funds will be credited once the admin confirms your payment.');
      setTopUpAmount('');
      setTopUpRef('');
      load();
    } catch (err) {
      setTopUpError(err.message);
    } finally {
      setTopUpBusy(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-12 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Virtual Wallet & Escrow</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Track available balance, funds locked in active escrow deals, and request payouts.
        </p>
      </div>

      {/* Main Account Balance Card */}
      <div className="rounded-3xl bg-zinc-900 p-7 text-white shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {user?.role === 'business' ? 'Available Budget' : 'Wallet Balance'}
          </span>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-bold text-zinc-300">
            INR Virtual Currency
          </span>
        </div>

        <p className="mt-3 text-4xl font-extrabold tracking-tight">
          ₹{wallet.availableBalance.toLocaleString()}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-5">
          {user?.role === 'business' && (
            <div className="rounded-2xl bg-zinc-800/80 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Secured in Escrow</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                ₹{wallet.escrowHeld.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">Locked until delivery confirmation</p>
            </div>
          )}

          {user?.role === 'creator' && (
            <div className="rounded-2xl bg-zinc-800/80 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Claimable Balance</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                ₹{wallet.claimableBalance.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">Ready to request bank payout</p>
            </div>
          )}

          <div className="rounded-2xl bg-zinc-800/80 p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Audited Ledger</span>
            </div>
            <p className="mt-1 text-lg font-bold text-white">
              {transactions.length}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Immutable ledger entries</p>
          </div>
        </div>
      </div>

      {/* Creator Payout Request Card */}
      {user?.role === 'creator' && wallet.claimableBalance > 0 && (
        <form
          onSubmit={requestPayout}
          className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-3"
        >
          <h2 className="text-sm font-bold text-zinc-900">Request Payout</h2>
          <p className="text-xs text-zinc-500">
            Convert your completed collaboration earnings into real money via bank or mobile transfer.
          </p>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span>
            <input
              type="number"
              min="1"
              max={wallet.claimableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input pl-8 text-sm font-semibold"
              placeholder={`Up to ₹${wallet.claimableBalance.toLocaleString()}`}
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs">
            {busy ? 'Processing request...' : 'Submit Payout Request'}
          </button>
        </form>
      )}

      {/* Business Top Up Request Card */}
      {user?.role === 'business' && (
        <form
          onSubmit={requestTopUp}
          className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-3"
        >
          <h2 className="text-sm font-bold text-zinc-900">Add Funds</h2>
          <p className="text-xs text-zinc-500">
            Submit a top-up request with your payment reference. The platform admin will verify the
            payment and credit your available budget.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span>
              <input
                type="number"
                min="1"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="input pl-8 text-sm font-semibold"
                placeholder="Amount"
              />
            </div>
            <input
              type="text"
              value={topUpRef}
              onChange={(e) => setTopUpRef(e.target.value)}
              className="input flex-1 text-sm"
              placeholder="Payment reference (txn ID, optional)"
            />
          </div>

          {topUpError && <p className="text-xs text-red-600 font-medium">{topUpError}</p>}
          {topUpSuccess && <p className="text-xs text-emerald-600 font-medium">{topUpSuccess}</p>}

          <button type="submit" disabled={topUpBusy} className="btn-primary w-full py-2.5 text-xs">
            {topUpBusy ? 'Submitting request...' : 'Request Top-Up'}
          </button>

          {transactions.some((t) => t.type === 'topup_request' && t.status === 'pending') && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
              You have pending top-up request(s) awaiting admin approval.
            </p>
          )}
        </form>
      )}

      {/* Ledger Transactions Stream */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-zinc-900">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 text-center text-xs text-zinc-400">
            No transactions recorded on your ledger yet.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => {
              const isCredit = t.type === 'topup' || t.type === 'escrow_release';
              const isDebit = t.type === 'withdrawal' || t.type === 'escrow_lock' || t.type === 'admin_deduct';
              return (
                <div
                  key={t._id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white p-3.5 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        t.type === 'topup'
                          ? 'bg-emerald-50 text-emerald-600'
                          : t.type === 'topup_request'
                          ? 'bg-blue-50 text-blue-600'
                          : t.type === 'escrow_lock'
                          ? 'bg-amber-50 text-amber-600'
                          : isDebit
                          ? 'bg-red-50 text-red-600'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {isDebit ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 capitalize">
                        {t.type.replace('_', ' ')}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {new Date(t.createdAt).toLocaleDateString()} · Status:{' '}
                        <span className="font-semibold text-zinc-600 capitalize">{t.status}</span>
                        {t.referenceNote && ` · ${t.referenceNote}`}
                      </p>
                    </div>
                  </div>

                  <p
                    className={`font-bold text-sm ${
                      isCredit ? 'text-emerald-600' : 'text-zinc-900'
                    }`}
                  >
                    {isCredit ? '+' : '-'}₹{t.amount.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
