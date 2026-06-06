// =============================================================================
// agents/src/kernel/buildKernel.ts
// Semantic Kernel instance factory with Azure OpenAI services configured
// =============================================================================

import { Kernel, OpenAIChatCompletion } from '@semantic-kernel/core';
import type { SkKernelConfig } from '@meetmind/shared';

/**
 * Creates a configured Semantic Kernel instance.
 * Call once per pipeline run (kernels are lightweight).
 */
export function buildKernel(config: SkKernelConfig): Kernel {
  const kernel = new Kernel();

  kernel.addService(
    new OpenAIChatCompletion(
      config.chatDeploymentName,
      {
        endpoint: config.azureOpenAiEndpoint,
        apiKey: config.azureOpenAiApiKey,
        apiVersion: '2024-04-01-preview',
      }
    )
  );

  return kernel;
}

export function kernelConfigFromEnv(): SkKernelConfig {
  return {
    azureOpenAiEndpoint: process.env['AZURE_OPENAI_ENDPOINT']!,
    azureOpenAiApiKey: process.env['AZURE_OPENAI_API_KEY']!,
    chatDeploymentName: process.env['AZURE_OPENAI_CHAT_DEPLOYMENT'] ?? 'gpt-4o',
    embeddingDeploymentName: process.env['AZURE_OPENAI_EMBEDDING_DEPLOYMENT'] ?? 'text-embedding-3-small',
    maxTokens: Number(process.env['OPENAI_MAX_TOKENS'] ?? 4096),
    temperature: Number(process.env['OPENAI_TEMPERATURE'] ?? 0.3),
  };
}
