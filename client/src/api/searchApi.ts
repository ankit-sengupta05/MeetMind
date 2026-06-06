// =============================================================================
// client/src/api/searchApi.ts
// Typed wrappers around the /search endpoints
// =============================================================================

import { apiClient } from './apiClient';
import type { SearchQuery, SearchResponse } from '@meetmind/shared';

export const searchApi = {
  search: async (query: SearchQuery): Promise<SearchResponse> => {
    const { data } = await apiClient.post<SearchResponse>('/search', query);
    return data;
  },
};
