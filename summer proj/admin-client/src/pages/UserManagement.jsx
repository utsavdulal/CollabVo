import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../lib/api.js';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (role) params.set('role', role);
    api(`/users?${params}`)
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [role]);

  const toggleSuspend = async (u) => {
    await api(`/users/${u._id}/suspend`, { method: 'PATCH', body: { suspended: !u.suspended } });
    load();
  };

  return (
    <div>
      <h1 className="text-lg font-bold">User Management</h1>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search by name or email" />
        </div>
        <button type="button" onClick={load} className="btn-primary">Search</button>
      </div>
      <div className="mt-3 flex gap-2">
        {['', 'creator', 'business'].map((r) => (
          <button key={r || 'all'} type="button" onClick={() => setRole(r)} className={`btn-secondary px-3 py-1.5 text-xs ${role === r ? 'border-brand text-brand' : ''}`}>
            {r || 'All roles'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="mt-4 space-y-2">
          {users.map((u) => (
            <div key={u._id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.name || u.email}</p>
                <p className="truncate text-xs text-gray-500">{u.email} · {u.role}</p>
                <p className="text-[11px] text-gray-400">
                  {u.category} · {u.verificationStatus} {u.suspended && '· SUSPENDED'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSuspend(u)}
                className={`btn-secondary text-xs ${u.suspended ? 'text-green-600' : 'text-red-600'}`}
              >
                {u.suspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <p className="mt-8 text-center text-sm text-gray-400">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
}
