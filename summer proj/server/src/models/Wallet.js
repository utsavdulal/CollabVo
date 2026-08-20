import mongoose from 'mongoose';

const { Schema } = mongoose;

const walletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    availableBalance: { type: Number, default: 0 },
    escrowHeld: { type: Number, default: 0 },
    claimableBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Wallet = mongoose.model('Wallet', walletSchema);
