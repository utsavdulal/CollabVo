import { useState } from 'react';
import { X, Calendar, Image as ImageIcon, MapPin, Tag, Video, Camera, MessageSquare, Users, Plus, Minus } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PlaceInput } from './PlaceInput.jsx';

const CATEGORIES = ['retail', 'food', 'tech', 'fashion', 'beauty', 'entertainment', 'services', 'other'];
const PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'Facebook'];

function formFromEvent(event) {
  if (!event) {
    return {
      title: '',
      description: '',
      category: 'fashion',
      platform: 'Instagram',
      workMode: 'onsite',
      image: '',
      budget: '',
      date: '',
      deliverables: { videos: 1, posts: 1, storyMentions: 1 },
      creatorsNeeded: 1,
      location: { coordinates: [85.324, 27.7172], address: 'Kathmandu, Nepal', country: 'Nepal', state: 'Bagmati Province', city: 'Kathmandu' }
    };
  }
  return {
    title: event.title || '',
    description: event.description || '',
    category: event.category || 'other',
    platform: event.platform || 'Instagram',
    workMode: event.workMode || 'onsite',
    image: event.image || '',
    budget: event.budget ?? '',
    date: event.date ? new Date(event.date).toISOString().slice(0, 10) : '',
    deliverables: {
      videos: event.deliverables?.videos ?? 1,
      posts: event.deliverables?.posts ?? 1,
      storyMentions: event.deliverables?.storyMentions ?? 1
    },
    creatorsNeeded: event.creatorsNeeded ?? 1,
    location: {
      ...(event.location || {}),
      coordinates: event.location?.coordinates?.length === 2 ? event.location.coordinates : [85.324, 27.7172],
      address: event.location?.address || ''
    }
  };
}

export function PostEventModal({ open, onClose, onCreated, event }) {
  const isEdit = Boolean(event);
  const [form, setForm] = useState(() => formFromEvent(event));
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
        workMode: form.workMode,
        image: form.image.trim() || undefined,
        budget: Number(form.budget) || 0,
        deliverables: {
          videos: Math.max(0, Number(form.deliverables?.videos) || 0),
          posts: Math.max(0, Number(form.deliverables?.posts) || 0),
          storyMentions: Math.max(0, Number(form.deliverables?.storyMentions) || 0)
        },
        creatorsNeeded: Math.max(1, Number(form.creatorsNeeded) || 1),
        date: form.date ? new Date(form.date).toISOString() : undefined,
        location: form.location
      };
      const res = isEdit
        ? await api(`/events/${event._id}`, { method: 'PATCH', body: payload })
        : await api('/events', { method: 'POST', body: payload });
      if (onCreated) onCreated(res.event);
      onClose();
    } catch (err) {
      setError(err.message || (isEdit ? 'Failed to save changes' : 'Failed to create campaign'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] rounded-3xl border border-zinc-200 dark:border-[#262a3e] bg-white dark:bg-[#161926] shadow-2xl flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#262a3e] px-5 py-4 shrink-0 bg-white dark:bg-[#161926]">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-[#232542] text-indigo-600 dark:text-indigo-400">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                {isEdit ? 'Edit Campaign' : 'Post New Campaign'}
              </h2>
              <p className="text-[10px] text-zinc-500 dark:text-[#8e95af]">
                {isEdit ? 'Update details of your campaign' : 'Specify requirements, budget, and location'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#232542] hover:text-zinc-700 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={submit} className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Campaign Title *</label>
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
            <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description &amp; Brief</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[65px] text-xs"
              placeholder="Describe campaign goals, theme, brand hashtags, and specific instructions..."
              maxLength={2000}
            />
          </div>

          {/* Deliverables Required & Slots Needed */}
          <div className="rounded-2xl border border-indigo-100 dark:border-[#2a2f4c] bg-indigo-50/40 dark:bg-[#1c2038] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <span>Deliverables &amp; Creator Slots</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Videos */}
              <div className="rounded-xl bg-white dark:bg-[#121522] p-2.5 border border-indigo-100 dark:border-[#262a3e] text-center shadow-xs">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  <Video className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Videos
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        deliverables: { ...f.deliverables, videos: Math.max(0, (f.deliverables?.videos || 0) - 1) }
                      }))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#202438] hover:bg-zinc-200 dark:hover:bg-[#232542] text-zinc-700 dark:text-zinc-300 font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs w-4 text-center text-zinc-900 dark:text-white">{form.deliverables?.videos ?? 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        deliverables: { ...f.deliverables, videos: (f.deliverables?.videos || 0) + 1 }
                      }))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-[#2e3357] text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Feed Posts */}
              <div className="rounded-xl bg-white dark:bg-[#121522] p-2.5 border border-indigo-100 dark:border-[#262a3e] text-center shadow-xs">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  <Camera className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Posts
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        deliverables: { ...f.deliverables, posts: Math.max(0, (f.deliverables?.posts || 0) - 1) }
                      }))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#202438] hover:bg-zinc-200 dark:hover:bg-[#232542] text-zinc-700 dark:text-zinc-300 font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs w-4 text-center text-zinc-900 dark:text-white">{form.deliverables?.posts ?? 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        deliverables: { ...f.deliverables, posts: (f.deliverables?.posts || 0) + 1 }
                      }))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-[#2e3357] text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Story Mentions */}
              <div className="rounded-xl bg-white dark:bg-[#121522] p-2.5 border border-indigo-100 dark:border-[#262a3e] text-center shadow-xs">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Stories
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        deliverables: { ...f.deliverables, storyMentions: Math.max(0, (f.deliverables?.storyMentions || 0) - 1) }
                      }))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 dark:bg-[#202438] hover:bg-zinc-200 dark:hover:bg-[#232542] text-zinc-700 dark:text-zinc-300 font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs w-4 text-center text-zinc-900 dark:text-white">{form.deliverables?.storyMentions ?? 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        deliverables: { ...f.deliverables, storyMentions: (f.deliverables?.storyMentions || 0) + 1 }
                      }))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-[#2e3357] text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Creators Needed Slot */}
            <div className="flex items-center justify-between pt-1.5 border-t border-indigo-100/60 dark:border-[#262a3e]">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Creators Needed (Capacity):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, creatorsNeeded: Math.max(1, (f.creatorsNeeded || 1) - 1) }))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-[#121522] border border-zinc-200 dark:border-[#262a3e] hover:bg-zinc-50 dark:hover:bg-[#161926] text-zinc-700 dark:text-zinc-300 font-bold text-xs shadow-xs"
                >
                  -
                </button>
                <span className="font-bold text-xs w-6 text-center text-indigo-700 dark:text-indigo-400">{form.creatorsNeeded || 1}</span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, creatorsNeeded: Math.min(50, (f.creatorsNeeded || 1) + 1) }))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input text-xs capitalize bg-white dark:bg-[#121522]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="input text-xs bg-white dark:bg-[#121522]"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Work Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[['onsite', 'On-site visit required', 'Creator visits your location'], ['remote', 'Remote collaboration', 'Work can be completed remotely']].map(([value, title, subtitle]) => (
                <button key={value} type="button" onClick={() => setForm({ ...form, workMode: value })} className={`rounded-xl border p-3 text-left transition-colors ${form.workMode === value ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:border-indigo-400 dark:bg-[#232542] dark:text-indigo-200' : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-[#262a3e] dark:bg-[#121522] dark:text-zinc-300'}`}>
                  <span className="block text-xs font-bold">{title}</span><span className="mt-0.5 block text-[10px] opacity-75">{subtitle}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Budget (₹ per creator)</label>
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
              <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Target Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Banner / Thumbnail Image</label>
            {form.image ? (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-[#262a3e]">
                <img src={form.image} alt="Banner preview" className="h-32 w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image: '' }))}
                    className="rounded-xl bg-white py-1.5 px-4 text-xs font-bold text-zinc-900 shadow-md"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 dark:border-[#262a3e] bg-zinc-50 dark:bg-[#121522] py-5 text-center hover:border-zinc-400 dark:hover:border-[#3a4060] transition-colors">
                <ImageIcon className="h-6 w-6 text-zinc-400 mb-1" />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
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
              <span className="text-[10px] font-medium text-zinc-400 uppercase shrink-0">or paste a link</span>
              <input
                value={form.image.startsWith('http') ? form.image : ''}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                className="input flex-1 text-xs"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>

          {form.workMode === 'onsite' && <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Shoot / Event Location</label>
            <PlaceInput
              value={form.location}
              onChange={(location) => setForm({ ...form, location })}
            />
          </div>}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </form>

        {/* Sticky Footer */}
        <div className="flex gap-2.5 px-5 py-3.5 border-t border-zinc-100 dark:border-[#262a3e] bg-zinc-50/80 dark:bg-[#121522]/80 backdrop-blur-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 py-2.5 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="btn-primary flex-1 py-2.5 text-xs font-bold justify-center"
          >
            {busy ? (isEdit ? 'Saving...' : 'Posting...') : isEdit ? 'Save Changes' : 'Post Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
