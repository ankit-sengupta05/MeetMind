// =============================================================================
// agents/src/plugins/SearchPlugin.ts
// Semantic Kernel Plugin for hybrid cognitive search — self-contained.
// Uses Cosmos DB SDK directly (no server/ imports).
// =============================================================================

import { CosmosClient } from '@azure/cosmos';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { agentConfig } from '../config.js';

export interface SearchResultItem {
  meetingId: string;
  title: string;
  summaryText: string;
  score: number;
}

export class SearchPlugin {
  readonly name = 'SearchPlugin';

  private cosmos = new CosmosClient({
    endpoint: agentConfig.cosmos.endpoint,
    key: agentConfig.cosmos.key,
  });

  private searchClient = new SearchClient<any>(
    agentConfig.search.endpoint,
    agentConfig.search.indexName,
    new AzureKeyCredential(agentConfig.search.adminKey)
  );

  /** Search past meetings using keyword search. */
  async searchPastMeetings(query: string, _tenantId: string): Promise<SearchResultItem[]> {
    console.log(`[SearchPlugin] Searching past meetings: "${query}"`);
    try {
      const results = await this.searchClient.search(query, { top: 3 });
      const items: SearchResultItem[] = [];
      for await (const r of results.results) {
        items.push({
          meetingId: (r.document as any).meetingId ?? '',
          title:     (r.document as any).title ?? '',
          summaryText: (r.document as any).summaryText ?? '',
          score: r.score ?? 0,
        });
      }
      return items;
    } catch {
      return [];
    }
  }

  /** Fetch open action items for a specific attendee across all meetings. */
  async getOpenActionItems(assigneeEmail: string, tenantId: string): Promise<any[]> {
    console.log(`[SearchPlugin] Fetching open action items for: ${assigneeEmail}`);
    try {
      const container = this.cosmos
        .database(agentConfig.cosmos.databaseName)
        .container('meetings');

      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.partitionKey = @tenant AND c.status != "completed"',
          parameters: [{ name: '@tenant', value: tenantId }],
        })
        .fetchAll();

      const openItems: any[] = [];
      for (const m of resources) {
        if (Array.isArray(m.actionItems)) {
          for (const ai of m.actionItems as any[]) {
            if (ai.assigneeEmail === assigneeEmail && ai.status !== 'completed') {
              openItems.push({ meetingTitle: m.title, ...ai });
            }
          }
        }
      }
      return openItems;
    } catch {
      return [];
    }
  }
}
