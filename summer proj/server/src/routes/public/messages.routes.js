import { Router } from 'express';
import { z } from 'zod';
import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';

const router = Router();
router.use(requireAuth);

const sendSchema = z.object({
  toUserId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  text: z.string().min(1).max(2000)
});

router.get('/', asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participantIds: req.user._id,
    isRequest: false
  })
    .sort({ lastMessageAt: -1 })
    .populate('participantIds', 'name role photoURL');
  res.json({ conversations });
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

router.post('/', validate(sendSchema), asyncHandler(async (req, res) => {
  const { toUserId, text } = req.body;
  if (String(toUserId) === String(req.user._id)) throw new ApiError(400, 'Cannot message yourself');

  let conv = await Conversation.findOne({
    participantIds: { $all: [req.user._id, toUserId], $size: 2 }
  });

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
  res.status(201).json({ conversation: conv, message });
}));

router.post('/:conversationId/accept', asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.conversationId);
  if (!conv || !conv.participantIds.some(p => String(p) === String(req.user._id))) {
    throw new ApiError(403, 'Forbidden');
  }
  conv.isRequest = false;
  await conv.save();
  res.json({ conversation: conv });
}));

export default router;
