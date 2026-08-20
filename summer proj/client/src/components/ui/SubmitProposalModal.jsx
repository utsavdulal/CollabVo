import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, Sparkles, Check, Banknote, Lightbulb, X, ExternalLink
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useNavigate } from 'react-router-dom';

const PITCH_TEMPLATES = [
  (brand, title) =>
    `Hi ${brand} team!\n\nI'm excited to apply for the "${title}" campaign. I believe my content style, aesthetic, and highly engaged audience are a great fit for what you're looking for. I'd love to deliver top-quality reels and stories that drive real customer engagement for your brand.`,
  (brand, title) =>
    `Hello ${brand}!\n\nI love your brand and would be thrilled to collaborate on "${title}". I specialize in authentic storytelling and creative visual content. Let's create memorable deliverables that showcase your products and connect deeply with our target audience.`,
  (brand, title) =>
    `Hi there ${brand}!\n\nI'm very interested in partnering on "${title}". With consistent reach and high community interaction, I can guarantee professional deliverables and creative coverage tailored to your campaign goals.`
];

export function SubmitProposalModal({ open, onClose, event, targetUser, onSubmitted }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const brandName = event?.createdBy?.name || targetUser?.name || 'Brand Partner';
  const eventTitle = event?.title || 'Brand Campaign Collaboration';
  const minBudget = event?.budget || 2500;
  const maxBudget = Math.round(minBudget * 1.5);

  const [message, setMessage] = useState('');
  const [rate, setRate] = useState(String(minBudget));
  const [portfolio, setPortfolio] = useState('');
  const [templateIdx, setTemplateIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Initial message generation
  useEffect(() => {
    if (open && !message) {
      setMessage(PITCH_TEMPLATES[0](brandName, eventTitle));
    }
  }, [open, brandName, eventTitle]);

  if (!open) return null;

  const handleRegenerate = () => {
    const nextIdx = (templateIdx + 1) % PITCH_TEMPLATES.length;
    setTemplateIdx(nextIdx);
    setMessage(PITCH_TEMPLATES[nextIdx](brandName, eventTitle));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (message.trim().length < 50) {
      setError('Please provide at least 50 characters in your pitch.');
      return;
    }

    if (!rate || Number(rate) <= 0) {
      setError('Please enter a valid proposed rate.');
      return;
    }

    setBusy(true);
    try {
      const fullMessage = portfolio.trim()
        ? `${message.trim()}\n\nPortfolio / Proof of Work: ${portfolio.trim()}`
        : message.trim();

      const payload = {
        offerAmount: Number(rate),
        message: fullMessage
      };

      if (event?._id) {
        payload.eventId = event._id;
        payload.toUserId = event.createdBy?._id || event.createdBy;
      } else if (targetUser?._id || targetUser?.id) {
        payload.toUserId = targetUser._id || targetUser.id;
      }

      await api('/proposals', {
        method: 'POST',
        body: payload
      });

      if (onSubmitted) onSubmitted();
      onClose();
      navigate(user?.role === 'business' ? '/proposals' : '/work');
    } catch (err) {
      setError(err.message || 'Failed to submit proposal.');
    } finally {
      setBusy(false);
    }
  };

  const charCount = message.length;
  const isCharValid = charCount >= 50;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#121522] p-6 text-zinc-900 dark:text-white shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#262a3e]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-[#202438] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
            Submit Proposal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* 1. Applying To Banner */}
          <div className="rounded-2xl border border-indigo-100 dark:border-[#2a2f4c] bg-indigo-50/50 dark:bg-gradient-to-r dark:from-[#1b1f38] dark:to-[#171a2e] p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#6366f1] dark:text-[#818cf8]">
              {user?.role === 'business' ? 'PROPOSING TO' : 'APPLYING TO'}
            </span>
            <h3 className="mt-1 text-sm font-black text-zinc-900 dark:text-white leading-snug">
              {eventTitle}
            </h3>
            <p className="text-xs font-semibold text-zinc-500 dark:text-[#8e95af] mt-0.5">
              {brandName}
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-[#34d399]">
                <Banknote className="h-3.5 w-3.5" /> Rs. {minBudget.toLocaleString()} – Rs. {maxBudget.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 2. Tip Box */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-zinc-700 dark:text-zinc-300">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              A strong answer that mentions the business, your experience, and a clear idea performs best.
            </p>
          </div>

          {/* 3. Why choose me? Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-900 dark:text-white">
                Why choose me? * <span className="text-zinc-400 text-[11px] font-normal">(min 50 chars)</span>
              </label>
              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-[#232542] dark:border-[#6366f1]/40 px-2.5 py-1 text-[11px] font-bold text-[#6366f1] dark:text-[#818cf8] hover:bg-indigo-100 dark:hover:bg-[#2e3157] transition-colors"
              >
                <Sparkles className="h-3 w-3" /> Regenerate
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={800}
              rows={5}
              placeholder="Explain why you are a great fit for this collaboration..."
              className="w-full rounded-2xl border border-zinc-200 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#161926] p-3.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-[#8e95af] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] leading-relaxed transition-all"
              required
            />

            {/* Character count */}
            <div className="mt-1.5 flex justify-end">
              <span
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  isCharValid
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {isCharValid && <Check className="h-3 w-3" />}
                {charCount}/800 characters
              </span>
            </div>
          </div>

          {/* 4. Proposed Rate (Rs.) */}
          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1.5">
              Proposed Rate (Rs.) *
            </label>
            <input
              type="number"
              min="1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 5000"
              className="input text-xs font-bold"
              required
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-[#8e95af]">
              Budget range: Rs. {minBudget.toLocaleString()} – Rs. {maxBudget.toLocaleString()}
            </p>
          </div>

          {/* 5. Portfolio / Previous Work */}
          <div>
            <label className="block text-xs font-bold text-zinc-900 dark:text-white mb-1.5">
              Portfolio / Previous Work <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://yourportfolio.com or Instagram link"
              className="input text-xs"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{error}</p>
          )}

          {/* 6. Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy || !isCharValid}
              className="btn-primary w-full py-3.5 text-sm font-extrabold tracking-wide rounded-2xl shadow-lg shadow-indigo-950/40 hover:bg-[#4f46e5] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {busy ? 'Submitting Proposal...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
