// =============================================================================
// scripts/seedDemoData.ts
// Seeds Cosmos DB with realistic demo meeting records for hackathon demo.
// Run with: npm run seed:demo
// =============================================================================

import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';

const COSMOS_ENDPOINT = process.env['COSMOS_ENDPOINT'] || '';
const COSMOS_KEY = process.env['COSMOS_KEY'] || '';
const COSMOS_DB = process.env['COSMOS_DB_NAME'] || 'meetmind';
const TENANT_ID = 'demo-tenant-001';

const client = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

function makeId() { return uuidv4(); }

// ---------------------------------------------------------------------------
// Demo meeting definitions
// ---------------------------------------------------------------------------
const meetings = [

  // 1. Sprint Retro
  {
    id: makeId(),
    partitionKey: TENANT_ID,
    type: 'retrospective',
    title: 'Sprint 42 Retrospective',
    status: 'completed',
    startTime: daysAgo(3),
    endTime: daysAgo(3),
    participants: [
      { id: 'u1', displayName: 'Priya Sharma',   email: 'priya@demo.com',   role: 'organizer' },
      { id: 'u2', displayName: 'Jake Williams',  email: 'jake@demo.com',    role: 'required'  },
      { id: 'u3', displayName: 'Mei-Lin Zhao',   email: 'mei@demo.com',     role: 'required'  },
      { id: 'u4', displayName: 'Arjun Patel',    email: 'arjun@demo.com',   role: 'required'  },
      { id: 'u5', displayName: 'Sofia Torres',   email: 'sofia@demo.com',   role: 'required'  },
    ],
    summary: {
      headline: 'Sprint 42 delivered 80% of committed stories. Velocity impacted by external API instability.',
      overview: 'The team identified API dependency risks as the top blocker. Three structural process changes were agreed upon to improve predictability in Sprint 43.',
      generatedAt: daysAgo(3),
    },
    decisions: [
      { id: makeId(), title: 'Add API contract tests',        description: 'All third-party API integrations must have contract tests in CI before merge.', createdAt: daysAgo(3), meetingId: '' },
      { id: makeId(), title: 'Cap WIP to 2 items per dev',   description: 'WIP limits enforced in Jira starting Sprint 43 to reduce context switching.', createdAt: daysAgo(3), meetingId: '' },
      { id: makeId(), title: 'Daily dependency check-in',    description: '5-minute async update in Teams channel every morning on external blockers.', createdAt: daysAgo(3), meetingId: '' },
    ],
    actionItems: [
      { id: makeId(), meetingId: '', title: 'Write contract tests for Stripe webhook', assigneeName: 'Jake Williams', assigneeEmail: 'jake@demo.com', dueDate: daysFromNow(4), status: 'in_progress', priority: 'high', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
      { id: makeId(), meetingId: '', title: 'Configure Jira WIP limits for Sprint 43', assigneeName: 'Priya Sharma',  assigneeEmail: 'priya@demo.com', dueDate: daysFromNow(2), status: 'pending',     priority: 'medium', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
      { id: makeId(), meetingId: '', title: 'Set up daily dependency Teams channel',   assigneeName: 'Mei-Lin Zhao',  assigneeEmail: 'mei@demo.com',   dueDate: daysFromNow(1), status: 'completed',  priority: 'low',    createdAt: daysAgo(3), updatedAt: daysAgo(1) },
      { id: makeId(), meetingId: '', title: 'Update team velocity chart in Confluence', assigneeName: 'Sofia Torres',  assigneeEmail: 'sofia@demo.com', dueDate: daysFromNow(5), status: 'pending',    priority: 'low',    createdAt: daysAgo(3), updatedAt: daysAgo(3) },
      { id: makeId(), meetingId: '', title: 'Draft retro findings email for stakeholders', assigneeName: 'Arjun Patel', assigneeEmail: 'arjun@demo.com', dueDate: daysFromNow(3), status: 'pending',  priority: 'medium', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
      { id: makeId(), meetingId: '', title: 'Identify backup vendor for payments API',   assigneeName: 'Jake Williams', assigneeEmail: 'jake@demo.com', dueDate: daysFromNow(7), status: 'pending',  priority: 'high',   createdAt: daysAgo(3), updatedAt: daysAgo(3) },
      { id: makeId(), meetingId: '', title: 'Run load test on search service',           assigneeName: 'Mei-Lin Zhao',  assigneeEmail: 'mei@demo.com',  dueDate: daysFromNow(6), status: 'pending',  priority: 'high',   createdAt: daysAgo(3), updatedAt: daysAgo(3) },
    ],
    transcript: [
      { id: makeId(), speakerName: 'Priya Sharma',  text: "Let's start with what went well. I think the auth feature ship was smooth.", startTime: 0,   endTime: 8,   tags: [{ type: 'key_point' }] },
      { id: makeId(), speakerName: 'Jake Williams', text: "Agreed. The payments integration was rough though—the Stripe webhook kept timing out.", startTime: 9,   endTime: 18,  tags: [{ type: 'blocker'   }] },
      { id: makeId(), speakerName: 'Mei-Lin Zhao',  text: "I'll handle writing the contract tests for the Stripe webhook, I can get that done by Thursday.", startTime: 19, endTime: 29,  tags: [{ type: 'action_item' }] },
      { id: makeId(), speakerName: 'Priya Sharma',  text: "We've decided: all external API integrations need contract tests in CI before merge. Agreed?", startTime: 30, endTime: 41, tags: [{ type: 'decision' }] },
      { id: makeId(), speakerName: 'All',           text: "Agreed.", startTime: 42, endTime: 43, tags: [] },
    ],
    tags: ['sprint', 'retro', 'api', 'velocity'],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // 2. Product Roadmap + Pricing
  {
    id: makeId(),
    partitionKey: TENANT_ID,
    type: 'team',
    title: 'Q3 Product Roadmap & Pricing Strategy',
    status: 'completed',
    startTime: daysAgo(8),
    endTime: daysAgo(8),
    participants: [
      { id: 'u6', displayName: 'Natasha Rivers',  email: 'natasha@demo.com', role: 'organizer' },
      { id: 'u7', displayName: 'David Chen',      email: 'david@demo.com',   role: 'required' },
      { id: 'u1', displayName: 'Priya Sharma',    email: 'priya@demo.com',   role: 'required' },
    ],
    summary: {
      headline: 'Q3 will ship three major features: semantic search, Planner sync, and the Teams Bot. Pricing set to $29/user/month for Pro tier.',
      overview: 'The team aligned on a tiered pricing model. Seat-based Pro at $29/month was selected over consumption-based after analyzing competitor benchmarks. Feature prioritization is finalized.',
      generatedAt: daysAgo(8),
    },
    decisions: [
      { id: makeId(), title: 'Q3 pricing set to $29/user/month',   description: 'Pro tier seat-based pricing. Free tier limited to 5 meetings/month.', createdAt: daysAgo(8), meetingId: '' },
      { id: makeId(), title: 'Semantic Search is Q3 anchor feature', description: 'MeetMind Search is the hero feature for the Q3 launch announcement.', createdAt: daysAgo(8), meetingId: '' },
    ],
    actionItems: [
      { id: makeId(), meetingId: '', title: 'Create pricing page mockups',        assigneeName: 'David Chen',   assigneeEmail: 'david@demo.com',   dueDate: daysFromNow(5), status: 'in_progress', priority: 'high',   createdAt: daysAgo(8), updatedAt: daysAgo(8) },
      { id: makeId(), meetingId: '', title: 'Draft Q3 launch announcement email', assigneeName: 'Natasha Rivers', assigneeEmail: 'natasha@demo.com', dueDate: daysFromNow(10), status: 'pending',  priority: 'medium', createdAt: daysAgo(8), updatedAt: daysAgo(8) },
    ],
    transcript: [
      { id: makeId(), speakerName: 'Natasha Rivers', text: "Let's lock in the Q3 pricing. David, what did the competitive analysis show?",                               startTime: 0,  endTime: 8,  tags: [] },
      { id: makeId(), speakerName: 'David Chen',     text: "Fireflies is at $19, Otter Pro is $20. If we include Planner sync and the Teams Bot, $29 is justified.",      startTime: 9,  endTime: 20, tags: [{ type: 'key_point' }] },
      { id: makeId(), speakerName: 'Natasha Rivers', text: "Going with $29/user/month for the Pro tier. That's confirmed. Free tier is 5 meetings per month.",             startTime: 21, endTime: 30, tags: [{ type: 'decision' }] },
      { id: makeId(), speakerName: 'Priya Sharma',   text: "I'll own the pricing page mockups. Can get the first draft done by end of this week.",                         startTime: 31, endTime: 40, tags: [{ type: 'action_item' }] },
    ],
    tags: ['pricing', 'roadmap', 'q3', 'strategy'],
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },

  // 3. Customer Escalation
  {
    id: makeId(),
    partitionKey: TENANT_ID,
    type: 'one_on_one',
    title: 'Contoso Customer Escalation — Data Sync Issue',
    status: 'completed',
    startTime: daysAgo(5),
    endTime: daysAgo(5),
    participants: [
      { id: 'u8', displayName: 'Liam O\'Brien',  email: 'liam@demo.com',  role: 'organizer' },
      { id: 'u9', displayName: 'Rachel Kim',     email: 'rachel@demo.com', role: 'required' },
    ],
    summary: {
      headline: 'Contoso reported data sync delays exceeding 30 minutes. Root cause identified as misconfigured queue TTL. Fix targeted for 48-hour hotfix release.',
      overview: 'Customer impact confirmed at 3 enterprise accounts. Engineering lead Rachel Kim committed to a targeted patch within two business days. Communication plan agreed upon.',
      generatedAt: daysAgo(5),
    },
    decisions: [
      { id: makeId(), title: 'Deploy hotfix within 48 hours', description: 'Priority P1 hotfix for queue TTL misconfiguration. Bypasses normal release cycle.', createdAt: daysAgo(5), meetingId: '' },
      { id: makeId(), title: 'Proactive email to affected accounts', description: 'Send apology + ETA email to Contoso and two other affected tenants within 2 hours.', createdAt: daysAgo(5), meetingId: '' },
    ],
    actionItems: [
      { id: makeId(), meetingId: '', title: 'Deploy queue TTL hotfix to prod',     assigneeName: 'Rachel Kim',   assigneeEmail: 'rachel@demo.com', dueDate: daysFromNow(-1), status: 'completed',  priority: 'critical', createdAt: daysAgo(5), updatedAt: daysAgo(3) },
      { id: makeId(), meetingId: '', title: 'Send escalation email to Contoso',    assigneeName: 'Liam O\'Brien', assigneeEmail: 'liam@demo.com',  dueDate: daysFromNow(-4), status: 'completed',  priority: 'critical', createdAt: daysAgo(5), updatedAt: daysAgo(5) },
    ],
    transcript: [
      { id: makeId(), speakerName: 'Liam O\'Brien', text: "Contoso is reporting that syncs are taking 30+ minutes. We need to understand root cause immediately.", startTime: 0, endTime: 10, tags: [{ type: 'blocker' }] },
      { id: makeId(), speakerName: 'Rachel Kim',    text: "Confirmed — the queue TTL is misconfigured to 30s instead of 30m. I can fix this with a targeted patch.", startTime: 11, endTime: 22, tags: [{ type: 'decision' }] },
      { id: makeId(), speakerName: 'Liam O\'Brien', text: "Agreed. Let's go with the hotfix. We've decided to prioritize this as a P1 and bypass the normal release gate.", startTime: 23, endTime: 35, tags: [{ type: 'decision' }] },
    ],
    tags: ['escalation', 'hotfix', 'customer', 'contoso'],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
  },

  // 4. Engineering Architecture Review
  {
    id: makeId(),
    partitionKey: TENANT_ID,
    type: 'team',
    title: 'Transcript Pipeline Architecture Review',
    status: 'completed',
    startTime: daysAgo(12),
    endTime: daysAgo(12),
    participants: [
      { id: 'u4',  displayName: 'Arjun Patel',    email: 'arjun@demo.com',  role: 'organizer' },
      { id: 'u3',  displayName: 'Mei-Lin Zhao',   email: 'mei@demo.com',    role: 'required' },
      { id: 'u10', displayName: 'Carlos Reyes',   email: 'carlos@demo.com', role: 'required' },
    ],
    summary: {
      headline: 'Event-driven architecture using Cosmos DB Change Feed selected over polling for the transcript pipeline. Decision finalizes Q3 scalability strategy.',
      overview: 'The team evaluated polling vs. event-driven approaches. Cosmos Change Feed was selected as the primary ingestion mechanism based on cost, latency, and fan-out capability. Semantic Kernel chosen as the orchestration layer.',
      generatedAt: daysAgo(12),
    },
    decisions: [
      { id: makeId(), title: 'Use Cosmos DB Change Feed for transcript streaming', description: 'Change Feed replaces the 10s polling loop once production scale is reached.', createdAt: daysAgo(12), meetingId: '' },
      { id: makeId(), title: 'Semantic Kernel v0.3 for agent orchestration',       description: 'SK selected over LangChain due to native M365 Graph integration support.', createdAt: daysAgo(12), meetingId: '' },
    ],
    actionItems: [
      { id: makeId(), meetingId: '', title: 'Prototype Change Feed trigger in Azure Functions', assigneeName: 'Carlos Reyes',  assigneeEmail: 'carlos@demo.com', dueDate: daysFromNow(3),  status: 'in_progress', priority: 'high',   createdAt: daysAgo(12), updatedAt: daysAgo(12) },
      { id: makeId(), meetingId: '', title: 'Write architecture decision record (ADR)',          assigneeName: 'Arjun Patel',   assigneeEmail: 'arjun@demo.com',  dueDate: daysFromNow(5),  status: 'pending',     priority: 'medium', createdAt: daysAgo(12), updatedAt: daysAgo(12) },
      { id: makeId(), meetingId: '', title: 'Benchmark Cosmos RU consumption under 100 users',   assigneeName: 'Mei-Lin Zhao',  assigneeEmail: 'mei@demo.com',    dueDate: daysFromNow(8),  status: 'pending',     priority: 'medium', createdAt: daysAgo(12), updatedAt: daysAgo(12) },
    ],
    transcript: [
      { id: makeId(), speakerName: 'Arjun Patel',  text: "The question is polling vs. event-driven. Polling every 10s adds 10s of latency and costs us more at scale.", startTime: 0,  endTime: 12, tags: [] },
      { id: makeId(), speakerName: 'Carlos Reyes', text: "Cosmos Change Feed is the cleaner solution. We can fan out to multiple downstream processors with sub-second latency.", startTime: 13, endTime: 25, tags: [{ type: 'key_point' }] },
      { id: makeId(), speakerName: 'Mei-Lin Zhao', text: "Going with Cosmos Change Feed. That's decided. Carlos, can you prototype the Azure Function trigger?",          startTime: 26, endTime: 35, tags: [{ type: 'decision' }, { type: 'action_item' }] },
    ],
    tags: ['architecture', 'cosmos', 'semantic-kernel', 'transcript'],
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },

  // 5. Sales Weekly
  {
    id: makeId(),
    partitionKey: TENANT_ID,
    type: 'team',
    title: 'Sales Team Weekly Sync — W23',
    status: 'completed',
    startTime: daysAgo(7),
    endTime: daysAgo(7),
    participants: [
      { id: 'u6',  displayName: 'Natasha Rivers',  email: 'natasha@demo.com', role: 'organizer' },
      { id: 'u11', displayName: 'Omar Hassan',     email: 'omar@demo.com',    role: 'required' },
      { id: 'u12', displayName: 'Jessica Park',    email: 'jessica@demo.com', role: 'required' },
    ],
    summary: {
      headline: 'Pipeline at 73% of Q3 target. Three enterprise deals in late-stage negotiation. Approved discount threshold raised to 15%.',
      overview: 'Team reviewed 14 active deals. Three are stalled on legal review. Discount authority for deals >$50K raised from 10% to 15% to unblock negotiation. Demo strategy adjusted for enterprise segment.',
      generatedAt: daysAgo(7),
    },
    decisions: [
      { id: makeId(), title: 'Raise discount threshold to 15% for deals over $50K', description: 'Effective immediately. Omar and Jessica have authority up to this limit.', createdAt: daysAgo(7), meetingId: '' },
      { id: makeId(), title: 'Prioritize Fabrikam and Northwind deals this week',   description: 'Both deals are 90-day close probability. Full team focus.', createdAt: daysAgo(7), meetingId: '' },
    ],
    actionItems: [
      { id: makeId(), meetingId: '', title: 'Send revised proposal to Fabrikam legal', assigneeName: 'Omar Hassan',   assigneeEmail: 'omar@demo.com',    dueDate: daysFromNow(2), status: 'in_progress', priority: 'critical', createdAt: daysAgo(7), updatedAt: daysAgo(7) },
      { id: makeId(), meetingId: '', title: 'Follow up with Northwind on MSA',          assigneeName: 'Jessica Park',  assigneeEmail: 'jessica@demo.com', dueDate: daysFromNow(1), status: 'pending',     priority: 'high',     createdAt: daysAgo(7), updatedAt: daysAgo(7) },
    ],
    transcript: [
      { id: makeId(), speakerName: 'Natasha Rivers', text: "We're at 73% of Q3 target. We need to close Fabrikam and Northwind this month.", startTime: 0,  endTime: 9,  tags: [] },
      { id: makeId(), speakerName: 'Omar Hassan',    text: "Fabrikam wants a 15% discount. Are we authorized to go that high?",              startTime: 10, endTime: 17, tags: [] },
      { id: makeId(), speakerName: 'Natasha Rivers', text: "Yes. Going with it. For deals over $50K, discount authority is now 15%. Agreed and confirmed.", startTime: 18, endTime: 26, tags: [{ type: 'decision' }] },
    ],
    tags: ['sales', 'pipeline', 'q3', 'fabrikam', 'discount'],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------
async function seed() {
  console.log('\n🌱  MeetMind Demo Seed Script\n');
  
  const db = client.database(COSMOS_DB);
  const container = db.container('meetings');

  for (const meeting of meetings) {
    // Wire meetingId back-references on nested objects
    const meetingId = meeting.id;
    meeting.decisions.forEach(d => (d.meetingId = meetingId));
    meeting.actionItems.forEach(ai => (ai.meetingId = meetingId));

    try {
      await container.items.upsert(meeting);
      console.log(`  ✅  Seeded meeting: "${meeting.title}" (${meeting.id})`);
    } catch (err: any) {
      console.error(`  ❌  Failed to seed "${meeting.title}": ${err.message}`);
    }
  }

  const totalDecisions   = meetings.reduce((acc, m) => acc + m.decisions.length, 0);
  const totalActionItems = meetings.reduce((acc, m) => acc + m.actionItems.length, 0);

  console.log(`\n🎉  Done! Seeded:`);
  console.log(`     ${meetings.length} meetings`);
  console.log(`     ${totalDecisions} decisions`);
  console.log(`     ${totalActionItems} action items`);
  console.log(`\n     Run: npm run dev  — then open the Teams Tab to see your data.\n`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
