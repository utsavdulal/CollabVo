import { useEffect, useState } from 'react';
import { Search, X, Wallet, FileText, Star, MapPin, Calendar } from 'lucide-react';
import { api } from '../lib/api.js';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailWallet, setDetailWallet] = useState(null);
  const [detailTxns, setDetailTxns] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (role) params.set('role', role);
    params.set('page', page);
    params.set('limit', '15');
    api(`/users?${params}`)
      .then((d) => {
        setUsers(d.users || []);
        setTotalPages(d.pages || 1);
        setTotal(d.total || 0);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [role, page]);

  const search = () => { setPage(1); load(); };

  const toggleSuspend = async (u) => {
    setConfirmSuspend(u);
  };

  const confirmSuspendAction = async () => {
    if (!confirmSuspend) return;
    await api(`/users/${confirmSuspend._id}/suspend`, { method: 'PATCH', body: { suspended: !confirmSuspend.suspended } });
    setConfirmSuspend(null);
    load();
  };

  const openDetail = async (u) => {
    setDetailLoading(true);
    try {
      const [userD, walletD] = await Promise.all([
        api(`/users/${u._id}`),
        api(`/wallet/user/${u._id}`).catch(() => ({ wallet: null, transactions: [] }))
      ]);
      setDetail(userD.user);
      setDetailWallet(walletD.wallet);
      setDetailTxns(walletD.transactions || []);
    } catch {}
    setDetailLoading(false);
  };

  return (
    <div>
      <h1 className="text-lg font-bold">User Management</h1>
      <p className="mt-0.5 text-xs text-gray-500">{total} users total</p>

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="input pl-9" placeholder="Search by name or email" />
        </div>
        <button type="button" onClick={search} className="btn-primary">Search</button>
      </div>
      <div className="mt-3 flex gap-2">
        {['', 'creator', 'business'].map((r) => (
          <button key={r || 'all'} type="button" onClick={() => { setRole(r); setPage(1); }} className={`btn-secondary px-3 py-1.5 text-xs ${role === r ? 'border-brand text-brand' : ''}`}>
            {r || 'All roles'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {users.map((u) => (
              <div key={u._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.name || u.email}</p>
                  <p className="truncate text-xs text-gray-500">{u.email} · {u.role}</p>
                  <p className="text-[11px] text-gray-400">
                    {u.category} · {u.verificationStatus} · Rating: {u.rating || 0} · Works: {u.workCompleted || 0}
                    {u.suspended && <span className="ml-1 font-bold text-red-500">SUSPENDED</span>}
                  </p>
                </div>
                <button type="button" onClick={() => openDetail(u)} className="btn-secondary text-xs">
                  <Wallet className="h-3.5 w-3.5" /> View
                </button>
                <button
                  type="button"
                  onClick={() => toggleSuspend(u)}
                  className={`btn-secondary text-xs ${u.suspended ? 'text-green-600' : 'text-red-600'}`}
                >
                  {u.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            ))}
            {users.length === 0 && (
              <p className="mt-8 text-center text-sm text-gray-400">No users found.</p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary px-3 py-1 text-xs disabled:opacity-30">
                Prev
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary px-3 py-1 text-xs disabled:opacity-30">
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* User Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto mt-10 max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="font-bold">User Details</p>
              <button type="button" onClick={() => { setDetail(null); setDetailWallet(null); }} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-6 text-center text-sm text-gray-400">Loading...</p>
            ) : detail ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-semibold">{detail.name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-500">{detail.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded bg-gray-200 px-2 py-0.5 font-semibold capitalize">{detail.role}</span>
                    <span className="rounded bg-gray-200 px-2 py-0.5 capitalize">{detail.verificationStatus}</span>
                    {detail.category && <span className="rounded bg-gray-200 px-2 py-0.5 capitalize">{detail.category}</span>}
                    {detail.suspended && <span className="rounded bg-red-100 px-2 py-0.5 font-bold text-red-600">Suspended</span>}
                  </div>
                  {detail.bio && <p className="mt-2 text-xs text-gray-600">{detail.bio}</p>}
                  {detail.location?.address && <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400"><MapPin className="h-3 w-3" />{detail.location.address}</p>}
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                    <Calendar className="h-3 w-3" /> Joined {new Date(detail.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {detailWallet && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-500">Wallet</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-green-50 p-2"><p className="text-sm font-bold">₹{detailWallet.availableBalance}</p><p className="text-[10px] text-gray-500">Available</p></div>
                      <div className="rounded-lg bg-amber-50 p-2"><p className="text-sm font-bold">₹{detailWallet.escrowHeld}</p><p className="text-[10px] text-gray-500">Escrow</p></div>
                      <div className="rounded-lg bg-blue-50 p-2"><p className="text-sm font-bold">₹{detailWallet.claimableBalance}</p><p className="text-[10px] text-gray-500">Claimable</p></div>
                    </div>
                  </div>
                )}

                {detailTxns.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-500">Recent Transactions</p>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {detailTxns.slice(0, 15).map((t) => (
                        <div key={t._id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                          <div>
                            <span className="font-semibold capitalize">{t.type.replace(/_/g, ' ')}</span>
                            <span className="ml-2 text-gray-400">{t.status}</span>
                          </div>
                          <span className="font-semibold">₹{t.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Confirm Suspend Modal */}
      {confirmSuspend && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmSuspend(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">{confirmSuspend.suspended ? 'Unsuspend' : 'Suspend'} User</h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmSuspend.suspended
                ? `Restore access for ${confirmSuspend.name || confirmSuspend.email}?`
                : `Suspend ${confirmSuspend.name || confirmSuspend.email}? They will be locked out immediately.`}
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmSuspend(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={confirmSuspendAction} className={`btn-primary flex-1 ${confirmSuspend.suspended ? 'bg-green-600' : 'bg-red-600'}`}>
                {confirmSuspend.suspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
