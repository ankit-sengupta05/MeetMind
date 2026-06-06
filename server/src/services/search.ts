// =============================================================================
// server/src/services/search.ts
// Azure Cognitive Search Service for Hybrid & Semantic Search
// =============================================================================

import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Meeting } from '@meetmind/shared';
import { OpenAIService } from './openai.js';

const searchClient = new SearchClient(
  config.search.endpoint,
  config.search.indexName,
  new AzureKeyCredential(config.search.adminKey)
);

const openaiClient = new AzureOpenAI({
  endpoint: config.openai.endpoint,
  apiKey: config.openai.apiKey,
  apiVersion: config.openai.apiVersion,
});

export interface SearchResultItem {
  meetingId: string;
  title: string;
  summaryText: string;
  score: number;
  semanticScore?: number;
}

export class CognitiveSearchService {
  /**
   * Generates a vector embedding using the configured embedding model (e.g., text-embedding-ada-002)
   */
  private static async getEmbedding(text: string): Promise<number[]> {
    // text-embedding-ada-002 or text-embedding-3-small
    const response = await openaiClient.embeddings.create({
      model: config.openai.embeddingDeployment,
      input: text,
    });
    return response.data[0]?.embedding ?? [];
  }

  /**
   * Indexes a meeting into the vector store.
   * @param meeting The meeting record to index
   */
  static async indexMeeting(meeting: Meeting): Promise<void> {
    const fullTranscript = (meeting.transcript ?? [])
      .map((s) => `${s.speakerName}: ${s.text}`)
      .join('\n');

    const textToEmbed = [
      meeting.title,
      meeting.summary?.overview ?? '',
      fullTranscript,
    ].join('\n\n').slice(0, 8000); // Token limits for embeddings

    const vector = await this.getEmbedding(textToEmbed);

    const doc = {
      id: meeting.id,
      tenantId: meeting.partitionKey,
      title: meeting.title,
      description: meeting.description ?? '',
      fullTranscript,
      summaryText: meeting.summary?.overview ?? '',
      decisions: meeting.decisions?.map((d) => d.title) ?? [],
      actionItemTitles: meeting.actionItems?.map((a) => a.title) ?? [],
      participantNames: meeting.participants.map((p) => p.displayName),
      participantEmails: meeting.participants.map((p) => p.email),
      tags: meeting.tags ?? [],
      meetingType: meeting.type,
      startTime: meeting.startTime,
      contentVector: vector,
    };

    await searchClient.uploadDocuments([doc]);
    logger.info(`Indexed meeting ${meeting.id} to Cognitive Search`);
  }

  /**
   * Performs a semantic hybrid search across meetings.
   * @param naturalLanguageQuery The natural language query from the user
   * @param tenantId The partition key / tenant to scope the search to
   * @param topK Number of top results to return
   */
  static async semanticSearch(naturalLanguageQuery: string, tenantId: string, topK: number = 5): Promise<SearchResultItem[]> {
    // 1. Convert natural language to optimized keywords
    const keywordQuery = await OpenAIService.generateSearchQuery(naturalLanguageQuery);
    
    // 2. Get vector embedding for the natural language query
    const queryVector = await this.getEmbedding(naturalLanguageQuery);

    // 3. Execute hybrid semantic search
    const searchResults = await searchClient.search(keywordQuery, {
      top: topK,
      filter: `tenantId eq '${tenantId}'`,
      vectorSearchOptions: {
        queries: [
          {
            kind: 'vector',
            vector: queryVector,
            kNearestNeighborsCount: topK,
            fields: ['contentVector'],
          }
        ]
      },
      semanticSearchOptions: {
        configurationName: 'default',
        captions: {
          captionType: 'extractive',
        },
        answers: {
          answerType: 'extractive',
          count: 1,
        }
      },
      queryType: 'semantic'
    });

    const results: SearchResultItem[] = [];
    for await (const result of searchResults.results) {
      results.push({
        meetingId: (result.document as Record<string, unknown>).id as string,
        title: (result.document as Record<string, unknown>).title as string,
        summaryText: (result.document as Record<string, unknown>).summaryText as string,
        score: result.score,
        semanticScore: (result as any).semanticSearch?.rerankerScore,
      });
    }

    return results;
  }
}
