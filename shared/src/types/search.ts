// =============================================================================
// shared/src/types/search.ts
// Azure Cognitive Search (vector + keyword) types
// =============================================================================

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  top?: number;                        // Max results (default 10)
  skip?: number;                       // Pagination offset
  semanticConfig?: string;             // Semantic ranking config name
  hybridSearch?: boolean;              // Combine vector + keyword
  minScore?: number;                   // Minimum relevance score
}

export interface SearchFilters {
  tenantId?: string;
  dateFrom?: string;                   // ISO 8601
  dateTo?: string;                     // ISO 8601
  participants?: string[];             // participant IDs or emails
  meetingType?: string[];
  tags?: string[];
  hasActionItems?: boolean;
  hasDecisions?: boolean;
}

export interface SearchResult {
  meetingId: string;
  title: string;
  snippet: string;                     // Highlighted excerpt
  score: number;                       // Relevance score
  rerankerScore?: number;              // Semantic re-ranker score
  highlights?: Record<string, string[]>;
  meetingDate: string;
  participants: string[];
  tags: string[];
  type: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  semanticAnswers?: SemanticAnswer[];
  facets?: SearchFacets;
  durationMs: number;
}

export interface SemanticAnswer {
  text: string;
  highlights: string;
  score: number;
  key: string;
}

export interface SearchFacets {
  meetingType?: Array<{ value: string; count: number }>;
  tags?: Array<{ value: string; count: number }>;
  participants?: Array<{ value: string; count: number }>;
}

export interface SearchIndexDocument {
  id: string;                          // meetingId
  tenantId: string;
  title: string;
  description?: string;
  fullTranscript?: string;             // Concatenated transcript text
  summaryText?: string;
  decisions?: string[];
  actionItemTitles?: string[];
  participantNames?: string[];
  participantEmails?: string[];
  tags?: string[];
  meetingType?: string;
  startTime: string;
  contentVector?: number[];            // 1536-dim embedding (text-embedding-3-small)
}
