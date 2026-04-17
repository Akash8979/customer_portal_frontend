import useAppStore from '../stores/useAppStore';
import * as aiApi from '../api/ai';

export function useAI() {
  const { openAiPanel, setAiOutput, setAiLoading, addToast } = useAppStore();

  async function run(actionLabel, apiFn, ...args) {
    openAiPanel(actionLabel);
    try {
      const { data } = await apiFn(...args);
      setAiOutput(data);
      return data;
    } catch (err) {
      setAiLoading(false);
      addToast({ type: 'error', message: 'AI action failed. Please try again.' });
      throw err;
    }
  }

  return {
    summariseThread:    (ticketId)   => run('Summarise Thread',       aiApi.summariseThread, ticketId),
    suggestComment:     (ticketId)   => run('Draft Reply',            aiApi.suggestComment,  ticketId),
    analyseSentiment:   (comment)    => run('Analyse Sentiment',      aiApi.analyseSentiment, comment),
    checkDuplicate:     (data)       => run('Duplicate Check',        aiApi.checkDuplicate,  data),
    accountHealth:      (data)       => run('Account Health',         aiApi.accountHealth,   data),
    draftReleaseNotes:  (data)       => run('Draft Release Notes',    aiApi.draftReleaseNotes, data),
    churnRisk:          (data)       => run('Churn Risk',             aiApi.churnRisk,       data),
    draftOutreach:      (data)       => run('Draft Outreach',         aiApi.draftOutreach,   data),
    agentRun:           (data)       => run('Agent Run',              aiApi.agentRun,        data),
    onboardingRecovery: (data)       => run('Recovery Plan',          aiApi.onboardingRecovery, data),
  };
}
