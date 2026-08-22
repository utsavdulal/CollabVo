import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/api.js';
import { PlaceInput, getCategories } from '../components/ui/PlaceInput.jsx';

export default function ProfileSetup() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    bio: '',
    category: '',
    location: { coordinates: [0, 0], address: '', country: 'Nepal', state: 'Bagmati Province', city: '' },
    photoURL: ''
  });
  const [preview, setPreview] = useState(user?.photoURL || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    setBusy(true);
    try {
      const { photoURL } = await api('/users/photo', { method: 'POST', formData: fd });
      setPreview(photoURL);
      setForm((f) => ({ ...f, photoURL }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.category) {
      setError('Name and category are required');
      return;
    }
    setBusy(true);
    try {
      const { user: updated } = await api('/users/setup-profile', {
        method: 'POST',
        body: { ...form, name: form.name.trim() }
      });
      setUser(updated);
      if (updated.role === 'business') {
        navigate('/verify');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const categories = getCategories(user?.role);

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Complete your profile</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Tell brands and creators about yourself to get started.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              {preview ? (
                <img src={preview} alt="profile" className="h-24 w-24 rounded-full object-cover border-2 border-zinc-200" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <User className="h-10 w-10" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-zinc-900 p-2 text-white shadow-md hover:bg-zinc-800 transition-colors">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Display Name / Brand Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="e.g. Riya Sharma or Acme Brands"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="input min-h-[75px]"
              placeholder="Share your niche, follower reach, or brand focus..."
              maxLength={500}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700">
              {user?.role === 'business' ? 'Industry / Business Type' : 'Content Category'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  className={`chip capitalize ${form.category === c ? 'chip-active' : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Home City / Location</label>
            <PlaceInput value={form.location} onChange={(location) => setForm({ ...form, location })} />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? 'Saving profile...' : 'Continue to Dashboard'}
          </button>
        </form>
      </main>
    </div>
  );
}
