import { Router } from 'express';
import { Proposal } from '../../models/Proposal.js';
import { Transaction } from '../../models/Transaction.js';
import { AdminAuditLog } from '../../models/AdminAuditLog.js';
import { User } from '../../models/User.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { asyncHandler } from '../../middleware/error.js';
import { getWallet } from '../../services/escrowService.js';

const router = Router();
router.use(requireAdminAuth);

router.get('/analytics', asyncHandler(async (_req, res) => {
  const [creators, businesses, verifiedBusinesses, transactions, pendingWithdrawals] = await Promise.all([
    User.countDocuments({ role: 'creator' }),
    User.countDocuments({ role: 'business' }),
    User.countDocuments({ role: 'business', verificationStatus: 'verified' }),
    Transaction.find({}),
    Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  const circulation = transactions
    .filter(t => t.status === 'completed' && (t.type === 'topup' || t.type === 'escrow_release'))
    .reduce((sum, t) => sum + t.amount, 0);

  res.json({
    totalCreators: creators,
    totalBusinesses: businesses,
    totalVerifiedBusinesses: verifiedBusinesses,
    virtualCurrencyInCirculation: circulation,
    pendingWithdrawalTotal: pendingWithdrawals[0]?.total || 0,
    pendingWithdrawalCount: pendingWithdrawals[0]?.count || 0
  });
}));

router.get('/escrows', asyncHandler(async (_req, res) => {
  const proposals = await Proposal.find({ escrowStatus: { $in: ['held', 'released', 'disputed'] } })
    .sort({ updatedAt: -1 })
    .populate('fromUserId', 'name')
    .populate('toUserId', 'name')
    .populate('eventId', 'title');
  res.json({ proposals });
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AdminAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('adminId', 'email'),
    AdminAuditLog.countDocuments()
  ]);
  res.json({ logs, total });
}));

router.get('/user/:id/wallet', asyncHandler(async (req, res) => {
  const wallet = await getWallet(req.params.id);
  res.json({ wallet });
}));

export default router;
