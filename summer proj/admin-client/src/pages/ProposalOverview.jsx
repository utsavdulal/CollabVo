import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function ProposalOverview() {
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    api('/panel/escrows').then((d) => setProposals(d.proposals || [])).catch(() => {});
  }, []);

  const tone = {
    held: 'bg-amber-50 text-amber-600',
    released: 'bg-green-50 text-green-600',
    disputed: 'bg-red-50 text-red-600'
  };

  return (
    <div>
      <h1 className="text-lg font-bold">Escrow Overview</h1>
      <p className="mt-1 text-sm text-gray-500">All proposals with active or closed escrow, useful for spotting stuck disputes.</p>
      <div className="mt-4 space-y-2">
        {proposals.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No escrow activity.</div>
        ) : (
          proposals.map((p) => (
            <div key={p._id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {p.fromUserId?.name} → {p.toUserId?.name}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone[p.escrowStatus]}`}>
                  {p.escrowStatus}
                </span>
              </div>
              {p.eventId && <p className="mt-1 text-xs text-gray-500">Event: {p.eventId.title}</p>}
              <p className="mt-1 text-xs text-gray-500">
                ₹{p.offerAmount} · confirmed by business: {p.businessConfirmedComplete ? 'yes' : 'no'} · confirmed by creator: {p.creatorConfirmedComplete ? 'yes' : 'no'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
