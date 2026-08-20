import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function ChatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () => {
    Promise.all([api(`/messages/${id}`), api(`/messages/${id}/messages`)])
      .then(([convData, msgData]) => {
        setConversation(convData.conversation);
        setMessages(msgData.messages || []);
      })
      .catch(() => navigate('/messages'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const other = conversation?.participantIds?.find((p) => String(p._id) !== String(user.id));
      await api('/messages', { method: 'POST', body: { toUserId: other?._id || '', text: text.trim() } });
      setText('');
      load();
    } catch {
      /* ignore send error */
    } finally {
      setSending(false);
    }
  };

  const mine = (m) => String(m.senderId) === String(user.id);
  const other = conversation?.participantIds?.find((p) => String(p._id) !== String(user.id));

  return (
    <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs md:h-[calc(100vh-8rem)]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {other && (
            <Link to={`/profile/${other._id}`} className="flex items-center gap-2.5">
              <Avatar user={other} size="sm" />
              <div>
                <p className="text-xs font-bold text-zinc-900 leading-tight">{other.name}</p>
                <p className="text-[10px] text-zinc-400 capitalize">{other.role}</p>
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-50/50">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No messages yet. Send a greeting to start collaborating!
          </div>
        ) : (
          messages.map((m) => (
            <div key={m._id} className={`flex ${mine(m) ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${
                  mine(m)
                    ? 'bg-zinc-900 text-white rounded-br-xs'
                    : 'bg-white text-zinc-800 border border-zinc-200/80 shadow-2xs rounded-bl-xs'
                }`}
              >
                <p className="leading-relaxed">{m.text}</p>
                <p
                  className={`mt-1 text-[9px] text-right ${
                    mine(m) ? 'text-zinc-400' : 'text-zinc-400'
                  }`}
                >
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-zinc-100 bg-white p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input flex-1 py-2 text-xs"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="btn-primary py-2 px-3 text-xs"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
