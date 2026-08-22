import { useEffect, useState } from 'react';
import { Search, Wallet, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api.js';

export default function WalletManagement() {
  const [tab, setTab] = useState('topup');
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [topUps, setTopUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmPay, setConfirmPay] = useState(null);
  const [confirmDeny, setConfirmDeny] = useState(null);
  const [confirmApproveTopUp, setConfirmApproveTopUp] = useState(null);
  const [confirmDenyTopUp, setConfirmDenyTopUp] = useState(null);

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    const d = await api(`/users?q=${encodeURIComponent(q.trim())}`).catch(() => { showMsg('Search failed', true); return { users: [] }; });
    setUsers(d.users || []);
    setLoading(false);
  };

  const openUser = async (u) => {
    setSelected(u);
    setWallet(null);
    setError('');
    const d = await api(`/wallet/user/${u._id}`).catch(() => { showMsg('Failed to load wallet', true); return { wallet: null, transactions: [] }; });
    setWallet(d.wallet);
    setLedger(d.transactions || []);
  };

  const loadWithdrawals = () => {
    setLoading(true);
    api('/wallet/withdrawals?status=pending')
      .then((d) => setWithdrawals(d.transactions || []))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  };

  const loadTopUps = () => {
    setLoading(true);
    api('/wallet/topups?status=pending')
      .then((d) => setTopUps(d.transactions || []))
      .catch(() => setTopUps([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'withdrawals') loadWithdrawals();
    if (tab === 'topups') loadTopUps();
  }, [tab]);

  const topUp = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setError('');
    try {
      await api('/wallet/topup', { method: 'POST', body: { userId: selected._id, amount: Number(amount), referenceNote: note } });
      setAmount('');
      setNote('');
      showMsg(`₹${amount} credited successfully`);
      openUser(selected);
    } catch (err) {
      showMsg(err.message || 'Top up failed', true);
    }
  };

  const deduct = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !note.trim()) return;
    setError('');
    try {
      await api('/wallet/deduct', { method: 'POST', body: { userId: selected._id, amount: Number(amount), reason: note } });
      setAmount('');
      setNote('');
      showMsg(`₹${amount} deducted successfully`);
      openUser(selected);
    } catch (err) {
      showMsg(err.message || 'Deduction failed', true);
    }
  };

  const pay = async (id) => {
    setConfirmPay(null);
    try {
      await api(`/wallet/withdrawals/${id}/pay`, { method: 'POST' });
      showMsg('Payout marked as paid');
      loadWithdrawals();
    } catch (err) {
      showMsg(err.message || 'Pay failed', true);
    }
  };

  const deny = async (id) => {
    setConfirmDeny(null);
    try {
      await api(`/wallet/withdrawals/${id}/deny`, { method: 'POST' });
      showMsg('Payout denied');
      loadWithdrawals();
    } catch (err) {
      showMsg(err.message || 'Deny failed', true);
    }
  };

  const approveTopUp = async (id) => {
    setConfirmApproveTopUp(null);
    try {
      await api(`/wallet/topups/${id}/approve`, { method: 'POST' });
      showMsg('Top-up approved and credited');
      loadTopUps();
    } catch (err) {
      showMsg(err.message || 'Approve failed', true);
    }
  };

  const denyTopUp = async (id) => {
    setConfirmDenyTopUp(null);
    try {
      await api(`/wallet/topups/${id}/deny`, { method: 'POST', body: { reason: 'Payment could not be verified' } });
      showMsg('Top-up request denied');
      loadTopUps();
    } catch (err) {
      showMsg(err.message || 'Deny failed', true);
    }
  };

  return (
    <div>
      <h1 className="text-lg font-bold">Wallet Management</h1>

      {(error || success) && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {error || success}
        </div>
      )}

      <div className="mt-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {['topup', 'deduct', 'topups', 'withdrawals'].map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setError(''); setSuccess(''); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === t ? 'bg-brand text-white' : 'text-gray-500'}`}>
            {t === 'topup' ? 'Top Ups' : t === 'deduct' ? 'Deduct Funds' : t === 'topups' ? 'Top-up Requests' : 'Payout Requests'}
          </button>
        ))}
      </div>

      {(tab === 'topup' || tab === 'deduct') && (
        <div className="mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="input pl-9" placeholder="Find a user" />
            </div>
            <button type="button" onClick={search} className="btn-primary">Find</button>
          </div>

          {loading ? (
            <p className="mt-6 text-center text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="mt-3 space-y-2">
              {users.map((u) => (
                <button key={u._id} type="button" onClick={() => openUser(u)} className={`flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left transition-colors ${selected?._id === u._id ? 'border-brand' : 'border-gray-200 hover:border-brand'}`}>
                  <div>
                    <p className="text-sm font-semibold">{u.name || u.email}</p>
                    <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
                  </div>
                  <Wallet className="h-4 w-4 text-gray-400" />
                </button>
              ))}
              {q && !loading && users.length === 0 && <p className="text-center text-sm text-gray-400">No users found.</p>}
            </div>
          )}

          {selected && wallet && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-semibold">{selected.name} · {selected.email}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-2"><p className="text-sm font-bold">₹{wallet.availableBalance}</p><p className="text-[10px] text-gray-500">Available</p></div>
                <div className="rounded-lg bg-gray-50 p-2"><p className="text-sm font-bold">₹{wallet.escrowHeld}</p><p className="text-[10px] text-gray-500">Escrow</p></div>
                <div className="rounded-lg bg-gray-50 p-2"><p className="text-sm font-bold">₹{wallet.claimableBalance}</p><p className="text-[10px] text-gray-500">Claimable</p></div>
              </div>

              {tab === 'topup' ? (
                <form onSubmit={topUp} className="mt-4 space-y-2">
                  <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Top up amount (₹)" required />
                  <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Reference (bank txn ID)" />
                  <button type="submit" className="btn-primary w-full">Credit wallet</button>
                </form>
              ) : (
                <form onSubmit={deduct} className="mt-4 space-y-2">
                  {wallet.availableBalance <= 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> User has no available balance to deduct
                    </div>
                  )}
                  <input type="number" min="1" max={wallet.availableBalance} value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Deduct amount (₹)" required />
                  <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Reason for deduction (required)" required />
                  <button type="submit" disabled={wallet.availableBalance <= 0} className="btn-primary w-full bg-red-600 hover:bg-red-700">Deduct from wallet</button>
                </form>
              )}

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">Ledger (last 20)</p>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {ledger.slice(0, 20).map((t) => (
                    <div key={t._id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <div>
                        <span className="font-semibold capitalize">{t.type.replace(/_/g, ' ')}</span>
                        <span className="ml-2 text-gray-400">{t.status}</span>
                        {t.referenceNote && <span className="ml-2 text-gray-400">· {t.referenceNote}</span>}
                      </div>
                      <span className="font-semibold">₹{t.amount}</span>
                    </div>
                  ))}
                  {ledger.length === 0 && <p className="text-xs text-gray-400">No transactions.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'topups' && (
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="mt-6 text-center text-sm text-gray-400">Loading...</p>
          ) : topUps.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No pending top-up requests.</div>
          ) : (
            topUps.map((t) => (
              <div key={t._id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{t.userId?.name || 'Business'}</p>
                    <p className="text-xs text-gray-500">{t.userId?.email} · requested {new Date(t.createdAt).toLocaleDateString()}</p>
                    {t.referenceNote && <p className="mt-1 text-xs text-gray-500">Ref: {t.referenceNote}</p>}
                  </div>
                  <p className="font-bold text-brand">₹{t.amount}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setConfirmApproveTopUp(t)} className="btn-primary flex-1 bg-green-600 text-xs hover:bg-green-700">Approve &amp; credit</button>
                  <button type="button" onClick={() => setConfirmDenyTopUp(t)} className="btn-secondary flex-1 text-xs text-red-600">Deny</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="mt-6 text-center text-sm text-gray-400">Loading...</p>
          ) : withdrawals.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No pending payouts.</div>
          ) : (
            withdrawals.map((w) => (
              <div key={w._id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{w.userId?.name || 'Creator'}</p>
                    <p className="text-xs text-gray-500">{w.userId?.email} · requested {new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-bold text-brand">₹{w.amount}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setConfirmPay(w)} className="btn-primary flex-1 bg-green-600 text-xs hover:bg-green-700">Mark paid</button>
                  <button type="button" onClick={() => setConfirmDeny(w)} className="btn-secondary flex-1 text-xs text-red-600">Deny</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirm Approve Top-up Modal */}
      {confirmApproveTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmApproveTopUp(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Confirm Top-up</h3>
            <p className="mt-2 text-sm text-gray-600">Credit ₹{confirmApproveTopUp.amount} to {confirmApproveTopUp.userId?.name}&apos;s wallet?</p>
            {confirmApproveTopUp.referenceNote && (
              <p className="mt-1 text-xs text-gray-400">Ref: {confirmApproveTopUp.referenceNote}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmApproveTopUp(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={() => approveTopUp(confirmApproveTopUp._id)} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deny Top-up Modal */}
      {confirmDenyTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmDenyTopUp(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Deny Top-up</h3>
            <p className="mt-2 text-sm text-gray-600">Deny ₹{confirmDenyTopUp.amount} top-up request from {confirmDenyTopUp.userId?.name}?</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmDenyTopUp(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={() => denyTopUp(confirmDenyTopUp._id)} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">Confirm Deny</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Pay Modal */}
      {confirmPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmPay(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Confirm Payout</h3>
            <p className="mt-2 text-sm text-gray-600">Pay ₹{confirmPay.amount} to {confirmPay.userId?.name}?</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmPay(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={() => pay(confirmPay._id)} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">Confirm Pay</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deny Modal */}
      {confirmDeny && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmDeny(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Deny Payout</h3>
            <p className="mt-2 text-sm text-gray-600">Deny ₹{confirmDeny.amount} payout request from {confirmDeny.userId?.name}?</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmDeny(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={() => deny(confirmDeny._id)} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">Confirm Deny</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
