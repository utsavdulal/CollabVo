import { Router } from 'express';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Review } from '../../models/Review.js';
import { Event } from '../../models/Event.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { upload, validateUploadedFiles } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { storage } from '../../config/azureBlob.js';

const router = Router();

const locationSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  address: z.string().default('')
});

const profileSchema = z.object({
  name: z.string().min(1).max(80),
  bio: z.string().max(1000).default(''),
  category: z.string().min(1).max(60),
  location: locationSchema,
  photoURL: z.string().url().max(500).optional().or(z.literal(''))
});

const workSampleSchema = z.object({
  title: z.string().min(1).max(120),
  url: z.string().max(500).default(''),
  platform: z.string().max(50).default('Instagram'),
  description: z.string().max(500).default('')
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(1000).optional(),
  category: z.string().min(1).max(60).optional(),
  photoURL: z.string().max(500).optional(),
  coverURL: z.string().max(500).optional(),
  location: locationSchema.optional(),
  socials: z.object({
    instagram: z.string().max(200).optional(),
    tiktok: z.string().max(200).optional(),
    youtube: z.string().max(200).optional(),
    facebook: z.string().max(200).optional(),
    website: z.string().max(200).optional()
  }).optional(),
  works: z.array(workSampleSchema).optional()
});

router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const { q = '', role, category, lat, lng, radiusKm } = req.query;
  const query = { role: { $ne: 'admin' } };

  if (role && ['creator', 'business'].includes(role)) query.role = role;
  if (category) query.category = category;
  if (q) query.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  if (lat && lng && radiusKm) {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusKm) * 1000
      }
    };
  }

  const users = await User.find(query)
    .select('name role photoURL bio category location verificationStatus rating workCompleted works socials')
    .limit(50);
  res.json({ users });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('name role photoURL coverURL bio category location socials works verificationStatus rating workCompleted workInProgress createdAt');
  if (!user) throw new ApiError(404, 'User not found');
  const reviews = await Review.find({ revieweeId: user._id }).populate('reviewerId', 'name photoURL').limit(10);
  const events = await Event.find({ createdBy: user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ user, reviews, events });
}));

router.post('/setup-profile', requireAuth, validate(profileSchema), asyncHandler(async (req, res) => {
  const user = req.user;
  const data = req.body;
  user.name = data.name;
  user.bio = data.bio;
  user.category = data.category;
  user.location = data.location;
  if (data.photoURL !== undefined) user.photoURL = data.photoURL;
  await user.save();
  res.json({ user });
}));

router.patch('/me', requireAuth, validate(updateSchema), asyncHandler(async (req, res) => {
  const user = req.user;
  const data = req.body;
  for (const key of ['name', 'bio', 'category', 'photoURL', 'coverURL', 'location', 'socials', 'works']) {
    if (data[key] !== undefined) user[key] = data[key];
  }
  await user.save();
  res.json({ user });
}));

router.post('/photo', requireAuth, uploadLimiter, upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No photo uploaded');
  validateUploadedFiles([req.file], { imagesOnly: true });
  const ext = req.file.mimetype.split('/')[1];
  const blobPath = `profiles/${req.user._id}-${Date.now()}.${ext}`;
  await storage.upload({ blobPath, data: req.file.buffer, contentType: req.file.mimetype });
  req.user.photoURL = `/files/${blobPath}`;
  await req.user.save();
  res.json({ user: req.user, photoURL: req.user.photoURL });
}));

export default router;
