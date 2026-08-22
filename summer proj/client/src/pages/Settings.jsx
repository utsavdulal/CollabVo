import { useEffect, useState } from 'react';
import { Instagram, Youtube, Facebook, Music2, Check, Camera, User, QrCode, Building2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/api.js';
import { PlaceInput } from '../components/ui/PlaceInput.jsx';
import { PAYMENT_PROVIDERS, NEPAL_BANKS, getProviderConfig } from '../lib/paymentData.jsx';

function parsePaymentDetails(pd) {
  const provider = pd?.provider || 'esewa';
  return {
    provider,
    esewa: {
      qrCodeURL: pd?.esewa?.qrCodeURL || (provider === 'esewa' ? pd?.qrCodeURL : '') || '',
      accountName: pd?.esewa?.accountName || (provider === 'esewa' ? pd?.accountName : '') || '',
      accountNumber: pd?.esewa?.accountNumber || (provider === 'esewa' ? pd?.accountNumber : '') || '',
      notes: pd?.esewa?.notes || (provider === 'esewa' ? pd?.notes : '') || ''
    },
    khalti: {
      qrCodeURL: pd?.khalti?.qrCodeURL || (provider === 'khalti' ? pd?.qrCodeURL : '') || '',
      accountName: pd?.khalti?.accountName || (provider === 'khalti' ? pd?.accountName : '') || '',
      accountNumber: pd?.khalti?.accountNumber || (provider === 'khalti' ? pd?.accountNumber : '') || '',
      notes: pd?.khalti?.notes || (provider === 'khalti' ? pd?.notes : '') || ''
    },
    fonepay: {
      qrCodeURL: pd?.fonepay?.qrCodeURL || (provider === 'fonepay' ? pd?.qrCodeURL : '') || '',
      accountName: pd?.fonepay?.accountName || (provider === 'fonepay' ? pd?.accountName : '') || '',
      accountNumber: pd?.fonepay?.accountNumber || (provider === 'fonepay' ? pd?.accountNumber : '') || '',
      notes: pd?.fonepay?.notes || (provider === 'fonepay' ? pd?.notes : '') || ''
    },
    bank: {
      bankName: pd?.bank?.bankName || (provider === 'bank' ? pd?.bankName : '') || NEPAL_BANKS[0],
      accountName: pd?.bank?.accountName || (provider === 'bank' ? pd?.accountName : '') || '',
      accountNumber: pd?.bank?.accountNumber || (provider === 'bank' ? pd?.accountNumber : '') || '',
      notes: pd?.bank?.notes || (provider === 'bank' ? pd?.notes : '') || ''
    }
  };
}

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    category: user?.category || '',
    location: user?.location || { coordinates: [0, 0], address: '', country: 'Nepal', state: '', city: '' },
    socials: user?.socials || { instagram: '', tiktok: '', youtube: '', facebook: '' },
    paymentDetails: parsePaymentDetails(user?.paymentDetails)
  });

  const [activeProvider, setActiveProvider] = useState(user?.paymentDetails?.provider || 'esewa');
  const [preview, setPreview] = useState(user?.photoURL || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);

  useEffect(() => {
    if (user) {
      const parsed = parsePaymentDetails(user.paymentDetails);
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        category: user.category || '',
        location: user.location || { coordinates: [0, 0], address: '', country: 'Nepal', state: '', city: '' },
        socials: user.socials || { instagram: '', tiktok: '', youtube: '', facebook: '' },
        paymentDetails: parsed
      });
      setActiveProvider(parsed.provider || 'esewa');
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

  const onQRUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('qrCode', file);
    setQrBusy(true);
    setError('');
    setSuccess('');
    try {
      const { user: updated, qrCodeURL } = await api(`/users/payment-qr?provider=${activeProvider}`, {
        method: 'POST',
        formData: fd
      });
      setForm((f) => ({
        ...f,
        paymentDetails: {
          ...f.paymentDetails,
          [activeProvider]: {
            ...f.paymentDetails[activeProvider],
            qrCodeURL
          }
        }
      }));
      setUser(updated);
      setSuccess(`${getProviderConfig(activeProvider).label} QR code uploaded.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setQrBusy(false);
    }
  };

  const removeQR = () => {
    setForm((f) => ({
      ...f,
      paymentDetails: {
        ...f.paymentDetails,
        [activeProvider]: {
          ...f.paymentDetails[activeProvider],
          qrCodeURL: ''
        }
      }
    }));
  };

  const updateCurrentMethodField = (field, value) => {
    setForm((f) => ({
      ...f,
      paymentDetails: {
        ...f.paymentDetails,
        [activeProvider]: {
          ...f.paymentDetails[activeProvider],
          [field]: value
        }
      }
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const payload = {
        ...form,
        paymentDetails: {
          ...form.paymentDetails,
          provider: activeProvider
        }
      };
      const { user: updated } = await api('/users/me', { method: 'PATCH', body: payload });
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

  const currentMethodData = form.paymentDetails[activeProvider] || {};
  const isBank = activeProvider === 'bank';

  return (
    <div className="pb-12 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Account Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Manage your profile, separate payment details per provider, location, and social channels.</p>
      </div>

      <form onSubmit={save} className="space-y-5 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        {/* Profile Photo */}
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

        {/* Display Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Display Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input text-xs"
            required
          />
        </div>

        {/* Bio */}
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

        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Category / Niche</label>
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input text-xs"
            placeholder="e.g. tech, lifestyle, food, beauty"
          />
        </div>

        {/* Country, State, City Location */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-zinc-900">Location (Country, State, City)</label>
          <PlaceInput
            value={form.location}
            onChange={(location) => setForm({ ...form, location })}
          />
        </div>

        {/* Creator Payout & Payment Details Section */}
        {user?.role !== 'business' && (
          <div className="pt-5 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-[#6366f1]">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900">Payout & Payment Options</h3>
                <p className="text-[11px] text-zinc-500">Each payment method has its own independent QR code and details</p>
              </div>
            </div>

            {/* Provider Selector with Official Brand Logos */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700">Select Payout Method to Edit / Activate</label>
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active: {getProviderConfig(activeProvider).label}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_PROVIDERS.map((p) => {
                  const LogoComponent = p.logo;
                  const isSelected = activeProvider === p.id;
                  const hasDetails = p.id === 'bank'
                    ? Boolean(form.paymentDetails.bank?.accountNumber)
                    : Boolean(form.paymentDetails[p.id]?.qrCodeURL || form.paymentDetails[p.id]?.accountNumber);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveProvider(p.id)}
                      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                        isSelected
                          ? `${p.activeClass} ring-2 ring-offset-1 ring-indigo-300`
                          : 'border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                      }`}
                    >
                      {hasDetails && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-500" title="Configured" />
                      )}
                      <LogoComponent className="h-7 w-7" />
                      <span className="text-xs font-bold leading-tight">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bank Transfer Specific Fields (NO QR OPTION) */}
            {isBank ? (
              <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 mb-4">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Building2 className="h-4 w-4 text-blue-700" />
                    <span>Bank Transfer Details (No QR Code Needed)</span>
                  </div>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-100 px-2 py-0.5 rounded-full">
                    Direct Account Deposit
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Bank Name (Top 10 Banks of Nepal)</label>
                  <select
                    value={currentMethodData.bankName || NEPAL_BANKS[0]}
                    onChange={(e) => updateCurrentMethodField('bankName', e.target.value)}
                    className="input py-2 text-xs bg-white font-medium"
                  >
                    {NEPAL_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">Account Holder Full Name</label>
                    <input
                      value={currentMethodData.accountName || ''}
                      onChange={(e) => updateCurrentMethodField('accountName', e.target.value)}
                      className="input py-2 text-xs bg-white"
                      placeholder="e.g. Ram Bahadur Thapa"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">Bank Account Number</label>
                    <input
                      value={currentMethodData.accountNumber || ''}
                      onChange={(e) => updateCurrentMethodField('accountNumber', e.target.value)}
                      className="input py-2 text-xs font-mono bg-white"
                      placeholder="e.g. 01234567890123"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Bank Branch / Remarks (Optional)</label>
                  <input
                    value={currentMethodData.notes || ''}
                    onChange={(e) => updateCurrentMethodField('notes', e.target.value)}
                    className="input py-2 text-xs bg-white"
                    placeholder="e.g. New Road Branch, Kathmandu"
                  />
                </div>
              </div>
            ) : (
              /* Wallet Fields with Dedicated QR (eSewa / Khalti / Fonepay) */
              <div className="space-y-3 mb-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60">
                  <span className="text-xs font-bold text-zinc-900 capitalize">
                    {getProviderConfig(activeProvider).label} Dedicated Details &amp; QR
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Separate from other payment methods
                  </span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">Account Holder Full Name</label>
                    <input
                      value={currentMethodData.accountName || ''}
                      onChange={(e) => updateCurrentMethodField('accountName', e.target.value)}
                      className="input py-2 text-xs bg-white"
                      placeholder="e.g. Ram Sharma"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700 capitalize">
                      {getProviderConfig(activeProvider).label} Mobile / ID Number
                    </label>
                    <input
                      value={currentMethodData.accountNumber || ''}
                      onChange={(e) => updateCurrentMethodField('accountNumber', e.target.value)}
                      className="input py-2 text-xs font-mono bg-white"
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Transfer Instructions / Notes (Optional)</label>
                  <input
                    value={currentMethodData.notes || ''}
                    onChange={(e) => updateCurrentMethodField('notes', e.target.value)}
                    className="input py-2 text-xs bg-white"
                    placeholder="Remarks or transfer reference note"
                  />
                </div>

                {/* QR Code Upload Box Dedicated to this Provider */}
                <div className="pt-2">
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {getProviderConfig(activeProvider).label} QR Code Image
                  </label>
                  <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3.5">
                    {currentMethodData.qrCodeURL ? (
                      <div className="relative group shrink-0">
                        <img
                          src={currentMethodData.qrCodeURL}
                          alt={`${activeProvider} QR`}
                          className="h-20 w-20 rounded-xl object-contain bg-white border border-zinc-200 p-1 shadow-2xs"
                        />
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[10px] font-bold">
                          <span>Replace</span>
                          <input type="file" accept="image/*" className="hidden" onChange={onQRUpload} disabled={qrBusy} />
                        </label>
                      </div>
                    ) : (
                      <label className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 hover:border-indigo-500 cursor-pointer shrink-0 transition-colors">
                        <QrCode className="h-5 w-5 mb-0.5" />
                        <span className="text-[10px] font-bold">Upload QR</span>
                        <input type="file" accept="image/*" className="hidden" onChange={onQRUpload} disabled={qrBusy} />
                      </label>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-900">
                        {currentMethodData.qrCodeURL ? `${getProviderConfig(activeProvider).label} QR Attached` : `No QR for ${getProviderConfig(activeProvider).label}`}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Upload your personal {getProviderConfig(activeProvider).label} scanner QR code.
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 cursor-pointer hover:bg-zinc-50 transition-colors">
                          {qrBusy ? 'Uploading...' : currentMethodData.qrCodeURL ? 'Change QR' : 'Choose File'}
                          <input type="file" accept="image/*" className="hidden" onChange={onQRUpload} disabled={qrBusy} />
                        </label>
                        {currentMethodData.qrCodeURL && (
                          <button
                            type="button"
                            onClick={removeQR}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connected Social Accounts */}
        <div className="pt-4 border-t border-zinc-100">
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

        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs font-bold">
          {busy ? 'Saving changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
