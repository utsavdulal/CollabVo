import { useEffect, useState } from 'react';
import { Bell, Wallet, ShieldCheck, FileText } from 'lucide-react';
import { api } from '../lib/api.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { Spinner } from '../components/ui/Spinner.jsx';

const ICONS = {
  wallet: Wallet,
  verification: ShieldCheck,
  proposal: FileText,
  escrow: Wallet
};

export default function Activity() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { markAllRead } = useNotificationStore();

  useEffect(() => {
    api('/notifications')
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    markAllRead();
  }, [markAllRead]);

  return (
    <div className="pb-12 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Activity & Updates</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Real-time updates regarding your proposals, wallet balance, and business verification.
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
            const Icon = ICONS[n.type] || Bell;
            return (
              <div
                key={n._id}
                className={`flex items-start gap-3.5 rounded-xl border bg-white p-3.5 shadow-xs transition-all ${
                  n.read ? 'border-zinc-200/70 opacity-80' : 'border-zinc-300 ring-1 ring-zinc-900/5'
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900 leading-snug">{n.message}</p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-zinc-900 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
