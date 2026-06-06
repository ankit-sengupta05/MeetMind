// =============================================================================
// server/src/index.ts
// Application entry point – creates Express server and mounts all routes
// =============================================================================

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { meetingsRouter } from './routes/meetings.js';
import { searchRouter } from './routes/search.js';
import { plannerRouter } from './routes/planner.js';
import { agentsRouter } from './routes/agents.js';
import { healthRouter } from './routes/health.js';
import { botRouter } from './routes/bot.js';
import { API_V1 } from '@meetmind/shared';

const app = express();

// ---------------------------------------------------------------------------
// Security & parsing middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-teams-tenant-id'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ---------------------------------------------------------------------------
// Public routes (no auth required)
// ---------------------------------------------------------------------------
app.use(`${API_V1}/health`, healthRouter);
app.use(`/api/bot`, botRouter); // Bot Framework requires its own auth provided by BotBuilder

// ---------------------------------------------------------------------------
// Protected routes
// ---------------------------------------------------------------------------
app.use(authMiddleware);
app.use(rateLimiter);

app.use(`${API_V1}/meetings`, meetingsRouter);
app.use(`${API_V1}/search`, searchRouter);
app.use(`${API_V1}/planner`, plannerRouter);
app.use(`${API_V1}/agents`, agentsRouter);

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server (only if not running on Vercel)
// ---------------------------------------------------------------------------
const port = config.port;
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    logger.info(`MeetMind API server running on port ${port} [${config.nodeEnv}]`);
  });
}

export { app };
export default app;
