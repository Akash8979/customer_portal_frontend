import './EmptyState.css';
import Button from './Button';

export default function EmptyState({ icon = '○', message, cta, onCta }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <p className="empty-msg">{message}</p>
      {cta && <Button variant="secondary" size="sm" onClick={onCta}>{cta}</Button>}
    </div>
  );
}
