import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Wallet } from '../../models/Wallet.js';
import { env } from '../../config/env.js';
import {
  signAccessToken,
  signRefreshToken,
  requireAuth
} from '../../middleware/auth.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['creator', 'business'])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function publicUser(user) {
  return {
    id: user._id,
    role: user.role,
    name: user.name,
    email: user.email,
    photoURL: user.photoURL,
    bio: user.bio,
    category: user.category,
    location: user.location,
    socials: user.socials,
    paymentDetails: user.paymentDetails,
    verificationStatus: user.verificationStatus,
    emailVerified: user.emailVerified,
    workCompleted: user.workCompleted,
    workInProgress: user.workInProgress,
    rating: user.rating
  };
}

async function issueTokens(user, res) {
  const accessToken = signAccessToken(user, env.JWT_USER_AUDIENCE);
  const refreshToken = signRefreshToken(user);
  setRefreshCookie(res, refreshToken);
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          token: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
        }
      },
      $slice: { refreshTokens: -5 }
    }
  );
  return accessToken;
}

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, role, passwordHash });
    await Wallet.create({ userId: user._id });

    const accessToken = await issueTokens(user, res);
    res.status(201).json({ user: publicUser(user), accessToken });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid email or password');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Invalid email or password');
    if (user.suspended) throw new ApiError(403, 'Account suspended');
    await Wallet.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true });

    const accessToken = await issueTokens(user, res);
    res.json({ user: publicUser(user), accessToken });
  })
);

router.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req, res) => {
    const oldToken = req.cookies?.refreshToken;
    if (!oldToken) throw new ApiError(401, 'No refresh token');

    let payload;
    try {
      payload = jwt.verify(oldToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }
    if (payload.typ === 'admin') throw new ApiError(401, 'Invalid refresh token');

    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.suspended) throw new ApiError(403, 'Account suspended');

    const hashed = hashToken(oldToken);
    const stored = user.refreshTokens.find(t => t.token === hashed && t.expiresAt > new Date());
    if (!stored) {
      await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
      throw new ApiError(401, 'Refresh token no longer valid');
    }

    await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: { token: hashed } } });
    const accessToken = await issueTokens(user, res);
    res.json({ user: publicUser(user), accessToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const oldToken = req.cookies?.refreshToken;
    if (oldToken) {
      await User.updateOne(
        { _id: req.user?._id, 'refreshTokens.token': hashToken(oldToken) },
        { $pull: { refreshTokens: { token: hashToken(oldToken) } } }
      );
    }
    res.clearCookie('refreshToken', { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.json({ success: true });
  })
);

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

if (env.GOOGLE_CLIENT_ID) {
  const { Strategy: GoogleStrategy } = await import('passport-google-oauth20');
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.findOne({ email: profile.emails?.[0]?.value });
            if (user) {
              user.googleId = profile.id;
              await user.save();
            } else {
              user = await User.create({
                googleId: profile.id,
                email: profile.emails?.[0]?.value || `${profile.id}@google.local`,
                role: 'creator',
                name: profile.displayName,
                photoURL: profile.photos?.[0]?.value,
                emailVerified: profile.emails?.[0]?.verified || false
              });
              await Wallet.create({ userId: user._id });
            }
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    asyncHandler(async (req, res) => {
      const accessToken = await issueTokens(req.user, res);
      res.redirect(`${env.CLIENT_ORIGIN[0]}?access_token=${accessToken}`);
    })
  );
}

export default router;
