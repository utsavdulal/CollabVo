import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { User } from '../../models/User.js';
import { Notification } from '../../models/Notification.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { registerSseClient, unregisterSseClient } from '../../utils/sseManager.js';

const router = Router();

// SSE stream endpoint (accepts token via query for EventSource)
router.get('/stream', asyncHandler(async (req, res) => {
  let token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token) throw new ApiError(401, 'Not authenticated');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: env.JWT_USER_AUDIENCE });
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub).select('-passwordHash -refreshTokens');
  if (!user || user.suspended) throw new ApiError(401, 'Not authenticated');

  const userId = user._id.toString();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  registerSseClient(userId, res);
  res.write(`:connected\n\n`);

  const cleanup = () => {
    unregisterSseClient(userId);
    res.end();
  };

  req.on('close', cleanup);
  res.on('error', cleanup);
}));

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100);
  const unread = await Notification.countDocuments({ userId: req.user._id, read: false });

  const followIds = [
    ...new Set(
      notifications
        .filter((n) => n.type === 'follow' && n.relatedId)
        .map((n) => n.relatedId.toString())
    )
  ];

  let senderMap = {};
  if (followIds.length > 0) {
    const [me, senders] = await Promise.all([
      User.findById(req.user._id).select('following'),
      User.find({ _id: { $in: followIds } }).select('name photoURL')
    ]);
    for (const s of senders) {
      senderMap[s._id.toString()] = {
        name: s.name,
        photoURL: s.photoURL || '',
        canFollowBack: !me.following.some((f) => String(f) === String(s._id))
      };
    }
  }

  const enriched = notifications.map((n) => {
    if (n.type === 'follow' && n.relatedId && senderMap[n.relatedId.toString()]) {
      return { ...n.toObject(), ...senderMap[n.relatedId.toString()] };
    }
    return n.toObject ? n.toObject() : n;
  });

  res.json({ notifications: enriched, unread });
}));

router.post('/read', asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ success: true });
}));

export default router;
