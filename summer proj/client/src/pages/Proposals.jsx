import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check, X, Flag, Plus, MapPin, Star, ShieldCheck, ExternalLink,
  Inbox, Send, Lock, CheckCircle2, MessageCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/api.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ReviewModal } from '../components/ui/ReviewModal.jsx';
import { PlaceInput } from '../components/ui/PlaceInput.jsx';

export default function Proposals() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const isBusiness = user?.role === 'business';

  // Default tab for business is 'incoming' (applications by creators to your posts);
  const defaultTab = isBusiness ? 'incoming' : 'all';
  const tab = searchParams.get('tab') || defaultTab;
  const eventFilterId = searchParams.get('eventId') || '';

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(!!searchParams.get('creator'));
  const [reviewingUser, setReviewingUser] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    let url = `/proposals?`;
    const params = new URLSearchParams();

    if (isBusiness) {
      // Business-specific tabs
      if (tab === 'incoming') {
        params.set('direction', 'incoming');
        params.set('tab', 'pending');
      } else if (tab === 'outgoing') {
        params.set('direction', 'outgoing');
      } else if (tab === 'active') {
        params.set('tab', 'accepted');
      }
    } else {
      // Creator tabs: all, pending, accepted, rejected
      if (tab !== 'all') {
        params.set('tab', tab);
      }
    }

    if (eventFilterId) {
      params.set('eventId', eventFilterId);
    }

    api(`/proposals?${params.toString()}`)
      .then((d) => setProposals(d.proposals || []))
      .catch((err) => {
        setError(err.message || 'Failed to load proposals');
        setProposals([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab, eventFilterId]);

  const setTab = (t) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', t);
    setSearchParams(next);
  };

  const act = async (id, action) => {
    setActioningId(id);
    setError('');
    setSuccess('');
    try {
      const response = await api(`/proposals/${id}/${action}`, { method: 'PATCH' });

      let message = 'Action completed successfully';
      if (action === 'accept') message = 'Proposal accepted! Escrow is now secured.';
      if (action === 'reject') message = 'Proposal declined successfully.';
      if (action === 'complete') {
        message = response.proposal?.escrowStatus === 'released'
          ? 'Work marked complete and escrow released!'
          : 'You marked the work complete. Funds release once the other party also confirms.';
      }
      setSuccess(message);
      setTimeout(() => setSuccess(''), 3000);
      
      // Update the proposal in state immediately
      setProposals(prev => prev.map(p => p._id === id ? response.proposal : p));
      load();
    } catch (err) {
      setError(err.message || `Failed to ${action} proposal`);
    } finally {
      setActioningId(null);
    }
  };

  const escrowChip = (p) => {
    if (p.escrowStatus === 'held')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
          <Lock className="h-3 w-3" /> Funds in Escrow
        </span>
      );
    if (p.escrowStatus === 'released')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" /> Escrow Released
        </span>
      );
    if (p.status === 'accepted')
      return (
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600">
          Accepted
        </span>
      );
    if (p.status === 'rejected')
      return (
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-700">
          Rejected
        </span>
      );
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600">
        Pending Review
      </span>
    );
  };

  return (
    <div className="pb-16 max-w-3xl mx-auto">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2.5">
          <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-800">{error}</p>
          </div>
          <button type="button" onClick={() => setError('')} className="text-red-600 hover:text-red-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-emerald-800">{success}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {isBusiness ? 'Campaign Proposals & Escrow' : 'Collaboration Proposals'}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isBusiness
              ? 'Review creator applications, manage outgoing offers, and release escrow upon delivery.'
              : 'Track incoming brand offers and campaign proposals.'}
          </p>
        </div>
        {isBusiness && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="btn-primary py-2 px-3.5 text-xs shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Proposal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1.5 border-b border-zinc-200/80 pb-3 overflow-x-auto">
        {isBusiness ? (
          <>
            <button
              type="button"
              onClick={() => setTab('incoming')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                tab === 'incoming'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Creator Applications to Posts</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('outgoing')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                tab === 'outgoing'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Offers Sent to Creators</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('active')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                tab === 'active'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Active Deals (Escrow Held)</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('all')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                tab === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <span>All History</span>
            </button>
          </>
        ) : (
          ['all', 'pending', 'accepted', 'rejected'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                tab === t
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {t}
            </button>
          ))
        )}
      </div>

      {/* Compose Form */}
      {composing && (
        <ComposeForm
          me={user}
          initialCreatorId={searchParams.get('creator')}
          onDone={() => {
            setComposing(false);
            load();
          }}
          onCancel={() => setComposing(false)}
        />
      )}

      {/* Proposals List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-12 text-center text-xs text-zinc-400">
          <p className="font-bold text-zinc-700 text-sm">No proposals in this view</p>
          <p className="mt-1">
            {isBusiness && tab === 'incoming'
              ? 'When creators apply to your campaign posts, their applications will appear here.'
              : isBusiness && tab === 'outgoing'
              ? 'Offers you send out directly to creators will appear here.'
              : 'No proposals match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const isFromMe = String(p.fromUserId?._id || p.fromUserId) === String(user.id);
            const other = isFromMe ? p.toUserId : p.fromUserId;
            const isIncoming = !isFromMe;

            const canAccept =
              p.status === 'pending' &&
              ((isIncoming && !p.businessAccepted && isBusiness) ||
                (isIncoming && !p.creatorAccepted && !isBusiness));

            const canReject = p.status === 'pending';
            const canComplete = p.status === 'accepted' && p.escrowStatus === 'held';
            const isCompleted = p.escrowStatus === 'released';

            const [lng, lat] = p.meetupLocation?.coordinates || [0, 0];
            const hasMeetup = p.status === 'accepted' && (p.meetupLocation?.address || (lat && lng));

            return (
              <div
                key={p._id}
                className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs hover:border-zinc-300 transition-all"
              >
                <Link
                  to={`/proposal/${p._id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-3 hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link to={`/profile/${other?._id || other?.id}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar user={other} size="md" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/profile/${other?._id || other?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="truncate text-sm font-bold text-zinc-900 hover:underline"
                          >
                            {other?.name || 'Collaborator'}
                          </Link>
                          {other?.verificationStatus === 'verified' && (
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 capitalize">
                          {isIncoming
                            ? isBusiness
                              ? 'Applied to your campaign'
                              : 'Offered a campaign deal'
                            : 'You proposed to'} · {other?.role}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-extrabold text-zinc-900">
                        ₹{p.offerAmount.toLocaleString()}
                      </p>
                      <div className="mt-0.5">{escrowChip(p)}</div>
                    </div>
                  </div>
                </Link>

                {p.message && (
                  <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 leading-relaxed">
                    "{p.message}"
                  </p>
                )}

                {p.eventId && (
                  <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-500">
                    <Link
                      to={`/event/${p.eventId._id}`}
                      className="font-bold text-zinc-900 hover:underline truncate max-w-sm"
                    >
                      Campaign: {p.eventId.title}
                    </Link>
                    {p.eventId.budget > 0 && (
                      <span className="text-[11px] text-zinc-400">
                        Budget: ₹{p.eventId.budget.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Meetup Map Preview on Acceptance */}
                {hasMeetup && (
                  <div className="mt-3.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 truncate">
                        <MapPin className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                        <span className="truncate">Meetup Location: {p.meetupLocation.address || `${lat}, ${lng}`}</span>
                      </div>
                      {lat && lng ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-bold text-zinc-900 hover:underline shrink-0"
                        >
                          Directions <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Status Notice */}
                {p.status === 'pending' && !canAccept && (
                  <p className="mt-2.5 text-[11px] text-zinc-400 font-medium">
                    Awaiting response from {other?.name || 'partner'}.
                  </p>
                )}

                {p.status === 'accepted' && p.escrowStatus === 'held' &&
                  ((p.businessConfirmedComplete && !p.creatorConfirmedComplete) ||
                   (p.creatorConfirmedComplete && !p.businessConfirmedComplete)) && (
                  <p className="mt-2.5 text-[11px] text-amber-700 font-medium bg-amber-50 p-2 rounded-lg">
                    {p.creatorConfirmedComplete
                      ? 'Creator marked the work delivered. Confirm to release funds to their wallet.'
                      : 'You marked work complete. Awaiting creator confirmation to finalize release.'}
                  </p>
                )}

                {/* Action Buttons */}

                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-zinc-100">
                  <Link
                    to={`/messages`}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Message
                  </Link>

                {canAccept && (
                    <button
                      type="button"
                      onClick={() => act(p._id, 'accept')}
                      disabled={actioningId === p._id}
                      className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actioningId === p._id ? (
                        <>
                          <Spinner size="sm" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" /> Accept & Secure Escrow
                        </>
                      )}
                    </button>
                  )}

                  {canReject && (
                    <button
                      type="button"
                      onClick={() => act(p._id, 'reject')}
                      disabled={actioningId === p._id}
                      className="btn-secondary py-1.5 px-3 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {actioningId === p._id ? (
                        <>
                          <Spinner size="sm" />
                          Declining...
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" /> Decline
                        </>
                      )}
                    </button>
                  )}

                  {canComplete && (
                    <button
                      type="button"
                      onClick={() => act(p._id, 'complete')}
                      disabled={actioningId === p._id}
                      className="btn-primary flex-1 bg-emerald-700 hover:bg-emerald-800 border-emerald-700 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actioningId === p._id ? (
                        <>
                          <Spinner size="sm" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Flag className="h-3.5 w-3.5" /> Confirm Work Delivered & Release Escrow
                        </>
                      )}
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => setReviewingUser(other)}
                      className="btn-secondary flex-1 py-1.5 text-xs text-amber-800 bg-amber-50/60 hover:bg-amber-100"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Rate & Review Partner
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReviewModal
        open={!!reviewingUser}
        onClose={() => setReviewingUser(null)}
        targetUser={reviewingUser}
        onReviewed={() => load()}
      />
    </div>
  );
}

function ComposeForm({ me, initialCreatorId, onDone, onCancel }) {
  const [toUserId, setToUserId] = useState(initialCreatorId || '');
  const [eventId, setEventId] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [meetupLocation, setMeetupLocation] = useState({ coordinates: [77.2, 28.6], address: '' });
  const [creators, setCreators] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/users/search?role=creator').then((d) => setCreators(d.users || [])).catch(() => {});
    api('/events?mine=true').then((d) => setMyEvents(d.events || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!toUserId || !offerAmount) {
      setError('Creator and offer amount are required');
      return;
    }
    setBusy(true);
    try {
      await api('/proposals', {
        method: 'POST',
        body: {
          toUserId,
          eventId: eventId || undefined,
          offerAmount: Number(offerAmount),
          message,
          meetupLocation: meetupLocation.address ? meetupLocation : undefined
        }
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
        <h2 className="text-sm font-bold text-zinc-900">Send Direct Offer to Creator</h2>
        <button type="button" onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-700">
          Cancel
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Select Creator</label>
        <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} className="input text-xs" required>
          <option value="">Choose a content creator</option>
          {creators.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} {c.category && `· ${c.category}`}
            </option>
          ))}
        </select>
      </div>

      {myEvents.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Attach Campaign Event (optional)</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="input text-xs">
            <option value="">Direct collaboration (no event)</option>
            {myEvents.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Offer Amount (₹)</label>
        <input
          type="number"
          min="1"
          value={offerAmount}
          onChange={(e) => setOfferAmount(e.target.value)}
          className="input text-xs"
          placeholder="e.g. 3500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Deal Terms / Deliverables</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input min-h-[60px] text-xs"
          placeholder="Specify deliverables (e.g. 1 Reel + 2 Stories, posting date)..."
          maxLength={1000}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Shoot / Meetup Location (optional)</label>
        <PlaceInput value={meetupLocation} onChange={(l) => setMeetupLocation(l)} />
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <button 
        type="submit" 
        disabled={busy || !toUserId || !offerAmount} 
        className="btn-primary w-full py-2.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Sending proposal offer...' : 'Send Proposal Offer'}
      </button>
    </form>
  );
}
