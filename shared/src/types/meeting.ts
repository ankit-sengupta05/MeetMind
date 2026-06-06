// =============================================================================
// shared/src/types/meeting.ts
// Core meeting domain types used across client, server, functions, and agents
// =============================================================================

export type MeetingStatus = 'scheduled' | 'in_progress' | 'processing' | 'completed' | 'failed';
export type MeetingType = 'one_on_one' | 'team' | 'all_hands' | 'interview' | 'standup' | 'retrospective' | 'other';

export interface MeetingParticipant {
  id: string;
  displayName: string;
  email: string;
  role: 'organizer' | 'required' | 'optional';
  joinedAt?: string;   // ISO 8601
  leftAt?: string;     // ISO 8601
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startTime: number;    // seconds from meeting start
  endTime: number;      // seconds from meeting start
  confidence: number;   // 0-1
  language?: string;
  tags?: SegmentTag[];
}

export type SegmentTagType = 'decision' | 'action_item' | 'risk' | 'blocker' | 'question' | 'key_point';

export interface SegmentTag {
  type: SegmentTagType;
  label: string;
  confidence: number;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  dueDate?: string;     // ISO 8601
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  plannerTaskId?: string;   // Microsoft Planner task ID
  plannerBucketId?: string;
  sourceSegmentId?: string; // Which transcript segment generated this
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  decidedBy?: string[];      // participant IDs
  rationale?: string;
  impact?: string;
  sourceSegmentId?: string;
  createdAt: string;
}

export interface MeetingSummary {
  headline: string;           // 1-sentence TL;DR
  overview: string;           // 2-3 paragraphs
  keyPoints: string[];        // Bullet list of key points
  decisions: string[];        // High-level decisions
  nextSteps: string[];        // Follow-up actions
  topics: string[];           // Topics covered
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  generatedAt: string;
}

export interface MeetingMetadata {
  teamsThreadId?: string;
  teamId?: string;
  channelId?: string;
  onlineMeetingId?: string;
  calendarEventId?: string;
  recordingUrl?: string;
  transcriptionJobId?: string;
}

export interface Meeting {
  id: string;                               // Cosmos DB document id
  partitionKey: string;                     // tenant id (for multi-tenant isolation)
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  startTime: string;                        // ISO 8601
  endTime?: string;                         // ISO 8601
  durationSeconds?: number;
  organizer: MeetingParticipant;
  participants: MeetingParticipant[];
  transcript?: TranscriptSegment[];
  summary?: MeetingSummary;
  actionItems?: ActionItem[];
  decisions?: Decision[];
  tags?: string[];
  metadata?: MeetingMetadata;
  vectorEmbeddingId?: string;               // Azure Cognitive Search document id
  createdAt: string;
  updatedAt: string;
  _ts?: number;                             // Cosmos DB timestamp
}

export type CreateMeetingDto = Pick<Meeting, 'title' | 'type' | 'startTime' | 'organizer'> & {
  description?: string;
  participants?: MeetingParticipant[];
  metadata?: MeetingMetadata;
};

export type UpdateMeetingDto = Partial<
  Pick<Meeting, 'title' | 'description' | 'status' | 'endTime' | 'durationSeconds' | 'tags'>
>;

export interface PaginatedMeetings {
  items: Meeting[];
  total: number;
  page: number;
  pageSize: number;
  continuationToken?: string;
}
