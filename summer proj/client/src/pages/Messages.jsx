import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search, Send, Plus, MoreVertical, ArrowLeft,
  Mic, Smile, Paperclip, CheckCheck, MessageSquare, X
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useMessagesSSE } from '../lib/useMessagesSSE.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuthStore } from '../store/authStore.js';

/* ─── helpers ─── */
function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86400000)
    return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtDateDivider(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
  if (diff < 2 * 86400000) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupByDay(messages) {
  const groups = [];
  let lastDay = null;
  messages.forEach((m) => {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDay) {
      groups.push({ type: 'divider', label: fmtDateDivider(m.createdAt), key: `div-${m._id}` });
      lastDay = day;
    }
    groups.push({ type: 'msg', ...m });
  });
  return groups;
}

/* ─── Chat List Item ─── */
function ConvItem({ conv, active, currentUserId, onClick }) {
  const other = conv.participantIds?.find((p) => String(p._id) !== String(currentUserId));
  const unread = conv.unreadCount || 0;

  return (
    <button
      type="button"
      onClick={() => onClick(conv._id)}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${
        active
          ? 'bg-indigo-50 border border-indigo-100'
          : 'hover:bg-zinc-100/80 border border-transparent'
      }`}
    >
      {/* Avatar with online dot */}
      <div className="relative shrink-0">
        <Avatar user={other} size="md" />
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`truncate text-[13px] leading-tight ${unread > 0 ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-800'}`}>
            {other?.name || 'User'}
          </p>
          <span className="text-[10px] text-zinc-400 ml-2 shrink-0">{fmtTime(conv.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`truncate text-[12px] ${unread > 0 ? 'font-medium text-zinc-700' : 'text-zinc-400'}`}>
            {conv.lastMessage || 'No messages yet'}
          </p>
          {unread > 0 ? (
            <span className="ml-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white shrink-0">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            <CheckCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0 ml-1" />
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Message Bubble ─── */
function Bubble({ msg, isMine, other, user }) {
  return (
    <div className={`flex items-end gap-2.5 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="shrink-0 mb-1">
        <Avatar user={isMine ? user : other} size="xs" />
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[68%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 text-[13px] leading-relaxed shadow-xs ${
            isMine
              ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
              : 'bg-white text-zinc-800 border border-zinc-200/80 rounded-2xl rounded-bl-sm'
          }`}
        >
          <p>{msg.text}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 px-1 text-[10px] text-zinc-400 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-zinc-400">·</span>
          <span>{isMine ? 'You' : other?.name?.split(' ')[0]}</span>
          {isMine && <CheckCheck className="h-3 w-3 text-indigo-400 ml-0.5" />}
        </div>
      </div>

      {/* Hover action */}
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 mb-5"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── New Conversation Search Panel ─── */
function ComposePanel({ currentUserId, onStart, onClose }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);

  const search = async (e) => {
    const term = e.target.value;
    setQ(term);
    if (term.trim().length < 2) return setUsers([]);
    const d = await api(`/users/search?q=${encodeURIComponent(term)}`).catch(() => ({ users: [] }));
    setUsers((d.users || []).filter((u) => String(u._id) !== String(currentUserId)));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <h3 className="text-sm font-bold text-zinc-900">New Message</h3>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            value={q}
            onChange={search}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
            placeholder="Search people..."
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {users.map((u) => (
          <button
            key={u._id}
            type="button"
            onClick={() => onStart(u._id)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-50 text-left transition-colors"
          >
            <Avatar user={u} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 leading-tight">{u.name}</p>
              <p className="text-xs text-zinc-400 capitalize">{u.role}{u.category && ` · ${u.category}`}</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600">Chat →</span>
          </button>
        ))}
        {q.trim().length >= 2 && users.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">No users found</p>
        )}
        {q.trim().length < 2 && (
          <p className="py-6 text-center text-xs text-zinc-400">Type a name to search</p>
        )}
      </div>
    </div>
  );
}

/* ─── Right Panel: Active Conversation ─── */
function ActiveChat({ convId, currentUser, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!convId) return;
    setLoading(true);
    Promise.all([api(`/messages/${convId}`), api(`/messages/${convId}/messages`)])
      .then(([convData, msgData]) => {
        setConversation(convData.conversation);
        setMessages(msgData.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [convId]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages.length]);

  useMessagesSSE({
    onNewMessage: (data) => {
      if (String(data.conversationId) === String(convId)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(data.message._id))) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }
  });

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    try {
      const data = await api(`/messages/${convId}/messages`, { method: 'POST', body: { text: msgText } });
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(data.message._id))) return prev;
          return [...prev, data.message];
        });
      }
    } catch {
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const other = conversation?.participantIds?.find((p) => String(p._id) !== String(currentUser?.id || currentUser?._id));
  const grouped = groupByDay(messages);

  if (!convId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/60 text-center p-8">
        <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-indigo-400" />
        </div>
        <h3 className="text-base font-bold text-zinc-800">Select a conversation</h3>
        <p className="text-sm text-zinc-400 mt-1">Choose a chat from the list or start a new one</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 mr-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {other && (
            <Link to={`/profile/${other._id}`} className="flex items-center gap-3 group">
              <div className="relative">
                <Avatar user={other} size="sm" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 leading-tight group-hover:text-indigo-600 transition-colors">{other.name}</p>
                <p className="text-[11px] text-emerald-500 font-semibold">Online</p>
              </div>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <Search className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-zinc-50/40">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-zinc-400">
            <MessageSquare className="h-10 w-10 mb-3 text-zinc-300" />
            <p className="text-sm font-semibold text-zinc-600">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start collaborating!</p>
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === 'divider') {
              return (
                <div key={item.key} className="flex items-center justify-center py-2">
                  <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-[11px] font-semibold text-zinc-500">
                    {item.label}
                  </span>
                </div>
              );
            }
            const isMine = String(item.senderId) === String(currentUser?.id || currentUser?._id);
            return (
              <Bubble
                key={item._id}
                msg={item}
                isMine={isMine}
                other={other}
                user={currentUser}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={send}
        className="flex items-center gap-2.5 border-t border-zinc-100 bg-white px-4 py-3 shrink-0"
      >
        <button type="button" className="shrink-0 rounded-full p-2 text-zinc-400 hover:bg-zinc-100">
          <Mic className="h-4.5 w-4.5" />
        </button>
        <div className="relative flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }}}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            placeholder="Type Your Message"
          />
        </div>
        <button type="button" className="shrink-0 rounded-full p-2 text-zinc-400 hover:bg-zinc-100">
          <Smile className="h-4.5 w-4.5" />
        </button>
        <button type="button" className="shrink-0 rounded-full p-2 text-zinc-400 hover:bg-zinc-100">
          <Paperclip className="h-4.5 w-4.5" />
        </button>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

/* ─── Main Messages Page ─── */
export default function Messages() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('chats');
  const [searchQ, setSearchQ] = useState('');
  const [composing, setComposing] = useState(false);

  const currentUserId = user?.id || user?._id;

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
            unreadCount: (updated[idx].unreadCount || 0) + (String(data.senderId) !== String(currentUserId) ? 1 : 0)
          };
          updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
          return updated;
        }
        load();
        return prev;
      });
    },
    onConversationAccepted: () => load()
  });

  const startChat = async (toUserId) => {
    const data = await api('/messages', { method: 'POST', body: { toUserId, text: "Hi! Let's connect on Collavo." } });
    setComposing(false);
    load();
    if (data.conversation?._id) navigate(`/messages/${data.conversation._id}`);
  };

  const acceptRequest = async (convId, e) => {
    e?.stopPropagation();
    await api(`/messages/${convId}/accept`, { method: 'POST' });
    load();
  };

  const handleSelectConv = (convId) => {
    navigate(`/messages/${convId}`);
  };

  const displayList = tab === 'chats' ? conversations : requests;
  const filtered = searchQ.trim()
    ? displayList.filter((c) => {
        const other = c.participantIds?.find((p) => String(p._id) !== String(currentUserId));
        return other?.name?.toLowerCase().includes(searchQ.toLowerCase());
      })
    : displayList;

  // On mobile: show list when no activeId, show chat when activeId is set
  const showList = !activeId;

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-4.5rem)] -mx-4 md:-mx-6 -mt-4 overflow-hidden bg-white rounded-2xl border border-zinc-200/80 shadow-xs">

      {/* ── Left Column: Chat List ── */}
      <div className={`flex flex-col border-r border-zinc-100 bg-zinc-50/60 shrink-0 w-full lg:w-[320px] ${activeId ? 'hidden lg:flex' : 'flex'}`}>

        {/* List Header */}
        <div className="px-4 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-zinc-900">Chats</h1>
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
              title="New message"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 pr-9 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
              placeholder="Search"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 px-4 pb-3 shrink-0">
          {[
            { key: 'chats', label: 'All Chats' },
            { key: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}` }
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tab === key ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-zinc-200/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 shrink-0">
          {tab === 'chats' ? 'All Chats' : 'Message Requests'}
        </p>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageSquare className="h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-600">No conversations</p>
              <p className="text-xs text-zinc-400 mt-1">
                {tab === 'requests' ? 'No pending requests.' : 'Start a new conversation.'}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <div key={conv._id} className="relative">
                <ConvItem
                  conv={conv}
                  active={String(conv._id) === String(activeId)}
                  currentUserId={currentUserId}
                  onClick={handleSelectConv}
                />
                {conv.isRequest && (
                  <button
                    type="button"
                    onClick={(e) => acceptRequest(conv._id, e)}
                    className="absolute right-3 top-3 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700"
                  >
                    Accept
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right Column: Active Chat or Empty State ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${activeId ? 'flex' : 'hidden lg:flex'}`}>
        {composing ? (
          <ComposePanel
            currentUserId={currentUserId}
            onStart={startChat}
            onClose={() => setComposing(false)}
          />
        ) : (
          <ActiveChat
            convId={activeId}
            currentUser={user}
            onBack={() => navigate('/messages')}
          />
        )}
      </div>
    </div>
  );
}
