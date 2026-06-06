// =============================================================================
// agents/src/index.ts
// Agents workspace entry point – can be invoked directly for testing pipelines
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { runPostMeetingPipeline } from './pipelines/postMeetingPipeline.js';

// Example: node dist/index.js <meetingId> <tenantId>
const [, , meetingId, tenantId] = process.argv;

if (meetingId && tenantId) {
  console.log(`Running post-meeting pipeline for meeting: ${meetingId}`);
  runPostMeetingPipeline({
    meetingId,
    tenantId,
    jobId: `manual-${Date.now()}`,
    transcriptText: '',   // In real use, fetched from Cosmos
    meetingTitle: 'Manual Test Run',
  }).then((result) => {
    console.log('Pipeline result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }).catch((err) => {
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
} else {
  console.log('MeetMind Agents – Semantic Kernel orchestration layer');
  console.log('Usage: node dist/index.js <meetingId> <tenantId>');
}
