// =============================================================================
// server/src/middleware/auth.ts
// MSAL / Azure AD JWT validation middleware
// Validates Bearer tokens issued by Microsoft Identity Platform
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const JWKS_URI = `https://login.microsoftonline.com/${config.azureAd.tenantId}/discovery/v2.0/keys`;

const client = jwksClient({
  jwksUri: JWKS_URI,
  requestHeaders: {},
  timeout: 10000,
  cache: true,
  cacheMaxEntries: 10,
  cacheMaxAge: 600000, // 10 minutes
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export interface AuthenticatedRequest extends Request {
  user?: {
    oid: string;        // Azure AD object ID
    tid: string;        // Tenant ID
    name?: string;
    email?: string;
    upn?: string;       // User Principal Name
    roles?: string[];
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  jwt.verify(
    token,
    getKey,
    {
      audience: config.azureAd.clientId,
      issuer: [
        `https://login.microsoftonline.com/${config.azureAd.tenantId}/v2.0`,
        `https://sts.windows.net/${config.azureAd.tenantId}/`,
      ],
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        logger.warn('JWT validation failed', { error: err.message });
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const claims = decoded as Record<string, unknown>;
      const payload: NonNullable<AuthenticatedRequest['user']> = {
        oid: claims['oid'] as string,
        tid: claims['tid'] as string,
      };
      if (claims['name']) payload.name = claims['name'] as string;
      if (claims['email'] || claims['preferred_username']) payload.email = (claims['email'] ?? claims['preferred_username']) as string;
      if (claims['upn']) payload.upn = claims['upn'] as string;
      if (claims['roles']) payload.roles = claims['roles'] as string[];

      req.user = payload;

      next();
    }
  );
}
