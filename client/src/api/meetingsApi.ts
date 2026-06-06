// =============================================================================
// client/src/api/meetingsApi.ts
// Typed wrappers around the /meetings REST endpoints
// =============================================================================

import { apiClient } from './apiClient';
import type { Meeting, CreateMeetingDto, PaginatedMeetings, UpdateMeetingDto } from '@meetmind/shared';

interface ListParams {
  page?: number;
  pageSize?: number;
}

export const meetingsApi = {
  list: async (params: ListParams = {}): Promise<PaginatedMeetings> => {
    const { data } = await apiClient.get<PaginatedMeetings>('/meetings', { params });
    return data;
  },

  getById: async (id: string): Promise<Meeting> => {
    const { data } = await apiClient.get<Meeting>(`/meetings/${id}`);
    return data;
  },

  create: async (dto: CreateMeetingDto): Promise<Meeting> => {
    const { data } = await apiClient.post<Meeting>('/meetings', dto);
    return data;
  },

  update: async (id: string, dto: UpdateMeetingDto): Promise<Meeting> => {
    const { data } = await apiClient.patch<Meeting>(`/meetings/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`);
  },

  uploadTranscript: async (id: string, segments: unknown[]): Promise<Meeting> => {
    const { data } = await apiClient.post<Meeting>(`/meetings/${id}/transcript`, { segments });
    return data;
  },
};
