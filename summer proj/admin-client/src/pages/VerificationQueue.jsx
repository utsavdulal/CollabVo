import { useEffect, useState } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';

export default function VerificationQueue() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api('/verification/queue?status=pending')
      .then((d) => setRecords(d.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const open = async (rec) => {
    const d = await api(`/verification/${rec._id}`);
    setDocs(d.verification.documents || []);
    setSelected(d.verification);
  };

  const decide = async (status, reason = '') => {
    await api(`/verification/${selected._id}/decide`, { method: 'PATCH', body: { status, reason } });
    setSelected(null);
    load();
  };

  return (
    <div>
      <h1 className="text-lg font-bold">Verification Queue</h1>
      <p className="mt-1 text-sm text-gray-500">Review business documents. Approve or reject with a reason.</p>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">Loading...</p>
      ) : records.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No pending verifications.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {records.map((r) => (
            <div key={r._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.userId?.name}</p>
                <p className="truncate text-xs text-gray-500">{r.userId?.email}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Submitted {new Date(r.submittedAt).toLocaleDateString()}</p>
              </div>
              <button type="button" onClick={() => open(r)} className="btn-secondary text-xs">
                Review
              </button>
            </div>
          ))}
        </div>
      )}

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
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => decide('verified')} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4" /> Approve
              </button>
              <button type="button" onClick={() => decide('rejected', window.prompt('Rejection reason') || 'Documents incomplete')} className="btn-secondary flex-1 text-red-600">
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
