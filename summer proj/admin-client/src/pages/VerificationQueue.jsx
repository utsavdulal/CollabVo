import { useEffect, useState } from 'react';
import { Check, X, ExternalLink, ChevronDown } from 'lucide-react';
import { api } from '../lib/api.js';

export default function VerificationQueue() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api(`/verification/queue?status=${statusFilter}`)
      .then((d) => setRecords(d.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const open = async (rec) => {
    try {
      const d = await api(`/verification/${rec._id}`);
      setDocs(d.verification.documents || []);
      setSelected(d.verification);
    } catch {}
  };

  const approve = async () => {
    setActionBusy(true);
    try {
      await api(`/verification/${selected._id}/decide`, { method: 'PATCH', body: { status: 'verified', reason: '' } });
      setSelected(null);
      load();
    } catch {}
    setActionBusy(false);
  };

  const openReject = () => {
    setRejectReason('');
    setRejectModal(true);
  };

  const confirmReject = async () => {
    setActionBusy(true);
    try {
      await api(`/verification/${selected._id}/decide`, { method: 'PATCH', body: { status: 'rejected', reason: rejectReason || 'Documents incomplete' } });
      setSelected(null);
      setRejectModal(false);
      load();
    } catch {}
    setActionBusy(false);
  };

  return (
    <div>
      <h1 className="text-lg font-bold">Verification Queue</h1>
      <p className="mt-1 text-sm text-gray-500">Review business documents. Approve or reject with a reason.</p>

      <div className="mt-4 flex gap-2">
        {['pending', 'verified', 'rejected'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
              statusFilter === s ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">Loading...</p>
      ) : records.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No {statusFilter} verifications.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {records.map((r) => (
            <div key={r._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.userId?.name}</p>
                <p className="truncate text-xs text-gray-500">{r.userId?.email}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Submitted {new Date(r.submittedAt).toLocaleDateString()}</p>
                {r.status === 'rejected' && r.rejectionReason && (
                  <p className="mt-0.5 text-[11px] text-red-500">Reason: {r.rejectionReason}</p>
                )}
              </div>
              {r.status === 'pending' && (
                <button type="button" onClick={() => open(r)} className="btn-secondary text-xs">
                  Review
                </button>
              )}
              {r.status === 'verified' && (
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-600">Approved</span>
              )}
              {r.status === 'rejected' && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">Rejected</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto mt-10 max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{selected.userId?.name}</p>
                <p className="text-xs text-gray-500">{selected.userId?.email}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {docs.map((d, i) => (
                <a
                  key={i}
                  href={d.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="capitalize">{d.type.replace('_', ' ')}</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>
              ))}
              {docs.length === 0 && <p className="text-xs text-gray-400">No documents uploaded.</p>}
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={approve} disabled={actionBusy} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4" /> {actionBusy ? 'Processing...' : 'Approve'}
              </button>
              <button type="button" onClick={openReject} disabled={actionBusy} className="btn-secondary flex-1 text-red-600">
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto mt-20 max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-bold text-gray-900">Rejection Reason</h3>
            <p className="mt-1 text-xs text-gray-500">Provide a reason for rejecting this verification.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input mt-3 min-h-[80px]"
              placeholder="e.g. Documents are blurry, business license expired..."
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setRejectModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={confirmReject} disabled={actionBusy} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">
                {actionBusy ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
