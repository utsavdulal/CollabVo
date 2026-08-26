import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { payoutLimiter } from '../../middleware/rateLimiter.js';
import { getWallet, requestPayout, requestTopUp } from '../../services/escrowService.js';
import { Transaction } from '../../models/Transaction.js';
import { PlatformSettings } from '../../models/PlatformSettings.js';
import { upload, validateUploadedFiles } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { storage } from '../../config/azureBlob.js';

const router = Router();
router.use(requireAuth);

const payoutSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal amount is ₹100')
});

const topUpRequestSchema = z.object({
  amount: z.number().positive(),
  referenceNote: z.string().max(200).default(''),
  paymentProofURL: z.string().max(500).optional().default(''),
  paymentProvider: z.enum(['esewa', 'khalti', 'fonepay', 'bank']).default('esewa')
});

router.get('/', asyncHandler(async (req, res) => {
  const wallet = await getWallet(req.user._id);

  if (req.user.role === 'creator') {
    const { Proposal } = await import('../../models/Proposal.js');
    const heldProposals = await Proposal.find({
      $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }],
      escrowStatus: 'held'
    });
    wallet.escrowHeld = heldProposals.reduce((sum, p) => sum + (p.offerAmount || 0), 0);
  }

  const transactions = await Transaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate('counterpartyId', 'name role')
    .limit(100);
  const settings = await PlatformSettings.findOne({ key: 'platform' }).select('topUpProvider topUpPaymentDetails topUpQrCodeURL topUpPaymentLabel topUpInstructions');
  const provider = settings?.topUpProvider || 'esewa';
  const method = settings?.topUpPaymentDetails?.[provider] || {};
  res.json({
    wallet,
    transactions,
    topUpPayment: settings ? {
      provider,
      topUpQrCodeURL: method.qrCodeURL || settings.topUpQrCodeURL || '',
      topUpPaymentLabel: method.accountName || settings.topUpPaymentLabel || provider,
      topUpInstructions: method.notes || settings.topUpInstructions || '',
      accountNumber: method.accountNumber || '',
      bankName: method.bankName || '',
      paymentMethods: settings.topUpPaymentDetails || {}
    } : {}
  });
}));

router.post('/topup-proof', uploadLimiter, upload.single('proof'), asyncHandler(async (req, res) => {
  if (req.user.role !== 'business') throw new ApiError(403, 'Only business accounts can upload top-up proof');
  if (!req.file) throw new ApiError(400, 'Please attach a payment screenshot');
  validateUploadedFiles([req.file], { imagesOnly: true });
  const ext = req.file.mimetype.split('/')[1] || 'png';
  const blobPath = `topup-proofs/${req.user._id}-${Date.now()}.${ext}`;
  await storage.upload({ blobPath, data: req.file.buffer, contentType: req.file.mimetype });
  res.status(201).json({ paymentProofURL: `/files/${blobPath}` });
}));

router.post('/payout', payoutLimiter, validate(payoutSchema), asyncHandler(async (req, res) => {
  const { transaction, pendingTotal } = await requestPayout({
    userId: req.user._id,
    amount: req.body.amount
  });
  res.status(201).json({ withdrawal: transaction, pendingTotal });
}));

router.post('/topup-request', payoutLimiter, validate(topUpRequestSchema), asyncHandler(async (req, res) => {
  if (req.user.role !== 'business') {
    throw new ApiError(403, 'Only business accounts can request wallet top-ups');
  }
  const transaction = await requestTopUp({
    userId: req.user._id,
    amount: req.body.amount,
    referenceNote: req.body.referenceNote,
    paymentProofURL: req.body.paymentProofURL,
    paymentProvider: req.body.paymentProvider
  });
  res.status(201).json({ topUpRequest: transaction });
}));

export default router;
