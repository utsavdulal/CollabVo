import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon, Lock, ArrowDownLeft, ArrowUpRight, ShieldCheck, Clock, CheckCircle, QrCode, AlertCircle, ExternalLink, Building2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Spinner } from '../components/ui/Spinner.jsx';
import { getProviderConfig } from '../lib/paymentData.jsx';

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
    if (!amount || Number(amount) < 100) return setError('Minimum withdrawal amount is ₹100');
    if (Number(amount) > wallet.availableBalance) return setError('Amount exceeds your available balance');
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
            {user?.role === 'business' ? 'Available Budget' : 'Available Wallet Balance'}
          </span>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-bold text-zinc-300">
            INR Virtual Currency
          </span>
        </div>

        <p className="mt-3 text-4xl font-extrabold tracking-tight">
          ₹{wallet.availableBalance.toLocaleString()}
        </p>
        <p className="mt-1 text-[11px] text-zinc-400">
          {user?.role === 'business'
            ? 'Funds ready to allocate to creator campaigns'
            : 'Available balance ready to be withdrawn to your account'}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-5">
          {user?.role === 'business' ? (
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
          ) : (
            <div className="rounded-2xl bg-zinc-800/80 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Payment on Hold</span>
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                ₹{(wallet.escrowHeld || 0).toLocaleString()}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">Released after work is completed &amp; confirmed by business</p>
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
      {user?.role === 'creator' && (
        <form
          onSubmit={requestPayout}
          className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900">Request Payout</h2>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                Min. ₹100
              </span>
            </div>
            <Link to="/settings" className="text-[11px] font-bold text-[#6366f1] hover:underline flex items-center gap-1">
              <QrCode className="h-3.5 w-3.5" /> Payout Settings
            </Link>
          </div>
          <p className="text-xs text-zinc-500">
            Withdraw any amount above ₹100 from your available balance via eSewa, Khalti, Fonepay, or Bank Transfer.
          </p>

          {/* Payment Method Preview */}
          {(() => {
            const prov = user?.paymentDetails?.provider || 'esewa';
            const provConfig = getProviderConfig(prov);
            const ProvLogo = provConfig.logo;
            const isBank = prov === 'bank';
            const hasConfig = isBank
              ? Boolean(user?.paymentDetails?.accountNumber)
              : Boolean(user?.paymentDetails?.qrCodeURL || user?.paymentDetails?.accountNumber);

            if (!hasConfig) {
              return (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">No payout destination configured for {provConfig.label}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {isBank
                        ? 'Add your bank account details in Settings so the admin can transfer funds.'
                        : `Add your ${provConfig.label} QR code or mobile number in Settings.`}
                    </p>
                    <Link to="/settings" className="mt-1.5 inline-block text-[11px] font-bold text-amber-900 underline">
                      + Configure in Settings
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                {isBank ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                ) : user?.paymentDetails?.qrCodeURL ? (
                  <img
                    src={user.paymentDetails.qrCodeURL}
                    alt={`${prov} QR`}
                    className="h-10 w-10 rounded-lg object-contain bg-white border border-zinc-200 p-0.5 shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 text-zinc-500 shrink-0">
                    <ProvLogo className="h-6 w-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-900 capitalize">{provConfig.label}</span>
                    {isBank && user?.paymentDetails?.bankName && (
                      <span className="text-[11px] text-blue-600 font-semibold truncate">({user.paymentDetails.bankName})</span>
                    )}
                    <span className="text-[10px] text-emerald-600 font-semibold">(Active Destination)</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {user?.paymentDetails?.accountName ? `${user.paymentDetails.accountName} · ` : ''}
                    {user?.paymentDetails?.accountNumber || (isBank ? 'Account set' : 'QR linked')}
                  </p>
                </div>
                <Link to="/settings" className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 shrink-0">
                  Change
                </Link>
              </div>
            );
          })()}

          {wallet.availableBalance < 100 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-900">Minimum withdrawal balance is ₹100.</span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Your available balance is currently ₹{wallet.availableBalance.toLocaleString()}. Once your earnings reach ₹100 or more, you can withdraw immediately.
              </p>
            </div>
          ) : (
            <>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span>
                <input
                  type="number"
                  min="100"
                  max={wallet.availableBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input pl-8 text-sm font-semibold"
                  placeholder={`Min ₹100 up to ₹${wallet.availableBalance.toLocaleString()}`}
                />
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
              {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}

              <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs font-bold">
                {busy ? 'Processing request...' : 'Submit Payout Request'}
              </button>
            </>
          )}
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
