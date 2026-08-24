import { Router } from 'express';
import mongoose from 'mongoose';
import { Proposal } from '../../models/Proposal.js';
import { Transaction } from '../../models/Transaction.js';
import { Wallet } from '../../models/Wallet.js';
import { AdminAuditLog } from '../../models/AdminAuditLog.js';
import { User } from '../../models/User.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { getWallet, releaseEscrow } from '../../services/escrowService.js';
import { notifyUser } from '../../services/notificationService.js';

const router = Router();
router.use(requireAdminAuth);

router.get('/analytics', asyncHandler(async (_req, res) => {
  const [creators, businesses, verifiedBusinesses, pendingWithdrawals, walletAgg] = await Promise.all([
    User.countDocuments({ role: 'creator' }),
    User.countDocuments({ role: 'business' }),
    User.countDocuments({ role: 'business', verificationStatus: 'verified' }),
    Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Wallet.aggregate([
      { $group: { _id: null, total: { $sum: { $add: ['$availableBalance', '$escrowHeld', '$claimableBalance'] } } } }
    ])
  ]);

  res.json({
    totalCreators: creators,
    totalBusinesses: businesses,
    totalVerifiedBusinesses: verifiedBusinesses,
    virtualCurrencyInCirculation: walletAgg[0]?.total || 0,
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

router.post('/escrows/:id/force-release', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.escrowStatus !== 'held') throw new ApiError(400, 'Escrow is not held');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await releaseEscrow({ proposal, session });
    });
  } finally {
    session.endSession();
  }

  await AdminAuditLog.create({
    adminId: req.user._id,
    action: 'force_release_escrow',
    targetType: 'Proposal',
    targetId: proposal._id,
    details: { amount: proposal.offerAmount, reason: req.body?.reason || 'Admin force release' }
  });

  await Promise.all([
    notifyUser(proposal.fromUserId, { type: 'proposal', message: `Escrow of ₹${proposal.offerAmount} was released by admin.`, relatedId: proposal._id }),
    notifyUser(proposal.toUserId, { type: 'proposal', message: `Escrow of ₹${proposal.offerAmount} was released by admin.`, relatedId: proposal._id })
  ]);

  res.json({ proposal });
}));

router.post('/escrows/:id/refund', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.escrowStatus !== 'held') throw new ApiError(400, 'Escrow is not held');

  const { User: UserModel } = await import('../../models/User.js');
  const fromUser = await UserModel.findById(proposal.fromUserId);
  const toUser = await UserModel.findById(proposal.toUserId);
  const businessUserId = fromUser?.role === 'business' ? proposal.fromUserId : proposal.toUserId;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { getOrCreateWallet: gow } = await import('../../services/escrowService.js');
      const businessWallet = await gow(businessUserId, session);
      businessWallet.escrowHeld = Math.max(0, businessWallet.escrowHeld - proposal.offerAmount);
      businessWallet.availableBalance += proposal.offerAmount;
      await businessWallet.save({ session });

      await Transaction.create([{
        type: 'escrow_refund',
        userId: businessUserId,
        counterpartyId: businessUserId === proposal.fromUserId ? proposal.toUserId : proposal.fromUserId,
        proposalId: proposal._id,
        amount: proposal.offerAmount,
        status: 'completed'
      }], { session });

      proposal.escrowStatus = 'released';
      await proposal.save({ session });
    });
  } finally {
    session.endSession();
  }

  await AdminAuditLog.create({
    adminId: req.user._id,
    action: 'refund_escrow',
    targetType: 'Proposal',
    targetId: proposal._id,
    details: { amount: proposal.offerAmount, refundedTo: businessUserId, reason: req.body?.reason || 'Admin refund' }
  });

  await notifyUser(businessUserId, { type: 'wallet', message: `₹${proposal.offerAmount} escrow was refunded to your wallet by admin.`, relatedId: proposal._id });

  res.json({ proposal });
}));

export default router;
