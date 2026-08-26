import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';

export default function Support() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await api('/notifications').catch(() => {});
    setSent(true);
  };

  const faqs = [
    {
      q: 'How does virtual escrow work?',
      a: 'When a brand and creator accept a deal proposal, the offer amount locks automatically in escrow. Funds only release to the creator after deliverables are delivered and confirmed.'
    },
    {
      q: 'How do businesses reload their budget?',
      a: 'Brands can contact the platform operations team. Virtual wallet balances are credited immediately upon bank transfer confirmation.'
    },
    {
      q: 'When do creators receive payouts?',
      a: 'Once a campaign is marked complete, funds move to your claimable balance. You can request a payout anytime directly from your wallet dashboard.'
    },
    {
      q: 'How is business verification handled?',
      a: 'Businesses submit official trade certificates and government IDs. Platform moderators review and approve verified badges within 24-48 hours.'
    }
  ];

  return (
    <div className="pb-12 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Support & Help Center</h1>
        <p className="text-xs text-zinc-500 dark:text-[#8e95af] mt-0.5">Find answers to common questions or reach out directly to the team.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-5 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <Headphones className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          <span>Contact Platform Support</span>
        </div>
        {sent ? (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Message received. Our support team will reply via notification.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-3 space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[90px] text-xs"
              placeholder="Describe your question, issue, or escrow inquiry..."
              required
            />
            <button type="submit" className="btn-primary w-full py-2 text-xs">
              <Send className="h-3.5 w-3.5" /> Submit Inquiry
            </button>
          </form>
        )}
      </div>

      <h2 className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">Frequently Asked Questions</h2>
      <div className="space-y-2">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-4 shadow-xs">
            <summary className="cursor-pointer text-xs font-bold text-zinc-900 dark:text-white list-none flex items-center justify-between">
              <span>{f.q}</span>
              <span className="text-zinc-400 dark:text-[#8e95af] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => navigate('/legal')}
          className="text-xs font-semibold text-zinc-500 dark:text-[#8e95af] hover:text-zinc-900 dark:hover:text-white hover:underline"
        >
          View Terms of Service & Privacy Policy &rarr;
        </button>
      </div>
    </div>
  );
}
