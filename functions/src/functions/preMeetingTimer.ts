import { app, InvocationContext, Timer } from '@azure/functions';

app.timer('preMeetingTimer', {
    schedule: '0 */5 * * * *',
    handler: async (myTimer: Timer, context: InvocationContext) => {
        context.log('Pre-meeting agent stub triggered');
    }
});
