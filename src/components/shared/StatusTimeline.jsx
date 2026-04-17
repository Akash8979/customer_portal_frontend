import { fullDate } from '../../utils/formatters';
import './StatusTimeline.css';

export default function StatusTimeline({ steps }) {
  return (
    <ol className="timeline">
      {steps.map((step, i) => (
        <li key={i} className={`timeline-step ${step.active ? 'active' : ''} ${step.done ? 'done' : ''}`}>
          <span className="timeline-dot" />
          <div className="timeline-content">
            <span className="timeline-label">{step.label}</span>
            {step.date && <span className="timeline-date">{fullDate(step.date)}</span>}
            {step.note && <span className="timeline-note">{step.note}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
