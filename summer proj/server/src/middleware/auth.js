import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from './error.js';

export function signAccessToken(user, audience) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL, audience }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` }
  );
}

export async function requireAuth(req, _res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new ApiError(401, 'Not authenticated');
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        audience: env.JWT_USER_AUDIENCE
      });
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }
    const user = await User.findById(payload.sub).select('-passwordHash -refreshTokens');
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.suspended) throw new ApiError(403, 'Account suspended');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) return next(new ApiError(403, 'Forbidden'));
    next();
  };
}
