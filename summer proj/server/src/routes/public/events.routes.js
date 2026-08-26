import { Router } from 'express';
import { z } from 'zod';
import { Event } from '../../models/Event.js';
import { Proposal } from '../../models/Proposal.js';
import { Notification } from '../../models/Notification.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { upload, validateUploadedFiles } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { storage } from '../../config/azureBlob.js';
import { notifyUser } from '../../services/notificationService.js';

const router = Router();

const eventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).default(''),
  category: z.string().min(1).max(60),
  platform: z.string().max(40).default(''),
  workMode: z.enum(['onsite', 'remote']).default('onsite'),
  image: z.string().max(500).default(''),
  budget: z.number().min(0).default(0),
  deliverables: z.object({
    videos: z.number().min(0).default(0),
    posts: z.number().min(0).default(0),
    storyMentions: z.number().min(0).default(0)
  }).optional().default({ videos: 0, posts: 0, storyMentions: 0 }),
  creatorsNeeded: z.number().min(1).max(50).default(1),
  date: z.string().datetime().optional(),
  location: z.object({
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    address: z.string().default('')
  })
});

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { category, platform, sort = 'latest', lat, lng, radiusKm, mine, createdBy, q } = req.query;
  const query = {};
  if (category) query.category = category;
  if (platform) query.platform = platform;
  if (mine === 'true') {
    query.createdBy = req.user._id;
  } else if (createdBy) {
    query.createdBy = createdBy;
  } else {
    query.status = { $ne: 'filled' };
  }

  if (q && q.trim()) {
    query.$or = [
      { title: { $regex: q.trim(), $options: 'i' } },
      { description: { $regex: q.trim(), $options: 'i' } },
      { category: { $regex: q.trim(), $options: 'i' } }
    ];
  }

  if (lat && lng && radiusKm) {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusKm) * 1000
      }
    };
  }

  const events = await Event.find(query)
    .sort(sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 })
    .populate('createdBy', 'name photoURL category verificationStatus')
    .limit(100);

  res.json({ events });
}));

router.get('/featured', requireAuth, asyncHandler(async (_req, res) => {
  const events = await Event.find({ status: { $ne: 'filled' } })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name photoURL category verificationStatus')
    .limit(10);
  res.json({ events });
}));

router.get('/nearby', requireAuth, asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm = 25 } = req.query;
  if (!lat || !lng) {
    const events = await Event.find({ status: { $ne: 'filled' } })
      .populate('createdBy', 'name photoURL category verificationStatus')
      .limit(20);
    return res.json({ events });
  }
  const events = await Event.find({
    status: { $ne: 'filled' },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusKm) * 1000
      }
    }
  }).populate('createdBy', 'name photoURL category verificationStatus').limit(50);
  res.json({ events });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('createdBy', 'name photoURL category verificationStatus');
  if (!event) throw new ApiError(404, 'Event not found');
  res.json({ event });
}));

router.post('/', requireAuth, requireRole('business'), validate(eventSchema), asyncHandler(async (req, res) => {
  if (req.user.verificationStatus !== 'verified') {
    throw new ApiError(403, 'Your business must be verified before posting events');
  }
  const data = req.body;
  const event = await Event.create({
    ...data,
    location: { type: 'Point', coordinates: data.location.coordinates, address: data.location.address },
    createdBy: req.user._id
  });
  res.status(201).json({ event });
}));

const eventUpdateSchema = eventSchema.partial();

router.patch('/:id', requireAuth, requireRole('business'), validate(eventUpdateSchema), asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (String(event.createdBy) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit your own campaigns');
  }
  if (event.status === 'filled') {
    throw new ApiError(400, 'This campaign is full and can no longer be edited');
  }

  const data = req.body;
  for (const key of ['title', 'description', 'category', 'platform', 'workMode', 'image', 'budget', 'date']) {
    if (data[key] !== undefined) event[key] = data[key];
  }
  if (data.deliverables !== undefined) {
    event.deliverables = {
      videos: data.deliverables.videos ?? event.deliverables?.videos ?? 0,
      posts: data.deliverables.posts ?? event.deliverables?.posts ?? 0,
      storyMentions: data.deliverables.storyMentions ?? event.deliverables?.storyMentions ?? 0
    };
  }
  if (data.creatorsNeeded !== undefined) {
    const hired = event.creatorsHired || 0;
    if (data.creatorsNeeded < hired) {
      throw new ApiError(400, `Creators needed cannot be less than already hired (${hired})`);
    }
    event.creatorsNeeded = data.creatorsNeeded;
  }
  if (data.location !== undefined) {
    event.location = {
      type: 'Point',
      coordinates: data.location.coordinates,
      address: data.location.address
    };
  }

  await event.save();
  res.json({ event });
}));

router.delete('/:id', requireAuth, requireRole('business'), asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (String(event.createdBy) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only delete your own campaigns');
  }

  const accepted = await Proposal.countDocuments({ eventId: event._id, status: 'accepted' });
  if (accepted > 0 || event.status === 'filled') {
    throw new ApiError(400, 'This campaign has hired creators and cannot be deleted. Resolve the proposals instead.');
  }

  const pending = await Proposal.find({ eventId: event._id, status: 'pending' }).select('_id fromUserId');
  if (pending.length > 0) {
    await Proposal.deleteMany({ _id: { $in: pending.map((p) => p._id) } });
    for (const p of pending) {
      await notifyUser(p.fromUserId, {
        type: 'proposal',
        message: `"${event.title}" was removed by the business. Your application is no longer under review.`,
        relatedId: null
      });
    }
  }
  await Notification.deleteMany({ type: 'proposal', relatedId: event._id });

  await Event.deleteOne({ _id: event._id });
  res.json({ success: true });
}));

router.post('/image', requireAuth, requireRole('business'), uploadLimiter, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  validateUploadedFiles([req.file], { imagesOnly: true });
  const ext = req.file.mimetype.split('/')[1];
  const blobPath = `events/${req.user._id}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  await storage.upload({ blobPath, data: req.file.buffer, contentType: req.file.mimetype });
  res.status(201).json({ url: `/files/${blobPath}` });
}));

export default router;
