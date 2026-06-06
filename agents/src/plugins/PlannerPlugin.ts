// =============================================================================
// agents/src/plugins/PlannerPlugin.ts
// Semantic Kernel Plugin for Microsoft Planner — self-contained.
// =============================================================================

import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { ClientSecretCredential } from '@azure/identity';
import { agentConfig } from '../config.js';

export interface ActionItemInput {
  id: string;
  title: string;
  assigneeName?: string;
  assigneeEmail?: string;
  dueDate?: string;
  priority?: string;
}

export class PlannerPlugin {
  readonly name = 'PlannerPlugin';

  // @ts-ignore
  private getGraphClient(): Client {
    const cred = new ClientSecretCredential(
      agentConfig.graph.tenantId,
      agentConfig.graph.clientId,
      agentConfig.graph.clientSecret
    );
    const auth = new TokenCredentialAuthenticationProvider(cred, {
      scopes: ['https://graph.microsoft.com/.default'],
    });
    return Client.initWithMiddleware({ authProvider: auth });
  }

  /** Creates a Planner task and returns the task ID. */
  async syncTask(item: ActionItemInput, planId: string, bucketId?: string): Promise<string> {
    console.log(`[PlannerPlugin] Syncing task: "${item.title}" to plan ${planId}`);

    const taskBody: any = {
      planId,
      title: item.title,
      dueDateTime: item.dueDate ?? null,
    };
    if (bucketId) taskBody.bucketId = bucketId;

    // In production:
    // const client = this.getGraphClient();
    // const task = await client.api('/planner/tasks').post(taskBody);
    // return task.id;

    const mockId = `mock-planner-task-${Date.now()}`;
    console.log(`[PlannerPlugin] (dev) Would create Planner task → ${mockId}`);
    return mockId;
  }
}
