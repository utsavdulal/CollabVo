import mongoose from 'mongoose';

const { Schema } = mongoose;

const verificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documents: [
      {
        type: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

verificationSchema.index({ status: 1, submittedAt: -1 });
verificationSchema.index({ userId: 1 });

export const BusinessVerification = mongoose.model('BusinessVerification', verificationSchema);
