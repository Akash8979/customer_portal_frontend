import { useQuery } from '@tanstack/react-query';
import { listReleases } from '../../api/releases';
import Badge from '../../components/shared/Badge';
import { shortDate } from '../../utils/formatters';
import './ClientReleaseNotes.css';

export default function ClientReleaseNotes() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-releases-all'],
    queryFn: () => listReleases({ page_size: 50 }).then((r) => r.data.data || []),
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Release Notes</h1>
      </div>
      {isLoading && <p>Loading…</p>}
      <div className="releases-list">
        {(data || []).map((r) => (
          <div key={r.id} className="release-entry">
            <div className="release-entry-header">
              <div>
                <span className="release-ver">v{r.version}</span>
                <span className="release-name">{r.title}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {r.is_hotfix && <Badge label="Hotfix" variant="danger" />}
                <span className="release-dt">{shortDate(r.release_date)}</span>
              </div>
            </div>
            {r.summary && <p className="release-summary">{r.summary}</p>}
            {r.release_notes && (
              <div className="release-notes-body">
                <pre>{r.release_notes}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
