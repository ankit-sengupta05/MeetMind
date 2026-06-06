// =============================================================================
// server/src/services/openai.ts
// Azure OpenAI Service implementation with retry logic and token counting
// =============================================================================

import { AzureOpenAI } from 'openai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { MeetingSummary, ActionItem, Decision } from '@meetmind/shared';

const openaiClient = new AzureOpenAI({
  endpoint: config.openai.endpoint,
  apiKey: config.openai.apiKey,
  apiVersion: config.openai.apiVersion,
});

export interface MeetingAnalysisResult {
  summary: Omit<MeetingSummary, 'generatedAt'>;
  actionItems: Omit<ActionItem, 'id' | 'meetingId' | 'status' | 'createdAt' | 'updatedAt'>[];
  decisions: Omit<Decision, 'id' | 'meetingId' | 'createdAt'>[];
  keyTopics: string[];
}

/**
 * Basic exponential backoff retry wrapper
 */
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        attempt++;
        const delayMs = Math.pow(2, attempt) * 1000;
        logger.warn(`Rate limited (429). Retrying in ${delayMs}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Very basic token counting estimation (4 chars ~= 1 token).
 * Used to avoid exceeding context window.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class OpenAIService {
  /**
   * Analyzes a meeting transcript to extract summary, action items, decisions, and key topics.
   * Uses GPT-4o with a structured JSON output format.
   * @param transcript The raw transcript text
   * @returns Structured MeetingAnalysisResult
   */
  static async analyzeMeetingTranscript(transcript: string): Promise<MeetingAnalysisResult> {
    const maxTokens = 120000; // GPT-4o context window is 128k
    const estimatedTokens = estimateTokens(transcript);
    
    // Truncate if necessary to fit context window
    let safeTranscript = transcript;
    if (estimatedTokens > maxTokens) {
      logger.warn(`Transcript too large (${estimatedTokens} tokens). Truncating to fit context window.`);
      safeTranscript = transcript.slice(0, maxTokens * 4); 
    }

    const systemPrompt = `You are an expert meeting analyst. Your job is to analyze the provided meeting transcript and produce a structured JSON response.
Identify SMART action items with owners and due dates, concrete decisions with their underlying rationale, and a concise executive summary.
Respond ONLY with a JSON object matching this exact shape:
{
  "summary": {
    "headline": "One sentence TL;DR",
    "overview": "2-3 paragraphs of detailed summary",
    "keyPoints": ["bullet point 1", "bullet point 2"],
    "nextSteps": ["step 1", "step 2"],
    "topics": ["topic 1", "topic 2"],
    "sentiment": "positive" | "neutral" | "negative" | "mixed"
  },
  "actionItems": [
    {
      "title": "Action title",
      "description": "Details",
      "assigneeName": "Person name",
      "dueDate": "YYYY-MM-DD",
      "priority": "low" | "medium" | "high" | "urgent"
    }
  ],
  "decisions": [
    {
      "title": "Decision title",
      "description": "What was decided",
      "rationale": "Why it was decided",
      "impact": "Expected impact"
    }
  ],
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;

    const response = await withRetry(() =>
      openaiClient.chat.completions.create({
        model: config.openai.chatDeployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this transcript:\n\n${safeTranscript}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Low temperature for consistent extraction
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    try {
      const parsed = JSON.parse(content) as MeetingAnalysisResult;
      // Map topics from summary to keyTopics if missing from root
      if (!parsed.keyTopics && parsed.summary?.topics) {
        parsed.keyTopics = parsed.summary.topics;
      }
      return parsed;
    } catch (err) {
      logger.error('Failed to parse OpenAI JSON response', { content });
      throw new Error('Failed to parse OpenAI JSON response');
    }
  }

  /**
   * Converts a user's natural language search query into an optimized keyword string
   * for Hybrid Search (combining with semantic vector search).
   * @param naturalLanguageQuery The user's query
   */
  static async generateSearchQuery(naturalLanguageQuery: string): Promise<string> {
    const systemPrompt = `Convert the user's natural language question into a concise, optimized keyword search string for a hybrid search engine. 
Drop filler words. Keep important nouns, names, and verbs.
Output ONLY the optimized query string, nothing else.`;

    const response = await withRetry(() =>
      openaiClient.chat.completions.create({
        model: config.openai.chatDeployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: naturalLanguageQuery }
        ],
        temperature: 0.1,
        max_tokens: 50,
      })
    );

    return response.choices[0]?.message?.content?.trim() ?? naturalLanguageQuery;
  }
}
