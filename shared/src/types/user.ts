// =============================================================================
// shared/src/types/user.ts
// User and tenant related types
// =============================================================================

export interface UserProfile {
  id: string;               // Azure AD object ID
  tenantId: string;         // Azure AD tenant ID
  displayName: string;
  email: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
  timezone?: string;
  preferredLanguage?: string;
}

export interface UserPreferences {
  userId: string;
  autoSummary: boolean;              // Auto-generate summary after meeting
  autoAssignTasks: boolean;          // Auto-assign Planner tasks
  summaryEmailEnabled: boolean;      // Send email summary after meeting
  digestFrequency: 'daily' | 'weekly' | 'off';
  notificationsEnabled: boolean;
  defaultMeetingType: string;
  updatedAt: string;
}

export interface TenantConfig {
  tenantId: string;
  displayName: string;
  plannerGroupId?: string;           // MS 365 group for Planner
  plannerPlanId?: string;            // Default Planner plan
  searchIndexName?: string;          // Azure Cognitive Search index override
  retentionDays: number;             // How long to keep meeting data
  features: {
    realTimeTranscription: boolean;
    semanticSearch: boolean;
    autoTaskCreation: boolean;
    sentimentAnalysis: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
