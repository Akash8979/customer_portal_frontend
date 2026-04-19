import { aiClient } from './client';

// ── Existing endpoints ─────────────────────────────────────────────────────
export const classifyTicket    = (data) => aiClient.post('/portal/ai-engine/ticket-classify', data);
export const suggestComment    = (id)   => aiClient.get(`/portal/ai-engine/ticket-comment-suggest/${id}`);
export const summariseThread   = (id)   => aiClient.get(`/portal/ai-engine/ticket-comment-summary/${id}`);

// ── New endpoints ──────────────────────────────────────────────────────────
export const analyseSentiment  = (comment)       => aiClient.post('/portal/ai-engine/ticket-sentiment', { comment });
export const checkDuplicate    = (data)           => aiClient.post('/portal/ai-engine/ticket-duplicate-check', data);
export const accountHealth     = (account_data)   => aiClient.post('/portal/ai-engine/account-health', { account_data });
export const draftReleaseNotes = (data)           => aiClient.post('/portal/ai-engine/draft-release-notes', data);
export const churnRisk         = (account_data)   => aiClient.post('/portal/ai-engine/churn-risk', { account_data });
export const draftOutreach     = (data)           => aiClient.post('/portal/ai-engine/draft-outreach', data);
export const agentRun          = (data)           => aiClient.post('/portal/ai-engine/agent-run', data);
export const onboardingRecovery= (data)           => aiClient.post('/portal/ai-engine/onboarding-recovery-plan', data);

// ── Personal Agent (Aria) ──────────────────────────────────────────────────
export const ariaChat          = (data)           => aiClient.post('/portal/ai-engine/personal-agent/chat', data);
export const ariaMemory        = (userId)         => aiClient.get(`/portal/ai-engine/personal-agent/memory/${userId}`);
