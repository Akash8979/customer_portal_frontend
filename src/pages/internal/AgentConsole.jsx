import { useState } from 'react';
import { useAI } from '../../hooks/useAI';
import useAppStore from '../../stores/useAppStore';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import './AgentConsole.css';

const PREBUILT_AGENTS = [
  { id: 'triage-new', label: 'Triage All New Tickets', description: 'Classify and prioritise every New ticket in the queue.', prompt: 'Triage all new tickets — classify each one into a category and assign initial priority based on description' },
  { id: 'flag-risk', label: 'Flag At-Risk Accounts', description: 'Analyse all clients and return a risk list.', prompt: 'Analyse all client accounts and identify which are at risk of churn or experiencing declining health' },
  { id: 'weekly-status', label: 'Weekly Status Update', description: 'Generate a weekly status update for all clients.', prompt: 'Generate a concise weekly status update covering all active clients, open tickets, and onboarding progress' },
  { id: 'summarise-threads', label: 'Summarise Open Threads', description: 'Condensed view of all active ticket threads.', prompt: 'Summarise all currently open ticket threads into a brief digest — highlight anything needing urgent attention' },
  { id: 'renewal-outreach', label: 'Draft Renewal Outreach', description: 'Draft emails for clients expiring in 60–90 days.', prompt: 'Draft renewal outreach emails for clients whose contracts are expiring in the next 60-90 days' },
  { id: 'recurring-themes', label: 'Recurring Issue Themes', description: 'Cluster tickets by topic and identify patterns.', prompt: 'Identify recurring issue themes across all open tickets — cluster them by topic and suggest systemic fixes' },
];

export default function AgentConsole() {
  const ai = useAI();
  const { aiHistory } = useAppStore();
  const [customPrompt, setCustomPrompt] = useState('');
  const [running, setRunning] = useState(null);

  async function runAgent(id, prompt) {
    setRunning(id);
    try {
      await ai.agentRun({ user_prompt: prompt, context_data: {} });
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Agent Console</h1>
          <p className="page-subtitle">Run AI agents across your client data. Results appear in the AI panel.</p>
        </div>
      </div>

      <div className="agent-grid">
        {PREBUILT_AGENTS.map((agent) => (
          <Card key={agent.id}>
            <div className="agent-card-inner">
              <div>
                <div className="agent-label">{agent.label}</div>
                <div className="agent-desc">{agent.description}</div>
              </div>
              <Button
                variant="ai" size="sm"
                loading={running === agent.id}
                onClick={() => runAgent(agent.id, agent.prompt)}
              >✦ Run</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Custom agent */}
      <Card>
        <div className="section-header">
          <h2 className="section-title">✦ Custom Agent</h2>
        </div>
        <div className="custom-agent-form">
          <textarea
            className="agent-textarea" rows={4}
            placeholder="Describe what you want the AI agent to do… e.g. 'Find all tickets mentioning forecast accuracy and suggest a pattern'"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
          <Button
            variant="ai"
            disabled={!customPrompt.trim()}
            loading={running === 'custom'}
            onClick={() => runAgent('custom', customPrompt)}
          >✦ Run Agent</Button>
        </div>
      </Card>

      {/* History */}
      {aiHistory.length > 0 && (
        <Card>
          <div className="section-header"><h2 className="section-title">Session History</h2></div>
          <div className="history-list">
            {aiHistory.map((h, i) => (
              <div key={i} className="history-item">
                <span className="history-action">{h.action}</span>
                <span className="history-time">{new Date(h.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
