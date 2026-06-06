// =============================================================================
// client/src/api/plannerApi.ts
// Typed wrappers around the /planner endpoints
// =============================================================================

import { apiClient } from './apiClient';
import type { PlannerSyncResult } from '@meetmind/shared';

export const plannerApi = {
  syncMeeting: async (meetingId: string): Promise<PlannerSyncResult> => {
    const { data } = await apiClient.post<PlannerSyncResult>(`/planner/sync/${meetingId}`);
    return data;
  },

  getPlans: async (): Promise<unknown> => {
    const { data } = await apiClient.get('/planner/plans');
    return data;
  },
};
