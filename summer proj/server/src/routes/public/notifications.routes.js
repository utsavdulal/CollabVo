import { Router } from 'express';
import { Notification } from '../../models/Notification.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/error.js';
import { registerSseClient, unregisterSseClient } from '../../utils/sseManager.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100);
  const unread = await Notification.countDocuments({ userId: req.user._id, read: false });
  res.json({ notifications, unread });
}));

// SSE stream endpoint for real-time notifications
router.get('/stream', requireAuth, (req, res) => {
  const userId = req.user._id.toString();
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Register the client
  registerSseClient(userId, res);

  // Send initial connection confirmation
  res.write(`:connected\n\n`);

  // Handle client disconnect
  const cleanup = () => {
    unregisterSseClient(userId);
    res.end();
  };

  req.on('close', cleanup);
  res.on('error', cleanup);
});

router.post('/read', asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ success: true });
}));

export default router;
