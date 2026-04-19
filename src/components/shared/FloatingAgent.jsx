import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../hooks/useAuth';
import { ariaChat } from '../../api/ai';
import './FloatingAgent.css';

const SESSION_KEY = (uid) => `aria_session_${uid}`;

function getOrCreateSession(uid) {
  const s = localStorage.getItem(SESSION_KEY(uid));
  if (s) return s;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY(uid), id);
  return id;
}

export default function FloatingAgent() {
  const { user } = useAuth();
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (!user?.email) return;
    setSessionId(getOrCreateSession(user.email));
    setMessages([{
      role: 'assistant',
      text: `Hi ${user.user_name?.split(' ')[0] || 'there'}! I'm Aria. Ask me anything about your tickets, account, or team.`,
    }]);
  }, [user?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 220);
  }, [open]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && open) setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((p) => [...p, { role: 'user', text }]);
    setLoading(true);
    try {
      const { data } = await ariaChat({
        user_id:    user.email,
        role:       user.role,
        tenant_id:  user.tenant_id || null,
        message:    text,
        session_id: sessionId,
      });
      const reply = data?.data?.response || 'Sorry, I could not get a response.';
      setMessages((p) => [...p, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((p) => [...p, {
        role: 'assistant',
        text: 'Something went wrong. Please try again.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function clearSession() {
    if (!user?.email) return;
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY(user.email), id);
    setSessionId(id);
    setMessages([{ role: 'assistant', text: 'New conversation started. What can I help with?' }]);
  }

  return (
    <>
      {/* ── Panel — inline flex sibling in layout (VS Code style) ── */}
      <div className={`aria-panel ${open ? 'aria-panel--open' : ''}`}>

        <div className="aria-panel-header">
          <div className="aria-panel-title">
            <span className="aria-panel-icon">✦</span>
            <span>Aria</span>
            <span className="aria-panel-role">{user?.role?.replace(/_/g, ' ')}</span>
          </div>
          <div className="aria-panel-controls">
            <button className="aria-ctrl-btn" onClick={clearSession} title="New conversation">↺</button>
            <button className="aria-ctrl-btn" onClick={() => setOpen(false)} title="Close">✕</button>
          </div>
        </div>

        <div className="aria-panel-messages">
          {messages.map((m, i) => (
            <div key={i} className={`aria-row aria-row--${m.role}${m.error ? ' aria-row--error' : ''}`}>
              {m.role === 'assistant' && <div className="aria-avatar">✦</div>}
              <div className="aria-bubble">
                {m.text.split('\n').map((line, li, arr) => (
                  <span key={li}>{line}{li < arr.length - 1 && <br />}</span>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="aria-row aria-row--assistant">
              <div className="aria-avatar">✦</div>
              <div className="aria-bubble aria-bubble--typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="aria-panel-footer">
          <textarea
            ref={inputRef}
            className="aria-panel-input"
            placeholder="Ask Aria anything…  (Enter to send)"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="aria-panel-send"
            onClick={send}
            disabled={!input.trim() || loading}
            title="Send"
          >
            ➤
          </button>
        </div>
      </div>

      {/* ── FAB — only visible when panel is closed, portal to body ── */}
      {!open && createPortal(
        <button className="aria-fab" onClick={() => setOpen(true)} title="Open Aria" aria-label="Open Aria AI">
          <span className="aria-fab-icon">✦</span>
          <span className="aria-fab-label">Aria</span>
          <span className="aria-fab-ping" />
        </button>,
        document.body,
      )}
    </>
  );
}
