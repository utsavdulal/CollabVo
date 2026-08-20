import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Lock, CheckCircle2, Clock, FileText, MessageCircle,
  MapPin, Star, ShieldCheck, ExternalLink
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ReviewModal } from '../components/ui/ReviewModal.jsx';

export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingUser, setReviewingUser] = useState(null);

  useEffect(() => {
    api(`/proposals/${id}`)
      .then((d) => setProposal(d.proposal))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );

  if (error)
    return (
      <div className="max-w-3xl mx-auto pt-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {error}
        </div>
      </div>
    );

  if (!proposal) return null;

  const isFromMe = String(proposal.fromUserId?._id) === String(user?.id);
  const other = isFromMe ? proposal.toUserId : proposal.fromUserId;
  const viewerIsBusiness = user?.role === 'business';

  const proposalDate = new Date(proposal.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const eventIdShort = proposal.eventId?._id ? `${String(proposal.eventId._id).slice(0, 8)}...` : '';
  const paymentLabel =
    proposal.escrowStatus === 'released'
      ? 'Paid'
      : proposal.escrowStatus === 'held'
        ? 'Escrow Held'
        : 'Pending';
  
  // Calculate payment breakdown (5% platform fee + 13% VAT on fee)
  const creatorFee = proposal.offerAmount;
  const platformFee = creatorFee * 0.05;
  const vatOnFee = platformFee * 0.13;
  const totalDeduction = platformFee + vatOnFee;
  const creatorReceives = creatorFee - totalDeduction;

  // Event progress steps based on viewer role
  const getProgressSteps = () => {
    if (!viewerIsBusiness) {
      return [
        { name: 'Started', done: proposal.escrowStatus === 'held' || proposal.escrowStatus === 'released' },
        { name: 'Submitted', done: proposal.creatorConfirmedComplete },
        { name: 'Approved', done: proposal.businessConfirmedComplete },
        { name: 'Released', done: proposal.escrowStatus === 'released' }
      ];
    }
    return [
      { name: 'Accepted', done: proposal.status === 'accepted' || proposal.escrowStatus !== 'none' },
      { name: 'Payment', done: proposal.escrowStatus === 'held' || proposal.escrowStatus === 'released' },
      { name: 'Secured', done: proposal.escrowStatus === 'held' || proposal.escrowStatus === 'released' },
      { name: 'Waiting', done: proposal.creatorConfirmedComplete || proposal.escrowStatus === 'released' },
      { name: 'Started', done: proposal.escrowStatus === 'released' }
    ];
  };

  const progressSteps = getProgressSteps();
  const isProjectComplete = proposal.escrowStatus === 'released';

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Proposals
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">
              {proposal.eventId?.title || 'Direct Collaboration'}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              by <span className="font-semibold text-zinc-700">{other?.name}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-zinc-900">₹{creatorFee.toLocaleString()}</p>
            <div className="mt-2">
              {proposal.escrowStatus === 'held' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                  <Lock className="h-3 w-3" /> Escrow Held
                </span>
              )}
              {proposal.escrowStatus === 'released' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> Released
                </span>
              )}
              {proposal.status === 'pending' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600">
                  <Clock className="h-3 w-3" /> Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {proposal.eventId && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-600">
              <FileText className="h-3.5 w-3.5" />
              <span>{proposal.eventId.category}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-600">
              <span>Budget: ₹{proposal.eventId.budget?.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Proposal meta: date, payment, event id */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Proposal Date</p>
            <p className="mt-1 text-xs font-bold text-zinc-900">{proposalDate}</p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Payment</p>
            <p
              className={`mt-1 text-xs font-bold ${
                proposal.escrowStatus === 'released'
                  ? 'text-emerald-600'
                  : proposal.escrowStatus === 'held'
                    ? 'text-amber-600'
                    : 'text-zinc-600'
              }`}
            >
              {paymentLabel}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Event ID</p>
            <p className="mt-1 text-xs font-bold text-zinc-900">{eventIdShort || 'Direct'}</p>
          </div>
        </div>
      </div>

      {/* Event Progress Timeline */}
      <div className="mb-8 rounded-2xl border border-zinc-200/80 bg-white p-6">
        <h2 className="text-sm font-bold text-zinc-900 mb-6">Event Progress</h2>
        <div className="flex items-center justify-between">
          {progressSteps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all ${
                  step.done
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                {step.done ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
              </div>
              <p className="text-xs font-semibold text-center text-zinc-700">{step.name}</p>
              {idx < progressSteps.length - 1 && (
                <div
                  className={`absolute h-0.5 w-12 mt-5 transition-all ${
                    step.done ? 'bg-emerald-200' : 'bg-zinc-200'
                  }`}
                  style={{ left: `calc(50% + ${idx * 80}px)` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Project Complete Status */}
      {isProjectComplete && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex gap-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-emerald-900">Project Complete!</h3>
            <p className="text-sm text-emerald-800 mt-1">This collaboration is complete.</p>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="mb-8 rounded-2xl border border-zinc-200/80 bg-white p-6">
        <h2 className="text-sm font-bold text-zinc-900 mb-4">Activity Timeline</h2>
        <div className="space-y-4">
          {proposal.escrowStatus === 'held' && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="h-12 w-0.5 bg-zinc-200 my-2" />
              </div>
              <div className="pb-4">
                <p className="font-semibold text-zinc-900 text-sm">Payment Secured</p>
                <p className="text-xs text-zinc-500 mt-0.5">Funds safely held by platform.</p>
                <p className="text-xs text-zinc-400 mt-2">
                  {new Date(proposal.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {proposal.escrowStatus === 'released' && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="h-12 w-0.5 bg-zinc-200 my-2" />
              </div>
              <div className="pb-4">
                <p className="font-semibold text-zinc-900 text-sm">Funds Released</p>
                <p className="text-xs text-zinc-500 mt-0.5">Payment released to creator.</p>
                <p className="text-xs text-zinc-400 mt-2">
                  {new Date(proposal.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 text-sm">Proposal Accepted</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {proposal.fromUserId?.role === 'business' ? 'Business' : 'Creator'} selected your proposal.
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                {new Date(proposal.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-8 rounded-2xl border border-zinc-200/80 bg-white p-6">
        <h2 className="text-sm font-bold text-zinc-900 mb-4">Payment Details</h2>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">Creator Fee</span>
            <span className="font-semibold text-zinc-900">₹{creatorFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">Platform Fee (5%)</span>
            <span className="font-semibold text-zinc-900">₹{platformFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">VAT (13% of fee)</span>
            <span className="font-semibold text-zinc-900">₹{vatOnFee.toLocaleString()}</span>
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-900">Total Creator Receives</span>
            <span className="text-lg font-bold text-emerald-700">₹{creatorReceives.toLocaleString()}</span>
          </div>
        </div>

        <div
          className={`mt-4 rounded-lg border p-3 ${
            isProjectComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex gap-2">
            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isProjectComplete ? 'text-emerald-600' : 'text-amber-600'}`} />
            <p className={`text-xs ${isProjectComplete ? 'text-emerald-800' : 'text-amber-800'}`}>
              <span className="font-semibold">
                Payment Status: {isProjectComplete ? 'Released' : 'Held in Escrow'}
              </span>
              <br />
              {isProjectComplete
                ? 'Payment released to the creator.'
                : 'Payment is securely held until work is approved.'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span>Your payment is secure with eSewa, Khalti and Fonepay.</span>
        </div>
      </div>

      {/* Proposal Message */}
      {proposal.message && (
        <div className="mb-8 rounded-2xl border border-zinc-200/80 bg-white p-6">
          <h2 className="text-sm font-bold text-zinc-900 mb-3">Deal Terms & Deliverables</h2>
          <p className="text-sm text-zinc-700 leading-relaxed">{proposal.message}</p>
        </div>
      )}

      {/* Meetup Location */}
      {proposal.meetupLocation?.address && (
        <div className="mb-8 rounded-2xl border border-zinc-200/80 bg-white p-6">
          <h2 className="text-sm font-bold text-zinc-900 mb-3">Meetup Location</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-zinc-600" />
              <span className="text-zinc-900 font-semibold">{proposal.meetupLocation.address}</span>
            </div>
            {proposal.meetupLocation.coordinates && proposal.meetupLocation.coordinates[0] && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${proposal.meetupLocation.coordinates[1]},${proposal.meetupLocation.coordinates[0]}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                View Map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          className="btn-secondary flex-1 py-2 px-4 text-sm flex items-center justify-center gap-2"
        >
          <MessageCircle className="h-4 w-4" /> Message
        </button>
        {isProjectComplete && (
          <button
            type="button"
            onClick={() => setReviewingUser(other)}
            className="btn-secondary flex-1 py-2 px-4 text-sm flex items-center justify-center gap-2 text-amber-700 bg-amber-50/60 hover:bg-amber-100"
          >
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Rate & Review
          </button>
        )}
      </div>

      <ReviewModal
        open={!!reviewingUser}
        onClose={() => setReviewingUser(null)}
        targetUser={other}
        onReviewed={() =>
          api(`/proposals/${proposal._id}`)
            .then((d) => setProposal(d.proposal))
            .catch(() => {})
        }
      />
    </div>
  );
}
