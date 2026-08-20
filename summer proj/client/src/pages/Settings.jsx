import { useEffect, useState } from 'react';
import { Instagram, Youtube, Facebook, Music2, Check, Camera, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/api.js';
import { PlaceInput } from '../components/ui/PlaceInput.jsx';

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    category: user?.category || '',
    location: user?.location || { coordinates: [77.2, 28.6], address: '' },
    socials: user?.socials || { instagram: '', tiktok: '', youtube: '', facebook: '' }
  });
  const [preview, setPreview] = useState(user?.photoURL || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        category: user.category || '',
        location: user.location || { coordinates: [77.2, 28.6], address: '' },
        socials: user.socials || { instagram: '', tiktok: '', youtube: '', facebook: '' }
      });
      setPreview(user.photoURL || '');
    }
  }, [user?.id]);

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    setPhotoBusy(true);
    setError('');
    setSuccess('');
    try {
      const { user: updated } = await api('/users/photo', { method: 'POST', formData: fd });
      setPreview(updated.photoURL);
      setUser(updated);
      setSuccess('Profile photo updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const { user: updated } = await api('/users/me', { method: 'PATCH', body: form });
      setUser(updated);
      setSuccess('Profile settings updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const socials = [
    { key: 'instagram', label: 'Instagram', icon: Instagram },
    { key: 'tiktok', label: 'TikTok', icon: Music2 },
    { key: 'youtube', label: 'YouTube', icon: Youtube },
    { key: 'facebook', label: 'Facebook', icon: Facebook }
  ];

  return (
    <div className="pb-12 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Account Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Manage your personal profile, bio, and connected social channels.</p>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="relative shrink-0">
            {preview ? (
              <img src={preview} alt="Profile" className="h-16 w-16 rounded-full object-cover border-2 border-zinc-200" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                <User className="h-8 w-8" />
              </div>
            )}
            <label
              className={`absolute bottom-0 right-0 cursor-pointer rounded-full bg-zinc-900 p-1.5 text-white shadow-md hover:bg-zinc-800 transition-colors ${
                photoBusy ? 'opacity-60 pointer-events-none' : ''
              }`}
              title={photoBusy ? 'Uploading...' : 'Change profile photo'}
            >
              <Camera className="h-3.5 w-3.5" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} disabled={photoBusy} />
            </label>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900">Profile Photo</p>
            <p className="text-xs text-zinc-500">JPG, PNG or WEBP · max 10 MB</p>
            {photoBusy && <p className="mt-1 text-xs font-medium text-indigo-600">Uploading...</p>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Display Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input text-xs"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="input min-h-[75px] text-xs"
            maxLength={500}
            placeholder="Tell collaborators about your brand or content focus..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Category / Niche</label>
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input text-xs"
            placeholder="e.g. tech, lifestyle, food, beauty"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Home Location</label>
          <PlaceInput value={form.location} onChange={(location) => setForm({ ...form, location })} />
        </div>

        <div className="pt-3 border-t border-zinc-100">
          <label className="mb-2 block text-xs font-bold text-zinc-900">
            Connected Social Accounts
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {socials.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <input
                  value={form.socials[key] || ''}
                  onChange={(e) => setForm({ ...form, socials: { ...form.socials, [key]: e.target.value } })}
                  className="input py-2 text-xs"
                  placeholder={`${label} @handle`}
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {success && (
          <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check className="h-3.5 w-3.5" /> {success}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs">
          {busy ? 'Saving changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
