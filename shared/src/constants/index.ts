// =============================================================================
// shared/src/constants/index.ts
// Application-wide constants
// =============================================================================

export const APP_NAME = 'MeetMind';
export const APP_VERSION = '1.0.0';

// API version prefix
export const API_V1 = '/api/v1';

// Cosmos DB
export const COSMOS_DATABASE_NAME = 'meetmind';
export const COSMOS_CONTAINERS = {
  MEETINGS: 'meetings',
  AGENT_JOBS: 'agentJobs',
  TENANT_CONFIGS: 'tenantConfigs',
  USER_PREFERENCES: 'userPreferences',
} as const;

// Azure Cognitive Search
export const SEARCH_INDEX_NAME = 'meetmind-meetings';
export const SEARCH_SEMANTIC_CONFIG = 'meetmind-semantic-config';
export const EMBEDDING_DIMENSIONS = 1536;

// Azure OpenAI
export const OPENAI_CHAT_DEPLOYMENT = 'gpt-4o';
export const OPENAI_EMBEDDING_DEPLOYMENT = 'text-embedding-3-small';
export const OPENAI_MAX_TOKENS = 4096;
export const OPENAI_TEMPERATURE = 0.3;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Agent job retry settings
export const MAX_AGENT_JOB_ATTEMPTS = 3;
export const AGENT_JOB_RETRY_DELAY_MS = 5000;

// Token limits for transcript chunking
export const MAX_TRANSCRIPT_CHUNK_TOKENS = 8000;

// Teams
export const TEAMS_APP_ID_PLACEHOLDER = '{{TEAMS_APP_ID}}';
export const SUPPORTED_MEETING_TYPES = [
  'one_on_one',
  'team',
  'all_hands',
  'interview',
  'standup',
  'retrospective',
  'other',
] as const;

// HTTP status codes (semantic aliases)
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
