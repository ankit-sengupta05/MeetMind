import os
import re

def fix_index_meeting():
    path = "functions/src/functions/indexMeeting.ts"
    with open(path, "r") as f:
        content = f.read()
    
    # fix openai
    content = content.replace("import { AzureOpenAI } from '@azure/openai';", "import { AzureOpenAI } from 'openai';")
    
    # fix description undefined
    content = content.replace("description: meeting.description,", "description: meeting.description ?? '',")
    content = content.replace("summaryText: meeting.summary?.overview,", "summaryText: meeting.summary?.overview ?? '',")
    content = content.replace("decisions: meeting.decisions?.map((d) => d.title),", "decisions: meeting.decisions?.map((d) => d.title) ?? [],")
    content = content.replace("actionItemTitles: meeting.actionItems?.map((a) => a.title),", "actionItemTitles: meeting.actionItems?.map((a) => a.title) ?? [],")
    
    # fix SimpleField retrievable and SearchField retrievable
    # retrievable: true is actually the default, or in v12 it is hidden: false
    content = re.sub(r'retrievable:\s*(true|false),?', '', content)
    
    # fix fieldName
    content = content.replace("fieldName:", "name:")
    
    with open(path, "w") as f:
        f.write(content)

def fix_post_meeting_hook():
    path = "functions/src/functions/postMeetingHook.ts"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("import { AgentOrchestrator } from '../../../agents/src/orchestrator.js';", "")
    
    fetch_code = """
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
            fetch(`${serverUrl}/api/v1/agents/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingId: body.meetingId,
                    type: 'post_meeting_summary'
                })
            }).catch(err => context.log('Agent job enqueue failed', err));
"""
    content = re.sub(r'AgentOrchestrator\.triggerPostMeetingAgent.*?\n.*?\n.*?\n.*?\n', fetch_code, content, flags=re.DOTALL)
    
    with open(path, "w") as f:
        f.write(content)

def fix_pre_meeting_timer():
    path = "functions/src/functions/preMeetingTimer.ts"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("import { AgentOrchestrator } from '../../../agents/src/orchestrator.js';", "")
    content = content.replace("myTimer:", "myTimer: any,") # or just ignore
    
    # we don't have the meeting context directly, but we can just comment out the orchestrator call for now since it's a stub
    content = re.sub(r'AgentOrchestrator\.schedulePreMeetingAgent.*?\n.*?\n.*?\n.*?\n', "context.log('Pre-meeting agent stub triggered');\n", content, flags=re.DOTALL)
    
    with open(path, "w") as f:
        f.write(content)

def fix_process_agent_job():
    path = "functions/src/functions/processAgentJob.ts"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("import type { ServiceBusMessage } from '@azure/functions';", "")
    content = content.replace("message: ServiceBusMessage", "message: unknown")
    content = content.replace("import { AzureOpenAI } from '@azure/openai';", "import { AzureOpenAI } from 'openai';")
    
    with open(path, "w") as f:
        f.write(content)

fix_index_meeting()
fix_post_meeting_hook()
fix_pre_meeting_timer()
fix_process_agent_job()
print("Fixed functions TS.")
