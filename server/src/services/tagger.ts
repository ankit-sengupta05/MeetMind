// =============================================================================
// server/src/services/tagger.ts
// Real-time tagging engine for transcripts
// =============================================================================

import { AzureOpenAI } from 'openai';
import { config } from '../config/env.js';
import { TranscriptSegment, SegmentTag } from '@meetmind/shared';
import { logger } from '../utils/logger.js';

export interface TaggedSegment extends Omit<TranscriptSegment, 'tags'> {
  tags?: SegmentTag[];
}

export class TaggerService {
  private static openai = new AzureOpenAI({
    endpoint: config.openai.endpoint,
    apiKey: config.openai.apiKey,
    apiVersion: config.openai.apiVersion,
  });

  private static actionPatterns = [/will do/i, /I'll handle/i, /assigned to/i, /by (monday|tuesday|wednesday|thursday|friday)/i];
  private static decisionPatterns = [/we've decided/i, /going with/i, /confirmed/i, /agreed/i];
  private static blockerPatterns = [/blocked by/i, /waiting on/i, /cannot proceed/i];

  /**
   * Fast pattern matching layer that runs on every segment.
   */
  static applyHeuristicTags(segment: TranscriptSegment): TaggedSegment {
    const text = segment.text;
    const tags: SegmentTag[] = [];

    if (this.actionPatterns.some(p => p.test(text))) tags.push({ type: 'action_item', label: 'Action Item', confidence: 0.8 });
    if (this.decisionPatterns.some(p => p.test(text))) tags.push({ type: 'decision', label: 'Decision', confidence: 0.8 });
    if (this.blockerPatterns.some(p => p.test(text))) tags.push({ type: 'blocker', label: 'Blocker', confidence: 0.8 });

    const result: TaggedSegment = { ...segment };
    if (tags.length > 0) result.tags = tags;
    return result;
  }

  /**
   * GPT-4o layer for highly accurate batch analysis of buffered segments.
   */
  static async applyGptTags(segments: TranscriptSegment[]): Promise<TaggedSegment[]> {
    if (segments.length === 0) return [];

    const prompt = `Analyze these transcript segments and extract semantic tags (action_item, decision, blocker, key_point).
    
    Format the output as JSON: { "tagged_segments": [ { "id": "segment_id", "tags": [ { "type": "...", "label": "..." } ] } ] }
    
    Segments:
    ${JSON.stringify(segments.map(s => ({ id: s.id, text: s.text, speaker: s.speakerName })))}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.chatDeployment,
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{"tagged_segments":[]}');
      const tagMap = new Map<string, any[]>();
      parsed.tagged_segments.forEach((t: any) => tagMap.set(t.id, t.tags));

      return segments.map(s => {
      const res = {
                ...s,
      };
      const newTags = tagMap.get(s.id || '') || s.tags;
      if (newTags) (res as TaggedSegment).tags = newTags;
      return res as TaggedSegment;
        
      });
    } catch (err) {
      logger.error('GPT Tagger failed', err);
      return segments; // Fallback to original
    }
  }

  private static buffer: TranscriptSegment[] = [];

  /**
   * Buffers segments and triggers batch analysis every 60s
   */
  static bufferSegment(segment: TranscriptSegment) {
    this.buffer.push(segment);
    // In a real pipeline, a background worker would drain this buffer
    // and update Cosmos DB asynchronously.
  }
}
