import './KpiTile.css';

export default function KpiTile({ label, value, trend, trendLabel, accent, icon, sublabel }) {
  const trendDir = trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  return (
    <div className="kpi-tile" style={{ '--accent': accent || 'var(--amber)' }}>
      {icon && <span className="kpi-icon">{icon}</span>}
      <div className="kpi-value">{value ?? '—'}</div>
      <div className="kpi-label">{label}</div>
      {sublabel && <div className="kpi-sublabel">{sublabel}</div>}
      {trend !== undefined && (
        <div className={`kpi-trend kpi-trend--${trendDir}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {trendLabel || Math.abs(trend)}
        </div>
      )}
    </div>
  );
}
