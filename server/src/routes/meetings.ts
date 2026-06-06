// =============================================================================
// server/src/routes/meetings.ts
// CRUD + transcript/summary endpoints for meetings
// =============================================================================

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getMeetingsContainer } from '../db/cosmosClient.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { nowIso } from '@meetmind/shared';
import type { Meeting, CreateMeetingDto } from '@meetmind/shared';

export const meetingsRouter = Router();

// POST /api/v1/meetings
meetingsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    type: z.enum(['one_on_one', 'team', 'all_hands', 'interview', 'standup', 'retrospective', 'other']),
    startTime: z.string().datetime(),
    description: z.string().max(2000).optional(),
    participants: z.array(z.object({
      id: z.string(),
      displayName: z.string(),
      email: z.string().email(),
      role: z.enum(['organizer', 'required', 'optional']),
    })).optional(),
  });

  const body = schema.parse(req.body) as CreateMeetingDto;
  const tenantId = req.user!.tid;
  const now = nowIso();

  const meeting: Meeting = {
    id: uuidv4(),
    partitionKey: tenantId,
    title: body.title,
    type: body.type,
    status: 'scheduled',
    startTime: body.startTime,
    description: body.description,
    organizer: {
      id: req.user!.oid,
      displayName: req.user!.name ?? 'Unknown',
      email: req.user!.email ?? '',
      role: 'organizer',
    },
    participants: body.participants ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const container = await getMeetingsContainer();
  const { resource } = await container.items.create(meeting);
  res.status(201).json(resource);
});

// GET /api/v1/meetings
meetingsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const page = Number(req.query['page'] ?? 1);
  const pageSize = Math.min(Number(req.query['pageSize'] ?? 20), 100);
  const offset = (page - 1) * pageSize;

  const container = await getMeetingsContainer();
  const query = {
    query: `SELECT * FROM c WHERE c.partitionKey = @tenantId ORDER BY c.startTime DESC OFFSET @offset LIMIT @limit`,
    parameters: [
      { name: '@tenantId', value: tenantId },
      { name: '@offset', value: offset },
      { name: '@limit', value: pageSize },
    ],
  };
  const { resources } = await container.items.query<Meeting>(query).fetchAll();
  res.json({ items: resources, page, pageSize });
});

// GET /api/v1/meetings/:id
meetingsRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const container = await getMeetingsContainer();
  const { resource } = await container.item(req.params['id']!, tenantId).read<Meeting>();
  if (!resource) throw createError('Meeting not found', 404);
  res.json(resource);
});

// PATCH /api/v1/meetings/:id
meetingsRouter.patch('/:id', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const container = await getMeetingsContainer();
  const { resource: existing } = await container.item(req.params['id']!, tenantId).read<Meeting>();
  if (!existing) throw createError('Meeting not found', 404);

  const updated: Meeting = {
    ...existing,
    ...req.body,
    id: existing.id,
    partitionKey: tenantId,
    updatedAt: nowIso(),
  };
  const { resource } = await container.item(req.params['id']!, tenantId).replace(updated);
  res.json(resource);
});

// DELETE /api/v1/meetings/:id
meetingsRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const container = await getMeetingsContainer();
  await container.item(req.params['id']!, tenantId).delete();
  res.status(204).send();
});

// POST /api/v1/meetings/:id/transcript
meetingsRouter.post('/:id/transcript', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tid;
  const container = await getMeetingsContainer();
  const { resource: existing } = await container.item(req.params['id']!, tenantId).read<Meeting>();
  if (!existing) throw createError('Meeting not found', 404);

  const updated: Meeting = {
    ...existing,
    transcript: req.body.segments,
    status: 'processing',
    updatedAt: nowIso(),
  };
  const { resource } = await container.item(req.params['id']!, tenantId).replace(updated);
  res.json(resource);
});
