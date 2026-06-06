// =============================================================================
// agents/src/plugins/MeetingPlugin.ts
// Semantic Kernel plugin exposing meeting knowledge functions to the kernel
// These are invokable by planner and chat agents
// =============================================================================

import { KernelFunction, kernel_function } from '@semantic-kernel/core';

export class MeetingPlugin {
  /**
   * Summarise a meeting transcript into structured points.
   */
  @kernel_function({
    description: 'Summarise a meeting transcript into headline, key points, and next steps',
    name: 'SummariseMeeting',
  })
  async summariseMeeting(
    @kernel_function.parameter({ description: 'The full meeting transcript text', name: 'transcript' })
    transcript: string,

    @kernel_function.parameter({ description: 'The meeting title', name: 'title' })
    title: string,
  ): Promise<string> {
    // The actual LLM call is handled by SK's semantic function via prompt template.
    // This stub is replaced by a semantic function definition loaded from prompts/
    return JSON.stringify({ headline: '', keyPoints: [], nextSteps: [] });
  }

  /**
   * Extract action items from a transcript.
   */
  @kernel_function({
    description: 'Extract action items with assignees and due dates from a meeting transcript',
    name: 'ExtractActionItems',
  })
  async extractActionItems(
    @kernel_function.parameter({ description: 'The meeting transcript', name: 'transcript' })
    transcript: string,
  ): Promise<string> {
    return JSON.stringify({ actionItems: [] });
  }

  /**
   * Generate a pre-meeting briefing from calendar context.
   */
  @kernel_function({
    description: 'Generate a focused pre-meeting brief based on agenda and past meetings',
    name: 'GeneratePreMeetingBrief',
  })
  async generatePreMeetingBrief(
    @kernel_function.parameter({ description: 'The meeting agenda text', name: 'agenda' })
    agenda: string,

    @kernel_function.parameter({ description: 'Context from related past meetings', name: 'pastContext' })
    pastContext: string,
  ): Promise<string> {
    return JSON.stringify({ brief: '', suggestedQuestions: [], risksToDiscuss: [] });
  }
}
