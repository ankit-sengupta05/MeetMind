// =============================================================================
// server/src/tests/health.test.ts
// Basic health endpoint smoke test
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { healthRouter } from '../routes/health.js';

// Mock env config so test doesn't need real Azure credentials
vi.mock('../config/env.js', () => ({
  config: {
    nodeEnv: 'test',
    port: 3001,
    corsOrigins: ['http://localhost:3000'],
    azureAd: { tenantId: 'test', clientId: 'test', clientSecret: 'test' },
    cosmos: { endpoint: 'https://test.documents.azure.com', key: 'test', databaseName: 'meetmind' },
    openai: { endpoint: 'https://test.openai.azure.com', apiKey: 'test', chatDeployment: 'gpt-4o', embeddingDeployment: 'text-embedding-3-small', apiVersion: '2024-04-01-preview' },
    search: { endpoint: 'https://test.search.windows.net', adminKey: 'test', indexName: 'meetmind-meetings' },
    graph: { tenantId: 'test', clientId: 'test', clientSecret: 'test' },
    planner: { groupId: 'test', planId: 'test' },
    bot: { appId: 'test', appPassword: 'test' },
    serviceBus: { connectionString: 'Endpoint=sb://test.servicebus.windows.net/;SharedAccessKeyName=test;SharedAccessKey=test', queueName: 'test' },
    storage: { connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;EndpointSuffix=core.windows.net', containerName: 'test' },
    jwtSecret: 'test-secret-value-that-is-long-enough-32chars',
  },
}));

describe('Health routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);
  });

  it('GET /health/live returns 200 with status ok', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });

  it('GET /health/ready returns 200 with status ok', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
