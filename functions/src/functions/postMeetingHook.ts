import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';


app.http('postMeetingHook', {
    methods: ['POST'],
    authLevel: 'function',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('[postMeetingHook] HTTP trigger function processed a request.');

        try {
            const body = await request.json() as any;
            
            // Validate incoming webhook payload
            if (!body || !body.meetingId || !body.tenantId) {
                return { status: 400, body: 'Missing meetingId or tenantId' };
            }

            const planId = body.planId || 'default-plan-id'; // Fallback for testing

            // Trigger the Post-Meeting Agent asynchronously
            // We don't await this so the webhook can return 202 Accepted immediately
            
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
            fetch(`${serverUrl}/api/v1/agents/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingId: body.meetingId,
                    type: 'post_meeting_summary'
                })
            }).catch(err => context.log('Agent job enqueue failed', err));

            return { status: 202, body: 'Accepted. Post-meeting agent triggered.' };
        } catch (error: any) {
            context.log(`[postMeetingHook] Error: ${error.message}`);
            return { status: 500, body: 'Internal Server Error' };
        }
    }
});
