import { useEffect, useState } from 'react';
import { Search, Wallet } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    const d = await api(`/users?q=${encodeURIComponent(q.trim())}`).catch(() => ({ users: [] }));
    setUsers(d.users || []);
    setLoading(false);
  };

  const openUser = async (u) => {
    setSelected(u);
    const d = await api(`/wallet/user/${u._id}`);
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

  useEffect(() => {
    if (tab === 'withdrawals') loadWithdrawals();
  }, [tab]);

  const topUp = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    await api('/wallet/topup', { method: 'POST', body: { userId: selected._id, amount: Number(amount), referenceNote: note } });
    setAmount('');
    setNote('');
    openUser(selected);
  };

  const pay = async (id) => {
    await api(`/wallet/withdrawals/${id}/pay`, { method: 'POST' });
    loadWithdrawals();
  };

  const deny = async (id) => {
    await api(`/wallet/withdrawals/${id}/deny`, { method: 'POST' });
    loadWithdrawals();
  };

  return (
    <div>
      <h1 className="text-lg font-bold">Wallet Management</h1>

      <div className="mt-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {['topup', 'withdrawals'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === t ? 'bg-brand text-white' : 'text-gray-500'}`}>
            {t === 'topup' ? 'Top Ups' : 'Payout Requests'}
          </button>
        ))}
      </div>

      {tab === 'topup' && (
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
                <button key={u._id} type="button" onClick={() => openUser(u)} className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-brand">
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

              <form onSubmit={topUp} className="mt-4 space-y-2">
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Top up amount (₹)" required />
                <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Reference (bank txn ID)" />
                <button type="submit" className="btn-primary w-full">Credit wallet</button>
              </form>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">Ledger (last 10)</p>
                <div className="space-y-1">
                  {ledger.slice(0, 10).map((t) => (
                    <div key={t._id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <span>{t.type} · {t.status}</span>
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
                  <button type="button" onClick={() => pay(w._id)} className="btn-primary flex-1 bg-green-600 text-xs hover:bg-green-700">Mark paid</button>
                  <button type="button" onClick={() => deny(w._id)} className="btn-secondary flex-1 text-xs text-red-600">Deny</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
