// =============================================================================
// server/src/middleware/rateLimiter.ts
// Per-user rate limiting with express-rate-limit
// =============================================================================

import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute window
  max: 120,                // 120 requests per minute per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => {
    // Key by user OID if authenticated, fallback to IP
    const authReq = req as { user?: { oid?: string } };
    return authReq.user?.oid ?? req.ip ?? 'unknown';
  },
});
