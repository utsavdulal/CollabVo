import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { AdminAuditLog } from '../../models/AdminAuditLog.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';

const router = Router();
router.use(requireAdminAuth);

const statusSchema = z.object({
  suspended: z.boolean()
});

async function writeAudit(admin, action, targetType, targetId, details = {}) {
  return AdminAuditLog.create({ adminId: admin._id, action, targetType, targetId, details });
}

router.get('/', asyncHandler(async (req, res) => {
  const { q = '', role, page = 1, limit = 20 } = req.query;
  const query = { role: { $ne: 'admin' } };
  if (role && ['creator', 'business'].includes(role)) query.role = role;
  if (q) {
    const re = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [{ name: { $regex: re, $options: 'i' } }, { email: { $regex: re, $options: 'i' } }];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(query).select('name email role category photoURL paymentDetails verificationStatus suspended rating workCompleted createdAt').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(query)
  ]);
  res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-passwordHash -refreshTokens');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user });
}));

router.patch('/:id/suspend', validate(statusSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Cannot suspend an admin');
  user.suspended = req.body.suspended;
  await user.save();
  await writeAudit(req.user, req.body.suspended ? 'suspend_user' : 'unsuspend_user', 'User', user._id);
  res.json({ user });
}));

export default router;
