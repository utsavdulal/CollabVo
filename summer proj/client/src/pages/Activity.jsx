import { useEffect, useState } from 'react';
import { Bell, Wallet, ShieldCheck, FileText, CheckCircle, AlertCircle, ChevronRight, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { Spinner } from '../components/ui/Spinner.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';

const TYPE_CONFIG = {
  proposal: {
    icon: FileText,
    color: 'bg-indigo-100 text-indigo-700',
    label: 'Proposal',
    getHref: (n) => n.relatedId ? `/proposal/${n.relatedId}` : '/proposals',
  },
  escrow: {
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-700',
    label: 'Escrow',
    getHref: (n) => n.relatedId ? `/proposal/${n.relatedId}` : '/proposals',
  },
  wallet: {
    icon: Wallet,
    color: 'bg-blue-100 text-blue-700',
    label: 'Wallet',
    getHref: () => '/wallet',
  },
  verification: {
    icon: ShieldCheck,
    color: 'bg-amber-100 text-amber-700',
    label: 'Verification',
    getHref: () => '/verify',
  },
  payout: {
    icon: Wallet,
    color: 'bg-green-100 text-green-700',
    label: 'Payout',
    getHref: () => '/wallet',
  },
  report: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-700',
    label: 'Report',
    getHref: () => '/support',
  },
  follow: {
    icon: UserPlus,
    color: 'bg-rose-100 text-rose-700',
    label: 'Follow',
    getHref: (n) => (n.relatedId ? `/profile/${n.relatedId}` : '/activity'),
  },
};

function getConfig(type) {
  return TYPE_CONFIG[type] || {
    icon: Bell,
    color: 'bg-zinc-100 text-zinc-700',
    label: 'Update',
    getHref: () => '/activity',
  };
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Activity() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(null);
  const { markAllRead } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    api('/notifications')
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    markAllRead();
  }, [markAllRead]);

  const handleClick = (n) => {
    const config = getConfig(n.type);
    const href = config.getHref(n);
    navigate(href);
  };

  const handleFollowBack = async (e, n) => {
    e.stopPropagation();
    setFollowBusy(n._id);
    try {
      await api(`/users/${n.relatedId}/follow`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, canFollowBack: false } : x))
      );
    } catch {}
    setFollowBusy(null);
  };

  return (
    <div className="pb-12 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Activity &amp; Updates</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Tap any notification to go directly to the relevant section.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-12 text-center text-xs text-zinc-400">
          <Bell className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
          <p className="font-bold text-zinc-700">No activity yet</p>
          <p className="mt-1">Notifications about accepted deals, escrow locks, and payouts appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = getConfig(n.type);
            const Icon = config.icon;
            const showFollowBack = n.type === 'follow' && n.relatedId && n.canFollowBack;
            return (
              <div
                key={n._id}
                role="button"
                tabIndex={0}
                onClick={() => handleClick(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(n);
                  }
                }}
                className={`flex w-full items-start gap-3.5 rounded-xl border bg-white p-3.5 shadow-xs transition-all text-left hover:shadow-md hover:-translate-y-px active:scale-[0.99] cursor-pointer ${
                  n.read
                    ? 'border-zinc-200/70 opacity-90'
                    : 'border-indigo-200 ring-1 ring-indigo-100'
                }`}
              >
                {/* Icon */}
                {n.type === 'follow' ? (
                  <Avatar user={{ name: n.name, photoURL: n.photoURL }} size="sm" />
                ) : (
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${config.color}`}>
                      {config.label}
                    </span>
                    {!n.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-zinc-900 leading-snug">{n.message}</p>
                  <p className="mt-1 text-[10px] text-zinc-400">{timeAgo(n.createdAt)}</p>
                  {showFollowBack && (
                    <button
                      type="button"
                      onClick={(e) => handleFollowBack(e, n)}
                      disabled={followBusy === n._id}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                    >
                      <UserPlus className="h-3 w-3" /> Follow back
                    </button>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0 mt-0.5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
