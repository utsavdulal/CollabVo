import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Banknote, Send, UserRound,
  ShieldAlert, ExternalLink, ShieldCheck, CheckCircle2, ChevronLeft
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuthStore } from '../store/authStore.js';
import { ReportModal } from '../components/ui/ReportModal.jsx';
import { SubmitProposalModal } from '../components/ui/SubmitProposalModal.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  useEffect(() => {
    api(`/events/${id}`)
      .then((d) => setEvent(d.event))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="py-16 text-center text-sm text-red-500">{error}</p>;
  if (!event) return <div className="flex justify-center py-16"><Spinner /></div>;

  const owner = event.createdBy;
  const isOwner = owner && String(owner._id) === String(user?.id);
  const [lng, lat] = event.location?.coordinates || [0, 0];

  return (
    <div className="pb-24 max-w-2xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-[#202438] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black text-zinc-900 dark:text-white">Campaign Details</h1>
        </div>
        {!isOwner && owner && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-rose-600 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Report
          </button>
        )}
      </header>

      {/* Main Campaign Card */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d]">
        <div className="h-48 md:h-64 bg-gradient-to-br from-indigo-700 to-violet-800 relative">
          {event.image ? (
            <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-white text-xl font-bold uppercase tracking-wider">
              {event.category}
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-zinc-100 dark:bg-[#232542] px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              {event.category}
            </span>
            {event.platform && (
              <span className="rounded-full bg-zinc-100 dark:bg-[#232542] px-3 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {event.platform}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-black text-zinc-900 dark:text-white">{event.title}</h2>
          {event.description && (
            <p className="mt-2.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {event.description}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3 border-t border-zinc-100 dark:border-[#262a3e] pt-4 text-xs">
            {event.location?.address && (
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                <MapPin className="h-4 w-4 text-[#6366f1] shrink-0" />
                <span className="truncate">{event.location.address}</span>
              </div>
            )}
            {event.date && (
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                <Calendar className="h-4 w-4 text-[#6366f1] shrink-0" />
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-4 w-4 shrink-0" />
              <span>Budget: Rs. {event.budget > 0 ? event.budget.toLocaleString() : 'Negotiable'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Organizer Info */}
      {owner && (
        <div className="flex items-center gap-3.5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d]">
          <Link to={`/profile/${owner._id}`}>
            <Avatar user={owner} size="md" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link to={`/profile/${owner._id}`} className="block truncate text-sm font-extrabold text-zinc-900 dark:text-white hover:underline">
                {owner.name || 'Organizer'}
              </Link>
              {owner.verificationStatus === 'verified' && (
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" title="Verified Business" />
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-[#8e95af] capitalize">
              {owner.category || owner.role}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await api('/messages', {
                method: 'POST',
                body: { toUserId: owner._id, text: `Hi! I'm interested in collaborating on "${event.title}".` }
              }).catch(() => {});
              navigate('/messages');
            }}
            className="btn-secondary py-1.5 px-3 text-xs font-bold"
          >
            Message
          </button>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="flex gap-2.5 pt-2">
        {isOwner ? (
          <Link
            to={`/proposals?eventId=${event._id}`}
            className="btn-primary flex-1 py-3 text-xs font-bold text-center justify-center"
          >
            View Proposals for this Campaign &rarr;
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setProposalOpen(true)}
            className="btn-primary flex-1 py-3.5 text-sm font-extrabold tracking-wide rounded-2xl shadow-lg shadow-indigo-950/40"
          >
            <Send className="h-4 w-4" /> Apply Now / Submit Proposal
          </button>
        )}
      </div>

      <SubmitProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        event={event}
      />

      {owner && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetUser={owner}
          eventId={event._id}
        />
      )}
    </div>
  );
}
