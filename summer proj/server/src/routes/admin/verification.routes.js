import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { BusinessVerification } from '../../models/BusinessVerification.js';
import { User } from '../../models/User.js';
import { AdminAuditLog } from '../../models/AdminAuditLog.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { storage } from '../../config/azureBlob.js';
import { notifyVerificationChange } from '../../services/notificationService.js';

const router = Router();
router.use(requireAdminAuth);

const decisionSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  reason: z.string().max(500).default('')
});

async function writeAudit(admin, action, targetType, targetId, details = {}) {
  return AdminAuditLog.create({
    adminId: admin._id,
    action,
    targetType,
    targetId,
    details
  });
}

router.get('/queue', asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const records = await BusinessVerification.find({ status })
    .sort({ submittedAt: -1 })
    .populate('userId', 'name email role category createdAt');
  res.json({ records });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const record = await BusinessVerification.findById(req.params.id).populate('userId', 'name email role category location createdAt');
  if (!record) throw new ApiError(404, 'Verification not found');
  const docURLs = [];
  for (const doc of record.documents) {
    docURLs.push({ ...doc.toObject(), signedUrl: await storage.signedUrl(doc.url.replace('/files/', ''), 600, `${req.protocol}://${req.get('host')}`) });
  }
  res.json({ verification: { ...record.toObject(), documents: docURLs } });
}));

router.patch('/:id/decide', validate(decisionSchema), asyncHandler(async (req, res) => {
  const record = await BusinessVerification.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Verification not found');
  if (record.status !== 'pending') throw new ApiError(400, 'Already reviewed');

  const { status, reason } = req.body;
  record.status = status;
  record.reviewedBy = req.user._id;
  record.reviewedAt = new Date();
  if (status === 'rejected') record.rejectionReason = reason;
  await record.save();

  const user = await User.findById(record.userId);
  if (user) {
    user.verificationStatus = status;
    await user.save();
    await notifyVerificationChange(user, status, reason);
  }

  await writeAudit(req.user, `verification_${status}`, 'BusinessVerification', record._id, { reason });

  res.json({ verification: record });
}));

export default router;
