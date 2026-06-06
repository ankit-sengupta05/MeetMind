// =============================================================================
// shared/src/types/planner.ts
// Microsoft Planner integration types
// =============================================================================

export interface PlannerTask {
  id?: string;                         // Set after creation
  planId: string;
  bucketId?: string;
  title: string;
  description?: string;
  assignedToUserId?: string;
  dueDateTime?: string;               // ISO 8601
  priority?: number;                  // 0 (urgent) to 9 (low)
  percentComplete?: number;           // 0-100
  meetingId: string;                  // MeetMind metadata
  actionItemId: string;               // MeetMind metadata
}

export interface PlannerSyncResult {
  meetingId: string;
  createdTasks: string[];             // Planner task IDs
  updatedTasks: string[];
  failedTasks: Array<{ actionItemId: string; error: string }>;
  syncedAt: string;
}

export interface PlannerBucket {
  id: string;
  name: string;
  planId: string;
  orderHint?: string;
}

export interface PlannerPlan {
  id: string;
  title: string;
  groupId: string;
  buckets: PlannerBucket[];
}
