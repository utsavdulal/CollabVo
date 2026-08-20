import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Camera, MapPin, Edit3, BarChart2, Share2,
  Briefcase, Tag, Plus, MessageCircle, Send, ShieldAlert,
  ShieldCheck, Star, ExternalLink, X, Store, Globe,
  CheckCircle2, Clock, PlusCircle
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PostEventModal } from '../components/ui/PostEventModal.jsx';
import { ReportModal } from '../components/ui/ReportModal.jsx';
import { ReviewModal } from '../components/ui/ReviewModal.jsx';
import { SubmitProposalModal } from '../components/ui/SubmitProposalModal.jsx';

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useAuthStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [postEventOpen, setPostEventOpen] = useState(false);
  const [submitProposalOpen, setSubmitProposalOpen] = useState(false);

  // Modals for editing sections
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const load = () => {
    const targetId = id || currentUser?.id || currentUser?._id;
    if (!targetId) return;
    api(`/users/${targetId}`)
      .then((d) => setData(d))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [id, currentUser]);

  if (error) return <p className="py-16 text-center text-sm text-red-500">{error}</p>;
  if (!data) return <div className="flex justify-center py-16"><Spinner /></div>;

  const p = data.user;
  const isBusiness = p.role === 'business';
  const isSelf = String(p._id) === String(currentUser?.id || currentUser?._id);
  const businessEvents = data.events || [];

  const handle = `@${(p.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const hasSocials =
    p.socials?.instagram || p.socials?.tiktok || p.socials?.youtube || p.socials?.facebook || p.socials?.website;
  const hasWorks = p.works && p.works.length > 0;

  // ====================================================
  // BUSINESS PROFILE VIEW (STRICTLY BUSINESS FEATURES)
  // ====================================================
  if (isBusiness) {
    return (
      <div className="pb-24 max-w-xl mx-auto">
        {/* 1. Header Banner */}
        <div className="relative h-44 w-full rounded-b-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 p-4 shadow-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {isSelf && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-95"
              aria-label="Change Cover"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 2. Main Business Info Card */}
        <div className="relative -mt-16 mx-3 rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-lg dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
          {/* Logo with Storefront Badge */}
          <div className="relative inline-block">
            <div className="h-28 w-28 rounded-full border-4 border-white dark:border-[#1a1d2d] shadow-xl overflow-hidden bg-zinc-100 dark:bg-[#121522] mx-auto">
              {p.photoURL ? (
                <img src={p.photoURL} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-[#232542]">
                  {p.name ? p.name.charAt(0).toUpperCase() : 'B'}
                </div>
              )}
            </div>
            {isSelf && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#6366f1] text-white border-2 border-white dark:border-[#1a1d2d] shadow-md hover:bg-[#4f46e5] transition-all"
                aria-label="Change Business Logo"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Business Title & Verified Status */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {p.name || 'Subedi kirana'}
            </h1>
            {p.verificationStatus === 'verified' && (
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" title="Verified Business" />
            )}
          </div>

          <p className="text-xs font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
            {handle} · <span className="capitalize">{p.category || 'Retail'}</span>
          </p>

          {/* Verification Status Pill */}
          <div className="mt-2 flex justify-center">
            {p.verificationStatus === 'verified' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified Business Account
              </span>
            ) : isSelf ? (
              <Link
                to="/verify"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                ⚠️ Verification Pending · Upload Documents
              </Link>
            ) : null}
          </div>

          {p.location?.address && (
            <p className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818cf8]">
              <MapPin className="h-3.5 w-3.5" />
              <span>{p.location.address}</span>
            </p>
          )}

          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md mx-auto">
            {p.bio ||
              "We are a verified local business collaborating with talented content creators for high-impact social campaigns, promotions, and brand storytelling."}
          </p>

          {/* Action Buttons for Business */}
          <div className="mt-5 flex items-center justify-center gap-3">
            {isSelf ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#6366f1]/40 bg-indigo-50/40 dark:bg-[#232542]/50 py-2.5 text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:bg-indigo-50 dark:hover:bg-[#232542] transition-colors"
                >
                  <Edit3 className="h-4 w-4" /> Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setPostEventOpen(true)}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold"
                >
                  <Plus className="h-4 w-4" /> Post Campaign
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await api('/messages', {
                      method: 'POST',
                      body: { toUserId: p._id, text: `Hi ${p.name}! I would love to collaborate with your business.` }
                    }).catch(() => {});
                    navigate('/messages');
                  }}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold"
                >
                  <MessageCircle className="h-4 w-4" /> Message Business
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold text-zinc-500"
                  title="Report"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Business Stats */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-zinc-200 dark:divide-[#262a3e] border-t border-zinc-200 dark:border-[#262a3e] pt-4 text-center">
            <div>
              <p className="text-lg font-black text-zinc-900 dark:text-white">
                {businessEvents.length}
              </p>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
                Campaigns
              </p>
            </div>
            <div>
              <p className="text-lg font-black text-zinc-900 dark:text-white">
                {p.workCompleted ?? 0}
              </p>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
                Creators Hired
              </p>
            </div>
            <div>
              <p className="text-lg font-black text-zinc-900 dark:text-white">
                {p.rating ? Number(p.rating).toFixed(1) : '5.0'}
              </p>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
                Rating
              </p>
            </div>
          </div>
        </div>

        {/* 3. Section: Active Campaigns Posted by This Business */}
        <div className="mt-5 px-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Active Campaigns ({businessEvents.length})
              </h2>
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setPostEventOpen(true)}
                  className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                >
                  + Post New
                </button>
              )}
            </div>

            {businessEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-[#262a3e] dark:bg-[#121522] py-8 px-4 text-center">
                <Briefcase className="h-8 w-8 text-zinc-400 dark:text-[#8e95af] mb-2" />
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  No active campaigns yet
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] max-w-xs">
                  {isSelf
                    ? 'Post a campaign event to start receiving collaboration proposals from creators.'
                    : 'This business has no active open campaigns right now.'}
                </p>
                {isSelf && (
                  <button
                    type="button"
                    onClick={() => setPostEventOpen(true)}
                    className="btn-primary mt-4 py-2 px-5 text-xs font-bold"
                  >
                    + Post Campaign
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {businessEvents.map((ev) => (
                  <div
                    key={ev._id}
                    className="rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="rounded-full bg-zinc-200 dark:bg-[#232542] px-2.5 py-0.5 text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300">
                          {ev.category}
                        </span>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-1">
                          {ev.title}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-zinc-900 dark:text-white">
                        Rs. {ev.budget > 0 ? ev.budget.toLocaleString() : 'Negotiable'}
                      </span>
                    </div>

                    {ev.description && (
                      <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {ev.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-[#262a3e] pt-2">
                      <Link
                        to={`/event/${ev._id}`}
                        className="text-[11px] font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                      >
                        View Campaign Details &rarr;
                      </Link>
                      {isSelf ? (
                        <Link
                          to={`/proposals?eventId=${ev._id}`}
                          className="btn-primary py-1 px-3 text-[11px] font-bold"
                        >
                          Proposals
                        </Link>
                      ) : (
                        <Link
                          to={`/event/${ev._id}`}
                          className="btn-primary py-1 px-3 text-[11px] font-bold"
                        >
                          Apply Now
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Section: Business Information & Category */}
        <div className="mt-5 px-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Business Information
              </h2>
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(true)}
                  className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                >
                  Edit Category
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-[#262a3e]">
                <span className="text-zinc-500 dark:text-[#8e95af]">Category</span>
                <span className="font-bold text-zinc-900 dark:text-white capitalize">
                  🏷️ {p.category || 'Retail & Groceries'}
                </span>
              </div>

              {p.location?.address && (
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-[#262a3e]">
                  <span className="text-zinc-500 dark:text-[#8e95af]">Store Location</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-xs">
                    📍 {p.location.address}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-500 dark:text-[#8e95af]">Escrow Payment Protection</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 100% Guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Section: Creator Reviews & Ratings */}
        <div className="mt-5 px-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Creator Reviews ({data.reviews?.length || 0})
              </h2>
              {!isSelf && (
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                >
                  Write Review
                </button>
              )}
            </div>

            {data.reviews?.length === 0 ? (
              <p className="text-center py-6 text-xs text-zinc-400">
                No reviews yet. Creators who complete campaigns with this business can leave reviews.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.reviews.map((r) => (
                  <div
                    key={r._id}
                    className="rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar user={r.reviewerId} size="sm" />
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {r.reviewerId?.name || 'Creator'}
                      </p>
                      <span className="ml-auto flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" /> {r.rating}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <PostEventModal
          open={postEventOpen}
          onClose={() => setPostEventOpen(false)}
          onCreated={() => load()}
        />
        <CategoryModal
          currentCategory={p.category || 'retail'}
          onClose={() => setCategoryModalOpen(false)}
          onSaved={(newCat) => {
            setData((d) => ({ ...d, user: { ...d.user, category: newCat } }));
            setCategoryModalOpen(false);
          }}
        />
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetUser={p} />
        <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} targetUser={p} onReviewed={load} />
      </div>
    );
  }

  // ====================================================
  // CREATOR PROFILE VIEW
  // ====================================================
  return (
    <div className="pb-24 max-w-xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative h-44 w-full rounded-b-3xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-orange-400 p-4 shadow-md">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {isSelf && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-95"
            aria-label="Change Cover"
          >
            <Camera className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 2. Main Creator Card */}
      <div className="relative -mt-16 mx-3 rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-lg dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
        <div className="relative inline-block">
          <div className="h-28 w-28 rounded-full border-4 border-white dark:border-[#1a1d2d] shadow-xl overflow-hidden bg-zinc-100 dark:bg-[#121522] mx-auto">
            {p.photoURL ? (
              <img src={p.photoURL} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-[#232542]">
                {p.name ? p.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
          {isSelf && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#6366f1] text-white border-2 border-white dark:border-[#1a1d2d] shadow-md hover:bg-[#4f46e5] transition-all"
              aria-label="Change Profile Photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          {p.name || 'Your Name'}
        </h1>
        <p className="text-xs font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
          {handle}
        </p>

        {p.location?.address && (
          <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818cf8]">
            <MapPin className="h-3.5 w-3.5" />
            <span>{p.location.address}</span>
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md mx-auto">
          {p.bio ||
            "I'm a content creator passionate about sharing authentic stories and engaging experiences. I love collaborating with businesses to create content that drives results."}
        </p>

        {/* Action Buttons Row */}
        <div className="mt-5 flex items-center justify-center gap-3">
          {isSelf ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#6366f1]/40 bg-indigo-50/40 dark:bg-[#232542]/50 py-2.5 text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:bg-indigo-50 dark:hover:bg-[#232542] transition-colors"
              >
                <Edit3 className="h-4 w-4" /> Edit Profile
              </button>
              <button
                type="button"
                onClick={() => navigate('/work')}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#6366f1]/40 bg-indigo-50/40 dark:bg-[#232542]/50 py-2.5 text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:bg-indigo-50 dark:hover:bg-[#232542] transition-colors"
              >
                <BarChart2 className="h-4 w-4" /> Analytics
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={async () => {
                  await api('/messages', {
                    method: 'POST',
                    body: { toUserId: p._id, text: 'Hi! Would love to connect on Collavo.' }
                  }).catch(() => {});
                  navigate('/messages');
                }}
                className="btn-secondary flex-1 py-2.5 text-xs"
              >
                <MessageCircle className="h-4 w-4" /> Message
              </button>
              {currentUser?.role === 'business' && (
                <button
                  type="button"
                  onClick={() => setSubmitProposalOpen(true)}
                  className="btn-primary flex-1 py-2.5 text-xs text-center justify-center font-bold"
                >
                  <Send className="h-4 w-4" /> Propose Deal
                </button>
              )}
            </>
          )}
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-zinc-200 dark:divide-[#262a3e] border-t border-zinc-200 dark:border-[#262a3e] pt-4 text-center">
          <div>
            <p className="text-lg font-extrabold text-zinc-900 dark:text-white">
              {p.workCompleted ?? 1}
            </p>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
              Completed
            </p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-zinc-900 dark:text-white">0</p>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
              Favorite Business
            </p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-zinc-900 dark:text-white">0</p>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
              Saved by Business
            </p>
          </div>
        </div>
      </div>

      {/* Social Accounts */}
      <div className="mt-5 px-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">Social Accounts</h2>
            {isSelf && (
              <button
                type="button"
                onClick={() => setSocialModalOpen(true)}
                className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
              >
                + Add
              </button>
            )}
          </div>

          {!hasSocials ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-[#262a3e] dark:bg-[#121522] py-8 px-4 text-center">
              <Share2 className="h-8 w-8 text-zinc-400 dark:text-[#8e95af] mb-2" />
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                No social accounts linked
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] max-w-xs">
                Connect Instagram, TikTok, YouTube and more to showcase your reach
              </p>
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setSocialModalOpen(true)}
                  className="btn-primary mt-4 py-2 px-5 text-xs font-bold"
                >
                  + Link Account
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {p.socials.instagram && (
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white text-xs">📷</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Instagram</p>
                      <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">{p.socials.instagram}</p>
                    </div>
                  </div>
                </div>
              )}
              {p.socials.tiktok && (
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white text-xs">♪</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">TikTok</p>
                      <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">{p.socials.tiktok}</p>
                    </div>
                  </div>
                </div>
              )}
              {p.socials.youtube && (
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white text-xs">▶</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">YouTube</p>
                      <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">{p.socials.youtube}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="mt-5 px-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">Categories</h2>
            {isSelf && (
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-2xl border border-[#6366f1]/40 bg-indigo-50/50 dark:bg-[#232542] px-4 py-2 text-xs font-bold text-[#6366f1] dark:text-[#818cf8]">
              <Tag className="h-3.5 w-3.5" />
              <span className="capitalize">{p.category || 'Entertainment'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Your Works */}
      <div className="mt-5 px-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">Your Works</h2>
            {isSelf && (
              <button
                type="button"
                onClick={() => setWorkModalOpen(true)}
                className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
              >
                + Add
              </button>
            )}
          </div>

          {!hasWorks ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-[#262a3e] dark:bg-[#121522] py-8 px-4 text-center">
              <Briefcase className="h-8 w-8 text-zinc-400 dark:text-[#8e95af] mb-2" />
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                No work added yet
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] max-w-xs">
                Share links to posts, events, or videos you've created for businesses
              </p>
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setWorkModalOpen(true)}
                  className="btn-primary mt-4 py-2 px-5 text-xs font-bold"
                >
                  + Add Work Sample
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {p.works.map((w, i) => (
                <div
                  key={w._id || i}
                  className="rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{w.title}</h4>
                    {w.platform && (
                      <span className="rounded-full bg-zinc-200 dark:bg-[#232542] px-2.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                        {w.platform}
                      </span>
                    )}
                  </div>
                  {w.description && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{w.description}</p>
                  )}
                  {w.url && (
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                    >
                      View Live Work <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Creator Modals */}
      {socialModalOpen && (
        <SocialModal
          initialSocials={p.socials || {}}
          onClose={() => setSocialModalOpen(false)}
          onSaved={(newSocials) => {
            setData((d) => ({ ...d, user: { ...d.user, socials: newSocials } }));
            setUser({ ...currentUser, socials: newSocials });
            setSocialModalOpen(false);
          }}
        />
      )}
      {workModalOpen && (
        <WorkModal
          onClose={() => setWorkModalOpen(false)}
          onSaved={(newWork) => {
            const nextWorks = [...(p.works || []), newWork];
            setData((d) => ({ ...d, user: { ...d.user, works: nextWorks } }));
            setWorkModalOpen(false);
          }}
          existingWorks={p.works || []}
        />
      )}
      {categoryModalOpen && (
        <CategoryModal
          currentCategory={p.category || 'entertainment'}
          onClose={() => setCategoryModalOpen(false)}
          onSaved={(newCat) => {
            setData((d) => ({ ...d, user: { ...d.user, category: newCat } }));
            setUser({ ...currentUser, category: newCat });
            setCategoryModalOpen(false);
          }}
        />
      )}
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetUser={p} />
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} targetUser={p} onReviewed={load} />
      <SubmitProposalModal
        open={submitProposalOpen}
        onClose={() => setSubmitProposalOpen(false)}
        targetUser={p}
      />
    </div>
  );
}

function SocialModal({ initialSocials, onClose, onSaved }) {
  const [instagram, setInstagram] = useState(initialSocials.instagram || '');
  const [tiktok, setTiktok] = useState(initialSocials.tiktok || '');
  const [youtube, setYoutube] = useState(initialSocials.youtube || '');
  const [facebook, setFacebook] = useState(initialSocials.facebook || '');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = { instagram, tiktok, youtube, facebook };
      await api('/users/me', { method: 'PATCH', body: { socials: updated } });
      onSaved(updated);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Link Social Accounts</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Instagram Handle / URL</label>
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@your_instagram" className="input text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">TikTok Handle / URL</label>
            <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@your_tiktok" className="input text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">YouTube Channel / URL</label>
            <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="Channel name or link" className="input text-xs" />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs font-bold mt-4">
            {busy ? 'Saving...' : 'Save Social Accounts'}
          </button>
        </form>
      </div>
    </div>
  );
}

function WorkModal({ onClose, onSaved, existingWorks }) {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const newWork = { title, platform, url, description };
      const updatedWorks = [...existingWorks, newWork];
      await api('/users/me', { method: 'PATCH', body: { works: updatedWorks } });
      onSaved(newWork);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Add Work Sample</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Campaign Title / Project Name</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer Festival Campaign Reel" className="input text-xs" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input text-xs">
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Post / Video Link (URL)</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/p/..." className="input text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Description / Results</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary of results" className="input min-h-[60px] text-xs" />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs font-bold mt-4">
            {busy ? 'Adding...' : 'Add Work Sample'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CategoryModal({ currentCategory, onClose, onSaved }) {
  const [category, setCategory] = useState(currentCategory);
  const [busy, setBusy] = useState(false);

  const categories = ['retail', 'food', 'hospitality', 'fashion', 'beauty', 'tech', 'fintech', 'automotive', 'education', 'entertainment'];

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/users/me', { method: 'PATCH', body: { category } });
      onSaved(category);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Edit Category</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`chip capitalize text-xs ${category === c ? 'chip-active' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs font-bold mt-4">
            {busy ? 'Saving...' : 'Save Category'}
          </button>
        </form>
      </div>
    </div>
  );
}
