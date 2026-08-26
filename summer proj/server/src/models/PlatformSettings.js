import mongoose from 'mongoose';

const { Schema } = mongoose;

const walletMethodSchema = new Schema({
  qrCodeURL: { type: String, default: '' },
  accountName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

const bankMethodSchema = new Schema({
  bankName: { type: String, default: '' },
  accountName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

const platformSettingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: 'platform' },
    topUpProvider: { type: String, enum: ['esewa', 'khalti', 'fonepay', 'bank'], default: 'esewa' },
    topUpPaymentDetails: {
      provider: { type: String, enum: ['esewa', 'khalti', 'fonepay', 'bank'], default: 'esewa' },
      esewa: { type: walletMethodSchema, default: () => ({}) },
      khalti: { type: walletMethodSchema, default: () => ({}) },
      fonepay: { type: walletMethodSchema, default: () => ({}) },
      bank: { type: bankMethodSchema, default: () => ({}) }
    },
    topUpQrCodeURL: { type: String, default: '' },
    topUpPaymentLabel: { type: String, default: '' },
    topUpInstructions: { type: String, default: '' }
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
