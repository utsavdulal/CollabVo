import { useState } from 'react';
import { X, Calendar, Image as ImageIcon, MapPin, Tag } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PlaceInput } from './PlaceInput.jsx';

const CATEGORIES = ['retail', 'food', 'tech', 'fashion', 'beauty', 'entertainment', 'services', 'other'];
const PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'Facebook'];

export function PostEventModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'fashion',
    platform: 'Instagram',
    image: '',
    budget: '',
    date: '',
    location: { coordinates: [77.2, 28.6], address: 'New Delhi, India' }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  if (!open) return null;

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return setUploadError('Please choose a JPG, PNG or WEBP image');
    }
    if (file.size > 10 * 1024 * 1024) {
      return setUploadError('Image is too large (max 10 MB)');
    }
    setUploadError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await api('/events/image', { method: 'POST', formData: fd });
      setForm((f) => ({ ...f, image: data.url }));
    } catch (err) {
      setUploadError(err.message || 'Upload failed, please try again');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Please provide an event title');
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        platform: form.platform,
        image: form.image.trim() || undefined,
        budget: Number(form.budget) || 0,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        location: form.location
      };
      const res = await api('/events', { method: 'POST', body: payload });
      if (onCreated) onCreated(res.event);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900">
            <Tag className="h-4.5 w-4.5" />
            <h2 className="text-sm font-bold text-zinc-900">Post New Campaign</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Campaign Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input text-xs"
              placeholder="e.g. Summer Collection Lookbook & Reels"
              required
              maxLength={120}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Description & Deliverables</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[70px] text-xs"
              placeholder="Describe deliverables, required audience reach, and campaign timeline..."
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input text-xs capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="input text-xs"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Budget (₹)</label>
              <input
                type="number"
                min="0"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="input text-xs"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Target Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Banner / Thumbnail Image</label>
            {form.image ? (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200">
                <img src={form.image} alt="Banner preview" className="h-36 w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image: '' }))}
                    className="rounded-xl bg-white py-1.5 px-4 text-xs font-bold text-zinc-900"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-6 text-center hover:border-zinc-400 transition-colors">
                <ImageIcon className="h-6 w-6 text-zinc-400 mb-1.5" />
                <span className="text-xs font-bold text-zinc-700">
                  {uploading ? 'Uploading...' : 'Click to upload a photo'}
                </span>
                <span className="mt-0.5 text-[10px] text-zinc-400">JPG, PNG or WEBP · up to 10 MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImagePick}
                  disabled={uploading}
                />
              </label>
            )}
            {uploadError && <p className="mt-1 text-xs text-red-600 font-medium">{uploadError}</p>}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-medium text-zinc-400 uppercase">or paste a link</span>
              <input
                value={form.image.startsWith('http') ? form.image : ''}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                className="input flex-1 text-xs"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Shoot / Event Location</label>
            <PlaceInput
              value={form.location}
              onChange={(location) => setForm({ ...form, location })}
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="flex gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex-1 py-2 text-xs"
            >
              {busy ? 'Posting...' : 'Post Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
