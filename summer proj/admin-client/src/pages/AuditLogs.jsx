import { useEffect, useState } from 'react';
import { ShieldCheck, Clock } from 'lucide-react';
import { api } from '../lib/api.js';

const ACTION_COLORS = {
  verification_verified: 'bg-green-50 text-green-600',
  verification_rejected: 'bg-red-50 text-red-600',
  wallet_topup: 'bg-blue-50 text-blue-600',
  wallet_deduct: 'bg-orange-50 text-orange-600',
  withdrawal_paid: 'bg-green-50 text-green-600',
  withdrawal_denied: 'bg-red-50 text-red-600',
  suspend_user: 'bg-red-50 text-red-600',
  unsuspend_user: 'bg-green-50 text-green-600',
  force_release_escrow: 'bg-amber-50 text-amber-600',
  refund_escrow: 'bg-blue-50 text-blue-600'
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    setLoading(true);
    api(`/panel/audit-logs?page=${page}&limit=${limit}`)
      .then((d) => {
        setLogs(d.logs || []);
        setTotal(d.total || 0);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Admin Audit Logs</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Immutable log of all administrator operations. {total} entries total.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">Loading audit trail...</p>
      ) : logs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No audit logs recorded yet.
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {logs.map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 text-xs shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${ACTION_COLORS[log.action] || 'bg-gray-50 text-gray-600'}`}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                        {log.targetType}
                      </span>
                    </div>
                    <p className="mt-0.5 text-gray-500">
                      By: <span className="font-semibold text-gray-700">{log.adminId?.email || 'Admin'}</span>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <span className="ml-2 font-mono text-[11px] text-gray-400">
                          {JSON.stringify(log.details)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

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
    </div>
  );
}
