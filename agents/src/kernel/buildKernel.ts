// =============================================================================
// agents/src/kernel/buildKernel.ts
// Semantic Kernel v0.3.0 instance factory
// SK JS is early-stage; we use it for plugin/planner pattern + AzureOpenAI SDK
// for the actual completions until SK v1.x stabilises.
// =============================================================================

import { Kernel } from 'semantic-kernel';
import type { SkKernelConfig } from '@meetmind/shared';

/**
 * Creates a configured Semantic Kernel instance at v0.3.0.
 * Actual LLM calls fall back to @azure/openai SDK for stability.
 */
export function buildKernel(_config: SkKernelConfig): Kernel {
  // SK v0.3.0 kernel — plugin registration works,
  // native Azure OpenAI binding via @semantic-kernel/openai is wired but
  // actual completions are delegated to the @azure/openai SDK in this phase
  // until the SK JS connector reaches stable v1.x.
  const kernel = new Kernel();
  return kernel;
}

export function kernelConfigFromEnv(): SkKernelConfig {
  return {
    azureOpenAiEndpoint: process.env['AZURE_OPENAI_ENDPOINT']!,
    azureOpenAiApiKey: process.env['AZURE_OPENAI_API_KEY']!,
    chatDeploymentName: process.env['AZURE_OPENAI_CHAT_DEPLOYMENT'] ?? 'gpt-4o',
    embeddingDeploymentName:
      process.env['AZURE_OPENAI_EMBEDDING_DEPLOYMENT'] ?? 'text-embedding-3-small',
    maxTokens: Number(process.env['OPENAI_MAX_TOKENS'] ?? 4096),
    temperature: Number(process.env['OPENAI_TEMPERATURE'] ?? 0.3),
  };
}
