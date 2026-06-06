// =============================================================================
// server/src/config/env.ts
// Centralised, validated environment config using Zod
// Throws at startup if any required variable is missing
// =============================================================================

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Microsoft Identity / MSAL
  AZURE_AD_TENANT_ID: z.string().min(1),
  AZURE_AD_CLIENT_ID: z.string().min(1),
  AZURE_AD_CLIENT_SECRET: z.string().min(1),

  // Azure Cosmos DB
  COSMOS_ENDPOINT: z.string().url(),
  COSMOS_KEY: z.string().min(1),
  COSMOS_DATABASE_NAME: z.string().default('meetmind'),

  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_CHAT_DEPLOYMENT: z.string().default('gpt-4o'),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().default('text-embedding-3-small'),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-04-01-preview'),

  // Azure Cognitive Search
  AZURE_SEARCH_ENDPOINT: z.string().url(),
  AZURE_SEARCH_ADMIN_KEY: z.string().min(1),
  AZURE_SEARCH_INDEX_NAME: z.string().default('meetmind-meetings'),

  // Microsoft Graph
  GRAPH_TENANT_ID: z.string().min(1),
  GRAPH_CLIENT_ID: z.string().min(1),
  GRAPH_CLIENT_SECRET: z.string().min(1),

  // Microsoft Planner
  PLANNER_GROUP_ID: z.string().min(1),
  PLANNER_PLAN_ID: z.string().min(1),

  // Bot Framework
  BOT_APP_ID: z.string().min(1),
  BOT_APP_PASSWORD: z.string().min(1),

  // Azure Service Bus (for agent job queue)
  SERVICEBUS_CONNECTION_STRING: z.string().min(1),
  SERVICEBUS_QUEUE_NAME: z.string().default('meetmind-agent-jobs'),

  // Azure Storage (for recordings & interim artifacts)
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
  AZURE_STORAGE_CONTAINER_NAME: z.string().default('meetmind-artifacts'),

  // JWT signing secret (for internal service-to-service tokens)
  JWT_SECRET: z.string().min(32),
});

type EnvSchema = z.infer<typeof envSchema>;

function loadConfig(): EnvSchema {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

const parsed = loadConfig();

export const config = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  corsOrigins: parsed.CORS_ORIGINS.split(',').map((o) => o.trim()),

  azureAd: {
    tenantId: parsed.AZURE_AD_TENANT_ID,
    clientId: parsed.AZURE_AD_CLIENT_ID,
    clientSecret: parsed.AZURE_AD_CLIENT_SECRET,
  },

  cosmos: {
    endpoint: parsed.COSMOS_ENDPOINT,
    key: parsed.COSMOS_KEY,
    databaseName: parsed.COSMOS_DATABASE_NAME,
  },

  openai: {
    endpoint: parsed.AZURE_OPENAI_ENDPOINT,
    apiKey: parsed.AZURE_OPENAI_API_KEY,
    chatDeployment: parsed.AZURE_OPENAI_CHAT_DEPLOYMENT,
    embeddingDeployment: parsed.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    apiVersion: parsed.AZURE_OPENAI_API_VERSION,
  },

  search: {
    endpoint: parsed.AZURE_SEARCH_ENDPOINT,
    adminKey: parsed.AZURE_SEARCH_ADMIN_KEY,
    indexName: parsed.AZURE_SEARCH_INDEX_NAME,
  },

  graph: {
    tenantId: parsed.GRAPH_TENANT_ID,
    clientId: parsed.GRAPH_CLIENT_ID,
    clientSecret: parsed.GRAPH_CLIENT_SECRET,
  },

  planner: {
    groupId: parsed.PLANNER_GROUP_ID,
    planId: parsed.PLANNER_PLAN_ID,
  },

  bot: {
    appId: parsed.BOT_APP_ID,
    appPassword: parsed.BOT_APP_PASSWORD,
  },

  serviceBus: {
    connectionString: parsed.SERVICEBUS_CONNECTION_STRING,
    queueName: parsed.SERVICEBUS_QUEUE_NAME,
  },

  storage: {
    connectionString: parsed.AZURE_STORAGE_CONNECTION_STRING,
    containerName: parsed.AZURE_STORAGE_CONTAINER_NAME,
  },

  jwtSecret: parsed.JWT_SECRET,
} as const;
