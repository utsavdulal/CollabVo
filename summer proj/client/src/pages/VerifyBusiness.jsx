import { useEffect, useState } from 'react';
import { FileText, IdCard, CheckCircle2, Clock, XCircle, Upload, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/api.js';

export default function VerifyBusiness() {
  const { user, setUser } = useAuthStore();
  const [registration, setRegistration] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [taxNumber, setTaxNumber] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/verification/me')
      .then((d) => setStatus(d.verification))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!registration || !idFile) {
      setError('Registration certificate and government ID are required');
      return;
    }
    const fd = new FormData();
    fd.append('documents', registration);
    fd.append('documents', idFile);
    if (taxNumber) fd.append('taxNumber', taxNumber);
    setBusy(true);
    try {
      await api('/verification/submit', { method: 'POST', formData: fd });
      setUser({ ...user, verificationStatus: 'pending' });
      const { verification } = await api('/verification/me');
      setStatus(verification);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (status?.status === 'pending') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Verification Under Review</h1>
        <p className="mt-2 max-w-sm text-xs text-zinc-500 dark:text-[#8e95af] leading-relaxed">
          Your trade documents were submitted on {new Date(status.submittedAt).toLocaleDateString()}.
          Review typically takes 24 to 48 hours. You can browse campaigns while waiting.
        </p>
      </div>
    );
  }

  if (status?.status === 'rejected') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
          <XCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Verification Needs Correction</h1>
        <p className="mt-2 max-w-sm text-xs text-red-600 leading-relaxed font-medium">
          {status.rejectionReason || 'Documents were incomplete or unreadable.'}
        </p>
        <button
          type="button"
          onClick={() => setStatus(null)}
          className="btn-primary mt-6 py-2 px-5 text-xs"
        >
          Re-upload Documents
        </button>
      </div>
    );
  }

  if (user?.verificationStatus === 'verified') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Business Account Verified</h1>
        <p className="mt-2 max-w-sm text-xs text-zinc-500 dark:text-[#8e95af]">
          Your business identity is fully verified. You can post campaigns, message creators, and send deal proposals.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-white mb-1">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-xl font-bold tracking-tight dark:text-white">Verify Your Business</h1>
        </div>
        <p className="text-xs text-zinc-500 dark:text-[#8e95af]">
          To protect content creators from scams, brands must submit company registration documents before operating.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200/80 dark:border-[#262a3e] bg-white dark:bg-[#1a1d2d] p-6 shadow-xs">
        <FileField
          label="Trade license or Company Registration Certificate"
          hint="PDF, JPG, or PNG · Max 10MB"
          file={registration}
          onSelect={setRegistration}
          icon={FileText}
        />

        <FileField
          label="Government-issued ID of business owner / representative"
          hint="Passport, Driver's License, or National ID"
          file={idFile}
          onSelect={setIdFile}
          icon={IdCard}
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Tax Registration / GSTIN Number (optional)
          </label>
          <input
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            className="input text-xs"
            placeholder="e.g. GSTIN / VAT / EIN"
            maxLength={40}
          />
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 text-xs">
          {busy ? 'Uploading documents...' : 'Submit Documents for Verification'}
        </button>

        <p className="text-center text-[11px] text-zinc-400 dark:text-[#8e95af]">
          🔒 Documents are encrypted and stored in private storage, only accessible to authorized moderators.
        </p>
      </form>
    </div>
  );
}

function FileField({ label, hint, file, onSelect, icon: Icon }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <label className="flex cursor-pointer items-center gap-3.5 rounded-xl border border-dashed border-zinc-300 dark:border-[#323752] bg-zinc-50/50 dark:bg-[#161926]/50 p-4 hover:border-zinc-900 dark:hover:border-[#6366f1] hover:bg-white dark:hover:bg-[#1a1d2d] transition-all">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#161926] border border-zinc-200 dark:border-[#262a3e] text-zinc-700 dark:text-zinc-300 shadow-2xs">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
            {file ? file.name : 'Click to select file'}
          </p>
          <p className="text-[11px] text-zinc-400 dark:text-[#8e95af]">{hint}</p>
        </div>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}
