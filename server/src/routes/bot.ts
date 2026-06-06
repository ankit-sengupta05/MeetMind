// =============================================================================
// server/src/routes/bot.ts
// Express routes for Bot Framework and Webhooks
// =============================================================================

import { Router } from 'express';
import { adapter, bot } from '../bot/botConfig.js';

export const botRouter = Router();

// POST /api/bot/messages
// Endpoint for Microsoft Teams / Bot Framework to send activities
botRouter.post('/messages', async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});

// POST /api/bot/webhooks/graph
// Endpoint for Graph API Change Notifications
botRouter.post('/webhooks/graph', async (req, res) => {
  // 1. Validation Token check (Graph sends a validation token when subscribing)
  if (req.query && req.query.validationToken) {
    res.set('Content-Type', 'text/plain');
    res.status(200).send(req.query.validationToken);
    return;
  }

  // 2. Process Notifications
  const notifications = req.body.value;
  if (notifications) {
    for (const notification of notifications) {
      console.log('Received Graph Notification:', notification.resource);
      // Process call records end events here...
    }
  }

  res.status(202).send();
});
