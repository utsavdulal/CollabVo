import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { User } from '../../models/User.js';
import { Transaction } from '../../models/Transaction.js';
import { AdminAuditLog } from '../../models/AdminAuditLog.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { getOrCreateWallet, getWallet, topUpWallet, requestTopUp, approveTopUp, denyTopUp, payWithdrawal, denyWithdrawal } from '../../services/escrowService.js';
import { notifyUser } from '../../services/notificationService.js';
import { PlatformSettings } from '../../models/PlatformSettings.js';
import { upload, validateUploadedFiles } from '../../middleware/upload.js';
import { storage } from '../../config/azureBlob.js';

const router = Router();
router.use(requireAdminAuth);

const topUpSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  amount: z.number().positive(),
  referenceNote: z.string().max(200).default('')
});

async function writeAudit(admin, action, targetType, targetId, details = {}) {
  return AdminAuditLog.create({ adminId: admin._id, action, targetType, targetId, details });
}

const topUpPaymentSchema = z.object({
  provider: z.enum(['esewa', 'khalti', 'fonepay', 'bank']).default('esewa'),
  paymentDetails: z.object({
    provider: z.enum(['esewa', 'khalti', 'fonepay', 'bank']).default('esewa'),
    esewa: z.object({ qrCodeURL: z.string().max(500).default(''), accountName: z.string().max(100).default(''), accountNumber: z.string().max(100).default(''), notes: z.string().max(500).default('') }).default({}),
    khalti: z.object({ qrCodeURL: z.string().max(500).default(''), accountName: z.string().max(100).default(''), accountNumber: z.string().max(100).default(''), notes: z.string().max(500).default('') }).default({}),
    fonepay: z.object({ qrCodeURL: z.string().max(500).default(''), accountName: z.string().max(100).default(''), accountNumber: z.string().max(100).default(''), notes: z.string().max(500).default('') }).default({}),
    bank: z.object({ bankName: z.string().max(120).default(''), accountName: z.string().max(100).default(''), accountNumber: z.string().max(100).default(''), notes: z.string().max(500).default('') }).default({})
  }).default({})
});

router.get('/topup-payment', asyncHandler(async (_req, res) => {
  const settings = await PlatformSettings.findOne({ key: 'platform' });
  res.json({ topUpPayment: settings || {} });
}));

router.post('/topup-payment', upload.single('qrCode'), asyncHandler(async (req, res) => {
  let paymentDetails = {};
  try { paymentDetails = JSON.parse(req.body?.paymentDetails || '{}'); } catch { throw new ApiError(400, 'Invalid payment details'); }
  const parsed = topUpPaymentSchema.parse({ provider: req.body?.provider || 'esewa', paymentDetails });
  const activeProvider = parsed.provider;
  const details = { ...parsed.paymentDetails, provider: activeProvider };
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { $setOnInsert: { key: 'platform' }, $set: { topUpProvider: activeProvider, topUpPaymentDetails: details } },
    { upsert: true, new: true }
  );
  if (req.file) {
    validateUploadedFiles([req.file], { imagesOnly: true });
    const ext = req.file.mimetype.split('/')[1] || 'png';
    const blobPath = `admin-topup-qr/${req.user._id}-${Date.now()}.${ext}`;
    await storage.upload({ blobPath, data: req.file.buffer, contentType: req.file.mimetype });
    settings.topUpPaymentDetails[activeProvider].qrCodeURL = `/files/${blobPath}`;
    settings.markModified('topUpPaymentDetails');
    settings.topUpQrCodeURL = `/files/${blobPath}`;
    await settings.save();
  }
  await writeAudit(req.user, 'topup_payment_settings_updated', 'PlatformSettings', settings._id, {});
  res.json({ topUpPayment: settings });
}));

router.get('/user/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name email role photoURL paymentDetails');
  if (!user) throw new ApiError(404, 'User not found');
  const wallet = await getWallet(user._id);
  const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(200);
  res.json({ user, wallet, transactions });
}));

router.post('/topup', validate(topUpSchema), asyncHandler(async (req, res) => {
  const { userId, amount, referenceNote } = req.body;
  const target = await User.findById(userId);
  if (!target) throw new ApiError(404, 'User not found');

  const { wallet, transaction } = await topUpWallet({
    adminId: req.user._id,
    userId,
    amount,
    referenceNote
  });

  await writeAudit(req.user, 'wallet_topup', 'User', userId, {
    amount,
    referenceNote,
    transactionId: transaction._id
  });
  await notifyUser(userId, {
    type: 'wallet',
    message: `Your wallet was topped up with ${amount}.`,
    relatedId: transaction._id
  });

  res.status(201).json({ wallet, transaction });
}));

router.get('/withdrawals', asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const transactions = await Transaction.find({ type: 'withdrawal', status })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email role paymentDetails photoURL');
  res.json({ transactions });
}));

router.get('/topups', asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const transactions = await Transaction.find({ type: 'topup_request', status })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email role paymentDetails');
  res.json({ transactions });
}));

router.post('/topups/:id/approve', asyncHandler(async (req, res) => {
  const { transaction, wallet } = await approveTopUp({ adminId: req.user._id, topUpId: req.params.id });
  await writeAudit(req.user, 'wallet_topup_approved', 'Transaction', transaction._id, {
    amount: transaction.amount,
    userId: transaction.userId,
    referenceNote: transaction.referenceNote
  });
  await notifyUser(transaction.userId, {
    type: 'wallet',
    message: `Your top-up request of ₹${transaction.amount} was approved and credited to your wallet.`,
    relatedId: transaction._id
  });
  res.json({ transaction, wallet });
}));

router.post('/topups/:id/deny', asyncHandler(async (req, res) => {
  const { transaction } = await denyTopUp({
    adminId: req.user._id,
    topUpId: req.params.id,
    reason: req.body?.reason
  });
  await writeAudit(req.user, 'wallet_topup_denied', 'Transaction', transaction._id, {
    amount: transaction.amount,
    userId: transaction.userId,
    reason: transaction.referenceNote
  });
  await notifyUser(transaction.userId, {
    type: 'wallet',
    message: `Your top-up request of ₹${transaction.amount} was denied. ${transaction.referenceNote || ''}`.trim(),
    relatedId: transaction._id
  });
  res.json({ transaction });
}));

router.post('/withdrawals/:id/pay', asyncHandler(async (req, res) => {
  const { transaction } = await payWithdrawal({ adminId: req.user._id, withdrawalId: req.params.id });
  await writeAudit(req.user, 'withdrawal_paid', 'Transaction', transaction._id, { amount: transaction.amount });
  await notifyUser(transaction.userId, {
    type: 'wallet',
    message: `Your payout request of ${transaction.amount} was paid out.`,
    relatedId: transaction._id
  });
  res.json({ transaction });
}));

router.post('/withdrawals/:id/deny', asyncHandler(async (req, res) => {
  const { transaction } = await denyWithdrawal({ adminId: req.user._id, withdrawalId: req.params.id, reason: req.body?.reason });
  await writeAudit(req.user, 'withdrawal_denied', 'Transaction', transaction._id, { amount: transaction.amount, reason: transaction.referenceNote });
  await notifyUser(transaction.userId, {
    type: 'wallet',
    message: `Your payout request of ${transaction.amount} was denied.`,
    relatedId: transaction._id
  });
  res.json({ transaction });
}));

const deductSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  amount: z.number().positive(),
  reason: z.string().min(1).max(200)
});

router.post('/deduct', validate(deductSchema), asyncHandler(async (req, res) => {
  const { userId, amount, reason } = req.body;
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const wallet = await getOrCreateWallet(userId, session);
      if (wallet.availableBalance < amount) {
        throw new ApiError(400, 'Insufficient available balance');
      }
      wallet.availableBalance -= amount;
      await wallet.save({ session });

      const txn = await Transaction.create([{
        type: 'admin_deduct',
        userId,
        amount,
        status: 'completed',
        adminId: req.user._id,
        referenceNote: reason
      }], { session });
      return { wallet, transaction: txn[0] };
    });
  } finally {
    session.endSession();
  }

  await writeAudit(req.user, 'wallet_deduct', 'User', userId, { amount, reason, transactionId: result.transaction._id });
  await notifyUser(userId, {
    type: 'wallet',
    message: `₹${amount} was deducted from your wallet. Reason: ${reason}`,
    relatedId: result.transaction._id
  });

  res.status(201).json(result);
}));

export default router;
