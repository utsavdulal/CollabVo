import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Banknote, Send, UserRound,
  ShieldAlert, ExternalLink, ShieldCheck, CheckCircle2, ChevronLeft, Pencil, Trash2
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuthStore } from '../store/authStore.js';
import { ReportModal } from '../components/ui/ReportModal.jsx';
import { SubmitProposalModal } from '../components/ui/SubmitProposalModal.jsx';
import { PostEventModal } from '../components/ui/PostEventModal.jsx';
import { GoogleMapViewer } from '../components/maps/GoogleMapViewer.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [userProposal, setUserProposal] = useState(null);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    if (deleteBusy) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setDeleteBusy(true);
    try {
      await api(`/events/${id}`, { method: 'DELETE' });
      navigate('/home');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete campaign');
      setConfirmDelete(false);
      setDeleteBusy(false);
    }
  };

  const load = () => {
    api(`/events/${id}`)
      .then((d) => setEvent(d.event))
      .catch((err) => setError(err.message));

    if (user?.role === 'creator') {
      api('/proposals')
        .then((d) => {
          const match = (d.proposals || []).find(
            (p) => String(p.eventId?._id || p.eventId) === String(id) && ['pending', 'accepted'].includes(p.status)
          );
          setUserProposal(match || null);
        })
        .catch(() => {});
    }
  };

  useEffect(load, [id, user]);

  if (error) return <p className="py-16 text-center text-sm text-red-500">{error}</p>;
  if (!event) return <div className="flex justify-center py-16"><Spinner /></div>;

  const owner = event.createdBy;
  const isOwner = owner && String(owner._id) === String(user?.id);
  const isFilled = event.status === 'filled' || (event.creatorsNeeded && (event.creatorsHired || 0) >= event.creatorsNeeded);
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
        <div className="flex items-center gap-2">
          {isOwner && !isFilled && (
            <>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-[#232542] px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-[#2e3357] transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                  confirmDelete
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteBusy ? 'Deleting...' : confirmDelete ? 'Tap to confirm' : 'Delete'}
              </button>
            </>
          )}
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

      {deleteError && (
        <p className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400">
          {deleteError}
        </p>
      )}

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
          {isFilled && (
            <div className="absolute top-4 right-4 rounded-full bg-amber-500 px-3.5 py-1 text-xs font-black text-white uppercase tracking-wider shadow-lg">
              Campaign Full
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

          {/* Deliverable Requirements & Slot Progress */}
          <div className="mt-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/50 dark:bg-[#161a2e] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                Deliverables Required
              </h4>
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-[#20253e] px-2.5 py-1 rounded-xl border border-indigo-200/60 dark:border-indigo-800">
                👥 {event.creatorsHired || 0} / {event.creatorsNeeded || 1} Creators Hired
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-white dark:bg-[#121522] p-2.5 border border-indigo-100/70 dark:border-[#262a3e]">
                <p className="text-sm font-black text-zinc-900 dark:text-white">{event.deliverables?.videos ?? 1}</p>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">🎥 Videos</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-[#121522] p-2.5 border border-indigo-100/70 dark:border-[#262a3e]">
                <p className="text-sm font-black text-zinc-900 dark:text-white">{event.deliverables?.posts ?? 1}</p>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">📸 Feed Posts</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-[#121522] p-2.5 border border-indigo-100/70 dark:border-[#262a3e]">
                <p className="text-sm font-black text-zinc-900 dark:text-white">{event.deliverables?.storyMentions ?? 1}</p>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">💬 Stories</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3 border-t border-zinc-100 dark:border-[#262a3e] pt-4 text-xs">
            {event.workMode === 'remote' ? (
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300"><span className="font-bold text-indigo-600">Remote collaboration</span></div>
            ) : event.location?.address && (
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
              <span>Budget: Rs. {event.budget > 0 ? `${event.budget.toLocaleString()} / creator` : 'Negotiable'}</span>
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

      {/* Shoot / Event Location Google Map */}
      {event.workMode !== 'remote' && (event.location?.coordinates?.[0] || event.location?.coordinates?.[1] || event.location?.address) && (
        <GoogleMapViewer
          coordinates={event.location?.coordinates || [0, 0]}
          address={event.location?.address}
          title={`${event.title} · Shoot / Event Location`}
          height="h-52"
        />
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
        ) : userProposal ? (
          <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                {userProposal.status === 'accepted'
                  ? 'Proposal Accepted · Escrow Secured'
                  : 'Application Submitted · Waiting for Business Review'}
              </span>
            </div>
            <Link
              to={`/proposal/${userProposal._id}`}
              className="text-xs font-black text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View Proposal &rarr;
            </Link>
          </div>
        ) : isFilled ? (
          <button
            type="button"
            disabled
            className="w-full py-3.5 text-sm font-bold text-zinc-400 bg-zinc-100 dark:bg-[#1f2335] rounded-2xl cursor-not-allowed text-center"
          >
            All Creator Slots Filled for this Campaign
          </button>
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
        onSubmitted={load}
      />

      {editOpen && (
        <PostEventModal
          open
          onClose={() => setEditOpen(false)}
          event={event}
          onCreated={() => load()}
        />
      )}

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
