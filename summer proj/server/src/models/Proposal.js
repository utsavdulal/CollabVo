import mongoose from 'mongoose';

const { Schema } = mongoose;

const proposalSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    offerAmount: { type: Number, required: true },
    message: { type: String, default: '' },
    meetupLocation: {
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' }
    },
    escrowStatus: {
      type: String,
      enum: ['none', 'held', 'released', 'disputed'],
      default: 'none'
    },
    businessConfirmedComplete: { type: Boolean, default: false },
    creatorConfirmedComplete: { type: Boolean, default: false },
    creatorConfirmedAt: { type: Date },
    workStarted: { type: Boolean, default: false },
    workStartedAt: { type: Date },
    submittedAt: { type: Date },
    deliverableURL: { type: String, default: '' },
    deliverableNotes: { type: String, default: '' },
    deliverableMedia: [
      {
        url: { type: String, required: true },
        mediaType: { type: String, enum: ['image', 'video', 'file'], default: 'image' },
        name: { type: String, default: '' }
      }
    ],
    revisionRequested: { type: Boolean, default: false },
    revisionNotes: { type: String, default: '' },
    revisionRequestedAt: { type: Date },
    businessAccepted: { type: Boolean, default: false },
    creatorAccepted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

proposalSchema.index({ fromUserId: 1, status: 1 });
proposalSchema.index({ toUserId: 1, status: 1 });
proposalSchema.index({ escrowStatus: 1 });

export const Proposal = mongoose.model('Proposal', proposalSchema);
