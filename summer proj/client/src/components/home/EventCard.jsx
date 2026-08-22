import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Banknote, ArrowRight, Bookmark } from 'lucide-react';
import { SubmitProposalModal } from '../ui/SubmitProposalModal.jsx';

export function EventCard({ event, isSaved, onToggleSave }) {
  const [proposalOpen, setProposalOpen] = useState(false);

  const timeAgo = () => {
    if (!event.createdAt) return '1d ago';
    const diff = Date.now() - new Date(event.createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'today';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const deadlineText = () => {
    if (!event.date) return '2d left';
    const diff = new Date(event.date).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `${days}d left`;
  };

  return (
    <>
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060] transition-all">
        <div>
          {/* Cover Image Frame */}
          <Link to={`/event/${event._id}`} className="relative block h-44 w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-[#121522]">
            {event.image ? (
              <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-gradient-to-br dark:from-[#1e2235] dark:to-[#121522] text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {event.category || 'Campaign'}
              </div>
            )}

            {/* Category Tag Top Left */}
            {event.category && (
              <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md">
                {event.category}
              </span>
            )}

            {/* Platform icons bottom right */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 backdrop-blur-md">
              {event.platform?.toLowerCase().includes('facebook') && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">f</span>
              )}
              {event.platform?.toLowerCase().includes('tiktok') && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">♪</span>
              )}
              {event.platform?.toLowerCase().includes('instagram') || !event.platform ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-[9px] font-bold text-white">📷</span>
              ) : null}
              {event.platform?.toLowerCase().includes('youtube') && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">▶</span>
              )}
            </div>
          </Link>

          {/* Title & Brand */}
          <div className="mt-3.5">
            <Link to={`/event/${event._id}`}>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug line-clamp-1 group-hover:text-[#6366f1] dark:group-hover:text-[#818cf8]">
                {event.title}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-[#8e95af] line-clamp-1">
              {event.createdBy?.name || 'Brand Partner'} · {timeAgo()}
            </p>

            {/* Paid Badge & Slots */}
            <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-block rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-[#121522] px-2.5 py-0.5 text-[11px] font-extrabold shadow-xs">
                Paid
              </span>
              {event.creatorsNeeded && event.creatorsNeeded > 1 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-900/60 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  {event.creatorsHired || 0}/{event.creatorsNeeded} Creators
                </span>
              )}
            </div>

            {/* Deliverables summary tag if set */}
            {(event.deliverables?.videos > 0 || event.deliverables?.posts > 0 || event.deliverables?.storyMentions > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-[#151824] rounded-xl p-2 border border-zinc-100 dark:border-[#262a3e]">
                {event.deliverables?.videos > 0 && (
                  <span className="inline-flex items-center gap-0.5">🎥 {event.deliverables.videos} {event.deliverables.videos === 1 ? 'Video' : 'Videos'}</span>
                )}
                {event.deliverables?.posts > 0 && (
                  <span className="inline-flex items-center gap-0.5">📸 {event.deliverables.posts} {event.deliverables.posts === 1 ? 'Post' : 'Posts'}</span>
                )}
                {event.deliverables?.storyMentions > 0 && (
                  <span className="inline-flex items-center gap-0.5">💬 {event.deliverables.storyMentions} {event.deliverables.storyMentions === 1 ? 'Story' : 'Stories'}</span>
                )}
              </div>
            )}

            {/* Location, Deadline, Budget */}
            <div className="mt-3 space-y-1.5 border-t border-zinc-100 dark:border-[#262a3e]/80 pt-2.5 text-xs">
              <p className="flex items-center gap-1.5 text-zinc-500 dark:text-[#8e95af] truncate">
                <MapPin className="h-3.5 w-3.5 text-zinc-400 dark:text-[#8e95af] shrink-0" />
                <span className="truncate">{event.location?.address || 'Itahari, Nepal'}</span>
              </p>

              <p className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-[#f97316]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{deadlineText()}</span>
              </p>

              <p className="flex items-center gap-1.5 font-extrabold text-zinc-900 dark:text-white">
                <Banknote className="h-3.5 w-3.5 text-zinc-400 dark:text-[#8e95af] shrink-0" />
                <span>
                  Rs. {event.budget > 0 ? `${event.budget.toLocaleString()} – Rs. ${(event.budget * 1.5).toLocaleString()}` : '2,500 – Rs. 4,000'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Apply Button & Bookmark */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProposalOpen(true)}
            className="btn-primary flex-1 py-2.5 text-xs font-bold justify-center"
          >
            Apply Now <ArrowRight className="h-3.5 w-3.5" />
          </button>
          {onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              className={`rounded-2xl border p-2.5 transition-colors ${
                isSaved
                  ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-[#232542] dark:border-[#6366f1] dark:text-rose-400'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-400 hover:text-zinc-700 dark:border-[#262a3e] dark:bg-[#161926] dark:text-[#8e95af] dark:hover:text-white'
              }`}
              title={isSaved ? 'Saved' : 'Save Event'}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <SubmitProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        event={event}
      />
    </>
  );
}
