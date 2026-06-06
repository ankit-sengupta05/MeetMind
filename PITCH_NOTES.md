# MeetMind: Pitch Notes & Strategy

## The One-Liner
MeetMind is an AI meeting copilot living inside Microsoft Teams that turns live conversations into documented decisions, auto-assigned tasks, and a searchable semantic knowledge base.

---

## 1. The Problem Slide
*Cite these stats to build urgency:*
1. **Time Wasted:** "Professionals spend up to 4 hours a week preparing for and recovering from meetings." *(Source: HBR)*
2. **Context Loss:** "Over 50% of decisions made in meetings are forgotten or misunderstood within 24 hours."
3. **App Fatigue:** "Employees toggle between apps up to 10 times an hour just to track action items."

---

## 2. The Solution Slide
*Focus on the workflow, not just the AI:*
1. **Real-Time Extraction:** Identifies action items and blockers instantly while you speak. *(Benefit: Never forget a commitment.)*
2. **Autonomous Dispatch:** Automatically syncs tasks to Microsoft Planner and emails summaries. *(Benefit: Zero manual follow-up required.)*
3. **Semantic Memory:** Chat with your organization's entire meeting history. *(Benefit: Onboard faster and eliminate redundant syncs.)*

---

## 3. Technical Depth Slide
*Judges will want to know how it actually works. Highlight the Azure stack:*
- **Azure OpenAI (GPT-4o & text-embedding-ada-002):** Used for highly accurate entity extraction, summarization, and vector generation.
- **Azure AI Search:** Powers the hybrid vector/keyword search, enabling the "Memory Search" feature.
- **Cosmos DB:** Serverless NoSQL storage for high-throughput, real-time transcript streaming.
- **Semantic Kernel:** Orchestrates the multi-agent swarm (Pre-Meeting Briefer, Post-Meeting Dispatcher).
- **Microsoft Graph API:** Deep integration to read calendars, send emails, and create Planner tasks natively.

---

## 4. Business Case & TAM
- **Target Audience:** Enterprise project managers, engineering teams, and sales orgs.
- **Monetization:** $15-30/user/month (competes with Otter.ai/Fireflies, but with native M365 integration).
- **TAM:** The 320+ million daily active users of Microsoft Teams. 
- **The Pitch:** "We aren't just another transcription app; we are an execution layer built directly into the Microsoft ecosystem."

---

## 5. Why Microsoft Teams?
*Anticipate the question: "Why not just a web app?"*
"Because context switching kills productivity. By building MeetMind as a native Teams Tab App and Bot, we meet users exactly where they are already collaborating. We inherit Teams' security, Azure AD identity, and Microsoft Graph integrations out of the box."

---

## 6. Q&A Prep (Tough Questions)

**Q: How does this differ from Microsoft Copilot for M365?**
*A: M365 Copilot is incredible at summarizing what happened. MeetMind goes a step further into autonomous execution—we don't just summarize, our agent swarm actually pushes tasks into Planner, drafts emails, and tracks open threads across multiple meetings proactively.*

**Q: What about privacy and sensitive meetings?**
*A: Because we are built entirely on your Azure tenant, your data never leaves your environment. We use Azure OpenAI, which does not use customer data to train its foundational models, ensuring enterprise-grade compliance.*

**Q: How do you handle inaccurate speech-to-text or hallucinated action items?**
*A: We use a two-pass system. A fast heuristic tagger catches immediate intent, but our background GPT-4o agent validates the context before officially logging it. Users also have full edit control in the UI before syncing to Planner.*

**Q: How scalable is the real-time transcript ingestion?**
*A: Very. We use Cosmos DB's serverless tier which seamlessly scales throughput, and we buffer transcript segments to reduce chat completion API pressure, saving costs and avoiding rate limits.*
