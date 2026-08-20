const BASE = 'http://localhost:4000';
const ADMIN_BASE = 'http://localhost:4000/api/ops-9f3k2';

let passed = 0;
let failed = 0;

function ok(cond, label) {
  if (cond) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.log(`  FAIL ${label}`); }
}

async function api(path, { method = 'GET', token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (formData) {
    payload = formData;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.error || 'unknown'}`);
  return data;
}

async function adminApi(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const payload = body ? JSON.stringify(body) : undefined;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${ADMIN_BASE}${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ADMIN ${method} ${path} -> ${res.status}: ${data.error || 'unknown'}`);
  return data;
}

function makeFakeFile(name, type) {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  return new File([bytes], name, { type });
}

async function main() {
  const stamp = Date.now();

  console.log('\n== 1. Register accounts ==');
  const bizEmail = `biz${stamp}@t.com`;
  const creatorEmail = `creator${stamp}@t.com`;
  const biz = await api('/api/auth/register', { method: 'POST', body: { email: bizEmail, password: 'password123', role: 'business' } });
  const creator = await api('/api/auth/register', { method: 'POST', body: { email: creatorEmail, password: 'password123', role: 'creator' } });
  ok(!!biz.accessToken && !!creator.accessToken, 'register both accounts');

  console.log('\n== 2. Profile setup ==');
  const loc = { coordinates: [77.2, 28.6], address: 'New Delhi' };
  await api('/api/users/setup-profile', { method: 'POST', token: biz.accessToken, body: { name: 'Acme Brands', category: 'retail', bio: 'we do brands', location: loc } });
  await api('/api/users/setup-profile', { method: 'POST', token: creator.accessToken, body: { name: 'Riya Creator', category: 'beauty', bio: 'makeup', location: loc } });
  ok(true, 'profiles saved');

  console.log('\n== 3. Business verification ==');
  const fd = new FormData();
  fd.append('documents', makeFakeFile('reg.png', 'image/png'));
  fd.append('documents', makeFakeFile('id.png', 'image/png'));
  fd.append('taxNumber', 'GST12345');
  await api('/api/verification/submit', { method: 'POST', token: biz.accessToken, formData: fd });
  ok(true, 'verification submitted (pending)');

  const adminLogin = await adminApi('/auth/login', { method: 'POST', body: { email: 'admin@collavo.app', password: 'AdminPass123!' } });
  ok(!!adminLogin.accessToken, 'admin login');

  const queue = await adminApi('/verification/queue', { token: adminLogin.accessToken });
  const myRecord = queue.records.find(r => r.userId?.email === bizEmail);
  ok(!!myRecord, 'verification in admin queue');
  const recordId = myRecord ? myRecord._id : queue.records[0]._id;
  await adminApi(`/verification/${recordId}/decide`, { method: 'PATCH', token: adminLogin.accessToken, body: { status: 'verified' } });

  const bizMe = await api('/api/auth/me', { token: biz.accessToken });
  ok(bizMe.user.verificationStatus === 'verified', 'business verification approved');

  console.log('\n== 4. Admin top up ==');
  await adminApi('/wallet/topup', { method: 'POST', token: adminLogin.accessToken, body: { userId: biz.user.id, amount: 5000, referenceNote: 'bank-ref-001' } });
  const bizWallet = await api('/api/wallet', { token: biz.accessToken });
  ok(bizWallet.wallet.availableBalance === 5000, `top up credited: available=${bizWallet.wallet.availableBalance}`);

  console.log('\n== 5. Event + proposal ==');
  const evt = await api('/api/events', { method: 'POST', token: biz.accessToken, body: { title: 'Launch Campaign', category: 'retail', platform: 'instagram', budget: 2000, location: { coordinates: [77.2, 28.6], address: 'New Delhi' } } });
  ok(!!evt.event, 'business posted event');

  const prop = await api('/api/proposals', { method: 'POST', token: biz.accessToken, body: { toUserId: creator.user.id, eventId: evt.event._id, offerAmount: 1000, message: 'let us collab' } });
  ok(prop.proposal.status === 'pending', 'proposal sent');

  console.log('\n== 6. Creator accepts -> escrow lock ==');
  const accepted = await api(`/api/proposals/${prop.proposal._id}/accept`, { method: 'PATCH', token: creator.accessToken });
  ok(accepted.proposal.status === 'accepted', 'proposal accepted by both sides');
  ok(accepted.proposal.escrowStatus === 'held', `escrow held (status=${accepted.proposal.escrowStatus})`);

  const bizWallet2 = await api('/api/wallet', { token: biz.accessToken });
  ok(bizWallet2.wallet.availableBalance === 4000 && bizWallet2.wallet.escrowHeld === 1000, `funds locked: available=${bizWallet2.wallet.availableBalance} escrow=${bizWallet2.wallet.escrowHeld}`);

  console.log('\n== 7. Completion -> escrow release ==');
  await api(`/api/proposals/${prop.proposal._id}/complete`, { method: 'PATCH', token: biz.accessToken });
  const released = await api(`/api/proposals/${prop.proposal._id}/complete`, { method: 'PATCH', token: creator.accessToken });
  ok(released.proposal.escrowStatus === 'released', `escrow released (status=${released.proposal.escrowStatus})`);

  const creatorWallet = await api('/api/wallet', { token: creator.accessToken });
  ok(creatorWallet.wallet.claimableBalance === 1000, `creator claimable=${creatorWallet.wallet.claimableBalance}`);
  const bizWallet3 = await api('/api/wallet', { token: biz.accessToken });
  ok(bizWallet3.wallet.escrowHeld === 0, 'business escrow back to 0');

  console.log('\n== 8. Creator payout + admin pays ==');
  await api('/api/wallet/payout', { method: 'POST', token: creator.accessToken, body: { amount: 1000 } });
  const withdrawals = await adminApi('/wallet/withdrawals', { token: adminLogin.accessToken });
  const myWithdrawal = withdrawals.transactions.find(t => String(t.userId?._id || t.userId) === String(creator.user.id));
  ok(!!myWithdrawal && myWithdrawal.status === 'pending', 'payout pending in admin panel');
  await adminApi(`/wallet/withdrawals/${myWithdrawal._id}/pay`, { method: 'POST', token: adminLogin.accessToken });
  const creatorWallet2 = await api('/api/wallet', { token: creator.accessToken });
  ok(creatorWallet2.wallet.claimableBalance === 0, 'payout deducted from claimable');

  console.log('\n== 9. Guard: unverified business cannot send proposal ==');
  const badBiz = await api('/api/auth/register', { method: 'POST', body: { email: `badbiz${stamp}@t.com`, password: 'password123', role: 'business' } });
  await api('/api/users/setup-profile', { method: 'POST', token: badBiz.accessToken, body: { name: 'Scam Co', category: 'other', bio: 'x', location: loc } });
  let guardBlocked = false;
  try {
    await api('/api/proposals', { method: 'POST', token: badBiz.accessToken, body: { toUserId: creator.user.id, offerAmount: 100, message: 'hi' } });
  } catch { guardBlocked = true; }
  ok(guardBlocked, 'unverified business blocked from sending proposal');

  console.log('\n== 10. Reporting system ==');
  const reportRes = await api('/api/reports', {
    method: 'POST',
    token: creator.accessToken,
    body: {
      reportedUserId: badBiz.user.id,
      reason: 'scam',
      details: 'Suspicious spam account attempting off-platform payment'
    }
  });
  ok(!!reportRes.report, 'report submitted');

  const adminReports = await adminApi('/reports?status=pending', { token: adminLogin.accessToken });
  const reportItem = adminReports.reports.find(r => r._id === reportRes.report._id);
  ok(!!reportItem, 'report visible in admin reports queue');

  await adminApi(`/reports/${reportRes.report._id}/decide`, {
    method: 'PATCH',
    token: adminLogin.accessToken,
    body: {
      status: 'actioned',
      resolutionNotes: 'Verified fraudulent behavior, suspended.',
      suspendUser: true
    }
  });
  ok(true, 'admin actioned report and suspended scammer');

  const audit = await adminApi('/panel/analytics', { token: adminLogin.accessToken });
  ok(audit.totalCreators >= 1 && audit.totalBusinesses >= 2, `analytics: creators=${audit.totalCreators} businesses=${audit.totalBusinesses}`);

  console.log(`\n==== RESULT: ${passed} passed, ${failed} failed ====`);
  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error('E2E test crashed:', err.message);
  process.exit(1);
});
