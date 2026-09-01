import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['topup', 'topup_request', 'escrow_lock', 'escrow_release', 'withdrawal', 'admin_deduct', 'escrow_refund', 'platform_fee'],
      required: true
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'User' },
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal' },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    referenceNote: { type: String, default: '' },
    paymentProofURL: { type: String, default: '' },
    paymentProvider: { type: String, enum: ['esewa', 'khalti', 'fonepay', 'bank'], default: 'esewa' }
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ proposalId: 1 });
transactionSchema.index({ type: 1, status: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
