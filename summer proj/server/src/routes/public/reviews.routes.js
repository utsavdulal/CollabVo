import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Review } from '../../models/Review.js';
import { User } from '../../models/User.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';

const router = Router();
router.use(requireAuth);

const reviewSchema = z.object({
  revieweeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  targetUserId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).default('')
}).refine(data => data.revieweeId || data.targetUserId, {
  message: 'revieweeId or targetUserId is required',
  path: ['revieweeId']
});

router.post('/', validate(reviewSchema), asyncHandler(async (req, res) => {
  const revieweeId = req.body.revieweeId || req.body.targetUserId;
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  if (String(revieweeId) === String(req.user._id)) throw new ApiError(400, 'Cannot review yourself');

  const existing = await Review.findOne({ reviewerId: req.user._id, revieweeId });
  if (existing) throw new ApiError(400, 'You already reviewed this user');

  const review = await Review.create({ reviewerId: req.user._id, revieweeId, rating, comment });

  const agg = await Review.aggregate([
    { $match: { revieweeId: new mongoose.Types.ObjectId(revieweeId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await User.updateOne(
    { _id: revieweeId },
    { rating: Math.round((agg[0]?.avg || rating) * 10) / 10 }
  );

  res.status(201).json({ review });
}));

export default router;
