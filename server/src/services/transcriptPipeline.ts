// =============================================================================
// server/src/services/transcriptPipeline.ts
// Pipeline for fetching and processing live meeting transcripts
// =============================================================================


import { TaggerService, TaggedSegment } from './tagger.js';
import { MeetingRepository } from '../db/repositories.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class TranscriptPipeline {
  private static pollingIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Starts polling Graph API for new transcript segments.
   */
  static startTranscriptCapture(meetingId: string, tenantId: string, teamsCallId: string) {
    if (this.pollingIntervals.has(meetingId)) {
      logger.warn(`Transcript polling already active for meeting ${meetingId}`);
      return;
    }

    logger.info(`Starting transcript capture for meeting ${meetingId} (Call: ${teamsCallId})`);

    const pollInterval = setInterval(async () => {
      try {
        // In a real app, we'd hit /communications/calls/${teamsCallId}/transcripts
        // and fetch the delta using Graph API.
        // For local development, we simulate incoming data.
        
        const mockSegment: TaggedSegment = {
          id: uuidv4(),
          speakerId: 'mock-speaker-id',
          speakerName: 'Alice Smith',
          text: 'I think we should proceed with the new UI changes by next week.',
          startTime: Date.now() / 1000,
          endTime: (Date.now() / 1000) + 5,
          confidence: 0.9,
        };

        // 1. Tag the segment
        const taggedSegment = TaggerService.applyHeuristicTags(mockSegment);

        // 2. Fetch current meeting to append transcript
        const meeting = await MeetingRepository.getById(meetingId, tenantId);
        if (meeting) {
          const currentTranscript = meeting.transcript || [];
          currentTranscript.push(taggedSegment);
          
          // 3. Save to Cosmos DB in real-time
          await MeetingRepository.update(meetingId, tenantId, {
            transcript: currentTranscript
          } as any);
        }
      } catch (err) {
        logger.error(`Error polling transcript for ${meetingId}`, err);
      }
    }, 10000); // Poll every 10 seconds

    this.pollingIntervals.set(meetingId, pollInterval);
  }

  /**
   * Stops polling.
   */
  static stopTranscriptCapture(meetingId: string) {
    const interval = this.pollingIntervals.get(meetingId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(meetingId);
      logger.info(`Stopped transcript capture for meeting ${meetingId}`);
    }
  }
}
