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

  console.log('\n== 2b. Creator Payment QR & Payout info ==');
  const qrFd = new FormData();
  qrFd.append('qrCode', makeFakeFile('esewa-qr.png', 'image/png'));
  const qrRes = await api('/api/users/payment-qr', { method: 'POST', token: creator.accessToken, formData: qrFd });
  ok(!!qrRes.qrCodeURL, 'creator uploaded payment QR code');

  const updateRes = await api('/api/users/me', {
    method: 'PATCH',
    token: creator.accessToken,
    body: {
      paymentDetails: {
        provider: 'esewa',
        accountName: 'Riya Creator',
        accountNumber: '9801234567',
        notes: 'eSewa digital wallet'
      }
    }
  });
  ok(updateRes.user.paymentDetails?.provider === 'esewa' && updateRes.user.paymentDetails?.accountNumber === '9801234567', 'creator payment details saved');

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

  console.log('\n== 7. Creator starts -> submits -> business requests revisions -> resubmits -> approves -> escrow release ==');
  const started = await api(`/api/proposals/${prop.proposal._id}/start`, { method: 'PATCH', token: creator.accessToken });
  ok(started.proposal.workStarted === true, 'creator marked work started');

  const submitted = await api(`/api/proposals/${prop.proposal._id}/submit`, { method: 'PATCH', token: creator.accessToken, body: { deliverableURL: 'https://instagram.com/reel/123', deliverableNotes: 'Reel ready' } });
  ok(submitted.proposal.creatorConfirmedComplete === true && submitted.proposal.deliverableURL === 'https://instagram.com/reel/123', 'creator submitted deliverables');

  const revised = await api(`/api/proposals/${prop.proposal._id}/request-revision`, { method: 'PATCH', token: biz.accessToken, body: { revisionNotes: 'Please add logo' } });
  ok(revised.proposal.revisionRequested === true && revised.proposal.creatorConfirmedComplete === false, 'business requested revision');

  const resubmitted = await api(`/api/proposals/${prop.proposal._id}/submit`, { method: 'PATCH', token: creator.accessToken, body: { deliverableURL: 'https://instagram.com/reel/123-v2', deliverableNotes: 'Added logo' } });
  ok(resubmitted.proposal.creatorConfirmedComplete === true && resubmitted.proposal.revisionRequested === false, 'creator resubmitted revised work');

  const released = await api(`/api/proposals/${prop.proposal._id}/complete`, { method: 'PATCH', token: biz.accessToken });
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
  ok(myWithdrawal.userId?.paymentDetails?.provider === 'esewa' && !!myWithdrawal.userId?.paymentDetails?.qrCodeURL, 'admin withdrawal includes creator QR and payment details');
  await adminApi(`/wallet/withdrawals/${myWithdrawal._id}/pay`, { method: 'POST', token: adminLogin.accessToken });
  const creatorWallet2 = await api('/api/wallet', { token: creator.accessToken });
  ok(creatorWallet2.wallet.claimableBalance === 0 && creatorWallet2.wallet.availableBalance === 0, `payout deducted from claimable & available balance (available=${creatorWallet2.wallet.availableBalance})`);

  console.log('\n== 9. Guard: unverified business cannot send proposal ==');
  const badBiz = await api('/api/auth/register', { method: 'POST', body: { email: `badbiz${stamp}@t.com`, password: 'password123', role: 'business' } });
  await api('/api/users/setup-profile', { method: 'POST', token: badBiz.accessToken, body: { name: 'Scam Co', category: 'other', bio: 'x', location: loc } });
  let guardBlocked = false;
  try {
    await api('/api/proposals', { method: 'POST', token: badBiz.accessToken, body: { toUserId: creator.user.id, offerAmount: 100, message: 'hi' } });
  } catch { guardBlocked = true; }
  ok(guardBlocked, 'unverified business blocked from sending proposal');

  console.log('\n== 10. Creator-initiated proposal -> escrow release ==');
  const evt2 = await api('/api/events', {
    method: 'POST',
    token: biz.accessToken,
    body: {
      title: 'Creator Apply Campaign',
      category: 'retail',
      platform: 'instagram',
      budget: 3000,
      deliverables: { videos: 1, posts: 2, storyMentions: 1 },
      creatorsNeeded: 1,
      location: { coordinates: [77.2, 28.6], address: 'New Delhi' }
    }
  });
  ok(evt2.event.deliverables?.videos === 1 && evt2.event.creatorsNeeded === 1, 'event created with deliverables and creatorsNeeded');

  const prop2 = await api('/api/proposals', { method: 'POST', token: creator.accessToken, body: { toUserId: biz.user.id, eventId: evt2.event._id, offerAmount: 500, message: 'applying to your campaign' } });
  ok(prop2.proposal.status === 'pending' && String(prop2.proposal.fromUserId?._id || prop2.proposal.fromUserId) === String(creator.user.id), 'creator applied to business campaign');

  // Test repeat application prevention
  let dupBlocked = false;
  try {
    await api('/api/proposals', { method: 'POST', token: creator.accessToken, body: { toUserId: biz.user.id, eventId: evt2.event._id, offerAmount: 500, message: 'applying again' } });
  } catch {
    dupBlocked = true;
  }
  ok(dupBlocked, 'creator blocked from submitting duplicate proposal to same campaign');

  const accepted2 = await api(`/api/proposals/${prop2.proposal._id}/accept`, { method: 'PATCH', token: biz.accessToken });
  ok(accepted2.proposal.escrowStatus === 'held', `escrow held on creator-initiated proposal (status=${accepted2.proposal.escrowStatus})`);

  // Check event is filled and hidden from public explore
  const freshEvt2 = await api(`/api/events/${evt2.event._id}`, { token: creator.accessToken });
  ok(freshEvt2.event.creatorsHired === 1 && freshEvt2.event.status === 'filled', 'event slots filled (creatorsHired=1, status=filled)');

  const publicEvents = await api('/api/events', { token: creator.accessToken });
  const inPublic = publicEvents.events.some(e => String(e._id) === String(evt2.event._id));
  ok(!inPublic, 'filled campaign automatically hidden from public explore feed');

  const bizWallet4 = await api('/api/wallet', { token: biz.accessToken });
  ok(bizWallet4.wallet.availableBalance === 3500 && bizWallet4.wallet.escrowHeld === 500, `business funds locked again: available=${bizWallet4.wallet.availableBalance} escrow=${bizWallet4.wallet.escrowHeld}`);

  await api(`/api/proposals/${prop2.proposal._id}/complete`, { method: 'PATCH', token: creator.accessToken });
  const released2 = await api(`/api/proposals/${prop2.proposal._id}/complete`, { method: 'PATCH', token: biz.accessToken });
  ok(released2.proposal.escrowStatus === 'released', `escrow released on creator-initiated proposal (status=${released2.proposal.escrowStatus})`);

  const creatorWallet3 = await api('/api/wallet', { token: creator.accessToken });
  ok(creatorWallet3.wallet.claimableBalance === 500, `creator received funds from creator-initiated deal: claimable=${creatorWallet3.wallet.claimableBalance}`);
  const bizWallet5 = await api('/api/wallet', { token: biz.accessToken });
  ok(bizWallet5.wallet.escrowHeld === 0 && bizWallet5.wallet.claimableBalance === 0, `business did not pay itself: escrow=${bizWallet5.wallet.escrowHeld} claimable=${bizWallet5.wallet.claimableBalance}`);

  console.log('\n== 11. Wallet top-up requests ==');
  const topUpReq = await api('/api/wallet/topup-request', { method: 'POST', token: biz.accessToken, body: { amount: 700, referenceNote: 'bank-ref-777' } });
  ok(topUpReq.topUpRequest?.status === 'pending', 'business submitted top-up request');

  let creatorTopUpBlocked = false;
  try {
    await api('/api/wallet/topup-request', { method: 'POST', token: creator.accessToken, body: { amount: 100 } });
  } catch { creatorTopUpBlocked = true; }
  ok(creatorTopUpBlocked, 'creator blocked from requesting top-up');

  const pendingTopUps = await adminApi('/wallet/topups?status=pending', { token: adminLogin.accessToken });
  const myTopUp = pendingTopUps.transactions.find(t => String(t.userId?._id || t.userId) === String(biz.user.id));
  ok(!!myTopUp && myTopUp.amount === 700, 'top-up request visible in admin queue');

  await adminApi(`/wallet/topups/${myTopUp._id}/approve`, { method: 'POST', token: adminLogin.accessToken });
  const bizWallet6 = await api('/api/wallet', { token: biz.accessToken });
  ok(bizWallet6.wallet.availableBalance === 4200, `approved top-up credited: available=${bizWallet6.wallet.availableBalance}`);

  const topUpReq2 = await api('/api/wallet/topup-request', { method: 'POST', token: biz.accessToken, body: { amount: 300 } });
  await adminApi(`/wallet/topups/${topUpReq2.topUpRequest._id}/deny`, { method: 'POST', token: adminLogin.accessToken, body: { reason: 'Payment not received' } });
  const bizWallet7 = await api('/api/wallet', { token: biz.accessToken });
  const deniedTxn = bizWallet7.transactions.find(t => t._id === topUpReq2.topUpRequest._id);
  ok(deniedTxn?.status === 'failed' && bizWallet7.wallet.availableBalance === 4200, 'denied top-up not credited');

  console.log('\n== 12. Reporting system ==');
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

  console.log('\n== 13. Event editing ==');
  const editEvt = await api('/api/events', {
    method: 'POST',
    token: biz.accessToken,
    body: { title: 'Editable Campaign', category: 'retail', platform: 'instagram', budget: 1000, location: { coordinates: [77.2, 28.6], address: 'New Delhi' } }
  });
  const edited = await api(`/api/events/${editEvt.event._id}`, {
    method: 'PATCH',
    token: biz.accessToken,
    body: { title: 'Launch Campaign (Updated)', budget: 2500, description: 'updated brief' }
  });
  ok(edited.event.title === 'Launch Campaign (Updated)' && edited.event.budget === 2500, 'business edited own event');

  let editBlockedOwner = false;
  try {
    await api(`/api/events/${editEvt.event._id}`, { method: 'PATCH', token: badBiz.accessToken, body: { title: 'hack' } });
  } catch { editBlockedOwner = true; }
  ok(editBlockedOwner, 'non-owner business blocked from editing event');

  let editBlockedRole = false;
  try {
    await api(`/api/events/${editEvt.event._id}`, { method: 'PATCH', token: creator.accessToken, body: { title: 'x' } });
  } catch { editBlockedRole = true; }
  ok(editBlockedRole, 'creator blocked from editing events');

  let slotGuard = false;
  try {
    await api(`/api/events/${editEvt.event._id}`, { method: 'PATCH', token: biz.accessToken, body: { creatorsNeeded: 0 } });
  } catch { slotGuard = true; }
  ok(slotGuard, 'creatorsNeeded below minimum rejected');

  let delBlockedRole = false;
  try {
    await api(`/api/events/${editEvt.event._id}`, { method: 'DELETE', token: creator.accessToken });
  } catch { delBlockedRole = true; }
  ok(delBlockedRole, 'creator blocked from deleting events');

  const evt3 = await api('/api/events', {
    method: 'POST',
    token: biz.accessToken,
    body: { title: 'Deletable Campaign', category: 'retail', platform: 'instagram', budget: 100, location: { coordinates: [77.2, 28.6], address: 'New Delhi' } }
  });
  await api('/api/proposals', { method: 'POST', token: creator.accessToken, body: { toUserId: biz.user.id, eventId: evt3.event._id, offerAmount: 50, message: 'applying' } });
  const del1 = await api(`/api/events/${evt3.event._id}`, { method: 'DELETE', token: biz.accessToken });
  ok(del1.success === true, 'business deleted event with pending application');

  const creatorNotifs = await api('/api/notifications', { token: creator.accessToken });
  const removalNote = creatorNotifs.notifications.find(n => n.message.includes('was removed by the business'));
  ok(!!removalNote, 'applicant notified of campaign removal');

  let delFilled = false;
  try {
    await api(`/api/events/${evt.event._id}`, { method: 'DELETE', token: biz.accessToken });
  } catch { delFilled = true; }
  ok(delFilled, 'filled campaign cannot be deleted');

  console.log('\n== 14. Cleanup test users ==');
  const purge = await adminApi('/panel/dev/purge-test-users', { method: 'POST', token: adminLogin.accessToken });
  ok(purge.purged >= 3, `purged ${purge.purged} test users (Acme Brands, Scam Co, etc.)`);

  console.log(`\n==== RESULT: ${passed} passed, ${failed} failed ====`);
  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error('E2E test crashed:', err.message);
  process.exit(1);
});
