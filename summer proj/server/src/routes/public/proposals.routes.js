import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Proposal } from '../../models/Proposal.js';
import { Event } from '../../models/Event.js';
import { User } from '../../models/User.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { lockEscrow, releaseEscrow, sweepExpiredEscrows, getOrCreateWallet } from '../../services/escrowService.js';
import { notifyUser } from '../../services/notificationService.js';
import { upload, validateUploadedFiles } from '../../middleware/upload.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { storage } from '../../config/azureBlob.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  toUserId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  eventId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  offerAmount: z.number().positive(),
  message: z.string().max(1000).default(''),
  meetupLocation: z.object({
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    address: z.string().default('')
  }).optional()
});

async function isBothAccepted(proposal) {
  return proposal.businessAccepted && proposal.creatorAccepted;
}

async function lockOnAcceptance(proposal) {
  if (!(await isBothAccepted(proposal))) return false;
  if (proposal.status !== 'accepted') {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const fresh = await Proposal.findById(proposal._id).session(session);
        fresh.status = 'accepted';
        await lockEscrow({ proposal: fresh, session });
        proposal.status = fresh.status;
        proposal.escrowStatus = fresh.escrowStatus;
      });
    } finally {
      session.endSession();
    }
  }
  return true;
}

router.get('/', asyncHandler(async (req, res) => {
  await sweepExpiredEscrows();
  const { tab = 'all', direction, eventId } = req.query;
  const base = { $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }] };
  let statusFilter = {};
  if (tab === 'pending') statusFilter = { status: 'pending' };
  if (tab === 'accepted') statusFilter = { status: 'accepted' };
  if (tab === 'rejected') statusFilter = { status: 'rejected' };

  if (direction === 'incoming') {
    statusFilter.toUserId = req.user._id;
  } else if (direction === 'outgoing') {
    statusFilter.fromUserId = req.user._id;
  }

  if (eventId) {
    statusFilter.eventId = eventId;
  }

  const proposals = await Proposal.find({ ...base, ...statusFilter })
    .sort({ updatedAt: -1 })
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');

  res.json({ proposals });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id)
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  const isParty = String(proposal.fromUserId._id) === String(req.user._id) || String(proposal.toUserId._id) === String(req.user._id);
  if (!isParty) throw new ApiError(403, 'Forbidden');
  res.json({ proposal });
}));

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const user = req.user;
  let toUserId = req.body.toUserId;
  const eventId = req.body.eventId;

  let event = null;
  if (eventId) {
    event = await Event.findById(eventId);
    if (!event) throw new ApiError(404, 'Campaign event not found');
    if (event.status === 'filled' || (event.creatorsNeeded && (event.creatorsHired || 0) >= event.creatorsNeeded)) {
      throw new ApiError(400, 'This campaign has already filled all creator slots');
    }
    if (!toUserId) {
      toUserId = String(event.createdBy);
    }
  }

  if (!toUserId) {
    throw new ApiError(400, 'Target recipient or Campaign is required');
  }

  if (String(user._id) === String(toUserId)) {
    throw new ApiError(400, 'Cannot send a proposal to yourself');
  }

  const target = await User.findById(toUserId);
  if (!target) throw new ApiError(404, 'Target user not found');

  // Prevent duplicate proposals from same creator for same event
  if (user.role !== 'business' && eventId) {
    const existing = await Proposal.findOne({
      fromUserId: user._id,
      eventId,
      status: { $in: ['pending', 'accepted'] }
    });
    if (existing) {
      throw new ApiError(400, 'You have already applied to this campaign');
    }
  }

  if (user.role === 'business') {
    if (user.verificationStatus !== 'verified') {
      throw new ApiError(403, 'Your business must be verified before sending proposals');
    }
    const wallet = await getOrCreateWallet(user._id);
    if (wallet.availableBalance < req.body.offerAmount) {
      throw new ApiError(400, 'Insufficient available wallet balance for this offer. Top up your wallet first.');
    }

    const proposal = await Proposal.create({
      fromUserId: user._id,
      toUserId,
      eventId,
      offerAmount: req.body.offerAmount,
      message: req.body.message,
      meetupLocation: req.body.meetupLocation || { coordinates: [0, 0], address: '' },
      businessAccepted: true,
      creatorAccepted: false,
      status: 'pending'
    });

    await notifyUser(toUserId, {
      type: 'proposal',
      message: `${user.name} sent you a campaign offer of ₹${req.body.offerAmount.toLocaleString()}.`,
      relatedId: proposal._id
    });

    return res.status(201).json({ proposal });
  } else {
    // Creator applying to business campaign
    const businessId = toUserId;
    const business = await User.findById(businessId);
    if (!business || business.role !== 'business') {
      throw new ApiError(400, 'Target must be a business');
    }

    const proposal = await Proposal.create({
      fromUserId: user._id,
      toUserId: businessId,
      eventId,
      offerAmount: req.body.offerAmount,
      message: req.body.message,
      meetupLocation: req.body.meetupLocation || { coordinates: [0, 0], address: '' },
      creatorAccepted: true,
      businessAccepted: false,
      status: 'pending'
    });

    await notifyUser(businessId, {
      type: 'proposal',
      message: `${user.name} applied to ${event ? `"${event.title}"` : 'your campaign'} with an offer of ₹${req.body.offerAmount.toLocaleString()}.`,
      relatedId: proposal._id
    });

    return res.status(201).json({ proposal });
  }
}));

router.patch('/:id/accept', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  const isFrom = String(proposal.fromUserId) === String(req.user._id);
  const isTo = String(proposal.toUserId) === String(req.user._id);
  if (!isFrom && !isTo) throw new ApiError(403, 'Forbidden');
  if (proposal.status === 'rejected') throw new ApiError(400, 'This proposal was rejected');
  if (proposal.status === 'accepted') throw new ApiError(400, 'Proposal already accepted');

  // Get both users to determine who is the business (payer)
  const fromUser = await User.findById(proposal.fromUserId);
  const toUser = await User.findById(proposal.toUserId);
  const businessUserId = fromUser.role === 'business' ? proposal.fromUserId : proposal.toUserId;
  const businessUser = await User.findById(businessUserId);
  
  if (!businessUser || businessUser.verificationStatus !== 'verified') {
    throw new ApiError(403, 'The business must be verified before accepting proposals');
  }

  // Check wallet balance for the business user (who will pay escrow)
  const businessWallet = await getOrCreateWallet(businessUserId);
  if (businessWallet.availableBalance < proposal.offerAmount) {
    throw new ApiError(400, 'Insufficient wallet balance to secure this deal');
  }

  // Mark acceptance based on who is accepting
  if (req.user.role === 'business') {
    proposal.businessAccepted = true;
  } else {
    proposal.creatorAccepted = true;
  }
  await proposal.save();

  await lockOnAcceptance(proposal);

  if (proposal.status === 'accepted') {
    if (proposal.eventId) {
      const event = await Event.findById(proposal.eventId);
      if (event) {
        event.creatorsHired = (event.creatorsHired || 0) + 1;
        if (event.creatorsHired >= (event.creatorsNeeded || 1)) {
          event.status = 'filled';
        }
        await event.save();
      }
    }
    await notifyUser(proposal.fromUserId, {
      type: 'escrow',
      message: `Proposal accepted! ₹${proposal.offerAmount.toLocaleString()} is now safely secured in escrow.`,
      relatedId: proposal._id
    });
    await notifyUser(proposal.toUserId, {
      type: 'escrow',
      message: `Proposal accepted! ₹${proposal.offerAmount.toLocaleString()} is now safely secured in escrow.`,
      relatedId: proposal._id
    });
  }

  const populated = await Proposal.findById(proposal._id)
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');

  res.json({ proposal: populated });
}));

router.patch('/:id/reject', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  const isParty = String(proposal.fromUserId) === String(req.user._id) || String(proposal.toUserId) === String(req.user._id);
  if (!isParty) throw new ApiError(403, 'Forbidden');
  if (proposal.status === 'accepted') throw new ApiError(400, 'Cannot reject an accepted proposal');
  proposal.status = 'rejected';
  await proposal.save();
  await notifyUser(
    String(proposal.fromUserId) === String(req.user._id) ? proposal.toUserId : proposal.fromUserId,
    { type: 'proposal', message: 'A proposal was rejected.', relatedId: proposal._id }
  );

  const populated = await Proposal.findById(proposal._id)
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');

  res.json({ proposal: populated });
}));

router.patch('/:id/start', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.status !== 'accepted' || proposal.escrowStatus !== 'held') {
    throw new ApiError(400, 'Proposal escrow must be active to start work');
  }
  const isParty = String(proposal.fromUserId) === String(req.user._id) || String(proposal.toUserId) === String(req.user._id);
  if (!isParty) throw new ApiError(403, 'Forbidden');

  proposal.workStarted = true;
  proposal.workStartedAt = new Date();
  await proposal.save();

  const notifyTarget = String(proposal.fromUserId) === String(req.user._id) ? proposal.toUserId : proposal.fromUserId;
  await notifyUser(notifyTarget, {
    type: 'escrow',
    message: `${req.user.name} marked the project as Started. Work is officially underway!`,
    relatedId: proposal._id
  });

  const populated = await Proposal.findById(proposal._id)
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');

  res.json({ proposal: populated });
}));

router.post('/:id/deliverable-upload', uploadLimiter, upload.single('media'), asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  const isParty = String(proposal.fromUserId) === String(req.user._id) || String(proposal.toUserId) === String(req.user._id);
  if (!isParty) throw new ApiError(403, 'Forbidden');
  if (!req.file) throw new ApiError(400, 'No file uploaded');

  const isVideo = req.file.mimetype.startsWith('video/');
  const mediaType = isVideo ? 'video' : 'image';
  const ext = req.file.mimetype.split('/')[1] || (isVideo ? 'mp4' : 'jpg');
  const blobPath = `deliverables/${proposal._id}-${Date.now()}.${ext}`;
  await storage.upload({ blobPath, data: req.file.buffer, contentType: req.file.mimetype });

  const mediaItem = {
    url: `/files/${blobPath}`,
    mediaType,
    name: req.file.originalname || `deliverable.${ext}`
  };

  res.json({ media: mediaItem });
}));

router.patch('/:id/submit', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.status !== 'accepted' || proposal.escrowStatus !== 'held') {
    throw new ApiError(400, 'Escrow is not active for this proposal');
  }
  const isParty = String(proposal.fromUserId) === String(req.user._id) || String(proposal.toUserId) === String(req.user._id);
  if (!isParty) throw new ApiError(403, 'Forbidden');

  proposal.workStarted = true;
  if (!proposal.workStartedAt) proposal.workStartedAt = new Date();
  proposal.creatorConfirmedComplete = true;
  proposal.creatorConfirmedAt = new Date();
  proposal.submittedAt = new Date();
  proposal.revisionRequested = false;
  if (req.body.deliverableURL !== undefined) proposal.deliverableURL = String(req.body.deliverableURL).trim();
  if (req.body.deliverableNotes !== undefined) proposal.deliverableNotes = String(req.body.deliverableNotes).trim();
  if (Array.isArray(req.body.deliverableMedia)) {
    proposal.deliverableMedia = req.body.deliverableMedia;
  }
  await proposal.save();

  const notifyTarget = String(proposal.fromUserId) === String(req.user._id) ? proposal.toUserId : proposal.fromUserId;
  await notifyUser(notifyTarget, {
    type: 'escrow',
    message: `${req.user.name} submitted the deliverables! Please review and confirm delivery to release escrow funds.`,
    relatedId: proposal._id
  });

  const populated = await Proposal.findById(proposal._id)
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');

  res.json({ proposal: populated });
}));

router.patch('/:id/request-revision', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.status !== 'accepted' || proposal.escrowStatus !== 'held') {
    throw new ApiError(400, 'Escrow is not active for this proposal');
  }
  const isParty = String(proposal.fromUserId) === String(req.user._id) || String(proposal.toUserId) === String(req.user._id);
  if (!isParty) throw new ApiError(403, 'Forbidden');

  const notes = String(req.body.revisionNotes || '').trim();
  if (!notes) {
    throw new ApiError(400, 'Please provide revision notes or details of required changes');
  }

  proposal.creatorConfirmedComplete = false;
  proposal.businessConfirmedComplete = false;
  proposal.revisionRequested = true;
  proposal.revisionNotes = notes;
  proposal.revisionRequestedAt = new Date();
  await proposal.save();

  const notifyTarget = String(proposal.fromUserId) === String(req.user._id) ? proposal.toUserId : proposal.fromUserId;
  await notifyUser(notifyTarget, {
    type: 'escrow',
    message: `${req.user.name} requested changes on your deliverables: "${notes}"`,
    relatedId: proposal._id
  });

  const populated = await Proposal.findById(proposal._id)
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');

  res.json({ proposal: populated });
}));

router.patch('/:id/complete', asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (proposal.status !== 'accepted' || proposal.escrowStatus !== 'held') {
    throw new ApiError(400, 'Escrow is not active for this proposal');
  }
  const isBusiness = String(proposal.fromUserId) === String(req.user._id) || String(proposal.toUserId) === String(req.user._id);
  if (!isBusiness) throw new ApiError(403, 'Forbidden');

  if (req.user.role === 'business') {
    proposal.businessConfirmedComplete = true;
  } else {
    proposal.creatorConfirmedComplete = true;
    proposal.creatorConfirmedAt = new Date();
    proposal.submittedAt = proposal.submittedAt || new Date();
  }
  await proposal.save();

  if (proposal.businessConfirmedComplete && proposal.creatorConfirmedComplete && proposal.escrowStatus === 'held') {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await releaseEscrow({ proposal, session });
      });
    } finally {
      session.endSession();
    }
    await notifyUser(proposal.fromUserId, {
      type: 'escrow',
      message: `₹${proposal.offerAmount.toLocaleString()} was released from escrow to the creator.`,
      relatedId: proposal._id
    });
    await notifyUser(proposal.toUserId, {
      type: 'escrow',
      message: `Work complete! ₹${proposal.offerAmount.toLocaleString()} was released to your claimable balance.`,
      relatedId: proposal._id
    });
  } else {
    const notifyTarget = String(proposal.fromUserId) === String(req.user._id) ? proposal.toUserId : proposal.fromUserId;
    await notifyUser(
      notifyTarget,
      { type: 'escrow', message: 'The other party marked the work complete. Confirm to release funds.', relatedId: proposal._id }
    );
  }

  const populated = await Proposal.findById(proposal._id)
    .populate('fromUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('toUserId', 'name role photoURL verificationStatus category bio location rating')
    .populate('eventId', 'title image category budget date location');

  res.json({ proposal: populated });
}));

export default router;
