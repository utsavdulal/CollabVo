import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { signAdminAccessToken, signAdminRefreshToken } from '../../middleware/adminAuth.js';
import { asyncHandler, ApiError } from '../../middleware/error.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setAdminRefreshCookie(res, token) {
  res.cookie('adminRefreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, role: 'admin' });
  if (!user || !user.passwordHash) throw new ApiError(401, 'Invalid admin credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid admin credentials');
  if (user.suspended) throw new ApiError(403, 'Account suspended');

  const accessToken = signAdminAccessToken(user);
  const refreshToken = signAdminRefreshToken(user);
  setAdminRefreshCookie(res, refreshToken);

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

  res.json({
    accessToken,
    admin: { id: user._id, email: user.email, name: user.name }
  });
}));

router.post('/refresh', authLimiter, asyncHandler(async (req, res) => {
  const oldToken = req.cookies?.adminRefreshToken;
  if (!oldToken) throw new ApiError(401, 'No refresh token');
  let payload;
  try {
    payload = jwt.verify(oldToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }
  if (payload.typ !== 'admin') throw new ApiError(401, 'Invalid refresh token');

  const user = await User.findById(payload.sub);
  if (!user || user.role !== 'admin') throw new ApiError(401, 'Admin no longer exists');
  if (user.suspended) throw new ApiError(403, 'Account suspended');

  const hashed = hashToken(oldToken);
  const stored = user.refreshTokens.find(t => t.token === hashed && t.expiresAt > new Date());
  if (!stored) {
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    throw new ApiError(401, 'Refresh token no longer valid');
  }

  await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: { token: hashed } } });
  const accessToken = signAdminAccessToken(user);
  const refreshToken = signAdminRefreshToken(user);
  setAdminRefreshCookie(res, refreshToken);
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
  res.json({ accessToken });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  res.clearCookie('adminRefreshToken', { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.json({ success: true });
}));

export default router;
