import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Send, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
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

  const load = () => {
    setLoading(true);
    Promise.all([api('/messages'), api('/messages/requests')])
      .then(([c, r]) => {
        setConversations(c.conversations || []);
        setRequests(r.conversations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const searchUsers = async (e) => {
    const term = e.target.value;
    setQ(term);
    if (term.trim().length < 2) return setUsers([]);
    const d = await api(`/users/search?q=${encodeURIComponent(term)}`).catch(() => ({ users: [] }));
    setUsers((d.users || []).filter((u) => String(u._id) !== String(user.id)));
  };

  const startChat = async (toUserId) => {
    await api('/messages', { method: 'POST', body: { toUserId, text: 'Hi! Let\'s connect on Collavo.' } });
    setComposing(false);
    load();
    const conv = conversations.find((c) => c.participantIds?.some((p) => String(p._id) === String(toUserId)));
    if (conv) navigate(`/messages/${conv._id}`);
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
            return (
              <Link
                key={conv._id}
                to={`/messages/${conv._id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                <Avatar user={other} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-bold text-zinc-900">{other?.name || 'User'}</p>
                    {conv.lastMessageAt && (
                      <span className="text-[10px] text-zinc-400">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-500 mt-0.5">{conv.lastMessage || 'No messages yet'}</p>
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
