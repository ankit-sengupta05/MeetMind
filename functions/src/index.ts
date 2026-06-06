// =============================================================================
// functions/src/index.ts
// Azure Functions v4 entry point – registers all function triggers
// =============================================================================

// Import all function modules so they register with the Azure Functions runtime
import './functions/processAgentJob.js';
import './functions/indexMeeting.js';
