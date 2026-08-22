import rateLimit from 'express-rate-limit';

// Rate limits are enforced only in production by default.
// Set DISABLE_RATE_LIMIT=false in .env to force them on outside production,
// or DISABLE_RATE_LIMIT=true to turn them off inside production.
function rateLimitsEnabled() {
  if (process.env.DISABLE_RATE_LIMIT !== undefined) {
    return process.env.DISABLE_RATE_LIMIT !== 'true';
  }
  return process.env.NODE_ENV === 'production';
}

function maybeLimited(factory) {
  return rateLimitsEnabled() ? factory() : (_req, _res, next) => next();
}

export const authLimiter = maybeLimited(() =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, try again later' }
  })
);

export const payoutLimiter = maybeLimited(() =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many payout requests, try again later' }
  })
);

export const uploadLimiter = maybeLimited(() =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many uploads, try again later' }
  })
);

export const apiLimiter = maybeLimited(() =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded' }
  })
);
