import { Router } from 'express';
import { z } from 'zod';
import { Event } from '../../models/Event.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { upload, validateUploadedFiles } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { storage } from '../../config/azureBlob.js';

const router = Router();

const eventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).default(''),
  category: z.string().min(1).max(60),
  platform: z.string().max(40).default(''),
  image: z.string().max(500).default(''),
  budget: z.number().min(0).default(0),
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
  const events = await Event.find()
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name photoURL category verificationStatus')
    .limit(10);
  res.json({ events });
}));

router.get('/nearby', requireAuth, asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm = 25 } = req.query;
  if (!lat || !lng) {
    const events = await Event.find().populate('createdBy', 'name photoURL category verificationStatus').limit(20);
    return res.json({ events });
  }
  const events = await Event.find({
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

router.post('/image', requireAuth, requireRole('business'), uploadLimiter, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded');
  validateUploadedFiles([req.file], { imagesOnly: true });
  const ext = req.file.mimetype.split('/')[1];
  const blobPath = `events/${req.user._id}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  await storage.upload({ blobPath, data: req.file.buffer, contentType: req.file.mimetype });
  res.status(201).json({ url: `/files/${blobPath}` });
}));

export default router;
