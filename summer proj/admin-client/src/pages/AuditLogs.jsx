import { useEffect, useState } from 'react';
import { ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/panel/audit-logs?page=${page}&limit=25`)
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
            Immutable log of all administrator operations: verifications, wallet top-ups, payouts, suspensions, and report actions.
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
        <div className="mt-4 space-y-2">
          {logs.map((log) => (
            <div
              key={log._id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 text-xs shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gray-50 p-2 text-brand">
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
                    By Admin: <span className="font-semibold text-gray-700">{log.adminId?.email || 'Admin'}</span>
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
      )}
    </div>
  );
}
