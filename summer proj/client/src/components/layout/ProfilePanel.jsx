import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Star, ShieldCheck, MapPin } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { api } from '../../lib/api.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Spinner } from '../ui/Spinner.jsx';

export function ProfilePanel({ open, onClose }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    api(`/users/${user.id}`)
      .then((d) => setReviews(d.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, user]);

  if (!open || !user) return null;

  const stats = [
    { label: 'Completed', value: user.workCompleted ?? 0 },
    { label: 'In Progress', value: user.workInProgress ?? 0 },
    { label: 'Rating', value: user.rating ? user.rating.toFixed(1) : '—' }
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex justify-end bg-white/95 p-3.5 backdrop-blur border-b border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-900">{user.name || 'Set up profile'}</p>
              <p className="truncate text-xs text-zinc-500 capitalize">
                {user.role} {user.category && `• ${user.category}`}
              </p>
              {user.verificationStatus === 'verified' && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  <ShieldCheck className="h-3 w-3" /> Verified Brand
                </span>
              )}
            </div>
          </div>

          {user.bio && <p className="mt-3.5 text-xs text-zinc-600 leading-relaxed">{user.bio}</p>}
          {user.location?.address && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-zinc-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.location.address}</span>
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-center">
                <p className="text-base font-extrabold text-zinc-900">{s.value}</p>
                <p className="text-[10px] text-zinc-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/profile/${user.id}`);
            }}
            className="btn-secondary mt-4 w-full py-2 text-xs"
          >
            View Public Profile
          </button>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Recent Reviews
            </p>
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-zinc-400">No reviews yet.</p>
            ) : (
              <div className="space-y-2.5">
                {reviews.map((r) => (
                  <div key={r._id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.reviewerId} size="sm" />
                      <p className="font-bold text-zinc-800">{r.reviewerId?.name || 'User'}</p>
                      <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-zinc-800">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.rating}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-zinc-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
