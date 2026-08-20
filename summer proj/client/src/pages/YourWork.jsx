import { useEffect, useState } from 'react';
import {
  Briefcase, CheckCircle2, Clock, FileText, Lock, MapPin, ExternalLink,
  MessageCircle, Star, ArrowRight, ShieldCheck, Sparkles, Send
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ReviewModal } from '../components/ui/ReviewModal.jsx';

export default function YourWork() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('active'); // 'active' | 'completed'
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingUser, setReviewingUser] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  const load = () => {
    setLoading(true);
    api('/proposals?tab=accepted')
      .then((d) => {
        setProposals(d.proposals || []);
      })
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markComplete = async (id, partnerUser) => {
    setCompletingId(id);
    try {
      await api(`/proposals/${id}/complete`, { method: 'PATCH' });
      load();
      setReviewingUser(partnerUser);
    } catch {}
    setCompletingId(null);
  };

  const activeDeals = proposals.filter((p) => p.escrowStatus === 'held');
  const completedDeals = proposals.filter((p) => p.escrowStatus === 'released');

  const displayedDeals = tab === 'active' ? activeDeals : completedDeals;

  return (
    <div className="pb-24 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          Your Campaigns & Work
        </h1>
        <p className="text-xs text-zinc-500 dark:text-[#8e95af] mt-1">
          Track brand campaigns you applied for, manage escrow deliveries, and view completed collaborations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-[#262a3e] pb-3">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            tab === 'active'
              ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-950/20'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:text-zinc-900 dark:bg-[#161926] dark:text-[#8e95af] dark:border-[#262a3e] dark:hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Active Campaigns ({activeDeals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('completed')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            tab === 'completed'
              ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-950/20'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:text-zinc-900 dark:bg-[#161926] dark:text-[#8e95af] dark:border-[#262a3e] dark:hover:text-white'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Completed Work ({completedDeals.length})</span>
        </button>
      </div>

      {/* Deals List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : displayedDeals.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d]">
          <Briefcase className="mx-auto h-10 w-10 text-zinc-300 dark:text-[#8e95af] mb-3" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            {tab === 'active' ? 'No active campaigns' : 'No completed work yet'}
          </h3>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-[#8e95af] max-w-sm mx-auto">
            {tab === 'active'
              ? 'When you apply to brand campaigns and the brand accepts your proposal, funds are locked in escrow and appear here.'
              : 'Completed campaigns and escrow releases will be archived here.'}
          </p>
          {tab === 'active' && (
            <Link to="/home" className="btn-primary mt-5 py-2.5 px-5 text-xs font-bold inline-flex">
              Explore Brand Campaigns <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedDeals.map((p) => {
            const isFromMe = String(p.fromUserId?._id || p.fromUserId) === String(user.id);
            const other = isFromMe ? p.toUserId : p.fromUserId;
            const [lng, lat] = p.meetupLocation?.coordinates || [0, 0];
            const hasMeetup = p.meetupLocation?.address || (lat && lng);

            return (
              <div
                key={p._id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060] transition-all"
              >
                {/* Top: Partner & Escrow Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link to={`/profile/${other?._id || other?.id}`}>
                      <Avatar user={other} size="md" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/profile/${other?._id || other?.id}`}
                          className="truncate text-sm font-extrabold text-zinc-900 dark:text-white hover:underline"
                        >
                          {other?.name || 'Brand Partner'}
                        </Link>
                        {other?.verificationStatus === 'verified' && (
                          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" title="Verified Business" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-[#8e95af] capitalize">
                        {other?.role} {other?.category && `· ${other.category}`}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-zinc-900 dark:text-white">
                      Rs. {p.offerAmount.toLocaleString()}
                    </p>
                    <div className="mt-1">
                      {tab === 'active' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                          <Lock className="h-3 w-3" /> Secured in Escrow
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Released & Paid
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Campaign Info */}
                {p.eventId && (
                  <div className="mt-3.5 rounded-2xl border border-zinc-100 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/event/${p.eventId._id}`}
                        className="text-xs font-bold text-zinc-900 dark:text-white hover:underline truncate max-w-sm"
                      >
                        Campaign: {p.eventId.title}
                      </Link>
                      {p.eventId.category && (
                        <span className="rounded-full bg-zinc-200 dark:bg-[#232542] px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
                          {p.eventId.category}
                        </span>
                      )}
                    </div>
                    {p.eventId.description && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] line-clamp-2">
                        {p.eventId.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Deliverables / Proposal Message */}
                {p.message && (
                  <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-200 mb-0.5">Deliverable Terms:</p>
                    <p className="italic bg-zinc-50 dark:bg-[#161926]/50 p-2.5 rounded-xl border border-zinc-100 dark:border-[#262a3e]">
                      "{p.message}"
                    </p>
                  </div>
                )}

                {/* Meetup / Shoot Location Map Preview */}
                {hasMeetup && (
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-100 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200 truncate">
                      <MapPin className="h-3.5 w-3.5 text-[#6366f1] shrink-0" />
                      <span className="truncate">Shoot / Meetup: {p.meetupLocation.address || 'Location Specified'}</span>
                    </div>
                    {lat && lng ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline shrink-0"
                      >
                        Directions <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                )}

                {/* Completion Notice */}
                {p.creatorConfirmedComplete && !p.businessConfirmedComplete && (
                  <p className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    ✓ You marked work delivered. Awaiting brand verification to release funds to your wallet.
                  </p>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100 dark:border-[#262a3e]">
                  <Link
                    to={`/proposal/${p._id}`}
                    className="btn-secondary py-2 px-4 text-xs font-bold"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Details
                  </Link>

                  <Link
                    to="/messages"
                    className="btn-secondary py-2 px-4 text-xs font-bold"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Message Brand
                  </Link>

                  {tab === 'active' && !p.creatorConfirmedComplete && (
                    <button
                      type="button"
                      disabled={completingId === p._id}
                      onClick={() => markComplete(p._id, other)}
                      className="btn-primary flex-1 py-2 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {completingId === p._id ? 'Submitting...' : 'Mark Work Complete'}
                    </button>
                  )}

                  {tab === 'completed' && (
                    <button
                      type="button"
                      onClick={() => setReviewingUser(other)}
                      className="btn-secondary flex-1 py-2 px-4 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Rate & Review Brand
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        open={!!reviewingUser}
        onClose={() => setReviewingUser(null)}
        targetUser={reviewingUser}
        onReviewed={load}
      />
    </div>
  );
}
