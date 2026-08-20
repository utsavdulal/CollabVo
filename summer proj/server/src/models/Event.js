import mongoose from 'mongoose';

const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    image: { type: String, default: '' },
    category: { type: String, default: '' },
    platform: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' }
    },
    date: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, default: '' },
    budget: { type: Number, default: 0 }
  },
  { timestamps: true }
);

eventSchema.index({ location: '2dsphere' });
eventSchema.index({ category: 1, platform: 1 });

export const Event = mongoose.model('Event', eventSchema);
