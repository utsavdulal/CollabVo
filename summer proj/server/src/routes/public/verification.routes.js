import { Router } from 'express';
import { z } from 'zod';
import { BusinessVerification } from '../../models/BusinessVerification.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { upload, validateUploadedFiles } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { storage } from '../../config/azureBlob.js';
import { notifyVerificationChange } from '../../services/notificationService.js';

const router = Router();

const submitSchema = z.object({
  taxNumber: z.string().max(40).optional().or(z.literal(''))
});

router.use(requireAuth, requireRole('business'));

router.get('/me', asyncHandler(async (req, res) => {
  const record = await BusinessVerification.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ verification: record });
}));

router.post(
  '/submit',
  uploadLimiter,
  upload.array('documents', 4),
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) throw new ApiError(400, 'Upload at least one document');
    if (req.files.length < 2) throw new ApiError(400, 'Upload a business registration certificate and a government issued ID');
    validateUploadedFiles(req.files);

    const extFor = (f) => {
      const map = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
      return map[f.mimetype];
    };

    const documents = [];
    const kinds = ['registration', 'government_id'];
    for (let i = 0; i < req.files.length; i++) {
      const f = req.files[i];
      const type = i < 2 ? kinds[i] : 'tax';
      const blobPath = `verification/${req.user._id}/${Date.now()}-${i}-${type}.${extFor(f)}`;
      await storage.upload({ blobPath, data: f.buffer, contentType: f.mimetype });
      documents.push({ type, url: `/files/${blobPath}`, uploadedAt: new Date() });
    }

    const existing = await BusinessVerification.findOneAndUpdate(
      { userId: req.user._id, status: { $in: ['pending', 'rejected'] } },
      {
        $set: {
          documents,
          status: 'pending',
          rejectionReason: '',
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedBy: null,
          taxNumber: req.body.taxNumber || ''
        }
      },
      { new: true, upsert: true }
    );

    req.user.verificationStatus = 'pending';
    await req.user.save();
    await notifyVerificationChange(req.user, 'pending');

    res.status(201).json({ verification: existing });
  })
);

export default router;
