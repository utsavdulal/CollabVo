import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Camera, MapPin, Edit3, BarChart2, Share2,
  Briefcase, Tag, Plus, MessageCircle, Send, ShieldAlert,
  ShieldCheck, Star, ExternalLink, X, Store, Globe,
  CheckCircle2, Clock, PlusCircle, QrCode, CreditCard, Building, Building2,
  UserPlus, UserCheck
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PostEventModal } from '../components/ui/PostEventModal.jsx';
import { ReportModal } from '../components/ui/ReportModal.jsx';
import { ReviewModal } from '../components/ui/ReviewModal.jsx';
import { SubmitProposalModal } from '../components/ui/SubmitProposalModal.jsx';
import { PAYMENT_PROVIDERS, NEPAL_BANKS, getProviderConfig } from '../lib/paymentData.jsx';
import { GoogleMapViewer } from '../components/maps/GoogleMapViewer.jsx';

function formatLocation(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return loc.address || '';
}

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
  const [editBusinessModalOpen, setEditBusinessModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [paymentQRModalOpen, setPaymentQRModalOpen] = useState(false);
  const [zoomQR, setZoomQR] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const load = () => {
    const targetId = id || currentUser?.id || currentUser?._id;
    if (!targetId) return;
    api(`/users/${targetId}`)
      .then((d) => setData(d))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [id, currentUser]);

  const toggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      const d = await api(`/users/${p?._id || id}/follow`, { method: 'POST' });
      setData((prev) => ({
        ...prev,
        isFollowing: d.isFollowing,
        user: { ...prev.user, followerCount: d.followerCount }
      }));
    } catch {}
    setFollowBusy(false);
  };

  const onPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await api('/users/photo', { method: 'POST', formData: fd });
      setData((d) => ({ ...d, user: { ...d.user, photoURL: res.photoURL || res.user?.photoURL } }));
      if (res.user) setUser(res.user);
    } catch (err) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCoverBusy(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await api('/users/photo', { method: 'POST', formData: fd });
      const photoURL = res.photoURL || res.user?.photoURL;
      const { user: updated } = await api('/users/me', { method: 'PATCH', body: { coverURL: photoURL } });
      setData((d) => ({ ...d, user: { ...d.user, coverURL: photoURL } }));
      setUser(updated);
    } catch (err) {
      alert(err.message || 'Failed to upload cover');
    } finally {
      setCoverBusy(false);
    }
  };

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
        <div
          className="relative h-44 w-full rounded-b-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 p-4 shadow-md overflow-hidden bg-cover bg-center"
          style={p.coverURL ? { backgroundImage: `url(${p.coverURL})` } : {}}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {isSelf && (
            <label
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-95 cursor-pointer"
              title="Change Cover Banner"
            >
              <Camera className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={onCoverUpload} disabled={coverBusy} />
            </label>
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
              <label
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#6366f1] text-white border-2 border-white dark:border-[#1a1d2d] shadow-md hover:bg-[#4f46e5] transition-all cursor-pointer"
                title="Change Business Logo"
              >
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} disabled={photoBusy} />
              </label>
            )}
          </div>

          {/* Business Title & Verified Status */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {p.name || 'Subedi Kirana'}
            </h1>
            {p.verificationStatus === 'verified' && (
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" title="Verified Business" />
            )}
          </div>

          <p className="text-xs font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
            {handle} · <span className="capitalize font-bold text-indigo-600 dark:text-indigo-400">{p.category || 'Retail'}</span>
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

          {formatLocation(p.location) && (
            <p className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818cf8]">
              <MapPin className="h-3.5 w-3.5" />
              <span>{formatLocation(p.location)}</span>
            </p>
          )}

          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md mx-auto">
            {p.bio ||
              "We are a verified business collaborating with talented content creators for high-impact social campaigns, promotions, and brand storytelling."}
          </p>

          {/* Action Buttons for Business */}
          <div className="mt-5 flex items-center justify-center gap-3">
            {isSelf ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditBusinessModalOpen(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#6366f1]/40 bg-indigo-50/50 dark:bg-[#232542]/50 py-2.5 text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:bg-indigo-100 dark:hover:bg-[#232542] transition-colors shadow-xs"
                >
                  <Edit3 className="h-4 w-4" /> Edit Business Profile
                </button>
                <button
                  type="button"
                  onClick={() => setPostEventOpen(true)}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Post Campaign
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followBusy}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-2xl border transition-colors shadow-xs ${
                    data.isFollowing
                      ? 'border-zinc-300 bg-white text-zinc-700 dark:border-[#262a3e] dark:bg-[#161926] dark:text-zinc-300'
                      : 'border-transparent bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {data.isFollowing ? (
                    <><UserCheck className="h-4 w-4" /> Following</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Follow</>
                  )}
                </button>
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

          <p className="mt-3 text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af]">
            {p.followerCount ?? 0} Followers · {p.followingCount ?? 0} Following
          </p>
        </div>

        {/* 2b. Section: Physical Location & On-Site Works Map */}
        {(p.location?.coordinates?.[0] || p.location?.coordinates?.[1] || p.location?.address) && (
          <div className="mt-5 px-3">
            <GoogleMapViewer
              coordinates={p.location?.coordinates || [0, 0]}
              address={p.location?.address || [p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ')}
              title={`${p.name} · Physical Location / Store`}
              height="h-56"
            />
          </div>
        )}

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
                  onClick={() => setEditBusinessModalOpen(true)}
                  className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                >
                  Edit Details
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-[#262a3e]">
                <span className="text-zinc-500 dark:text-[#8e95af]">Industry Category</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 dark:text-white capitalize">
                    🏷️ {p.category || 'Retail & Groceries'}
                  </span>
                  {isSelf && (
                    <button
                      type="button"
                      onClick={() => setCategoryModalOpen(true)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-[#262a3e]">
                <span className="text-zinc-500 dark:text-[#8e95af]">Store Location</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
                    📍 {[p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ') || p.location?.address || 'Nepal'}
                  </span>
                  {isSelf && (
                    <button
                      type="button"
                      onClick={() => setLocationModalOpen(true)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {p.socials?.website && (
                <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-[#262a3e]">
                  <span className="text-zinc-500 dark:text-[#8e95af]">Website</span>
                  <a
                    href={p.socials.website.startsWith('http') ? p.socials.website : `https://${p.socials.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{p.socials.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 dark:text-[#8e95af]">Escrow Payment Protection</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 100% Guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Section: Connected Social & Online Channels */}
        <div className="mt-5 px-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Social &amp; Web Presence
              </h2>
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setSocialModalOpen(true)}
                  className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                >
                  {hasSocials ? 'Edit Links' : '+ Link Channels'}
                </button>
              )}
            </div>

            {!hasSocials ? (
              <div className="text-center py-5">
                <p className="text-xs text-zinc-400 dark:text-[#8e95af]">
                  No social accounts or website linked yet.
                </p>
                {isSelf && (
                  <button
                    type="button"
                    onClick={() => setSocialModalOpen(true)}
                    className="btn-secondary mt-3 py-1.5 px-4 text-xs font-bold"
                  >
                    + Add Online Links
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {p.socials?.website && (
                  <a
                    href={p.socials.website.startsWith('http') ? p.socials.website : `https://${p.socials.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3 text-zinc-800 dark:text-zinc-200 hover:border-indigo-400"
                  >
                    <Globe className="h-4 w-4 text-indigo-600" />
                    <span className="truncate">Website</span>
                  </a>
                )}
                {p.socials?.instagram && (
                  <a
                    href={p.socials.instagram.startsWith('http') ? p.socials.instagram : `https://instagram.com/${p.socials.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-2xl border border-pink-200/60 dark:border-pink-900/40 bg-pink-50/40 dark:bg-[#161926] p-3 text-pink-700 dark:text-pink-300 hover:border-pink-400"
                  >
                    <span className="text-sm">📸</span>
                    <span className="truncate">{p.socials.instagram}</span>
                  </a>
                )}
                {p.socials?.facebook && (
                  <a
                    href={p.socials.facebook.startsWith('http') ? p.socials.facebook : `https://facebook.com/${p.socials.facebook}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/40 dark:bg-[#161926] p-3 text-blue-700 dark:text-blue-300 hover:border-blue-400"
                  >
                    <span className="text-sm">👥</span>
                    <span className="truncate">Facebook</span>
                  </a>
                )}
                {p.socials?.tiktok && (
                  <a
                    href={p.socials.tiktok.startsWith('http') ? p.socials.tiktok : `https://tiktok.com/@${p.socials.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400"
                  >
                    <span className="text-sm">🎵</span>
                    <span className="truncate">{p.socials.tiktok}</span>
                  </a>
                )}
                {p.socials?.youtube && (
                  <a
                    href={p.socials.youtube.startsWith('http') ? p.socials.youtube : `https://youtube.com/${p.socials.youtube}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-red-50/40 dark:bg-[#161926] p-3 text-red-700 dark:text-red-300 hover:border-red-400"
                  >
                    <span className="text-sm">▶️</span>
                    <span className="truncate">YouTube</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 6. Section: Creator Reviews & Ratings */}
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

        {/* Modals for Business */}
        <PostEventModal
          open={postEventOpen}
          onClose={() => setPostEventOpen(false)}
          onCreated={() => load()}
        />
        {editBusinessModalOpen && (
          <EditBusinessModal
            user={p}
            onClose={() => setEditBusinessModalOpen(false)}
            onSaved={(updatedUser) => {
              setData((d) => ({ ...d, user: { ...d.user, ...updatedUser } }));
              setUser(updatedUser);
              setEditBusinessModalOpen(false);
            }}
          />
        )}
        {locationModalOpen && (
          <LocationModal
            currentLocation={p.location}
            onClose={() => setLocationModalOpen(false)}
            onSaved={(newLoc) => {
              setData((d) => ({ ...d, user: { ...d.user, location: newLoc } }));
              setUser({ ...currentUser, location: newLoc });
              setLocationModalOpen(false);
            }}
          />
        )}
        {categoryModalOpen && (
          <CategoryModal
            currentCategory={p.category || 'retail'}
            onClose={() => setCategoryModalOpen(false)}
            onSaved={(newCat) => {
              setData((d) => ({ ...d, user: { ...d.user, category: newCat } }));
              setUser({ ...currentUser, category: newCat });
              setCategoryModalOpen(false);
            }}
          />
        )}
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

        {formatLocation(p.location) && (
          <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 dark:text-[#818cf8]">
            <MapPin className="h-3.5 w-3.5" />
            <span>{formatLocation(p.location)}</span>
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
                onClick={toggleFollow}
                disabled={followBusy}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-2xl border transition-colors ${
                  data.isFollowing
                    ? 'border-zinc-300 bg-white text-zinc-700 dark:border-[#262a3e] dark:bg-[#161926] dark:text-zinc-300'
                    : 'border-transparent bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {data.isFollowing ? (
                  <><UserCheck className="h-4 w-4" /> Following</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Follow</>
                )}
              </button>
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
              {p.workCompleted ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
              Completed
            </p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-zinc-900 dark:text-white">
              {p.followerCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
              Followers
            </p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-zinc-900 dark:text-white">
              {p.followingCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
              Following
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
              {p.socials?.instagram && (
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
              {p.socials?.tiktok && (
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
              {p.socials?.youtube && (
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
              {p.socials?.facebook && (
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white text-xs">👥</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Facebook</p>
                      <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">{p.socials.facebook}</p>
                    </div>
                  </div>
                </div>
              )}
              {p.socials?.website && (
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs">🌐</span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Website</p>
                      <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">{p.socials.website}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Creator Payment & Payout QR Section (eSewa / Khalti / Fonepay) */}
      {isSelf && (
        <div className="mt-5 px-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-[#6366f1] dark:bg-[#232542] dark:text-[#818cf8]">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">Payout & Payment QR</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">eSewa, Khalti, Fonepay for real money earnings withdrawal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentQRModalOpen(true)}
                className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
              >
                {p.paymentDetails?.qrCodeURL || p.paymentDetails?.accountNumber ? 'Edit QR' : '+ Add QR'}
              </button>
            </div>

            {!(p.paymentDetails?.qrCodeURL || p.paymentDetails?.accountNumber) ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-[#262a3e] dark:bg-[#121522] py-8 px-4 text-center">
                <QrCode className="h-8 w-8 text-zinc-400 dark:text-[#8e95af] mb-2" />
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  No Payment / Payout Details Linked
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] max-w-xs">
                  Add your eSewa, Khalti, Fonepay, or Nepal Bank details so the admin can transfer your payout earnings.
                </p>
                <button
                  type="button"
                  onClick={() => setPaymentQRModalOpen(true)}
                  className="btn-primary mt-4 py-2 px-5 text-xs font-bold"
                >
                  + Link Payment Details
                </button>
              </div>
            ) : (() => {
              const providerConfig = getProviderConfig(p.paymentDetails?.provider);
              const ProviderLogo = providerConfig.logo;
              return (
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-4">
                  {p.paymentDetails?.qrCodeURL ? (
                    <div
                      className="relative group cursor-pointer shrink-0 rounded-2xl overflow-hidden border border-zinc-200 dark:border-[#262a3e] bg-white p-1 shadow-sm"
                      onClick={() => setZoomQR(true)}
                      title="Click to view full-size QR"
                    >
                      <img
                        src={p.paymentDetails.qrCodeURL}
                        alt="Payment QR"
                        className="h-24 w-24 object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        View QR
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-200 dark:bg-[#232542] text-zinc-400 shrink-0">
                      <ProviderLogo className="h-10 w-10 text-zinc-400" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5 text-center sm:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${providerConfig.bgClass}`}>
                        <ProviderLogo className="h-3.5 w-3.5" />
                        <span>{providerConfig.label}</span>
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Payout Ready
                      </span>
                    </div>

                    {p.paymentDetails?.provider === 'bank' && p.paymentDetails?.bankName && (
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        Bank: <span className="font-semibold text-blue-600 dark:text-blue-400">{p.paymentDetails.bankName}</span>
                      </p>
                    )}

                    {p.paymentDetails?.accountName && (
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        Account Holder: <span className="font-normal text-zinc-600 dark:text-zinc-300">{p.paymentDetails.accountName}</span>
                      </p>
                    )}

                    {p.paymentDetails?.accountNumber && (
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {p.paymentDetails?.provider === 'bank' ? 'Account Number: ' : 'Wallet / ID: '}
                        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{p.paymentDetails.accountNumber}</span>
                      </p>
                    )}

                    {p.paymentDetails?.notes && (
                      <p className="text-[11px] text-zinc-500 dark:text-[#8e95af] line-clamp-1">
                        Branch / Notes: {p.paymentDetails.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
      {paymentQRModalOpen && (
        <PaymentQRModal
          initialPaymentDetails={p.paymentDetails || {}}
          onClose={() => setPaymentQRModalOpen(false)}
          onSaved={(newDetails) => {
            setData((d) => ({ ...d, user: { ...d.user, paymentDetails: newDetails } }));
            setUser({ ...currentUser, paymentDetails: newDetails });
            setPaymentQRModalOpen(false);
          }}
        />
      )}
      {zoomQR && p.paymentDetails?.qrCodeURL && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setZoomQR(false)}>
          <div className="relative max-w-sm w-full rounded-3xl bg-white dark:bg-[#1a1d2d] p-6 text-center shadow-2xl border border-zinc-200 dark:border-[#262a3e]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomQR(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Payment QR Code</h3>
            <p className="text-xs text-zinc-500 capitalize mt-0.5">{p.paymentDetails.provider || 'Digital Wallet'}</p>
            <div className="mt-4 p-3 bg-white rounded-2xl border border-zinc-200 inline-block shadow-inner">
              <img src={p.paymentDetails.qrCodeURL} alt="QR Code Full" className="h-64 w-64 object-contain mx-auto" />
            </div>
            {p.paymentDetails.accountName && (
              <p className="mt-3 text-xs font-bold text-zinc-900 dark:text-white">
                {p.paymentDetails.accountName}
              </p>
            )}
            {p.paymentDetails.accountNumber && (
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                {p.paymentDetails.accountNumber}
              </p>
            )}
          </div>
        </div>
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

function EditBusinessModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    category: user.category || 'retail',
    location: user.location || { coordinates: [0, 0], address: '', country: 'Nepal', state: '', city: '' },
    socials: user.socials || { instagram: '', facebook: '', tiktok: '', youtube: '', website: '' }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const categories = ['retail', 'food', 'hospitality', 'fashion', 'beauty', 'tech', 'fintech', 'automotive', 'education', 'entertainment'];

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Business name is required');
    setBusy(true);
    setError('');
    try {
      const res = await api('/users/me', { method: 'PATCH', body: form });
      onSaved(res.user);
    } catch (err) {
      setError(err.message || 'Failed to update business details');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-6 shadow-2xl text-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-[#262a3e]">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Edit Business Profile</h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">Update company details, location, and online channels</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-2.5 text-xs text-red-600 font-medium">{error}</div>
        )}

        <form onSubmit={save} className="space-y-3.5">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Business Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input text-xs"
              placeholder="e.g. Subedi Kirana Store"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Industry / Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input py-2 text-xs bg-white dark:bg-[#161926] font-medium capitalize"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">About the Business / Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="input min-h-[65px] text-xs"
              placeholder="Describe your store, products, and collaboration interests..."
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Store Location (Country, State, City)</label>
            <PlaceInput value={form.location} onChange={(location) => setForm({ ...form, location })} />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Website URL</label>
              <input
                value={form.socials?.website || ''}
                onChange={(e) => setForm({ ...form, socials: { ...form.socials, website: e.target.value } })}
                className="input text-xs"
                placeholder="https://yourbusiness.com"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Instagram Handle / URL</label>
              <input
                value={form.socials?.instagram || ''}
                onChange={(e) => setForm({ ...form, socials: { ...form.socials, instagram: e.target.value } })}
                className="input text-xs"
                placeholder="@business_instagram"
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-xs font-bold">
              {busy ? 'Saving Changes...' : 'Save Business Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LocationModal({ currentLocation, onClose, onSaved }) {
  const [location, setLocation] = useState(currentLocation || { coordinates: [0, 0], address: '', country: 'Nepal', state: '', city: '' });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api('/users/me', { method: 'PATCH', body: { location } });
      onSaved(res.user?.location || location);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Edit Store Location</h3>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <PlaceInput value={location} onChange={setLocation} />
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs font-bold mt-4">
            {busy ? 'Saving Location...' : 'Save Location'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SocialModal({ initialSocials, onClose, onSaved }) {
  const [instagram, setInstagram] = useState(initialSocials.instagram || '');
  const [tiktok, setTiktok] = useState(initialSocials.tiktok || '');
  const [youtube, setYoutube] = useState(initialSocials.youtube || '');
  const [facebook, setFacebook] = useState(initialSocials.facebook || '');
  const [website, setWebsite] = useState(initialSocials.website || '');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = { instagram, tiktok, youtube, facebook, website };
      await api('/users/me', { method: 'PATCH', body: { socials: updated } });
      onSaved(updated);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Link Social &amp; Web Accounts</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Official Website URL</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" className="input text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Instagram Handle / URL</label>
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@your_instagram" className="input text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Facebook Page URL</label>
            <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/yourpage" className="input text-xs" />
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
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Edit Industry Category</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`flex items-center justify-center rounded-2xl border px-3 py-2.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                  category === c
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700'
                    : 'bg-zinc-50 dark:bg-[#1a1d2d] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#262a3e] hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs font-bold mt-4">
            {busy ? 'Saving Category...' : 'Save Category'}
          </button>
        </form>
      </div>
    </div>
  );
}

function parseModalPaymentDetails(pd) {
  const provider = pd?.provider || 'esewa';
  return {
    provider,
    esewa: {
      qrCodeURL: pd?.esewa?.qrCodeURL || (provider === 'esewa' ? pd?.qrCodeURL : '') || '',
      accountName: pd?.esewa?.accountName || (provider === 'esewa' ? pd?.accountName : '') || '',
      accountNumber: pd?.esewa?.accountNumber || (provider === 'esewa' ? pd?.accountNumber : '') || '',
      notes: pd?.esewa?.notes || (provider === 'esewa' ? pd?.notes : '') || ''
    },
    khalti: {
      qrCodeURL: pd?.khalti?.qrCodeURL || (provider === 'khalti' ? pd?.qrCodeURL : '') || '',
      accountName: pd?.khalti?.accountName || (provider === 'khalti' ? pd?.accountName : '') || '',
      accountNumber: pd?.khalti?.accountNumber || (provider === 'khalti' ? pd?.accountNumber : '') || '',
      notes: pd?.khalti?.notes || (provider === 'khalti' ? pd?.notes : '') || ''
    },
    fonepay: {
      qrCodeURL: pd?.fonepay?.qrCodeURL || (provider === 'fonepay' ? pd?.qrCodeURL : '') || '',
      accountName: pd?.fonepay?.accountName || (provider === 'fonepay' ? pd?.accountName : '') || '',
      accountNumber: pd?.fonepay?.accountNumber || (provider === 'fonepay' ? pd?.accountNumber : '') || '',
      notes: pd?.fonepay?.notes || (provider === 'fonepay' ? pd?.notes : '') || ''
    },
    bank: {
      bankName: pd?.bank?.bankName || (provider === 'bank' ? pd?.bankName : '') || NEPAL_BANKS[0],
      accountName: pd?.bank?.accountName || (provider === 'bank' ? pd?.accountName : '') || '',
      accountNumber: pd?.bank?.accountNumber || (provider === 'bank' ? pd?.accountNumber : '') || '',
      notes: pd?.bank?.notes || (provider === 'bank' ? pd?.notes : '') || ''
    }
  };
}

function PaymentQRModal({ initialPaymentDetails, onClose, onSaved }) {
  const parsed = parseModalPaymentDetails(initialPaymentDetails);
  const [methods, setMethods] = useState(parsed);
  const [activeProvider, setActiveProvider] = useState(parsed.provider || 'esewa');
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');

  const currentData = methods[activeProvider] || {};
  const isBank = activeProvider === 'bank';

  const updateField = (field, val) => {
    setMethods((prev) => ({
      ...prev,
      [activeProvider]: {
        ...prev[activeProvider],
        [field]: val
      }
    }));
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('qrCode', file);
    try {
      const res = await api(`/users/payment-qr?provider=${activeProvider}`, { method: 'POST', formData: fd });
      updateField('qrCodeURL', res.qrCodeURL);
    } catch (err) {
      setError(err.message || 'Failed to upload QR code');
    } finally {
      setUploadBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const updated = {
        ...methods,
        provider: activeProvider
      };
      const res = await api('/users/me', {
        method: 'PATCH',
        body: { paymentDetails: updated }
      });
      onSaved(res.user?.paymentDetails || updated);
    } catch (err) {
      setError(err.message || 'Failed to save payment details');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-[#262a3e]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-[#6366f1] dark:bg-[#232542] dark:text-[#818cf8]">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Payout & Payment Details</h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8e95af]">Each method has its own independent QR code and details</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={save} className="space-y-4 text-xs">
          {/* Provider Selector with Brand Logos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Select Payout Method to Edit
              </label>
              <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active: {getProviderConfig(activeProvider).label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_PROVIDERS.map((p) => {
                const LogoComponent = p.logo;
                const isSelected = activeProvider === p.id;
                const hasData = p.id === 'bank'
                  ? Boolean(methods.bank?.accountNumber)
                  : Boolean(methods[p.id]?.qrCodeURL || methods[p.id]?.accountNumber);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProvider(p.id)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center font-bold transition-all ${
                      isSelected
                        ? `${p.activeClass} ring-2 ring-indigo-400/40`
                        : 'border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#121522] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    {hasData && (
                      <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-500" title="Configured" />
                    )}
                    <LogoComponent className="h-6 w-6" />
                    <span className="text-[11px] leading-tight">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bank Selection if Bank Transfer (NO QR) */}
          {isBank ? (
            <div className="space-y-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Nepal Bank Account Details</span>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                  No QR Code Needed
                </span>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Bank Name (Top 10 Banks of Nepal)
                </label>
                <select
                  value={currentData.bankName || NEPAL_BANKS[0]}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  className="input py-2 text-xs bg-white dark:bg-[#161926] font-medium"
                >
                  {NEPAL_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Account Holder Full Name
                  </label>
                  <input
                    type="text"
                    value={currentData.accountName || ''}
                    onChange={(e) => updateField('accountName', e.target.value)}
                    placeholder="e.g. Ram Bahadur Thapa"
                    className="input text-xs bg-white dark:bg-[#161926]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={currentData.accountNumber || ''}
                    onChange={(e) => updateField('accountNumber', e.target.value)}
                    placeholder="e.g. 01234567890123"
                    className="input text-xs font-mono bg-white dark:bg-[#161926]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Bank Branch / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={currentData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="e.g. New Road Branch, Kathmandu"
                  className="input text-xs bg-white dark:bg-[#161926]"
                />
              </div>
            </div>
          ) : (
            /* Digital Wallet Fields (eSewa / Khalti / Fonepay) with Separate QR */
            <div className="space-y-3 rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50/60 dark:bg-[#121522] p-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-200/70 dark:border-[#262a3e]">
                <span className="font-bold text-zinc-900 dark:text-white">
                  {getProviderConfig(activeProvider).label} Dedicated Info &amp; QR
                </span>
                <span className="text-[10px] text-zinc-500">
                  Unique to {getProviderConfig(activeProvider).label}
                </span>
              </div>

              {/* Dedicated QR Code Upload / Preview */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {getProviderConfig(activeProvider).label} QR Code Image
                </label>
                <div className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] p-3.5">
                  {currentData.qrCodeURL ? (
                    <div className="relative group shrink-0">
                      <img
                        src={currentData.qrCodeURL}
                        alt={`${activeProvider} QR`}
                        className="h-20 w-20 rounded-xl object-contain bg-white border border-zinc-200 p-1 shadow-2xs"
                      />
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[10px] font-bold">
                        <span>Change</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} disabled={uploadBusy} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#1a1d2d] text-zinc-400 hover:border-[#6366f1] cursor-pointer shrink-0 transition-colors">
                      <QrCode className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-bold">Upload QR</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} disabled={uploadBusy} />
                    </label>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 dark:text-white">
                      {currentData.qrCodeURL ? `${getProviderConfig(activeProvider).label} QR Linked` : `No QR for ${getProviderConfig(activeProvider).label}`}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-[#8e95af] mt-0.5">
                      Upload your official {getProviderConfig(activeProvider).label} QR image.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] px-2.5 py-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 cursor-pointer hover:bg-zinc-50 dark:hover:bg-[#232542] transition-colors">
                        {uploadBusy ? 'Uploading...' : currentData.qrCodeURL ? 'Replace QR' : 'Choose QR File'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} disabled={uploadBusy} />
                      </label>
                      {currentData.qrCodeURL && (
                        <button
                          type="button"
                          onClick={() => updateField('qrCodeURL', '')}
                          className="text-[11px] font-bold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Holder Name */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Account Holder Full Name
                  </label>
                  <input
                    type="text"
                    value={currentData.accountName || ''}
                    onChange={(e) => updateField('accountName', e.target.value)}
                    placeholder="e.g. Ram Sharma"
                    className="input text-xs bg-white dark:bg-[#161926]"
                  />
                </div>

                {/* Mobile or Account Number */}
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {getProviderConfig(activeProvider).label} Mobile / ID Number
                  </label>
                  <input
                    type="text"
                    value={currentData.accountNumber || ''}
                    onChange={(e) => updateField('accountNumber', e.target.value)}
                    placeholder="e.g. 9841234567"
                    className="input text-xs font-mono bg-white dark:bg-[#161926]"
                  />
                </div>
              </div>

              {/* Notes / Instructions */}
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Transfer Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={currentData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="e.g. remarks or transfer reference"
                  className="input text-xs bg-white dark:bg-[#161926]"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy || uploadBusy}
              className="btn-primary w-full py-3 text-xs font-bold"
            >
              {busy ? 'Saving Payout Details...' : `Save & Set ${getProviderConfig(activeProvider).label} as Active`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
