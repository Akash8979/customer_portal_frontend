import useAppStore from '../../stores/useAppStore';
import Drawer from './Drawer';
import Button from './Button';
import './AIOutputPanel.css';

export default function AIOutputPanel() {
  const { aiPanelOpen, aiAction, aiLoading, aiOutput, aiHistory, closeAiPanel } = useAppStore();

  function copyOutput() {
    const text = typeof aiOutput === 'string' ? aiOutput : JSON.stringify(aiOutput, null, 2);
    navigator.clipboard.writeText(text);
  }

  function renderOutput(output) {
    if (!output) return null;
    if (typeof output === 'string') return <pre className="ai-text">{output}</pre>;
    return (
      <div className="ai-structured">
        {Object.entries(output).map(([k, v]) => (
          <div key={k} className="ai-field">
            <div className="ai-field-key">{k.replace(/_/g, ' ')}</div>
            <div className="ai-field-val">
              {Array.isArray(v)
                ? <ul>{v.map((item, i) => <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>)}</ul>
                : typeof v === 'object'
                  ? <pre>{JSON.stringify(v, null, 2)}</pre>
                  : String(v)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Drawer open={aiPanelOpen} onClose={closeAiPanel} title={`✦ AI — ${aiAction || ''}`} width={420}>
      <div className="ai-panel">
        {aiLoading && (
          <div className="ai-loading">
            <div className="ai-loading-dots">
              <span /><span /><span />
            </div>
            <p>Running AI action…</p>
          </div>
        )}

        {!aiLoading && aiOutput && (
          <div className="ai-output">
            <div className="ai-output-header">
              <span className="ai-output-label">Output</span>
              <Button variant="ghost" size="sm" onClick={copyOutput}>Copy</Button>
            </div>
            {renderOutput(aiOutput)}
          </div>
        )}

        {!aiLoading && !aiOutput && (
          <div className="ai-empty">
            <span className="ai-icon">✦</span>
            <p>Run an AI action to see results here.</p>
          </div>
        )}

        {aiHistory.length > 0 && (
          <div className="ai-history">
            <div className="ai-history-label">Session history</div>
            {aiHistory.slice(0, 5).map((h, i) => (
              <div key={i} className="ai-history-item">
                <span>{h.action}</span>
                <span className="ai-history-time">{new Date(h.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
