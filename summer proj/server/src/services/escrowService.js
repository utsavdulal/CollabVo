import mongoose from 'mongoose';
import { Wallet } from '../models/Wallet.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../middleware/error.js';

export async function sweepExpiredEscrows() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { Proposal } = await import('../models/Proposal.js');
  const candidates = await Proposal.find({
    escrowStatus: 'held',
    creatorConfirmedComplete: true,
    businessConfirmedComplete: false,
    creatorConfirmedAt: { $lte: cutoff }
  });

  const session = await mongoose.startSession();
  try {
    for (const proposal of candidates) {
      await session.withTransaction(async () => {
        await releaseEscrow({ proposal, session });
      });
    }
  } finally {
    session.endSession();
  }
  return candidates.length;
}

export async function getOrCreateWallet(userId, session = null) {
  const q = { userId };
  const opts = session ? { session, new: true, upsert: true, setDefaultsOnInsert: true } : { new: true, upsert: true, setDefaultsOnInsert: true };
  return Wallet.findOneAndUpdate(q, { $setOnInsert: { userId } }, opts);
}

export async function getWallet(userId) {
  return getOrCreateWallet(userId);
}

export async function topUpWallet({ adminId, userId, amount, referenceNote }) {
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const wallet = await getOrCreateWallet(userId, session);
      wallet.availableBalance += amount;
      await wallet.save({ session });

      const txn = await Transaction.create(
        [
          {
            type: 'topup',
            userId,
            amount,
            status: 'completed',
            adminId,
            referenceNote
          }
        ],
        { session }
      );
      return { wallet, transaction: txn[0] };
    });
  } finally {
    session.endSession();
  }
  return result;
}

export async function lockEscrow({ proposal, session }) {
  // Determine who is the business (payer) - it's whoever is accepting and whose role is 'business'
  const { User } = await import('../models/User.js');
  const fromUser = await User.findById(proposal.fromUserId).session(session);
  const toUser = await User.findById(proposal.toUserId).session(session);
  
  // Business is the one paying the escrow
  const businessUserId = fromUser.role === 'business' ? proposal.fromUserId : proposal.toUserId;
  const creatorUserId = String(businessUserId) === String(proposal.fromUserId) ? proposal.toUserId : proposal.fromUserId;

  const businessWallet = await getOrCreateWallet(businessUserId, session);
  const creatorWallet = await getOrCreateWallet(creatorUserId, session);
  
  if (businessWallet.availableBalance < proposal.offerAmount) {
    throw new ApiError(400, 'Insufficient wallet balance to secure this deal');
  }
  businessWallet.availableBalance -= proposal.offerAmount;
  businessWallet.escrowHeld += proposal.offerAmount;
  await businessWallet.save({ session });

  // Update creator payment on hold
  creatorWallet.escrowHeld += proposal.offerAmount;
  await creatorWallet.save({ session });

  await Transaction.create(
    [
      {
        type: 'escrow_lock',
        userId: businessUserId,
        counterpartyId: creatorUserId,
        proposalId: proposal._id,
        amount: proposal.offerAmount,
        status: 'completed'
      }
    ],
    { session }
  );

  proposal.escrowStatus = 'held';
  await proposal.save({ session });
}

export async function releaseEscrow({ proposal, session }) {
  if (proposal.escrowStatus !== 'held') {
    throw new ApiError(400, 'Escrow is not held for this proposal');
  }
  const amount = proposal.offerAmount;
  const { User } = await import('../models/User.js');
  const fromUser = await User.findById(proposal.fromUserId).session(session);
  const toUser = await User.findById(proposal.toUserId).session(session);

  // Business is the one who paid the escrow - must match lockEscrow logic
  const businessUserId = fromUser?.role === 'business' ? proposal.fromUserId : proposal.toUserId;
  const creatorUserId = String(businessUserId) === String(proposal.fromUserId) ? proposal.toUserId : proposal.fromUserId;

  const businessWallet = await getOrCreateWallet(businessUserId, session);
  const creatorWallet = await getOrCreateWallet(creatorUserId, session);

  businessWallet.escrowHeld = Math.max(0, businessWallet.escrowHeld - amount);
  await businessWallet.save({ session });

  creatorWallet.escrowHeld = Math.max(0, creatorWallet.escrowHeld - amount);
  creatorWallet.availableBalance += amount;
  creatorWallet.claimableBalance += amount;
  await creatorWallet.save({ session });

  await Transaction.create(
    [
      {
        type: 'escrow_release',
        userId: creatorUserId,
        counterpartyId: businessUserId,
        proposalId: proposal._id,
        amount,
        status: 'completed'
      }
    ],
    { session }
  );

  proposal.escrowStatus = 'released';
  await proposal.save({ session });
}

export async function requestPayout({ userId, amount }) {
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const wallet = await getOrCreateWallet(userId, session);

      const pendingAgg = await Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'withdrawal', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).session(session);
      const pendingTotal = pendingAgg[0]?.total || 0;

      if (!amount || amount < 100) {
        throw new ApiError(400, 'Minimum withdrawal amount is ₹100');
      }

      // Total withdrawable is the available balance
      const totalWithdrawable = wallet.availableBalance;
      if (totalWithdrawable < pendingTotal + amount) {
        throw new ApiError(400, 'Insufficient balance for this payout request');
      }

      const txn = await Transaction.create(
        [
          {
            type: 'withdrawal',
            userId,
            amount,
            status: 'pending'
          }
        ],
        { session }
      );
      return { transaction: txn[0], pendingTotal: pendingTotal + amount };
    });
  } finally {
    session.endSession();
  }
  return result;
}

export async function requestTopUp({ userId, amount, referenceNote, paymentProofURL = '', paymentProvider = 'esewa' }) {
  if (!amount || amount <= 0) throw new ApiError(400, 'Invalid top-up amount');
  const txn = await Transaction.create([
    {
      type: 'topup_request',
      userId,
      amount,
      status: 'pending',
      referenceNote: referenceNote || '',
      paymentProofURL,
      paymentProvider
    }
  ]);
  return txn[0];
}

export async function approveTopUp({ adminId, topUpId }) {
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const txn = await Transaction.findById(topUpId).session(session);
      if (!txn) throw new ApiError(404, 'Top-up request not found');
      if (txn.type !== 'topup_request') throw new ApiError(400, 'Not a top-up request');
      if (txn.status !== 'pending') throw new ApiError(400, 'Top-up request already processed');

      const wallet = await getOrCreateWallet(txn.userId, session);
      wallet.availableBalance += txn.amount;
      await wallet.save({ session });

      txn.status = 'completed';
      txn.adminId = adminId;
      await txn.save({ session });
      return { transaction: txn, wallet };
    });
  } finally {
    session.endSession();
  }
  return result;
}

export async function denyTopUp({ adminId, topUpId, reason }) {
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const txn = await Transaction.findById(topUpId).session(session);
      if (!txn) throw new ApiError(404, 'Top-up request not found');
      if (txn.type !== 'topup_request') throw new ApiError(400, 'Not a top-up request');
      if (txn.status !== 'pending') throw new ApiError(400, 'Top-up request already processed');

      txn.status = 'failed';
      txn.adminId = adminId;
      txn.referenceNote = reason || 'Denied by admin';
      await txn.save({ session });
      return { transaction: txn };
    });
  } finally {
    session.endSession();
  }
  return result;
}

export async function payWithdrawal({ adminId, withdrawalId }) {
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const txn = await Transaction.findById(withdrawalId).session(session);
      if (!txn) throw new ApiError(404, 'Withdrawal not found');
      if (txn.type !== 'withdrawal') throw new ApiError(400, 'Not a withdrawal');
      if (txn.status !== 'pending') throw new ApiError(400, 'Withdrawal already processed');

      const wallet = await getOrCreateWallet(txn.userId, session);
      if (wallet.availableBalance < txn.amount && wallet.claimableBalance < txn.amount) {
        throw new ApiError(400, 'Wallet balance no longer covers this payout');
      }

      wallet.availableBalance = Math.max(0, wallet.availableBalance - txn.amount);
      wallet.claimableBalance = Math.max(0, wallet.claimableBalance - txn.amount);
      await wallet.save({ session });

      txn.status = 'completed';
      txn.adminId = adminId;
      await txn.save({ session });
      return { transaction: txn };
    });
  } finally {
    session.endSession();
  }
  return result;
}

export async function denyWithdrawal({ adminId, withdrawalId, reason }) {
  const session = await mongoose.startSession();
  let result;
  try {
    result = await session.withTransaction(async () => {
      const txn = await Transaction.findById(withdrawalId).session(session);
      if (!txn) throw new ApiError(404, 'Withdrawal not found');
      if (txn.type !== 'withdrawal' || txn.status !== 'pending') {
        throw new ApiError(400, 'Withdrawal already processed');
      }
      txn.status = 'failed';
      txn.adminId = adminId;
      txn.referenceNote = reason || 'Denied by admin';
      await txn.save({ session });
      return { transaction: txn };
    });
  } finally {
    session.endSession();
  }
  return result;
}
