import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Lock, CheckCircle2, Clock, FileText, MessageCircle,
  MapPin, Star, ShieldCheck, ExternalLink, Check, X, AlertCircle,
  Play, Send, UploadCloud, Image, Video, File, Trash2, Link2, RotateCcw
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ReviewModal } from '../components/ui/ReviewModal.jsx';
import { GoogleMapViewer } from '../components/maps/GoogleMapViewer.jsx';

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// ── Horizontal scrollable stepper ────────────────────────────────────────────
function ProgressStepper({ steps }) {
  return (
    <div className="overflow-x-auto pb-2 -mx-1">
      <div className="flex items-start min-w-max px-1 gap-0">
        {steps.map((step, idx) => {
          const prevDone = idx === 0 || steps[idx - 1].done;
          const lineColor = prevDone && step.done
            ? 'bg-emerald-500'
            : 'bg-zinc-200 dark:bg-zinc-700';

          return (
            <div key={step.label} className="flex items-center">
              {/* Left connector line */}
              {idx > 0 && (
                <div className={`h-0.5 w-8 sm:w-12 flex-shrink-0 transition-all ${lineColor}`} />
              )}
              {/* Step circle + label */}
              <div className="flex flex-col items-center w-14 sm:w-16 flex-shrink-0">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    step.done
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200/60'
                      : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-[#1a1d2d] text-zinc-400'
                  }`}
                >
                  {step.done
                    ? <Check className="h-5 w-5 stroke-[2.5]" />
                    : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                <p className={`mt-2 text-[10px] sm:text-[11px] font-bold text-center leading-tight ${
                  step.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                }`}>
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vertical timeline ─────────────────────────────────────────────────────────
function TimelineItem({ item, isLast }) {
  const icons = {
    lock: <Lock className="h-4 w-4 text-white" />,
    file: <FileText className="h-4 w-4 text-white" />,
    play: <Play className="h-4 w-4 text-white fill-white" />,
    upload: <UploadCloud className="h-4 w-4 text-white" />,
    rotate: <RotateCcw className="h-4 w-4 text-white" />,
    check: <Check className="h-4 w-4 text-white stroke-[2.5]" />,
  };
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 ${item.color || (item.done ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700')}`}>
          {icons[item.icon] || <Check className="h-4 w-4 text-white" />}
        </div>
        {!isLast && <div className="w-0.5 bg-zinc-200 dark:bg-zinc-700 flex-1 my-1.5 min-h-[20px]" />}
      </div>
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-5'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.label}</p>
          {item.done && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${item.badgeClass || 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'}`}>
              {item.badgeText || 'DONE'}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
        {item.date && (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">{formatDateTime(item.date)}</p>
        )}
      </div>
    </div>
  );
}

export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [reviewingUser, setReviewingUser] = useState(null);

  // Submit deliverables modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [deliverableURL, setDeliverableURL] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [deliverableMedia, setDeliverableMedia] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Request revision modal state
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotesInput, setRevisionNotesInput] = useState('');

  const fileInputRef = useRef(null);

  const loadProposal = (silent = false) => {
    if (!silent) setLoading(true);
    api(`/proposals/${id}`)
      .then((d) => {
        setProposal(d.proposal);
        if (d.proposal?.deliverableURL) setDeliverableURL(d.proposal.deliverableURL);
        if (d.proposal?.deliverableNotes) setDeliverableNotes(d.proposal.deliverableNotes);
        if (d.proposal?.deliverableMedia) setDeliverableMedia(d.proposal.deliverableMedia);
      })
      .catch((err) => {
        if (!silent) setError(err.message);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  // Realtime Polling every 3 seconds for instant multi-device sync
  useEffect(() => {
    loadProposal(false);
    const interval = setInterval(() => {
      loadProposal(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingMedia(true);
    setActionError('');
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('media', file);
        const res = await api(`/proposals/${id}/deliverable-upload`, {
          method: 'POST',
          formData
        });
        if (res.media) {
          setDeliverableMedia((prev) => [...prev, res.media]);
        }
      }
    } catch (err) {
      setActionError(err.message || 'Failed to upload media file');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index) => {
    setDeliverableMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const act = async (action, body = {}) => {
    setActioning(true);
    setActionError('');
    setActionSuccess('');
    try {
      const response = await api(`/proposals/${id}/${action}`, { method: 'PATCH', body });
      let msg = 'Action completed successfully.';
      if (action === 'accept') msg = 'Proposal accepted! Escrow payment has been secured.';
      if (action === 'reject') msg = 'Proposal was declined.';
      if (action === 'start') msg = 'Status updated: Work Started.';
      if (action === 'submit') msg = 'Deliverables submitted successfully! Business has been notified.';
      if (action === 'request-revision') msg = 'Revision requested! Creator has been notified to make changes.';
      if (action === 'complete') {
        msg = response.proposal?.escrowStatus === 'released'
          ? 'Work confirmed and escrow released to creator!'
          : 'You confirmed work completion.';
      }
      setActionSuccess(msg);
      setProposal(response.proposal);
      setSubmitModalOpen(false);
      setRevisionModalOpen(false);
      setRevisionNotesInput('');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || `Failed to ${action} proposal`);
    } finally {
      setActioning(false);
    }
  };

  const handleMessage = async () => {
    if (!other?._id) return;
    try {
      await api('/messages', {
        method: 'POST',
        body: { toUserId: other._id, text: `Hi! Regarding "${proposal.eventId?.title || 'our collaboration'}": ` }
      }).catch(() => {});
    } finally {
      navigate('/messages');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  if (error) return (
    <div className="max-w-3xl mx-auto pt-8 px-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{error}</div>
    </div>
  );

  if (!proposal) return null;

  const currentUserId = String(user?.id || user?._id);
  const fromUserIdStr = String(proposal.fromUserId?._id || proposal.fromUserId);
  const toUserIdStr = String(proposal.toUserId?._id || proposal.toUserId);
  const isFromMe = fromUserIdStr === currentUserId;
  const isToMe = toUserIdStr === currentUserId;
  const other = isFromMe ? proposal.toUserId : proposal.fromUserId;
  const viewerIsBusiness = user?.role === 'business';

  const proposalDate = new Date(proposal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const paymentLabel = proposal.escrowStatus === 'released' ? 'Paid' : proposal.escrowStatus === 'held' ? 'Escrow Held' : 'Pending';

  const creatorFee = proposal.offerAmount;
  const businessPlatformFee = Math.round(creatorFee * 0.10);
  const creatorPlatformFee = Math.round(creatorFee * 0.10);
  const creatorReceives = creatorFee - creatorPlatformFee;
  const totalBusiness = creatorFee + businessPlatformFee;

  const isProjectComplete = proposal.escrowStatus === 'released';
  const isEscrowHeld = proposal.escrowStatus === 'held';
  const isPending = proposal.status === 'pending';
  const isRejected = proposal.status === 'rejected';
  const isAccepted = proposal.status === 'accepted';
  const canAcceptOrReject = isPending && isToMe;

  const isStarted = Boolean(proposal.workStarted || proposal.creatorConfirmedComplete || isProjectComplete);
  const isSubmitted = Boolean(proposal.creatorConfirmedComplete || isProjectComplete);
  const isApproved = Boolean(proposal.businessConfirmedComplete || isProjectComplete);

  // ── Progress steps in sequence ─────────────────────────────────────────────
  const creatorSteps = [
    { label: 'Accepted',        done: isAccepted || isEscrowHeld || isProjectComplete },
    { label: 'Payment Secured', done: isEscrowHeld || isProjectComplete },
    { label: 'Started',         done: isStarted },
    { label: 'Submitted',       done: isSubmitted },
    { label: 'Approved',        done: isApproved },
    { label: 'Released',        done: isProjectComplete },
  ];
  const businessSteps = [
    { label: 'Accepted',        done: isAccepted || isEscrowHeld || isProjectComplete },
    { label: 'Payment Secured', done: isEscrowHeld || isProjectComplete },
    { label: 'Started',         done: isStarted },
    { label: 'Submitted',       done: isSubmitted },
    { label: 'Review',          done: isSubmitted || isApproved },
    { label: 'Approved',        done: isApproved },
    { label: 'Released',        done: isProjectComplete },
  ];
  const progressSteps = viewerIsBusiness ? businessSteps : creatorSteps;

  // ── Activity Timeline ─────────────────────────────────────────────────────
  const timelineItems = [];
  if (isProjectComplete) {
    timelineItems.push({ icon: 'check', label: 'Funds Released', desc: 'Payment released to creator wallet.', date: proposal.updatedAt, done: true });
  }
  if (proposal.businessConfirmedComplete) {
    timelineItems.push({ icon: 'check', label: 'Work Approved & Confirmed', desc: 'Business approved the deliverables and released payment.', date: proposal.updatedAt, done: true });
  }
  if (proposal.revisionRequested) {
    timelineItems.push({
      icon: 'rotate',
      color: 'bg-amber-500',
      badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
      badgeText: 'REVISION',
      label: 'Revision Requested',
      desc: `Business requested updates: "${proposal.revisionNotes}"`,
      date: proposal.revisionRequestedAt || proposal.updatedAt,
      done: true
    });
  }
  if (proposal.creatorConfirmedComplete) {
    timelineItems.push({
      icon: 'upload',
      label: 'Deliverables Submitted',
      desc: proposal.deliverableMedia?.length > 0
        ? `Creator submitted ${proposal.deliverableMedia.length} media file(s) and project details for review.`
        : proposal.deliverableURL
        ? `Deliverable Link: ${proposal.deliverableURL}`
        : 'Creator submitted project deliverables for business review.',
      date: proposal.submittedAt || proposal.creatorConfirmedAt || proposal.updatedAt,
      done: true
    });
  }
  if (proposal.workStarted) {
    timelineItems.push({ icon: 'play', label: 'Work Started', desc: 'Creator marked the content creation phase as started.', date: proposal.workStartedAt || proposal.updatedAt, done: true });
  }
  if (isEscrowHeld || isProjectComplete) {
    timelineItems.push({ icon: 'lock', label: 'Payment Secured', desc: "Funds safely held in Escrow by platform.", date: proposal.updatedAt, done: true });
  }
  if (isAccepted || isEscrowHeld || isProjectComplete) {
    timelineItems.push({ icon: 'check', label: 'Proposal Accepted', desc: `${viewerIsBusiness ? 'Creator applied to' : 'Business selected'} your proposal.`, date: proposal.createdAt, done: true });
  }
  timelineItems.push({ icon: 'file', label: 'Proposal Sent', desc: `Offer of ₹${creatorFee.toLocaleString()} was submitted.`, date: proposal.createdAt, done: true });

  return (
    <div className="max-w-3xl mx-auto pb-20 px-0">
      {/* Back */}
      <button onClick={() => navigate('/proposals')} className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Proposals
      </button>

      {/* Alerts */}
      {actionError && (
        <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2 text-xs text-red-800 font-semibold">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" /><span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2 text-xs text-emerald-800 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span>{actionSuccess}</span>
        </div>
      )}

      {/* Status banners */}
      {isPending && isFromMe && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 text-xs text-amber-800">
            <span className="font-bold">Awaiting Response</span>
            <p className="mt-0.5 text-amber-700">Waiting for {other?.name} to review and respond.</p>
          </div>
        </div>
      )}
      {isRejected && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <X className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1 text-xs text-red-800">
            <span className="font-bold">Proposal Declined</span>
            <p className="mt-0.5 text-red-700">This proposal was not accepted.</p>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight">
              {proposal.eventId?.title || 'Collaboration Proposal'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-zinc-500">Proposal with</span>
              <Link to={`/profile/${other?._id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                {other?.name} <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="flex sm:flex-col sm:items-end items-center gap-3 sm:gap-0 flex-shrink-0">
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">₹{creatorFee.toLocaleString()}</p>
            <div>
              {isEscrowHeld && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800"><Lock className="h-3 w-3" /> Escrow Held</span>}
              {isProjectComplete && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Released</span>}
              {isPending && <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600"><Clock className="h-3 w-3" /> Pending</span>}
              {isRejected && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold text-red-700"><X className="h-3 w-3" /> Declined</span>}
            </div>
          </div>
        </div>

        {/* Counterparty card */}
        {other && (
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-3 sm:p-3.5 shadow-xs mb-4 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar user={other} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">{other.name}</span>
                  {other.verificationStatus === 'verified' && <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                </div>
                <p className="text-[11px] text-zinc-500 capitalize">{other.role}{other.category ? ` · ${other.category}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link to={`/profile/${other._id}`} className="btn-secondary py-1.5 px-2.5 sm:px-3 text-xs font-bold whitespace-nowrap">Profile</Link>
              <button type="button" onClick={handleMessage} className="btn-primary py-1.5 px-2.5 sm:px-3 text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                <MessageCircle className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Chat</span><span className="sm:hidden">Chat</span>
              </button>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-2.5 sm:p-3">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-zinc-400">Proposal Date</p>
            <p className="mt-1 text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-white">{proposalDate}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-2.5 sm:p-3">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-zinc-400">Payment</p>
            <p className={`mt-1 text-[11px] sm:text-xs font-bold ${isProjectComplete ? 'text-emerald-600' : isEscrowHeld ? 'text-amber-600' : 'text-zinc-600'}`}>{paymentLabel}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-2.5 sm:p-3">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-zinc-400">Campaign</p>
            <p className="mt-1 text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-white truncate">{proposal.eventId?.title || 'Direct Deal'}</p>
          </div>
        </div>
      </div>

      {/* ── Event Progress Stepper ─────────────────────────────────────────── */}
      <div className="mb-5 rounded-3xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-4 sm:p-6 shadow-xs">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-5">Event Progress</h2>
        <ProgressStepper steps={progressSteps} />
      </div>

      {/* ── Action Card for Active Deals ───────────────────────────────────── */}
      {isEscrowHeld && (
        <div className="mb-5 rounded-3xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-4 sm:p-5 shadow-xs">
          {/* CREATOR VIEW ACTIONS */}
          {!viewerIsBusiness && (
            <div>
              {/* Revision Notice for Creator */}
              {proposal.revisionRequested && (
                <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                    <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
                    Changes / Revision Requested by Business
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200 bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-amber-200/60 my-2 italic">
                    "{proposal.revisionNotes}"
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">
                    Please review the feedback above, make the requested adjustments, and submit your updated deliverables below.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(true)}
                    className="btn-primary bg-amber-600 hover:bg-amber-700 py-2 px-5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <UploadCloud className="h-4 w-4" /> Submit Revised Work
                  </button>
                </div>
              )}

              {!proposal.workStarted && !proposal.creatorConfirmedComplete && !proposal.revisionRequested && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Payment Secured in Escrow</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Click below once you begin working on this project.</p>
                  </div>
                  <button
                    type="button"
                    disabled={actioning}
                    onClick={() => act('start')}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {actioning ? 'Updating...' : 'Work Started'}
                  </button>
                </div>
              )}

              {proposal.workStarted && !proposal.creatorConfirmedComplete && !proposal.revisionRequested && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Work in Progress
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Ready with the deliverables? Submit your work for business approval.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(true)}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 py-2 px-5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <UploadCloud className="h-4 w-4" /> Submit Work
                  </button>
                </div>
              )}

              {proposal.creatorConfirmedComplete && (
                <div className="rounded-2xl bg-zinc-50 dark:bg-[#161926] p-3.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2 font-bold text-emerald-600 mb-1">
                    <CheckCircle2 className="h-4 w-4" /> Work Submitted
                  </div>
                  <p className="text-zinc-500">Waiting for business to review deliverables and approve escrow payment.</p>
                </div>
              )}
            </div>
          )}

          {/* BUSINESS VIEW ACTIONS */}
          {viewerIsBusiness && (
            <div>
              {!proposal.creatorConfirmedComplete && (
                <div className="text-xs text-zinc-500">
                  {proposal.revisionRequested
                    ? `You requested changes on deliverables: "${proposal.revisionNotes}". Waiting for creator to submit revised work.`
                    : proposal.workStarted
                    ? 'Creator has started working on the deliverables.'
                    : 'Funds are secured in escrow. Waiting for creator to begin work.'}
                </div>
              )}

              {proposal.creatorConfirmedComplete && !proposal.businessConfirmedComplete && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Deliverables Ready for Review
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Review the submitted work below. If satisfied, approve to release escrow funds, or request changes/revisions from the creator.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={actioning}
                      onClick={() => act('complete')}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700 py-2 px-5 text-xs font-bold flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {actioning ? 'Releasing Escrow...' : 'Approve & Release Escrow'}
                    </button>
                    <button
                      type="button"
                      disabled={actioning}
                      onClick={() => setRevisionModalOpen(true)}
                      className="btn-secondary text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Request Changes / Revision
                    </button>
                  </div>
                </div>
              )}

              {proposal.businessConfirmedComplete && (
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Work Approved &amp; Escrow Released
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Submitted Deliverables Card (Photos, Videos, Links & Notes) ──────── */}
      {(proposal.creatorConfirmedComplete || proposal.deliverableMedia?.length > 0 || proposal.deliverableURL || proposal.deliverableNotes) && (
        <div className="mb-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-[#162224] p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4 text-emerald-600" /> Submitted Deliverables
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
              Proof of Work
            </span>
          </div>

          {/* Uploaded Photos & Videos Grid */}
          {proposal.deliverableMedia?.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {proposal.deliverableMedia.map((m, idx) => (
                <div key={idx} className="group relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-black aspect-video flex items-center justify-center">
                  {m.mediaType === 'video' ? (
                    <video src={m.url} controls className="w-full h-full object-cover" />
                  ) : (
                    <a href={m.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                      <img src={m.url} alt={m.name || 'Deliverable'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </a>
                  )}
                  {m.name && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-white truncate">
                      {m.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Deliverable Link */}
          {proposal.deliverableURL && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Link2 className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-zinc-500">Content URL:</span>
              <a
                href={proposal.deliverableURL.startsWith('http') ? proposal.deliverableURL : `https://${proposal.deliverableURL}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-indigo-600 hover:underline truncate max-w-sm flex items-center gap-1"
              >
                {proposal.deliverableURL} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Notes */}
          {proposal.deliverableNotes && (
            <div className="mt-3 rounded-2xl bg-white dark:bg-[#1a1d2d] p-3 border border-emerald-200/60 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">Creator Notes:</span>
              {proposal.deliverableNotes}
            </div>
          )}
        </div>
      )}

      {/* ── Project Complete Banner ──────────────────────────────────────────── */}
      {isProjectComplete && (
        <div className="mb-5 rounded-3xl border-l-4 border-emerald-500 bg-white dark:bg-[#1a1d2d] shadow-xs p-4 sm:p-5 flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white">Project Complete &amp; Escrow Released!</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">This collaboration has been successfully completed.</p>
            <button
              type="button"
              onClick={() => setReviewingUser(other)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Star className="h-3.5 w-3.5 fill-current" /> Rate &amp; Leave Review
            </button>
          </div>
        </div>
      )}

      {/* ── Activity Timeline ────────────────────────────────────────────────── */}
      <div className="mb-5 rounded-3xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-4 sm:p-6 shadow-xs">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-5">Activity Timeline</h2>
        <div>
          {timelineItems.map((item, idx) => (
            <TimelineItem key={idx} item={item} isLast={idx === timelineItems.length - 1} />
          ))}
        </div>
      </div>

      {/* ── Deal Terms ───────────────────────────────────────────────────────── */}
      {proposal.message && (
        <div className="mb-5 rounded-3xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-4 sm:p-6 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Deal Terms &amp; Deliverables</h2>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{proposal.message}</p>
        </div>
      )}

      {/* ── Meetup Location ──────────────────────────────────────────────────── */}
      {proposal.meetupLocation?.address && (
        <div className="mb-5">
          <GoogleMapViewer
            coordinates={proposal.meetupLocation.coordinates || [0, 0]}
            address={proposal.meetupLocation.address}
            title="Shoot / Meetup Location"
            height="h-48"
          />
        </div>
      )}

      {/* ── Payment Details ───────────────────────────────────────────────────── */}
      <div className="mb-5 rounded-3xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-4 sm:p-6 shadow-xs">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Payment Details</h2>
        <div className="space-y-3 text-xs mb-5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-[#8e95af]">Deal Amount</span>
            <span className="font-bold text-zinc-900 dark:text-white">₹{creatorFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-[#8e95af]">Platform Fee &mdash; Business (10%)</span>
            <span className="font-bold text-zinc-900 dark:text-white">&minus;₹{businessPlatformFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-[#8e95af]">Platform Fee &mdash; Creator (10%)</span>
            <span className="font-bold text-zinc-900 dark:text-white">&minus;₹{creatorPlatformFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-[#8e95af]">Creator Receives</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{creatorReceives.toLocaleString()}</span>
          </div>
        </div>
        <div className="border-t border-zinc-200 dark:border-[#262a3e] pt-3 flex items-center justify-between text-xs mb-4">
          <span className="font-bold text-zinc-900 dark:text-white">Business Total &mdash; Pays</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{totalBusiness.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs mb-4 flex-wrap gap-2">
          <span className="text-zinc-500">Payment Status</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
            isProjectComplete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            : isEscrowHeld ? 'bg-amber-100 text-amber-700'
            : 'bg-zinc-100 text-zinc-600'
          }`}>
            {isProjectComplete ? 'Released' : isEscrowHeld ? 'In Escrow' : 'Pending'}
          </span>
        </div>
        <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="text-emerald-800 dark:text-emerald-300 font-semibold leading-relaxed">Payment is securely held until work is approved.</span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Your payment is secure with eSewa, Khalti and Fonepay.
        </p>
      </div>

      {/* ── Bottom Action Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
        <button type="button" onClick={handleMessage}
          className="btn-secondary flex-1 min-w-[120px] py-3 px-3 text-xs font-bold flex items-center justify-center gap-2">
          <MessageCircle className="h-4 w-4" /> Message {other?.name?.split(' ')[0]}
        </button>

        {canAcceptOrReject && (
          <>
            <button type="button" disabled={actioning} onClick={() => act('accept')}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[120px] py-3 px-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <Check className="h-4 w-4" /> {actioning ? 'Processing...' : 'Accept'}
            </button>
            <button type="button" disabled={actioning} onClick={() => act('reject')}
              className="rounded-2xl border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-100 py-3 px-4 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
              <X className="h-4 w-4" /> Decline
            </button>
          </>
        )}

        {isProjectComplete && (
          <button type="button" onClick={() => setReviewingUser(other)}
            className="btn-secondary flex-1 min-w-[120px] py-3 px-3 text-xs font-bold flex items-center justify-center gap-2 text-amber-700 bg-amber-50/60 hover:bg-amber-100">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Rate &amp; Review
          </button>
        )}
      </div>

      {/* ── Submit Deliverables Modal (Upload photos, videos & links) ────────── */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1a1d2d] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-emerald-600" /> {proposal.revisionRequested ? 'Submit Revised Deliverables' : 'Submit Work Deliverables'}
              </h3>
              <button onClick={() => setSubmitModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Upload proof of work (photos, video clips) and attach direct links (Instagram, TikTok, YouTube, Drive) for the business to review.
            </p>

            <div className="space-y-4">
              {/* 1. File Upload Dropzone */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Upload Photos or Videos
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  id="deliverable-file-input"
                />
                <label
                  htmlFor="deliverable-file-input"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 rounded-2xl p-4 cursor-pointer transition-colors bg-zinc-50 dark:bg-[#161926]"
                >
                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    {uploadingMedia ? (
                      <>
                        <Spinner size="sm" />
                        <span>Uploading files...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Click to upload photos or videos</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">Supports JPG, PNG, MP4, MOV, WEBM (up to 50MB)</p>
                </label>

                {/* Uploaded media previews */}
                {deliverableMedia.length > 0 && (
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {deliverableMedia.map((m, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-black aspect-video group">
                        {m.mediaType === 'video' ? (
                          <video src={m.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1 opacity-90 hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white px-1.5 py-0.5 truncate">
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Content / Post URL */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Content / Post Link (Instagram, TikTok, YouTube, Drive)
                </label>
                <div className="relative">
                  <Link2 className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={deliverableURL}
                    onChange={(e) => setDeliverableURL(e.target.value)}
                    placeholder="https://instagram.com/reel/... or https://tiktok.com/@..."
                    className="input pl-9 text-xs"
                  />
                </div>
              </div>

              {/* 3. Notes & Caption */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Notes &amp; Description for Business
                </label>
                <textarea
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  placeholder="e.g. Published on Instagram Reel with brand tags, audio overlay, and link in bio."
                  rows="3"
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="btn-secondary flex-1 py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actioning || uploadingMedia || (!deliverableURL && !deliverableNotes && deliverableMedia.length === 0)}
                onClick={() => act('submit', { deliverableURL, deliverableNotes, deliverableMedia })}
                className="btn-primary flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {actioning ? 'Submitting...' : 'Submit Deliverables'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Revision Modal (Business side) ─────────────────────────── */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1a1d2d] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600" /> Request Changes / Revisions
              </h3>
              <button onClick={() => setRevisionModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Please specify what changes, adjustments, or re-edits are needed from the creator before approving the escrow payment.
            </p>

            <div>
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Revision Details &amp; Feedback *
              </label>
              <textarea
                value={revisionNotesInput}
                onChange={(e) => setRevisionNotesInput(e.target.value)}
                placeholder="e.g. Please add the brand logo in the first 3 seconds and include the discount promo code COLLAB10 in the caption."
                rows="4"
                className="input text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setRevisionModalOpen(false)}
                className="btn-secondary flex-1 py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actioning || !revisionNotesInput.trim()}
                onClick={() => act('request-revision', { revisionNotes: revisionNotesInput })}
                className="btn-primary flex-1 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
              >
                {actioning ? 'Sending...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal open={!!reviewingUser} onClose={() => setReviewingUser(null)} targetUser={other} onReviewed={() => loadProposal(true)} />
    </div>
  );
}
