import { useEffect, useState } from 'react';
import { ShieldAlert, Check, X, UserX, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ReportsQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const load = () => {
    setLoading(true);
    api(`/reports?status=${statusFilter}`)
      .then((d) => setReports(d.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const handleAction = async (status, suspendUser = false) => {
    if (!selectedReport) return;
    await api(`/reports/${selectedReport._id}/decide`, {
      method: 'PATCH',
      body: {
        status,
        resolutionNotes: notes,
        suspendUser
      }
    });
    setSelectedReport(null);
    setNotes('');
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Abuse & Scam Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Review user-submitted flags against suspected scam accounts, harassment, or spam.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {['pending', 'actioned', 'dismissed', 'all'].map((s) => (
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
        <p className="mt-8 text-center text-sm text-gray-400">Loading reports queue...</p>
      ) : reports.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No {statusFilter} reports found.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reports.map((r) => (
            <div
              key={r._id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-600">
                      {r.reason}
                    </span>
                    <span className="text-xs text-gray-400">
                      Reported {new Date(r.createdAt).toLocaleString()}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.status === 'pending' ? 'bg-amber-50 text-amber-600' : r.status === 'actioned' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p className="font-semibold text-gray-900">
                      Reported Account:{' '}
                      <span className="text-red-700 font-bold">
                        {r.reportedUserId?.name || 'User'} ({r.reportedUserId?.email})
                      </span>
                      {r.reportedUserId?.suspended && (
                        <span className="ml-2 text-xs font-bold text-red-500">[CURRENTLY SUSPENDED]</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Reported by: {r.reporterId?.name || 'User'} ({r.reporterId?.email})
                    </p>
                  </div>
                  {r.details && (
                    <p className="mt-2.5 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700">
                      "{r.details}"
                    </p>
                  )}
                  {r.eventId && (
                    <p className="mt-2 text-xs text-gray-500">Related Event: {r.eventId.title}</p>
                  )}
                  {r.resolutionNotes && (
                    <p className="mt-2 text-xs text-gray-500 font-medium">
                      Admin note: {r.resolutionNotes}
                    </p>
                  )}
                </div>

                {r.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setSelectedReport(r)}
                    className="btn-secondary text-xs"
                  >
                    Take Action
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedReport(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-bold text-gray-900">Moderate Reported Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-600">
                Target User: <strong className="text-gray-900">{selectedReport.reportedUserId?.name}</strong> ({selectedReport.reportedUserId?.email})
              </p>
              <p className="text-xs text-gray-600">
                Flag: <strong className="uppercase text-red-600">{selectedReport.reason}</strong> — "{selectedReport.details}"
              </p>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Resolution Notes (Audit Log)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-[70px]"
                  placeholder="Reason for suspension or dismissal..."
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleAction('actioned', true)}
                  className="btn-primary flex-1 bg-red-600 py-2.5 text-xs hover:bg-red-700"
                >
                  <UserX className="h-3.5 w-3.5" /> Suspend Account & Action Report
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('dismissed', false)}
                  className="btn-secondary flex-1 py-2.5 text-xs text-gray-700"
                >
                  <Check className="h-3.5 w-3.5" /> Dismiss Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
