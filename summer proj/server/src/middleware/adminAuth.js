import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from './error.js';

export function signAdminAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: 'admin' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL, audience: env.JWT_ADMIN_AUDIENCE }
  );
}

export function signAdminRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), typ: 'admin' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` }
  );
}

export async function requireAdminAuth(req, _res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new ApiError(401, 'Not authenticated');
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        audience: env.JWT_ADMIN_AUDIENCE
      });
    } catch {
      throw new ApiError(401, 'Invalid or expired admin token');
    }
    const user = await User.findById(payload.sub).select('-passwordHash -refreshTokens');
    if (!user || user.role !== 'admin') throw new ApiError(403, 'Admin access only');
    if (user.suspended) throw new ApiError(403, 'Account suspended');
    req.user = user;
    req.isAdmin = true;
    next();
  } catch (err) {
    next(err);
  }
}
