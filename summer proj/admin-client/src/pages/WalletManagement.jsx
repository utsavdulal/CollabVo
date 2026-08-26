import { useEffect, useState } from 'react';
import { Search, Wallet, AlertTriangle, QrCode, Copy, Check, X, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';

export default function WalletManagement() {
  const [tab, setTab] = useState('topup');
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [topUps, setTopUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmPay, setConfirmPay] = useState(null);
  const [confirmDeny, setConfirmDeny] = useState(null);
  const [confirmApproveTopUp, setConfirmApproveTopUp] = useState(null);
  const [confirmDenyTopUp, setConfirmDenyTopUp] = useState(null);
  const [copiedId, setCopiedId] = useState('');
  const [previewQR, setPreviewQR] = useState(null);
  const [topUpPayment, setTopUpPayment] = useState({});
  const [topUpQrFile, setTopUpQrFile] = useState(null);
  const [savingTopUpPayment, setSavingTopUpPayment] = useState(false);

  const defaultPaymentDetails = {
    provider: 'esewa',
    esewa: { qrCodeURL: '', accountName: '', accountNumber: '', notes: '' },
    khalti: { qrCodeURL: '', accountName: '', accountNumber: '', notes: '' },
    fonepay: { qrCodeURL: '', accountName: '', accountNumber: '', notes: '' },
    bank: { bankName: '', accountName: '', accountNumber: '', notes: '' }
  };

  useEffect(() => {
    api('/wallet/topup-payment').then((d) => setTopUpPayment(d.topUpPayment || {})).catch(() => {});
  }, []);

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const saveTopUpPayment = async (e) => {
    e.preventDefault();
    setSavingTopUpPayment(true);
    try {
      const formData = new FormData();
      formData.append('provider', topUpPayment.topUpProvider || 'esewa');
      formData.append('paymentDetails', JSON.stringify({ ...defaultPaymentDetails, ...(topUpPayment.topUpPaymentDetails || {}), provider: topUpPayment.topUpProvider || 'esewa' }));
      if (topUpQrFile) formData.append('qrCode', topUpQrFile);
      const d = await api('/wallet/topup-payment', { method: 'POST', formData });
      setTopUpPayment(d.topUpPayment || {});
      setTopUpQrFile(null);
      showMsg('Business top-up payment details saved');
    } catch (err) {
      showMsg(err.message || 'Could not save payment details', true);
    } finally {
      setSavingTopUpPayment(false);
    }
  };

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    const d = await api(`/users?q=${encodeURIComponent(q.trim())}`).catch(() => { showMsg('Search failed', true); return { users: [] }; });
    setUsers(d.users || []);
    setLoading(false);
  };

  const openUser = async (u) => {
    setSelected(u);
    setWallet(null);
    setError('');
    const d = await api(`/wallet/user/${u._id}`).catch(() => { showMsg('Failed to load wallet', true); return { wallet: null, transactions: [] }; });
    if (d.user) setSelected(d.user);
    setWallet(d.wallet);
    setLedger(d.transactions || []);
  };

  const loadWithdrawals = () => {
    setLoading(true);
    api('/wallet/withdrawals?status=pending')
      .then((d) => setWithdrawals(d.transactions || []))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  };

  const loadTopUps = () => {
    setLoading(true);
    api('/wallet/topups?status=pending')
      .then((d) => setTopUps(d.transactions || []))
      .catch(() => setTopUps([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'withdrawals') loadWithdrawals();
    if (tab === 'topups') loadTopUps();
  }, [tab]);

  const topUp = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setError('');
    try {
      await api('/wallet/topup', { method: 'POST', body: { userId: selected._id, amount: Number(amount), referenceNote: note } });
      setAmount('');
      setNote('');
      showMsg(`₹${amount} credited successfully`);
      openUser(selected);
    } catch (err) {
      showMsg(err.message || 'Top up failed', true);
    }
  };

  const deduct = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !note.trim()) return;
    setError('');
    try {
      await api('/wallet/deduct', { method: 'POST', body: { userId: selected._id, amount: Number(amount), reason: note } });
      setAmount('');
      setNote('');
      showMsg(`₹${amount} deducted successfully`);
      openUser(selected);
    } catch (err) {
      showMsg(err.message || 'Deduction failed', true);
    }
  };

  const pay = async (id) => {
    setConfirmPay(null);
    try {
      await api(`/wallet/withdrawals/${id}/pay`, { method: 'POST' });
      showMsg('Payout marked as paid');
      loadWithdrawals();
    } catch (err) {
      showMsg(err.message || 'Pay failed', true);
    }
  };

  const deny = async (id) => {
    setConfirmDeny(null);
    try {
      await api(`/wallet/withdrawals/${id}/deny`, { method: 'POST' });
      showMsg('Payout denied');
      loadWithdrawals();
    } catch (err) {
      showMsg(err.message || 'Deny failed', true);
    }
  };

  const approveTopUp = async (id) => {
    setConfirmApproveTopUp(null);
    try {
      await api(`/wallet/topups/${id}/approve`, { method: 'POST' });
      showMsg('Top-up approved and credited');
      loadTopUps();
    } catch (err) {
      showMsg(err.message || 'Approve failed', true);
    }
  };

  const denyTopUp = async (id) => {
    setConfirmDenyTopUp(null);
    try {
      await api(`/wallet/topups/${id}/deny`, { method: 'POST', body: { reason: 'Payment could not be verified' } });
      showMsg('Top-up request denied');
      loadTopUps();
    } catch (err) {
      showMsg(err.message || 'Deny failed', true);
    }
  };

  const activeTopUpProvider = topUpPayment.topUpProvider || 'esewa';
  const paymentDetails = { ...defaultPaymentDetails, ...(topUpPayment.topUpPaymentDetails || {}) };
  const currentPaymentMethod = paymentDetails[activeTopUpProvider] || {};
  const updateCurrentPaymentMethod = (field, value) => {
    setTopUpPayment({
      ...topUpPayment,
      topUpPaymentDetails: {
        ...paymentDetails,
        provider: activeTopUpProvider,
        [activeTopUpProvider]: { ...currentPaymentMethod, [field]: value }
      }
    });
  };

  return (
    <div>
      <h1 className="text-lg font-bold">Wallet Management</h1>

      {(error || success) && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {error || success}
        </div>
      )}

      <form onSubmit={saveTopUpPayment} className="mt-4 max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-brand"><QrCode className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-bold text-gray-900">Payout &amp; Payment Options</h2><p className="text-[11px] text-gray-500">Each payment method keeps its own QR code and account details.</p></div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold text-gray-700">Select Payment Method to Edit / Activate</label><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">Active: {activeTopUpProvider}</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['esewa', 'eSewa', 'e', 'bg-[#60BB46]'], ['khalti', 'Khalti', 'K', 'bg-[#5C2D91]'], ['fonepay', 'Fonepay', 'f', 'bg-[#ED1C24]'], ['bank', 'Bank Transfer', '▣', 'bg-blue-700']
            ].map(([id, label, mark, color]) => (
              <button key={id} type="button" onClick={() => {
                setTopUpQrFile(null);
                setTopUpPayment({ ...topUpPayment, topUpProvider: id, topUpPaymentDetails: { ...paymentDetails, provider: id } });
              }} className={`relative flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-xs font-bold transition-all ${activeTopUpProvider === id ? `${color} border-transparent text-white ring-2 ring-indigo-300 ring-offset-1` : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                {paymentDetails[id]?.qrCodeURL && activeTopUpProvider !== id && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />}
                <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs ${activeTopUpProvider === id ? 'bg-white/20' : `${color} text-white`}`}>{mark}</span>{label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3"><h3 className="text-xs font-bold text-gray-900 capitalize">{activeTopUpProvider} Dedicated Details {activeTopUpProvider !== 'bank' && '& QR'}</h3><span className="text-[10px] text-gray-500">Separate from other methods</span></div>
          {activeTopUpProvider === 'bank' && <div className="mt-3"><label className="mb-1 block text-xs font-semibold text-gray-700">Bank Name</label><input value={currentPaymentMethod.bankName || ''} onChange={(e) => updateCurrentPaymentMethod('bankName', e.target.value)} className="input" placeholder="Bank name" /></div>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-gray-700">Account Holder Full Name</label><input value={currentPaymentMethod.accountName || ''} onChange={(e) => updateCurrentPaymentMethod('accountName', e.target.value)} className="input" placeholder="e.g. Ram Sharma" /></div><div><label className="mb-1 block text-xs font-semibold text-gray-700">{activeTopUpProvider === 'bank' ? 'Bank Account Number' : 'Mobile / ID Number'}</label><input value={currentPaymentMethod.accountNumber || ''} onChange={(e) => updateCurrentPaymentMethod('accountNumber', e.target.value)} className="input" placeholder="98XXXXXXXX" /></div></div>
          <div className="mt-3"><label className="mb-1 block text-xs font-semibold text-gray-700">Transfer Instructions / Notes (Optional)</label><input value={currentPaymentMethod.notes || ''} onChange={(e) => updateCurrentPaymentMethod('notes', e.target.value)} className="input" placeholder="Remarks or transfer reference note" /></div>
          {activeTopUpProvider !== 'bank' && <div className="mt-4 border-t border-gray-200 pt-3"><label className="mb-2 block text-xs font-semibold text-gray-700">{activeTopUpProvider} QR Code Image</label><div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">{topUpQrFile ? <img src={URL.createObjectURL(topUpQrFile)} alt="New QR" className="h-[72px] w-[72px] rounded-lg object-contain" /> : currentPaymentMethod.qrCodeURL ? <img src={currentPaymentMethod.qrCodeURL} alt="Saved QR" className="h-[72px] w-[72px] rounded-lg object-contain" /> : <QrCode className="h-10 w-10 text-gray-400" />}<div><p className="text-xs font-bold text-gray-900">{currentPaymentMethod.qrCodeURL ? `${activeTopUpProvider} QR attached` : `Upload ${activeTopUpProvider} QR`}</p><p className="mt-0.5 text-[11px] text-gray-500">Businesses can scan this in their wallet.</p><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setTopUpQrFile(e.target.files?.[0] || null)} className="mt-2 text-[11px]" /></div></div></div>}
          <button type="submit" disabled={savingTopUpPayment} className="btn-primary mt-4 w-full text-xs">{savingTopUpPayment ? 'Saving...' : `Save ${activeTopUpProvider} details`}</button>
        </div>
      </form>

      <div className="mt-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {['topup', 'deduct', 'topups', 'withdrawals'].map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setError(''); setSuccess(''); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === t ? 'bg-brand text-white' : 'text-gray-500'}`}>
            {t === 'topup' ? 'Top Ups' : t === 'deduct' ? 'Deduct Funds' : t === 'topups' ? 'Top-up Requests' : 'Payout Requests'}
          </button>
        ))}
      </div>

      {(tab === 'topup' || tab === 'deduct') && (
        <div className="mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="input pl-9" placeholder="Find a user" />
            </div>
            <button type="button" onClick={search} className="btn-primary">Find</button>
          </div>

          {loading ? (
            <p className="mt-6 text-center text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="mt-3 space-y-2">
              {users.map((u) => (
                <button key={u._id} type="button" onClick={() => openUser(u)} className={`flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left transition-colors ${selected?._id === u._id ? 'border-brand' : 'border-gray-200 hover:border-brand'}`}>
                  <div>
                    <p className="text-sm font-semibold">{u.name || u.email}</p>
                    <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
                  </div>
                  <Wallet className="h-4 w-4 text-gray-400" />
                </button>
              ))}
              {q && !loading && users.length === 0 && <p className="text-center text-sm text-gray-400">No users found.</p>}
            </div>
          )}

          {selected && wallet && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-semibold">{selected.name} · {selected.email}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-2"><p className="text-sm font-bold">₹{wallet.availableBalance}</p><p className="text-[10px] text-gray-500">Available</p></div>
                <div className="rounded-lg bg-gray-50 p-2"><p className="text-sm font-bold">₹{wallet.escrowHeld}</p><p className="text-[10px] text-gray-500">Escrow</p></div>
                <div className="rounded-lg bg-gray-50 p-2"><p className="text-sm font-bold">₹{wallet.claimableBalance}</p><p className="text-[10px] text-gray-500">Claimable</p></div>
              </div>

              {selected.paymentDetails && (selected.paymentDetails.qrCodeURL || selected.paymentDetails.accountNumber) && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-xs">
                  {selected.paymentDetails.qrCodeURL ? (
                    <img
                      src={selected.paymentDetails.qrCodeURL}
                      alt="QR"
                      onClick={() => setPreviewQR(selected.paymentDetails)}
                      className="h-12 w-12 cursor-pointer rounded-lg border bg-white object-contain p-0.5 shadow-2xs hover:opacity-90"
                      title="Click to zoom"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-gray-400">
                      <QrCode className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                      {selected.paymentDetails.provider || 'Digital Wallet'}
                    </span>
                    <p className="font-semibold text-gray-900 mt-0.5 truncate">
                      {selected.paymentDetails.accountName || selected.name}
                    </p>
                    <p className="font-mono text-[11px] text-gray-500 truncate">
                      {selected.paymentDetails.accountNumber}
                    </p>
                  </div>
                </div>
              )}

              {tab === 'topup' ? (
                <form onSubmit={topUp} className="mt-4 space-y-2">
                  <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Top up amount (₹)" required />
                  <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Reference (bank txn ID)" />
                  <button type="submit" className="btn-primary w-full">Credit wallet</button>
                </form>
              ) : (
                <form onSubmit={deduct} className="mt-4 space-y-2">
                  {wallet.availableBalance <= 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> User has no available balance to deduct
                    </div>
                  )}
                  <input type="number" min="1" max={wallet.availableBalance} value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Deduct amount (₹)" required />
                  <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Reason for deduction (required)" required />
                  <button type="submit" disabled={wallet.availableBalance <= 0} className="btn-primary w-full bg-red-600 hover:bg-red-700">Deduct from wallet</button>
                </form>
              )}

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">Ledger (last 20)</p>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {ledger.slice(0, 20).map((t) => (
                    <div key={t._id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <div>
                        <span className="font-semibold capitalize">{t.type.replace(/_/g, ' ')}</span>
                        <span className="ml-2 text-gray-400">{t.status}</span>
                        {t.referenceNote && <span className="ml-2 text-gray-400">· {t.referenceNote}</span>}
                      </div>
                      <span className="font-semibold">₹{t.amount}</span>
                    </div>
                  ))}
                  {ledger.length === 0 && <p className="text-xs text-gray-400">No transactions.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'topups' && (
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="mt-6 text-center text-sm text-gray-400">Loading...</p>
          ) : topUps.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No pending top-up requests.</div>
          ) : (
            topUps.map((t) => (
              <div key={t._id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{t.userId?.name || 'Business'}</p>
                    <p className="text-xs text-gray-500">{t.userId?.email} · requested {new Date(t.createdAt).toLocaleDateString()}</p>
                    {t.referenceNote && <p className="mt-1 text-xs text-gray-500">Ref: {t.referenceNote}</p>}
                    {t.paymentProofURL && (
                      <a href={t.paymentProofURL} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                        <ExternalLink className="h-3 w-3" /> View payment screenshot
                      </a>
                    )}
                  </div>
                  <p className="font-bold text-brand">₹{t.amount}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setConfirmApproveTopUp(t)} className="btn-primary flex-1 bg-green-600 text-xs hover:bg-green-700">Approve &amp; credit</button>
                  <button type="button" onClick={() => setConfirmDenyTopUp(t)} className="btn-secondary flex-1 text-xs text-red-600">Deny</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="mt-6 text-center text-sm text-gray-400">Loading...</p>
          ) : withdrawals.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No pending payouts.</div>
          ) : (
            withdrawals.map((w) => {
              const pd = w.userId?.paymentDetails;
              const hasQR = !!pd?.qrCodeURL;
              const prov = pd?.provider || 'esewa';
              return (
                <div key={w._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {hasQR ? (
                        <div
                          className="relative cursor-pointer group shrink-0"
                          onClick={() => setPreviewQR(pd)}
                          title="Click to scan QR"
                        >
                          <img
                            src={pd.qrCodeURL}
                            alt="Creator QR"
                            className="h-16 w-16 rounded-xl border border-gray-200 object-contain bg-white p-1 shadow-2xs group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[9px] text-white">
                            <QrCode className="h-3 w-3" />
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-400 shrink-0">
                          <QrCode className="h-6 w-6" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-gray-900">{w.userId?.name || 'Creator'}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                            prov === 'esewa'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : prov === 'khalti'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : prov === 'fonepay'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {prov}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{w.userId?.email} · requested {new Date(w.createdAt).toLocaleDateString()}</p>

                        {pd?.provider === 'bank' && pd?.bankName && (
                          <p className="text-xs font-semibold text-blue-700">
                            🏦 {pd.bankName}
                          </p>
                        )}

                        {pd?.accountNumber ? (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-xs font-semibold text-gray-700">
                              {pd.accountName ? `${pd.accountName} · ` : ''}
                              <span className="font-mono text-indigo-600 font-bold">{pd.accountNumber}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(pd.accountNumber, w._id)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              title="Copy account / mobile number"
                            >
                              {copiedId === w._id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-600 font-medium">⚠️ No payout account linked</p>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                      <p className="text-lg font-extrabold text-emerald-600">₹{w.amount.toLocaleString()}</p>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Real Payout</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setConfirmPay(w)}
                      className="btn-primary flex-1 bg-green-600 text-xs hover:bg-green-700 flex items-center justify-center gap-1.5 py-2 font-bold"
                    >
                      <QrCode className="h-4 w-4" /> Scan &amp; Pay (₹{w.amount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeny(w)}
                      className="btn-secondary px-4 text-xs text-red-600 hover:bg-red-50"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Confirm Approve Top-up Modal */}
      {confirmApproveTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmApproveTopUp(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Confirm Top-up</h3>
            <p className="mt-2 text-sm text-gray-600">Credit ₹{confirmApproveTopUp.amount} to {confirmApproveTopUp.userId?.name}&apos;s wallet?</p>
            {confirmApproveTopUp.referenceNote && (
              <p className="mt-1 text-xs text-gray-400">Ref: {confirmApproveTopUp.referenceNote}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmApproveTopUp(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={() => approveTopUp(confirmApproveTopUp._id)} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deny Top-up Modal */}
      {confirmDenyTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmDenyTopUp(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Deny Top-up</h3>
            <p className="mt-2 text-sm text-gray-600">Deny ₹{confirmDenyTopUp.amount} top-up request from {confirmDenyTopUp.userId?.name}? Reason: Payment could not be verified.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmDenyTopUp(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={() => denyTopUp(confirmDenyTopUp._id)} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">Confirm Deny</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payout Modal with Large Scannable QR Code */}
      {confirmPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setConfirmPay(null)} />
          <div className="relative my-6 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-200 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 text-left">
              <div>
                <h3 className="text-base font-bold text-gray-900">Transfer Real Currency</h3>
                <p className="text-xs text-gray-500">Scan QR via eSewa / Khalti / Fonepay to pay creator</p>
              </div>
              <button type="button" onClick={() => setConfirmPay(null)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scannable QR Code Display */}
            {confirmPay.userId?.paymentDetails?.qrCodeURL ? (
              <div className="mt-4 inline-block rounded-2xl border-2 border-dashed border-gray-300 p-3 bg-white shadow-xs">
                <img
                  src={confirmPay.userId.paymentDetails.qrCodeURL}
                  alt="Creator Payment QR"
                  className="h-56 w-56 object-contain mx-auto"
                />
                <p className="mt-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Scan to Pay · {confirmPay.userId.paymentDetails.provider || 'eSewa'}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 text-left">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>No QR Code Uploaded</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  The creator did not upload a QR image. Please transfer funds to their account/mobile number below.
                </p>
              </div>
            )}

            {/* Payout Details Card */}
            <div className="mt-4 rounded-2xl bg-gray-50 p-3.5 text-left text-xs space-y-2 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500">Payout Amount</span>
                <span className="text-base font-extrabold text-emerald-600">₹{confirmPay.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Creator / Payee</span>
                <span className="font-bold text-gray-900">
                  {confirmPay.userId?.paymentDetails?.accountName || confirmPay.userId?.name || 'Creator'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Payment Provider</span>
                <span className="font-bold capitalize text-indigo-600">
                  {confirmPay.userId?.paymentDetails?.provider || 'eSewa / Khalti'}
                </span>
              </div>
              {confirmPay.userId?.paymentDetails?.provider === 'bank' && confirmPay.userId?.paymentDetails?.bankName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Bank Name</span>
                  <span className="font-bold text-blue-700">
                    {confirmPay.userId.paymentDetails.bankName}
                  </span>
                </div>
              )}
              {confirmPay.userId?.paymentDetails?.accountNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Account / Mobile ID</span>
                  <span className="flex items-center gap-1 font-mono font-bold text-gray-900">
                    {confirmPay.userId.paymentDetails.accountNumber}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(confirmPay.userId?.paymentDetails?.accountNumber, 'modal')}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-700"
                      title="Copy"
                    >
                      {copiedId === 'modal' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </span>
                </div>
              )}
              {confirmPay.userId?.paymentDetails?.notes && (
                <div className="pt-1 text-[11px] text-gray-500 border-t border-gray-200/60">
                  <span className="font-semibold">Notes:</span> {confirmPay.userId.paymentDetails.notes}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmPay(null)}
                className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => pay(confirmPay._id)}
                className="btn-primary flex-1 bg-green-600 hover:bg-green-700 py-2.5 text-xs font-bold"
              >
                Confirm Transfer Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deny Modal */}
      {confirmDeny && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmDeny(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Deny Payout</h3>
            <p className="mt-2 text-sm text-gray-600">Deny ₹{confirmDeny.amount} payout request from {confirmDeny.userId?.name}?</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmDeny(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={() => deny(confirmDeny._id)} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">Confirm Deny</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview / Zoom Modal */}
      {previewQR && previewQR.qrCodeURL && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewQR(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreviewQR(null)} className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-gray-900">Payment QR Code</h3>
            <p className="text-xs text-gray-500 capitalize">{previewQR.provider || 'Digital Wallet'}</p>
            <div className="mt-4 p-3 bg-white rounded-2xl border border-gray-200 inline-block shadow-inner">
              <img src={previewQR.qrCodeURL} alt="QR Full" className="h-60 w-60 object-contain mx-auto" />
            </div>
            {previewQR.accountName && (
              <p className="mt-3 text-xs font-bold text-gray-900">{previewQR.accountName}</p>
            )}
            {previewQR.accountNumber && (
              <p className="text-xs font-mono text-indigo-600 font-bold mt-0.5">{previewQR.accountNumber}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
