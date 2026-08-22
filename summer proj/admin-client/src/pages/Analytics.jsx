import { useEffect, useState } from 'react';
import { Users, BadgeCheck, Coins, Clock } from 'lucide-react';
import { api } from '../lib/api.js';

export default function Analytics() {
  const [a, setA] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api('/panel/analytics')
      .then(setA)
      .catch((err) => setError(err.message || 'Failed to load analytics'));
  };

  useEffect(load, []);

  if (error) {
    return (
      <div>
        <h1 className="text-lg font-bold">Analytics</h1>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button type="button" onClick={load} className="ml-3 font-semibold underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!a) return <p className="mt-8 text-center text-sm text-gray-400">Loading...</p>;

  const cards = [
    { label: 'Total Creators', value: a.totalCreators, icon: Users, tone: 'bg-brand-50 text-brand-600' },
    { label: 'Total Businesses', value: a.totalBusinesses, icon: Users, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Verified Businesses', value: a.totalVerifiedBusinesses, icon: BadgeCheck, tone: 'bg-green-50 text-green-600' },
    { label: 'Virtual Currency in Circulation', value: `₹${a.virtualCurrencyInCirculation}`, icon: Coins, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Withdrawals', value: `₹${a.pendingWithdrawalTotal} (${a.pendingWithdrawalCount})`, icon: Clock, tone: 'bg-red-50 text-red-600' }
  ];

  return (
    <div>
      <h1 className="text-lg font-bold">Analytics</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className={`inline-flex rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></div>
            <p className="mt-3 text-lg font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
