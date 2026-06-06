// =============================================================================
// server/src/db/cosmosClient.ts
// Singleton Cosmos DB client + typed container accessors
// =============================================================================

import { CosmosClient, type Container, type Database } from '@azure/cosmos';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { COSMOS_CONTAINERS } from '@meetmind/shared';

let _client: CosmosClient | null = null;
let _database: Database | null = null;

function getClient(): CosmosClient {
  if (!_client) {
    _client = new CosmosClient({
      endpoint: config.cosmos.endpoint,
      key: config.cosmos.key,
      userAgentSuffix: 'meetmind-api/1.0',
    });
  }
  return _client;
}

async function getDatabase(): Promise<Database> {
  if (!_database) {
    const client = getClient();
    const { database } = await client.databases.createIfNotExists({
      id: config.cosmos.databaseName,
    });
    _database = database;
    logger.info(`Cosmos DB connected: ${config.cosmos.databaseName}`);
  }
  return _database;
}

export async function getMeetingsContainer(): Promise<Container> {
  const db = await getDatabase();
  const { container } = await db.containers.createIfNotExists({
    id: COSMOS_CONTAINERS.MEETINGS,
    partitionKey: { paths: ['/partitionKey'] },
    defaultTtl: -1, // TTL controlled per-document
  });
  return container;
}

export async function getAgentJobsContainer(): Promise<Container> {
  const db = await getDatabase();
  const { container } = await db.containers.createIfNotExists({
    id: COSMOS_CONTAINERS.AGENT_JOBS,
    partitionKey: { paths: ['/tenantId'] },
    defaultTtl: 86400 * 30, // 30-day auto-expiry for job records
  });
  return container;
}

export async function getTenantConfigsContainer(): Promise<Container> {
  const db = await getDatabase();
  const { container } = await db.containers.createIfNotExists({
    id: COSMOS_CONTAINERS.TENANT_CONFIGS,
    partitionKey: { paths: ['/tenantId'] },
  });
  return container;
}
