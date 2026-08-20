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
      address: { type: String, default: '' }
    },
    socials: {
      instagram: { type: String, default: '' },
      tiktok: { type: String, default: '' },
      youtube: { type: String, default: '' },
      facebook: { type: String, default: '' }
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
    refreshTokens: { type: [refreshTokenSchema], default: [] }
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1 });

export const User = mongoose.model('User', userSchema);
