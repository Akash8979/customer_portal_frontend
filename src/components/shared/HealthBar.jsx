import { healthColor } from '../../utils/formatters';
import './HealthBar.css';

export default function HealthBar({ score, showLabel = true }) {
  const color = healthColor(score ?? 0);
  return (
    <div className="health-bar-wrap">
      <div className="health-bar-track">
        <div
          className="health-bar-fill"
          style={{ width: `${score ?? 0}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="health-bar-label" style={{ color }}>{score ?? 0}</span>
      )}
    </div>
  );
}
