import { useState } from 'react';
import { X, Star, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api.js';

export function ReviewModal({ open, onClose, targetUser, onReviewed }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
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
      await api('/reviews', {
        method: 'POST',
        body: {
          targetUserId: targetUser._id || targetUser.id,
          rating,
          comment: comment.trim() || undefined
        }
      });
      setSubmitted(true);
      if (onReviewed) onReviewed();
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h2 className="text-sm font-bold text-zinc-900">Rate & Review Partner</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">Review Published</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Thank you! Your feedback helps build trust in the creator economy.
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
          <form onSubmit={submit} className="mt-4 space-y-4">
            <p className="text-xs text-zinc-600">
              Reviewing: <strong className="text-zinc-900">{targetUser?.name || 'User'}</strong>
            </p>

            <div className="text-center py-2">
              <label className="mb-2 block text-xs font-semibold text-zinc-700">Star Rating</label>
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-zinc-300 transition-colors"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Feedback & Comments (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input min-h-[75px] text-xs"
                placeholder="Share your experience working with this collaborator..."
                maxLength={500}
              />
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

            <div className="flex gap-2 pt-2 border-t border-zinc-100">
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
                className="btn-primary flex-1 py-2 text-xs"
              >
                {busy ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
