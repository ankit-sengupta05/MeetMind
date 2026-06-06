// =============================================================================
// server/src/routes/health.ts
// Liveness and readiness probes for Azure App Service
// =============================================================================

import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', (_req, res) => {
  // TODO: add actual dependency checks (Cosmos, Search) for readiness
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
