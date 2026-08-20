import { Router } from 'express';
import { z } from 'zod';
import { Report } from '../../models/Report.js';
import { User } from '../../models/User.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';

const router = Router();
router.use(requireAuth);

const reportSchema = z.object({
  reportedUserId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  eventId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  reason: z.enum(['scam', 'spam', 'harassment', 'inappropriate', 'other']),
  details: z.string().max(1000).default('')
});

router.post('/', validate(reportSchema), asyncHandler(async (req, res) => {
  const { reportedUserId, eventId, reason, details } = req.body;

  if (String(reportedUserId) === String(req.user._id)) {
    throw new ApiError(400, 'Cannot report yourself');
  }

  const target = await User.findById(reportedUserId);
  if (!target) throw new ApiError(404, 'Reported user not found');

  const report = await Report.create({
    reporterId: req.user._id,
    reportedUserId,
    eventId: eventId || undefined,
    reason,
    details
  });

  res.status(201).json({ report, message: 'Report submitted for admin review' });
}));

export default router;
