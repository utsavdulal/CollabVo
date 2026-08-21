import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { User } from '../../models/User.js';
import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { registerMessageSseClient, unregisterMessageSseClient, broadcastMessage } from '../../utils/sseManager.js';

const router = Router();

const sendSchema = z.object({
  toUserId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  text: z.string().min(1).max(2000)
});

const sendToConvSchema = z.object({
  text: z.string().min(1).max(2000)
});

// SSE stream for real-time messages (accepts token via query for EventSource)
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

  registerMessageSseClient(userId, res);
  res.write(`:connected\n\n`);

  const cleanup = () => {
    unregisterMessageSseClient(userId, res);
    res.end();
  };

  req.on('close', cleanup);
  res.on('error', cleanup);
}));

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participantIds: req.user._id,
    isRequest: false
  })
    .sort({ lastMessageAt: -1 })
    .populate('participantIds', 'name role photoURL');

  const convIds = conversations.map(c => c._id);
  const unreadCounts = await Message.aggregate([
    { $match: { conversationId: { $in: convIds }, senderId: { $ne: req.user._id }, read: false } },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } }
  ]);
  const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));

  const result = conversations.map(c => ({
    ...c.toObject(),
    unreadCount: unreadMap[c._id.toString()] || 0
  }));

  res.json({ conversations: result });
}));

router.get('/requests', asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participantIds: req.user._id,
    isRequest: true
  })
    .sort({ lastMessageAt: -1 })
    .populate('participantIds', 'name role photoURL');
  res.json({ conversations });
}));

router.get('/:conversationId', asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.conversationId).populate('participantIds', 'name role photoURL');
  if (!conv || !conv.participantIds.some(p => String(p._id) === String(req.user._id))) {
    throw new ApiError(403, 'Forbidden');
  }
  res.json({ conversation: conv });
}));

router.get('/:conversationId/messages', asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.conversationId);
  if (!conv || !conv.participantIds.some(p => String(p) === String(req.user._id))) {
    throw new ApiError(403, 'Forbidden');
  }
  const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
  await Message.updateMany(
    { conversationId: conv._id, senderId: { $ne: req.user._id }, read: false },
    { read: true }
  );
  res.json({ messages });
}));

// Send message to existing conversation
router.post('/:conversationId/messages', validate(sendToConvSchema), asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.conversationId);
  if (!conv || !conv.participantIds.some(p => String(p) === String(req.user._id))) {
    throw new ApiError(403, 'Forbidden');
  }

  const { text } = req.body;
  conv.lastMessage = text;
  conv.lastMessageAt = new Date();
  await conv.save();

  const message = await Message.create({
    conversationId: conv._id,
    senderId: req.user._id,
    text
  });

  const recipientId = conv.participantIds.find(p => String(p) !== String(req.user._id));

  broadcastMessage(recipientId.toString(), 'new-message', {
    message: { ...message.toObject(), senderId: message.senderId },
    conversationId: conv._id,
    lastMessage: text,
    lastMessageAt: conv.lastMessageAt
  });

  broadcastMessage(recipientId.toString(), 'conversation-updated', {
    conversationId: conv._id,
    lastMessage: text,
    lastMessageAt: conv.lastMessageAt,
    senderId: req.user._id
  });

  res.status(201).json({ message });
}));

// Send message to new/existing user (creates conversation if needed)
router.post('/', validate(sendSchema), asyncHandler(async (req, res) => {
  const { toUserId, text } = req.body;
  if (String(toUserId) === String(req.user._id)) throw new ApiError(400, 'Cannot message yourself');

  let conv = await Conversation.findOne({
    participantIds: { $all: [req.user._id, toUserId], $size: 2 }
  });
  const isNew = !conv;

  if (!conv) {
    conv = await Conversation.create({
      participantIds: [req.user._id, toUserId],
      isRequest: true,
      lastMessage: text,
      lastMessageAt: new Date()
    });
  } else {
    conv.lastMessage = text;
    conv.lastMessageAt = new Date();
    await conv.save();
  }

  const message = await Message.create({
    conversationId: conv._id,
    senderId: req.user._id,
    text
  });

  const recipientId = conv.participantIds.find(p => String(p) !== String(req.user._id));

  broadcastMessage(recipientId.toString(), 'new-message', {
    message: { ...message.toObject(), senderId: message.senderId },
    conversationId: conv._id,
    lastMessage: text,
    lastMessageAt: conv.lastMessageAt,
    isNewConversation: isNew
  });

  broadcastMessage(recipientId.toString(), 'conversation-updated', {
    conversationId: conv._id,
    lastMessage: text,
    lastMessageAt: conv.lastMessageAt,
    senderId: req.user._id,
    isNewConversation: isNew
  });

  res.status(201).json({ conversation: conv, message });
}));

router.post('/:conversationId/accept', asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.conversationId);
  if (!conv || !conv.participantIds.some(p => String(p) === String(req.user._id))) {
    throw new ApiError(403, 'Forbidden');
  }
  conv.isRequest = false;
  await conv.save();

  const recipientId = conv.participantIds.find(p => String(p) !== String(req.user._id));
  broadcastMessage(recipientId.toString(), 'conversation-accepted', {
    conversationId: conv._id
  });

  res.json({ conversation: conv });
}));

export default router;
