import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { payoutLimiter } from '../../middleware/rateLimiter.js';
import { getWallet, requestPayout, requestTopUp } from '../../services/escrowService.js';
import { Transaction } from '../../models/Transaction.js';

const router = Router();
router.use(requireAuth);

const payoutSchema = z.object({
  amount: z.number().positive()
});

const topUpRequestSchema = z.object({
  amount: z.number().positive(),
  referenceNote: z.string().max(200).default('')
});

router.get('/', asyncHandler(async (req, res) => {
  const wallet = await getWallet(req.user._id);
  const transactions = await Transaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate('counterpartyId', 'name role')
    .limit(100);
  res.json({ wallet, transactions });
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
    referenceNote: req.body.referenceNote
  });
  res.status(201).json({ topUpRequest: transaction });
}));

export default router;
