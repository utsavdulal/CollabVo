import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShieldCheck, MessageCircle, Send, MapPin, Briefcase, Bookmark } from 'lucide-react';
import { Avatar } from '../ui/Avatar.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { api } from '../../lib/api.js';
import { SubmitProposalModal } from '../ui/SubmitProposalModal.jsx';

export function UserCard({ user: targetUser, isSaved, onToggleSave, onReport }) {
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [proposalOpen, setProposalOpen] = useState(false);

  const isSelf = String(targetUser._id || targetUser.id) === String(currentUser?.id);

  const startChat = async () => {
    try {
      await api('/messages', {
        method: 'POST',
        body: { toUserId: targetUser._id || targetUser.id, text: "Hi! Let's connect on Collavo." }
      });
      navigate('/messages');
    } catch {
      navigate('/messages');
    }
  };

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060] transition-all">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Link to={`/profile/${targetUser._id || targetUser.id}`}>
                <Avatar user={targetUser} size="lg" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/profile/${targetUser._id || targetUser.id}`}
                    className="truncate text-sm font-bold text-zinc-900 dark:text-white hover:underline"
                  >
                    {targetUser.name || 'User'}
                  </Link>
                  {targetUser.verificationStatus === 'verified' && (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" title="Verified Business" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-[#8e95af] capitalize">
                  {targetUser.role} {targetUser.category && `• ${targetUser.category}`}
                </p>
                {targetUser.location?.address && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-400 dark:text-[#8e95af]">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{targetUser.location.address}</span>
                  </p>
                )}
              </div>
            </div>

            {onToggleSave && !isSelf && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSave();
                }}
                className={`rounded-2xl border p-2 transition-colors ${
                  isSaved
                    ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-[#232542] dark:border-[#6366f1] dark:text-rose-400'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-400 hover:text-zinc-700 dark:border-[#262a3e] dark:bg-[#161926] dark:text-[#8e95af] dark:hover:text-white'
                }`}
                title={isSaved ? 'Unfollow / Remove bookmark' : 'Save / Follow Creator'}
                aria-label="Save Creator"
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {targetUser.bio && (
            <p className="mt-3 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {targetUser.bio}
            </p>
          )}

          <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 dark:border-[#262a3e]/80 pt-2.5 text-[11px] text-zinc-500 dark:text-[#8e95af]">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-zinc-400 dark:text-[#8e95af]" />
              <strong className="font-semibold text-zinc-800 dark:text-white">{targetUser.workCompleted ?? 0}</strong> deals completed
            </span>
            <span className="flex items-center gap-1 text-zinc-800 dark:text-white font-bold">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {targetUser.rating ? Number(targetUser.rating).toFixed(1) : 'New'}
            </span>
          </div>
        </div>

        {!isSelf && (
          <div className="mt-4 flex gap-2 pt-2.5 border-t border-zinc-100 dark:border-[#262a3e]/80">
            <button
              type="button"
              onClick={startChat}
              className="btn-secondary flex-1 py-1.5 text-xs font-bold"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Message
            </button>
            {currentUser?.role === 'business' && targetUser.role === 'creator' && (
              <button
                type="button"
                onClick={() => setProposalOpen(true)}
                className="btn-primary flex-1 py-1.5 text-xs font-bold text-center justify-center"
              >
                <Send className="h-3.5 w-3.5" /> Propose Deal
              </button>
            )}
          </div>
        )}
      </div>

      <SubmitProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        targetUser={targetUser}
      />
    </>
  );
}
