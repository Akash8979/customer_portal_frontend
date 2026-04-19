import { useQuery } from '@tanstack/react-query';
import { Tag, Calendar, Zap, FileText } from 'lucide-react';
import { listReleases } from '../../api/releases';
import Badge from '../../components/shared/Badge';
import { shortDate } from '../../utils/formatters';
import './ClientReleaseNotes.css';

const STATUS_ACCENT = {
  PUBLISHED:  'var(--green)',
  IN_TESTING: 'var(--amber)',
  DRAFT:      'var(--text-dim)',
};

export default function ClientReleaseNotes() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-releases-all'],
    queryFn: () => listReleases({ page_size: 50 }).then((r) => r.data.data || []),
  });

  const releases = data || [];

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Release Notes</h1>
          <p className="page-subtitle">What's new, fixed, and improved</p>
        </div>
        {!isLoading && (
          <span className="rn-total-chip">{releases.length} releases</span>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="rn-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rn-card rn-card--skeleton" />
          ))}
        </div>
      )}

      {/* ── Release list ── */}
      {!isLoading && (
        <div className="rn-list">
          {releases.length === 0 && (
            <div className="rn-empty">
              <FileText size={28} />
              <span>No release notes yet</span>
            </div>
          )}

          {releases.map((r) => {
            const accent = STATUS_ACCENT[r.status] || 'var(--border-mid)';
            return (
              <div
                key={r.id}
                className="rn-card"
                style={{ '--rn-accent': accent }}
              >

                {/* ── Card header ── */}
                <div className="rn-card-header">
                  <div className="rn-card-header-left">
                    <span className="rn-ver">
                      <Tag size={11} />
                      v{r.version}
                    </span>
                    <h2 className="rn-title">{r.title}</h2>
                  </div>

                  <div className="rn-card-header-right">
                    {r.is_hotfix && (
                      <span className="rn-hotfix-badge">
                        <Zap size={10} />
                        Hotfix
                      </span>
                    )}
                    <Badge status={r.status} />
                    {r.release_date && (
                      <span className="rn-date">
                        <Calendar size={11} />
                        {shortDate(r.release_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Summary ── */}
                {r.summary && (
                  <p className="rn-summary">{r.summary}</p>
                )}

                {/* ── Full notes ── */}
                {r.release_notes && (
                  <div className="rn-notes">
                    <pre>{r.release_notes}</pre>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
