import { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api.js';

export function ReportModal({ open, onClose, targetUser, eventId }) {
  const [reason, setReason] = useState('scam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!targetUser?._id && !targetUser?.id) return;
    setError('');
    setBusy(true);
    try {
      await api('/reports', {
        method: 'POST',
        body: {
          reportedUserId: targetUser._id || targetUser.id,
          eventId: eventId || undefined,
          reason,
          details
        }
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1d2d] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#262a3e] pb-3">
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-4.5 w-4.5" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Report User or Campaign</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#212538] hover:text-zinc-700 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Report Submitted</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] max-w-xs mx-auto">
              Our trust and operations team will investigate this account immediately.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary mt-5 w-full py-2 text-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3.5">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Reporting: <strong className="text-zinc-900 dark:text-white">{targetUser?.name || 'User'}</strong>
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input text-xs"
              >
                <option value="scam">Suspected scam / payment fraud</option>
                <option value="spam">Spam or unwanted advertising</option>
                <option value="harassment">Harassment or unprofessional conduct</option>
                <option value="inappropriate">Inappropriate content or campaign</option>
                <option value="other">Other safety violation</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Details (optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="input min-h-[75px] text-xs"
                placeholder="Explain the reason for reporting..."
                maxLength={1000}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 font-medium">{error}</p>
            )}

            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-[#262a3e]">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 border-red-600 py-2 text-xs"
              >
                {busy ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
