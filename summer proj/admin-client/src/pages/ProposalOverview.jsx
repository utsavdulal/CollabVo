import { useEffect, useState } from 'react';
import { Unlock, RotateCcw, X } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ProposalOverview() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('held');
  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api('/panel/escrows')
      .then((d) => setProposals(d.proposals || []))
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const tone = {
    held: 'bg-amber-50 text-amber-600',
    released: 'bg-green-50 text-green-600',
    disputed: 'bg-red-50 text-red-600'
  };

  const filtered = filter === 'all' ? proposals : proposals.filter((p) => p.escrowStatus === filter);

  const forceRelease = async () => {
    if (!actionModal) return;
    setActionBusy(true);
    try {
      await api(`/panel/escrows/${actionModal._id}/force-release`, { method: 'POST', body: { reason: actionReason || 'Admin force release' } });
      setActionModal(null);
      setActionReason('');
      load();
    } catch {}
    setActionBusy(false);
  };

  const refund = async () => {
    if (!actionModal) return;
    setActionBusy(true);
    try {
      await api(`/panel/escrows/${actionModal._id}/refund`, { method: 'POST', body: { reason: actionReason || 'Admin refund' } });
      setActionModal(null);
      setActionReason('');
      load();
    } catch {}
    setActionBusy(false);
  };

  return (
    <div>
      <h1 className="text-lg font-bold">Escrow Overview</h1>
      <p className="mt-1 text-sm text-gray-500">All proposals with active or closed escrow. Force release or refund stuck disputes.</p>

      <div className="mt-4 flex gap-2">
        {['held', 'released', 'disputed', 'all'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
              filter === f ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f} {f === 'held' && `(${proposals.filter((p) => p.escrowStatus === 'held').length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No escrow activity.</div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((p) => (
            <div key={p._id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {p.fromUserId?.name} → {p.toUserId?.name}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone[p.escrowStatus]}`}>
                  {p.escrowStatus}
                </span>
              </div>
              {p.eventId && <p className="mt-1 text-xs text-gray-500">Event: {p.eventId.title}</p>}
              <p className="mt-1 text-xs text-gray-500">
                ₹{p.offerAmount} · Business confirmed: {p.businessConfirmedComplete ? 'yes' : 'no'} · Creator confirmed: {p.creatorConfirmedComplete ? 'yes' : 'no'}
              </p>
              {p.escrowStatus === 'held' && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => { setActionModal(p); setActionReason(''); }} className="btn-secondary text-xs text-amber-600">
                    <Unlock className="h-3.5 w-3.5" /> Force Release to Creator
                  </button>
                  <button type="button" onClick={() => { setActionModal(p); setActionReason(''); }} className="btn-secondary text-xs text-blue-600">
                    <RotateCcw className="h-3.5 w-3.5" /> Refund to Business
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setActionModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <button type="button" onClick={() => setActionModal(null)} className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-bold">Escrow Action</h3>
            <p className="mt-1 text-xs text-gray-500">
              ₹{actionModal.offerAmount} between {actionModal.fromUserId?.name} and {actionModal.toUserId?.name}
            </p>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="input mt-3 min-h-[60px]"
              placeholder="Reason (optional)..."
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={forceRelease} disabled={actionBusy} className="btn-primary flex-1 bg-amber-600 text-xs hover:bg-amber-700">
                {actionBusy ? 'Processing...' : 'Release to Creator'}
              </button>
              <button type="button" onClick={refund} disabled={actionBusy} className="btn-primary flex-1 bg-blue-600 text-xs hover:bg-blue-700">
                {actionBusy ? 'Processing...' : 'Refund to Business'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
