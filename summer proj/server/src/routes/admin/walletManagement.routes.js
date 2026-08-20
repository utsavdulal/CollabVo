import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Transaction } from '../../models/Transaction.js';
import { AdminAuditLog } from '../../models/AdminAuditLog.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { getWallet, topUpWallet, payWithdrawal, denyWithdrawal } from '../../services/escrowService.js';
import { notifyUser } from '../../services/notificationService.js';

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

router.get('/user/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name email role photoURL');
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
    .populate('userId', 'name email');
  res.json({ transactions });
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

export default router;
