import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Wallet } from '../models/Wallet.js';
import { Transaction } from '../models/Transaction.js';
import { BusinessVerification } from '../models/BusinessVerification.js';
import { Event } from '../models/Event.js';
import { Proposal } from '../models/Proposal.js';
import { storage } from '../config/azureBlob.js';

const DEMO_PASS = 'Demo@1234';
const LOCATION = { coordinates: [87.27, 26.66], address: 'Itahari, Nepal' };

async function hash() {
  return bcrypt.hash(DEMO_PASS, 12);
}

async function seedWallet(userId, { available = 0 } = {}) {
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (available > 0 && wallet.availableBalance === 0) {
    wallet.availableBalance = available;
    await wallet.save();
    await Transaction.create({
      type: 'topup',
      userId,
      amount: available,
      status: 'completed',
      referenceNote: 'Demo seed top-up'
    });
  }
  return wallet;
}

async function seedDocs(userId) {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const docs = [];
  for (const type of ['registration', 'government_id']) {
    const blobPath = `verification/${userId}/demo-${type}.png`;
    await storage.upload({ blobPath, data: png, contentType: 'image/png' });
    docs.push({ type, url: `/files/${blobPath}`, uploadedAt: new Date() });
  }
  return docs;
}

export async function seedDemoData() {
  if (process.env.SEED_DEMO === 'false') return;
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') return;
  const already = await User.findOne({ email: 'demo.business@collavo.app' });

  if (!already) {
    await seedAll();
  } else {
    await ensurePendingVerification();
  }
}

async function seedAll() {
  const pass = await hash();

  const business = await User.create({
    role: 'business',
    name: 'Kool Cafe and Hotel',
    email: 'demo.business@collavo.app',
    passwordHash: pass,
    category: 'food',
    bio: 'Premium hospitality and culinary experience in eastern Nepal.',
    location: LOCATION,
    verificationStatus: 'verified',
    emailVerified: true
  });

  const creator = await User.create({
    role: 'creator',
    name: 'Riya Sharma',
    email: 'demo.creator@collavo.app',
    passwordHash: pass,
    category: 'beauty',
    bio: 'Content creator specializing in lifestyle, food and beauty. 50k followers on Instagram.',
    location: LOCATION,
    socials: { instagram: '@riyabeauty', youtube: 'Riya Beauty' },
    emailVerified: true
  });

  const pendingBiz = await User.create({
    role: 'business',
    name: 'Paradise School & College',
    email: 'demo.pending@collavo.app',
    passwordHash: pass,
    category: 'automotive',
    bio: 'Educational institution hosting creative showcases.',
    location: { coordinates: [87.28, 26.48], address: 'Biratnagar, Nepal' },
    verificationStatus: 'pending',
    emailVerified: true
  });

  await seedWallet(business._id, { available: 5000 });
  await seedWallet(creator._id);
  await seedWallet(pendingBiz._id);

  const event1 = await Event.create({
    title: 'Stay & Sip: Kool Cafe x Itahari Showcase',
    category: 'food',
    platform: 'instagram',
    budget: 2500,
    location: { coordinates: [87.27, 26.66], address: 'Itahari, Nepal' },
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    description: 'Looking for 2 creators to review our new gourmet menu, signature cocktails and weekend lounge ambiance.',
    createdBy: business._id
  });

  const event2 = await Event.create({
    title: 'Soft Mirch Paradise Creative Showcase',
    category: 'travel',
    platform: 'tiktok',
    budget: 20000,
    location: { coordinates: [87.28, 26.48], address: 'Biratnagar, Nepal' },
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    description: 'Youth festival and music performance showcase. Creators needed for high-energy TikTok vlogs and stories.',
    createdBy: pendingBiz._id
  });

  const event3 = await Event.create({
    title: 'Grand Festive Road Trip & Resort Launch',
    category: 'travel',
    platform: 'youtube',
    budget: 8000,
    location: { coordinates: [85.32, 27.71], address: 'Kathmandu, Nepal' },
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    description: 'Experience our mountain viewpoint luxury glamping resort. Full weekend stay included with vlog deliverables.',
    createdBy: business._id
  });

  await Proposal.create({
    fromUserId: business._id,
    toUserId: creator._id,
    eventId: event1._id,
    status: 'pending',
    offerAmount: 2500,
    message: 'Hi Riya! We would love to have you at our Stay & Sip tasting event this Friday.',
    escrowStatus: 'none'
  });

  const docs = await seedDocs(pendingBiz._id);
  await BusinessVerification.create({
    userId: pendingBiz._id,
    documents: docs,
    status: 'pending',
    submittedAt: new Date()
  });

  console.log('Demo data seeded with Nepal sample events.');
}

async function ensurePendingVerification() {
  const pendingBiz = await User.findOne({ email: 'demo.pending@collavo.app' });
  if (!pendingBiz) return;
  const open = await BusinessVerification.findOne({ userId: pendingBiz._id, status: 'pending' });
  if (open) return;
  if (pendingBiz.verificationStatus !== 'verified') {
    pendingBiz.verificationStatus = 'pending';
    await pendingBiz.save();
  }
  const docs = await seedDocs(pendingBiz._id);
  await BusinessVerification.create({
    userId: pendingBiz._id,
    documents: docs,
    status: 'pending',
    submittedAt: new Date()
  });
}
