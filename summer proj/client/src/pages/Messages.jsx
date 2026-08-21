import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Send, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useMessagesSSE } from '../lib/useMessagesSSE.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function Messages() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('chats');
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api('/messages'), api('/messages/requests')])
      .then(([c, r]) => {
        setConversations(c.conversations || []);
        setRequests(r.conversations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Real-time updates via SSE
  useMessagesSSE({
    onConversationUpdated: (data) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => String(c._id) === String(data.conversationId));
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt,
            unreadCount: (updated[idx].unreadCount || 0) + (String(data.senderId) !== String(user.id) ? 1 : 0)
          };
          updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
          return updated;
        }
        // New conversation — reload to get full data
        load();
        return prev;
      });
    },
    onConversationAccepted: () => {
      load();
    }
  });

  const searchUsers = async (e) => {
    const term = e.target.value;
    setQ(term);
    if (term.trim().length < 2) return setUsers([]);
    const d = await api(`/users/search?q=${encodeURIComponent(term)}`).catch(() => ({ users: [] }));
    setUsers((d.users || []).filter((u) => String(u._id) !== String(user.id)));
  };

  const startChat = async (toUserId) => {
    const data = await api('/messages', { method: 'POST', body: { toUserId, text: 'Hi! Let\'s connect on Collavo.' } });
    setComposing(false);
    setQ('');
    setUsers([]);
    load();
    if (data.conversation?._id) {
      navigate(`/messages/${data.conversation._id}`);
    }
  };

  const acceptRequest = async (id) => {
    await api(`/messages/${id}/accept`, { method: 'POST' });
    load();
  };

  const otherOf = (conv) =>
    conv.participantIds?.find((p) => String(p._id) !== String(user.id));

  const list = tab === 'chats' ? conversations : requests;

  return (
    <div className="pb-12 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Messages</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Chat directly with brands and content creators.</p>
        </div>
        <button
          type="button"
          onClick={() => setComposing(!composing)}
          className="btn-primary py-2 px-3 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> New Message
        </button>
      </div>

      <div className="mb-4 flex gap-1.5 border-b border-zinc-200/80 pb-3">
        {['chats', 'requests'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
              tab === t
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            {t === 'chats' ? 'Conversations' : `Requests ${requests.length > 0 ? `(${requests.length})` : ''}`}
          </button>
        ))}
      </div>

      {composing && (
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={searchUsers}
              className="input pl-8 py-2 text-xs"
              placeholder="Search people by name..."
              autoFocus
            />
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {users.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => startChat(u._id)}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 hover:bg-zinc-50 text-left transition-colors"
              >
                <Avatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900">{u.name}</p>
                  <p className="text-[10px] text-zinc-400 capitalize">{u.role} {u.category && `· ${u.category}`}</p>
                </div>
                <span className="text-xs font-semibold text-zinc-900">Start Chat &rarr;</span>
              </button>
            ))}
            {q.trim().length >= 2 && users.length === 0 && (
              <p className="py-4 text-center text-xs text-zinc-400">No users found</p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-12 text-center text-xs text-zinc-400">
          <MessageSquare className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
          <p className="font-bold text-zinc-700">No messages yet</p>
          <p className="mt-1">Start a conversation from a creator profile or campaign.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((conv) => {
            const other = otherOf(conv);
            const unread = conv.unreadCount || 0;
            return (
              <Link
                key={conv._id}
                to={`/messages/${conv._id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                <div className="relative">
                  <Avatar user={other} size="md" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[9px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`truncate text-xs ${unread > 0 ? 'font-extrabold text-zinc-900' : 'font-bold text-zinc-900'}`}>{other?.name || 'User'}</p>
                    {conv.lastMessageAt && (
                      <span className="text-[10px] text-zinc-400">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className={`truncate text-xs mt-0.5 ${unread > 0 ? 'font-semibold text-zinc-700' : 'text-zinc-500'}`}>{conv.lastMessage || 'No messages yet'}</p>
                </div>
                {conv.isRequest && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      acceptRequest(conv._id);
                    }}
                    className="btn-primary py-1 px-2.5 text-[11px]"
                  >
                    Accept
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
