// =============================================================================
// server/src/routes/search.ts
// Natural-language + semantic search over meeting knowledge base
// =============================================================================

import { Router } from 'express';
import { z } from 'zod';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { config } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { SearchResult, SearchResponse } from '@meetmind/shared';

export const searchRouter = Router();

function getSearchClient(): SearchClient<Record<string, unknown>> {
  return new SearchClient(
    config.search.endpoint,
    config.search.indexName,
    new AzureKeyCredential(config.search.adminKey)
  );
}

// POST /api/v1/search
searchRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    query: z.string().min(1).max(500),
    top: z.number().min(1).max(50).default(10),
    skip: z.number().min(0).default(0),
    hybridSearch: z.boolean().default(true),
    filters: z.object({
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      meetingType: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }).optional(),
  });

  const body = schema.parse(req.body);
  const tenantId = req.user!.tid;
  const startMs = Date.now();

  const searchClient = getSearchClient();

  // Build OData filter
  const filters: string[] = [`tenantId eq '${tenantId}'`];
  if (body.filters?.dateFrom) filters.push(`startTime ge ${body.filters.dateFrom}`);
  if (body.filters?.dateTo) filters.push(`startTime le ${body.filters.dateTo}`);
  if (body.filters?.meetingType?.length) {
    const types = body.filters.meetingType.map((t) => `meetingType eq '${t}'`).join(' or ');
    filters.push(`(${types})`);
  }

  const searchResults = await searchClient.search(body.query, {
    filter: filters.join(' and '),
    top: body.top,
    skip: body.skip,
    select: ['id', 'title', 'summaryText', 'participantNames', 'tags', 'meetingType', 'startTime'],
    highlightFields: 'fullTranscript,summaryText',
    queryType: 'semantic',
    semanticSearchOptions: {
      configurationName: 'meetmind-semantic-config',
      answers: { answerType: 'extractive', count: 3 },
      captions: { captionType: 'extractive' },
    },
  });

  const results: SearchResult[] = [];
  for await (const result of searchResults.results) {
    const doc = result.document as Record<string, unknown>;
    const resItem: SearchResult = {
      meetingId: doc['id'] as string,
      title: doc['title'] as string,
      snippet: (result as { captions?: Array<{ text?: string }> }).captions?.[0]?.text ?? (doc['summaryText'] as string ?? '').slice(0, 200),
      score: result.score ?? 0,
      meetingDate: doc['startTime'] as string,
      participants: (doc['participantNames'] as string[] | undefined) ?? [],
      tags: (doc['tags'] as string[] | undefined) ?? [],
      type: doc['meetingType'] as string ?? 'other',
    };
    const reranker = (result as { rerankerScore?: number }).rerankerScore;
    if (reranker !== undefined) resItem.rerankerScore = reranker;
    if (result.highlights) resItem.highlights = result.highlights as Record<string, string[]>;
    
    results.push(resItem);
  }

  const response: SearchResponse = {
    results,
    total: results.length,
    durationMs: Date.now() - startMs,
  };

  res.json(response);
});

// GET /api/v1/search?q=... (quick keyword search)
searchRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const q = z.string().min(1).max(500).parse(req.query['q']);
  req.body = { query: q };
  // Reuse POST handler logic by delegating
  return searchRouter(req, res, () => {});
});
