import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Users, MessageSquare, Briefcase,
  FileText, Store, Heart, Navigation, ChevronDown, Layers,
  Star, Flame, Clock, Plus, Banknote, ArrowRight, Sparkles, Gift
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/api.js';
import { EventCard } from '../components/home/EventCard.jsx';
import { UserCard } from '../components/home/UserCard.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { PostEventModal } from '../components/ui/PostEventModal.jsx';
import { ReportModal } from '../components/ui/ReportModal.jsx';
import { CampaignsMapView } from '../components/maps/CampaignsMapView.jsx';
import { NearbyEventsMap } from '../components/maps/NearbyEventsMap.jsx';
import { Map, LayoutGrid } from 'lucide-react';

const CATEGORIES_DATA = [
  { id: 'automotive', label: 'Automotive', icon: '🚗' },
  { id: 'fintech', label: 'Banking & FinTech', icon: '🏛️' },
  { id: 'beauty', label: 'Beauty', icon: '🪷' },
  { id: 'food', label: 'Food & Dining', icon: '🍽️' },
  { id: 'gaming', label: 'Gaming & Esports', icon: '🎮' },
  { id: 'travel', label: 'Travel & Tourism', icon: '✈️' },
  { id: 'fashion', label: 'Fashion & Lifestyle', icon: '👗' },
  { id: 'tech', label: 'Tech & Gadgets', icon: '📱' }
];

const PLATFORMS_DATA = [
  { id: 'facebook', label: 'Facebook', color: 'text-blue-500', icon: 'f' },
  { id: 'instagram', label: 'Instagram', color: 'text-pink-500', icon: '📷' },
  { id: 'tiktok', label: 'TikTok', color: 'text-zinc-800 dark:text-white', icon: '♪' },
  { id: 'youtube', label: 'YouTube', color: 'text-red-500', icon: '▶' }
];

export default function Home() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isBusiness = user?.role === 'business';

  const activeTab = searchParams.get('tab') || (isBusiness ? 'my_dashboard' : 'events');
  const searchQuery = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedPlatform = searchParams.get('platform') || '';

  // Business state
  const [myEvents, setMyEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('All'); // 'All' | 'Paid' | 'Open'

  // Creator state
  const [feedFilter, setFeedFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('latest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [radius, setRadius] = useState(25);
  const [events, setEvents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [creatorsList, setCreatorsList] = useState([]);
  const [businessesList, setBusinessesList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [postEventOpen, setPostEventOpen] = useState(false);
  const [reportingUser, setReportingUser] = useState(null);

  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('collavo_saved_events') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch data
  useEffect(() => {
    setLoading(true);
    if (isBusiness) {
      // Fetch ONLY business's own created events (no events by other businesses)
      api('/events?mine=true')
        .then((d) => setMyEvents(d.events || []))
        .catch(() => setMyEvents([]))
        .finally(() => setLoading(false));

      // If viewing creators tab
      if (activeTab === 'creators') {
        const params = new URLSearchParams();
        params.set('role', 'creator');
        if (selectedCategory) params.set('category', selectedCategory);
        if (searchQuery) params.set('q', searchQuery);
        api(`/users/search?${params.toString()}`)
          .then((d) => setCreatorsList(d.users || []))
          .catch(() => setCreatorsList([]));
      }
    } else {
      // Creator view
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedPlatform) params.set('platform', selectedPlatform);
      if (searchQuery) params.set('q', searchQuery);
      params.set('sort', sortOrder);

      api(`/events?${params.toString()}`)
        .then((d) => {
          setEvents(d.events || []);
          if (!selectedCategory && !searchQuery) {
            setFeatured(d.events?.slice(0, 4) || []);
          }
        })
        .catch(() => setEvents([]))
        .finally(() => setLoading(false));
    }
  }, [isBusiness, activeTab, selectedCategory, selectedPlatform, searchQuery, sortOrder]);

  const toggleSave = (id) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('collavo_saved_events', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredMyEvents = myEvents.filter((ev) => {
    if (eventFilter === 'Paid') return ev.budget > 0;
    if (eventFilter === 'Open') return true;
    return true;
  });

  // ==========================================
  // BUSINESS DASHBOARD VIEW (MATCHING SCREENSHOT)
  // ==========================================
  if (isBusiness) {
    return (
      <div className="pb-24 max-w-xl mx-auto space-y-6">
        {/* Business Header Title */}
        <div className="text-center pt-1 pb-2">
          <h1 className="text-2xl font-black text-indigo-600 dark:text-[#818cf8] tracking-tight">
            {user?.name || 'Subedi kirana'}
          </h1>
        </div>

        {/* 1. 4 Quick Nav Cards: Create, Creators, Messages, Events */}
        <div className="grid grid-cols-4 gap-2.5">
          {/* Create */}
          <button
            type="button"
            onClick={() => setPostEventOpen(true)}
            className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-3 hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060] transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f3ff] text-[#7c3aed] shadow-xs mb-1.5 dark:bg-[#2e264e] dark:text-[#a78bfa]">
              <PlusCircle className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Create</span>
          </button>

          {/* Creators */}
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set('tab', activeTab === 'creators' ? 'my_dashboard' : 'creators');
              setSearchParams(next);
            }}
            className={`flex flex-col items-center justify-center rounded-3xl border p-3 transition-all ${
              activeTab === 'creators'
                ? 'border-[#6366f1] bg-indigo-50/50 dark:border-[#6366f1] dark:bg-[#1e2235]'
                : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060]'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#059669] shadow-xs mb-1.5 dark:bg-[#13332a] dark:text-[#34d399]">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Creators</span>
          </button>

          {/* Messages */}
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-3 hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060] transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb] shadow-xs mb-1.5 dark:bg-[#1b2b4d] dark:text-[#60a5fa]">
              <MessageSquare className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Messages</span>
          </button>

          {/* Events */}
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('tab');
              setSearchParams(next);
            }}
            className={`flex flex-col items-center justify-center rounded-3xl border p-3 transition-all ${
              activeTab === 'my_dashboard'
                ? 'border-[#6366f1] bg-indigo-50/50 dark:border-[#6366f1] dark:bg-[#1e2235]'
                : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060]'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fffbeb] text-[#d97706] shadow-xs mb-1.5 dark:bg-[#3d2e18] dark:text-[#fbbf24]">
              <Briefcase className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Events</span>
          </button>
        </div>

        {/* 2. View: Content Creators Discovery (when Creators button clicked) */}
        {activeTab === 'creators' ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Discover Creators ({creatorsList.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('tab');
                  setSearchParams(next);
                }}
                className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
              >
                Back to Events
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : creatorsList.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white dark:border-[#262a3e] dark:bg-[#1a1d2d] p-12 text-center text-xs text-zinc-400">
                No creators found.
              </div>
            ) : (
              <div className="space-y-3">
                {creatorsList.map((c) => (
                  <UserCard
                    key={c._id}
                    user={c}
                    onReport={(u) => setReportingUser(u)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 4. Recent Events Section (ONLY this business's own events) */
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-zinc-900 dark:text-white">Recent Events</h2>
              <Link
                to="/proposals"
                className="text-xs font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
              >
                View all
              </Link>
            </div>

            {/* Filter Pills: All, Paid, Open */}
            <div className="flex items-center gap-2 mb-4">
              {[
                { id: 'All', icon: Layers },
                { id: 'Paid', icon: Banknote },
                { id: 'Open', icon: Gift }
              ].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEventFilter(id)}
                  className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                    eventFilter === id
                      ? 'bg-zinc-900 text-white shadow-xs dark:bg-[#232542] dark:border dark:border-[#6366f1]'
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:text-zinc-900 dark:bg-[#161926] dark:text-[#8e95af] dark:border-[#262a3e] dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{id}</span>
                </button>
              ))}
            </div>

            {/* Event List or Empty State */}
            {loading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : filteredMyEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-[#262a3e] dark:bg-[#1a1d2d]">
                <FileText className="h-10 w-10 text-zinc-400 dark:text-[#8e95af] mb-3 stroke-[1.5]" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">No events yet</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] max-w-xs">
                  Create your first event to start working with creators.
                </p>
                <button
                  type="button"
                  onClick={() => setPostEventOpen(true)}
                  className="btn-primary mt-5 py-3 px-6 text-xs font-bold rounded-2xl"
                >
                  Create Event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMyEvents.map((ev) => (
                  <div
                    key={ev._id}
                    className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 dark:border-[#262a3e] dark:bg-[#1a1d2d] dark:hover:border-[#3a4060] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-zinc-100 dark:bg-[#232542] px-2.5 py-0.5 text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300">
                          {ev.category}
                        </span>
                        <h3 className="mt-2 text-sm font-bold text-zinc-900 dark:text-white leading-snug">
                          {ev.title}
                        </h3>
                        {ev.description && (
                          <p className="mt-1 text-xs text-zinc-500 dark:text-[#8e95af] line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs font-extrabold text-zinc-900 dark:text-white">
                          Budget: Rs. {ev.budget > 0 ? ev.budget.toLocaleString() : 'Negotiable'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center gap-2 pt-2.5 border-t border-zinc-100 dark:border-[#262a3e]">
                      <Link
                        to={`/event/${ev._id}`}
                        className="btn-secondary flex-1 py-1.5 text-xs text-center justify-center font-bold"
                      >
                        View Details
                      </Link>
                      <Link
                        to={`/proposals?eventId=${ev._id}`}
                        className="btn-primary flex-1 py-1.5 text-xs text-center justify-center font-bold"
                      >
                        View Proposals
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <PostEventModal
          open={postEventOpen}
          onClose={() => setPostEventOpen(false)}
          onCreated={(newEvent) => {
            setMyEvents((prev) => [newEvent, ...prev]);
            setPostEventOpen(false);
          }}
        />

        <ReportModal
          open={!!reportingUser}
          onClose={() => setReportingUser(null)}
          targetUser={reportingUser}
        />
      </div>
    );
  }

  // ==========================================
  // CREATOR HOME VIEW
  // ==========================================
  const displayedEvents =
    activeTab === 'saved'
      ? events.filter((e) => savedIds.includes(e._id))
      : events;

  return (
    <div className="pb-24 max-w-4xl mx-auto space-y-6">
      {/* Categories Section */}
      <div>
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-white mb-3">Categories</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES_DATA.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (selectedCategory === id) next.delete('category');
                else next.set('category', id);
                setSearchParams(next);
              }}
              className={`chip ${selectedCategory === id ? 'chip-active' : ''}`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Platforms Section */}
      <div>
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-white mb-3">Platforms</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PLATFORMS_DATA.map(({ id, label, icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (selectedPlatform === id) next.delete('platform');
                else next.set('platform', id);
                setSearchParams(next);
              }}
              className={`chip ${selectedPlatform === id ? 'chip-active' : ''}`}
            >
              <span className={color}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Events Horizontal Carousel */}
      {!searchQuery && !selectedCategory && featured.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-white mb-3">Featured Events</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible">
            {featured.map((ev) => (
              <div key={ev._id} className="w-80 shrink-0 sm:w-auto">
                <EventCard
                  event={ev}
                  isSaved={savedIds.includes(ev._id)}
                  onToggleSave={() => toggleSave(ev._id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Events Interactive Map Section */}
      <NearbyEventsMap
        events={events}
        userLocation={user?.location}
        savedIds={savedIds}
        onToggleSave={toggleSave}
      />

      {/* All Events Header with count, view toggle & sort */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
          All Events · {displayedEvents.length}
        </h2>

        <div className="flex items-center gap-2">
          {/* Grid / Map View Toggle */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-[#121522] p-0.5 border border-zinc-200 dark:border-[#262a3e]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#1a1d2d] text-indigo-600 dark:text-[#818cf8] shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-[#1a1d2d] text-indigo-600 dark:text-[#818cf8] shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              <span>Map</span>
            </button>
          </div>

          {/* Date Sort Dropdown */}
          <div className="flex items-center gap-1 text-xs font-semibold text-zinc-800 dark:text-white bg-white dark:bg-[#1a1d2d] border border-zinc-200 dark:border-[#262a3e] rounded-xl px-3 py-1.5">
            <span>Date ({sortOrder === 'latest' ? 'Latest' : 'Oldest'})</span>
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === 'latest' ? 'oldest' : 'latest'))}
              className="ml-1 text-[#6366f1] dark:text-[#818cf8]"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Events View: Map or Grid */}
      {viewMode === 'map' ? (
        <CampaignsMapView
          items={displayedEvents}
          userLocation={user?.location}
          height="h-[480px]"
        />
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : displayedEvents.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white dark:border-[#262a3e] dark:bg-[#1a1d2d] p-12 text-center text-xs text-zinc-400">
          No events found matching your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayedEvents.map((ev) => (
            <EventCard
              key={ev._id}
              event={ev}
              isSaved={savedIds.includes(ev._id)}
              onToggleSave={() => toggleSave(ev._id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ReportModal
        open={!!reportingUser}
        onClose={() => setReportingUser(null)}
        targetUser={reportingUser}
      />
    </div>
  );
}
