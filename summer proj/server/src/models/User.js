import mongoose from 'mongoose';

const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { _id: false }
);

const workSampleSchema = new Schema(
  {
    title: { type: String, required: true },
    url: { type: String, default: '' },
    platform: { type: String, default: 'Instagram' },
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

const methodDetailsSchema = new Schema(
  {
    qrCodeURL: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const bankDetailsSchema = new Schema(
  {
    bankName: { type: String, default: 'Nabil Bank' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const paymentDetailsSchema = new Schema(
  {
    provider: { type: String, enum: ['esewa', 'khalti', 'fonepay', 'bank', ''], default: 'esewa' },
    esewa: { type: methodDetailsSchema, default: () => ({ qrCodeURL: '', accountName: '', accountNumber: '', notes: '' }) },
    khalti: { type: methodDetailsSchema, default: () => ({ qrCodeURL: '', accountName: '', accountNumber: '', notes: '' }) },
    fonepay: { type: methodDetailsSchema, default: () => ({ qrCodeURL: '', accountName: '', accountNumber: '', notes: '' }) },
    bank: { type: bankDetailsSchema, default: () => ({ bankName: 'Nabil Bank', accountName: '', accountNumber: '', notes: '' }) },
    qrCodeURL: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    role: { type: String, enum: ['creator', 'business', 'admin'], required: true },
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String },
    photoURL: { type: String, default: '' },
    coverURL: { type: String, default: '' },
    bio: { type: String, default: '' },
    category: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' },
      country: { type: String, default: '' },
      state: { type: String, default: '' },
      city: { type: String, default: '' }
    },
    showLocation: { type: Boolean, default: true },
    socials: {
      instagram: { type: String, default: '' },
      tiktok: { type: String, default: '' },
      youtube: { type: String, default: '' },
      facebook: { type: String, default: '' }
    },
    paymentDetails: {
      type: paymentDetailsSchema,
      default: () => ({
        qrCodeURL: '',
        provider: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        notes: ''
      })
    },
    works: { type: [workSampleSchema], default: [] },
    workCompleted: { type: Number, default: 0 },
    workInProgress: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'verified', 'rejected'],
      default: 'not_applicable'
    },
    suspended: { type: Boolean, default: false },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    followers: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    following: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] }
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1 });
userSchema.index({ followers: 1 });

export const User = mongoose.model('User', userSchema);
