// =============================================================================
// functions/src/functions/indexMeeting.ts
// Timer + HTTP triggered function – indexes meeting into Azure Cognitive Search
// Creates/updates the vector embedding for semantic search
// =============================================================================

import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { SearchClient, AzureKeyCredential, SearchIndexClient } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import type { Meeting, SearchIndexDocument } from '@meetmind/shared';
import { COSMOS_CONTAINERS, SEARCH_INDEX_NAME, SEARCH_SEMANTIC_CONFIG } from '@meetmind/shared';

const cosmos = new CosmosClient({
  endpoint: process.env['COSMOS_ENDPOINT']!,
  key: process.env['COSMOS_KEY']!,
});

const openai = new AzureOpenAI({
  endpoint: process.env['AZURE_OPENAI_ENDPOINT']!,
  apiKey: process.env['AZURE_OPENAI_API_KEY']!,
  apiVersion: process.env['AZURE_OPENAI_API_VERSION'] ?? '2024-04-01-preview',
});

const searchIndexClient = new SearchIndexClient(
  process.env['AZURE_SEARCH_ENDPOINT']!,
  new AzureKeyCredential(process.env['AZURE_SEARCH_ADMIN_KEY']!)
);

const searchClient = new SearchClient<SearchIndexDocument>(
  process.env['AZURE_SEARCH_ENDPOINT']!,
  process.env['AZURE_SEARCH_INDEX_NAME'] ?? SEARCH_INDEX_NAME,
  new AzureKeyCredential(process.env['AZURE_SEARCH_ADMIN_KEY']!)
);

// HTTP trigger: POST /api/indexMeeting  body: { meetingId, tenantId }
app.http('indexMeeting', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const body = await req.json() as { meetingId: string; tenantId: string };
    context.log(`Indexing meeting: ${body.meetingId}`);

    try {
      await ensureSearchIndex();
      const doc = await buildIndexDocument(body.meetingId, body.tenantId);
      await searchClient.uploadDocuments([doc]);
      return { status: 200, jsonBody: { indexed: true, id: body.meetingId } };
    } catch (err) {
      context.error('Indexing failed', err);
      return { status: 500, jsonBody: { error: String(err) } };
    }
  },
});

async function buildIndexDocument(meetingId: string, tenantId: string): Promise<SearchIndexDocument> {
  const db = cosmos.database(process.env['COSMOS_DATABASE_NAME'] ?? 'meetmind');
  const { resource: meeting } = await db.container(COSMOS_CONTAINERS.MEETINGS)
    .item(meetingId, tenantId)
    .read<Meeting>();

  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const fullTranscript = (meeting.transcript ?? [])
    .map((s) => `${s.speakerName}: ${s.text}`)
    .join('\n');

  const textToEmbed = [
    meeting.title,
    meeting.summary?.overview ?? '',
    fullTranscript,
  ].join('\n\n').slice(0, 8000); // text-embedding-3-small 8k token limit

  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: process.env['AZURE_OPENAI_EMBEDDING_DEPLOYMENT'] ?? 'text-embedding-3-small',
    input: textToEmbed,
  });

  const vector = embeddingResponse.data[0]?.embedding ?? [];

  const doc: SearchIndexDocument = {
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

  return doc;
}

async function ensureSearchIndex(): Promise<void> {
  try {
    await searchIndexClient.getIndex(SEARCH_INDEX_NAME);
  } catch {
    // Index doesn't exist – create it
    await searchIndexClient.createIndex({
      name: SEARCH_INDEX_NAME,
      fields: [
        { name: 'id', type: 'Edm.String', key: true, filterable: true },
        { name: 'tenantId', type: 'Edm.String', filterable: true },
        { name: 'title', type: 'Edm.String', searchable: true,  },
        { name: 'description', type: 'Edm.String', searchable: true,  },
        { name: 'fullTranscript', type: 'Edm.String', searchable: true,  },
        { name: 'summaryText', type: 'Edm.String', searchable: true,  },
        { name: 'decisions', type: 'Collection(Edm.String)', searchable: true },
        { name: 'actionItemTitles', type: 'Collection(Edm.String)', searchable: true },
        { name: 'participantNames', type: 'Collection(Edm.String)', searchable: true, filterable: true },
        { name: 'participantEmails', type: 'Collection(Edm.String)', filterable: true },
        { name: 'tags', type: 'Collection(Edm.String)', filterable: true, facetable: true },
        { name: 'meetingType', type: 'Edm.String', filterable: true, facetable: true },
        { name: 'startTime', type: 'Edm.DateTimeOffset', sortable: true, filterable: true },
        {
          name: 'contentVector',
          type: 'Collection(Edm.Single)',
          searchable: true,
          vectorSearchDimensions: 1536,
          vectorSearchProfileName: 'meetmind-vector-profile',
        },
      ],
      vectorSearch: {
        profiles: [{ name: 'meetmind-vector-profile', algorithmConfigurationName: 'hnsw-config' }],
        algorithms: [{ name: 'hnsw-config', kind: 'hnsw', parameters: { m: 4, efConstruction: 400, efSearch: 500, metric: 'cosine' } }],
      },
      semanticSearch: {
        configurations: [{
          name: SEARCH_SEMANTIC_CONFIG,
          prioritizedFields: {
            titleField: { name: 'title' },
            contentFields: [{ name: 'summaryText' }, { name: 'fullTranscript' }],
            keywordsFields: [{ name: 'decisions' }, { name: 'tags' }],
          },
        }],
      },
    });
  }
}
