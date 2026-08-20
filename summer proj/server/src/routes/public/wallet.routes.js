import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { payoutLimiter } from '../../middleware/rateLimiter.js';
import { getWallet, requestPayout } from '../../services/escrowService.js';
import { Transaction } from '../../models/Transaction.js';

const router = Router();
router.use(requireAuth);

const payoutSchema = z.object({
  amount: z.number().positive()
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

export default router;
