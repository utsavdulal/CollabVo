import { Router } from 'express';
import { z } from 'zod';
import { Report } from '../../models/Report.js';
import { User } from '../../models/User.js';
import { AdminAuditLog } from '../../models/AdminAuditLog.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';

const router = Router();
router.use(requireAdminAuth);

const decideSchema = z.object({
  status: z.enum(['reviewed', 'dismissed', 'actioned']),
  resolutionNotes: z.string().max(500).default(''),
  suspendUser: z.boolean().default(false)
});

router.get('/', asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const query = status === 'all' ? {} : { status };

  const reports = await Report.find(query)
    .sort({ createdAt: -1 })
    .populate('reporterId', 'name email role')
    .populate('reportedUserId', 'name email role category verificationStatus suspended')
    .populate('eventId', 'title');

  res.json({ reports });
}));

router.patch('/:id/decide', validate(decideSchema), asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found');

  const { status, resolutionNotes, suspendUser } = req.body;
  report.status = status;
  report.reviewedBy = req.user._id;
  report.resolutionNotes = resolutionNotes;
  await report.save();

  if (suspendUser && report.reportedUserId) {
    const user = await User.findById(report.reportedUserId);
    if (user && user.role !== 'admin') {
      user.suspended = true;
      await user.save();
    }
  }

  await AdminAuditLog.create({
    adminId: req.user._id,
    action: `report_${status}`,
    targetType: 'Report',
    targetId: report._id,
    details: {
      reportedUserId: report.reportedUserId,
      suspendUser,
      resolutionNotes
    }
  });

  res.json({ report });
}));

export default router;
