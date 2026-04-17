import { useState, useEffect } from 'react';
import './SlaTimer.css';

function getRemaining(deadlineStr) {
  if (!deadlineStr) return null;
  const diff = new Date(deadlineStr) - Date.now();
  return diff;
}

function formatMs(ms) {
  if (ms <= 0) return 'Breached';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export default function SlaTimer({ deadline, label = 'SLA' }) {
  const [remaining, setRemaining] = useState(() => getRemaining(deadline));

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setRemaining(getRemaining(deadline)), 30000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  const breached = remaining <= 0;
  const warning  = !breached && remaining < 2 * 3600000;

  return (
    <span
      className={`sla-timer ${breached ? 'sla--breached' : warning ? 'sla--warning' : 'sla--ok'}`}
      title={deadline}
    >
      {label}: {formatMs(remaining)}
    </span>
  );
}
