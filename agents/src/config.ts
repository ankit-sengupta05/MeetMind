// =============================================================================
// agents/src/config.ts
// Standalone environment config for the agents workspace.
// Reads directly from process.env so agents never import from server/src.
// =============================================================================

import 'dotenv/config';

function require(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const agentConfig = {
  openai: {
    endpoint:           require('AZURE_OPENAI_ENDPOINT'),
    apiKey:             require('AZURE_OPENAI_API_KEY'),
    apiVersion:         process.env['AZURE_OPENAI_API_VERSION'] ?? '2024-04-01-preview',
    chatDeployment:     process.env['AZURE_OPENAI_CHAT_DEPLOYMENT'] ?? 'gpt-4o',
    embeddingDeployment: process.env['AZURE_OPENAI_EMBEDDING_DEPLOYMENT'] ?? 'text-embedding-ada-002',
  },
  cosmos: {
    endpoint:     require('COSMOS_ENDPOINT'),
    key:          require('COSMOS_KEY'),
    databaseName: process.env['COSMOS_DATABASE_NAME'] ?? 'meetmind',
  },
  search: {
    endpoint:  require('AZURE_SEARCH_ENDPOINT'),
    adminKey:  require('AZURE_SEARCH_ADMIN_KEY'),
    indexName: process.env['AZURE_SEARCH_INDEX_NAME'] ?? 'meetmind-meetings',
  },
  graph: {
    tenantId:     require('GRAPH_TENANT_ID'),
    clientId:     require('GRAPH_CLIENT_ID'),
    clientSecret: require('GRAPH_CLIENT_SECRET'),
  },
} as const;
