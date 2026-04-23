import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Zap, CheckCircle2, Clock,
  Search, Plus, CalendarDays, Box, Bug,
} from 'lucide-react';
import { listReleases, createRelease } from '../../api/releases';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import FilterSelect from '../../components/shared/FilterSelect';
import Pagination from '../../components/shared/Pagination';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import './Releases.css';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_TESTING', label: 'In Testing' },
  { value: 'PUBLISHED', label: 'Published' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'false', label: 'Release' },
  { value: 'true',  label: 'Hotfix' },
];

const STATUS_ACCENT = {
  PUBLISHED:  'var(--green)',
  IN_TESTING: 'var(--amber)',
  DRAFT:      'var(--text-dim)',
};

const EMPTY_FORM = { version: '', title: '', is_hotfix: false, release_date: '' };

export default function Releases() {
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const [search,      setSearch]     = useState('');
  const [statusFilter, setStatus]    = useState('');
  const [typeFilter,   setType]      = useState('');
  const [page,         setPage]       = useState(1);
  const [showCreate,   setShowCreate] = useState(false);
  const [form,         setForm]       = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn:  () => listReleases({ page_size: 200 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: createRelease,
    onSuccess: () => {
      qc.invalidateQueries(['releases']);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      addToast({ type: 'success', message: 'Release created.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to create release.' }),
  });

  const allReleases = data?.data || [];

  const filtered = useMemo(() => allReleases.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(q) ||
      r.version?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchType   = !typeFilter   || String(r.is_hotfix) === typeFilter;
    return matchSearch && matchStatus && matchType;
  }), [allReleases, search, statusFilter, typeFilter]);

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pagedRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const published = allReleases.filter((r) => r.status === 'PUBLISHED').length;
  const inTesting = allReleases.filter((r) => r.status === 'IN_TESTING').length;
  const drafts    = allReleases.filter((r) => r.status === 'DRAFT').length;
  const hotfixes  = allReleases.filter((r) => r.is_hotfix).length;
  const hasFilters = search || statusFilter || typeFilter;


  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Releases</h1>
          <p className="page-subtitle">{allReleases.length} release{allReleases.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
          New Release
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="rl-stats-grid">
        <div className="rl-stat">
          <div className="rl-stat-icon rl-stat-icon--green"><CheckCircle2 size={16} /></div>
          <div>
            <div className="rl-stat-value">{published}</div>
            <div className="rl-stat-label">Published</div>
          </div>
        </div>
        <div className="rl-stat">
          <div className="rl-stat-icon rl-stat-icon--amber"><Clock size={16} /></div>
          <div>
            <div className="rl-stat-value">{inTesting}</div>
            <div className="rl-stat-label">In Testing</div>
          </div>
        </div>
        <div className="rl-stat">
          <div className="rl-stat-icon rl-stat-icon--dim"><Package size={16} /></div>
          <div>
            <div className="rl-stat-value">{drafts}</div>
            <div className="rl-stat-label">Draft</div>
          </div>
        </div>
        <div className="rl-stat">
          <div className="rl-stat-icon rl-stat-icon--red"><Zap size={16} /></div>
          <div>
            <div className="rl-stat-value">{hotfixes}</div>
            <div className="rl-stat-label">Hotfixes</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="rl-search-wrap">
          <Search size={13} className="rl-search-icon" />
          <input
            className="rl-search"
            placeholder="Search version or title…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <FilterSelect value={statusFilter} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="All Status" />
        <FilterSelect value={typeFilter}   options={TYPE_OPTIONS}   onChange={(v) => { setType(v);   setPage(1); }} placeholder="All Types" />
        {hasFilters && (
          <button className="rl-clear-btn" onClick={() => { setSearch(''); setStatus(''); setType(''); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Release Cards ── */}
      {isLoading ? (
        <div className="rl-list">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="rl-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rl-empty">
          <Package size={32} />
          <p>No releases found.</p>
        </div>
      ) : (
        <div className="rl-list">
          {pagedRows.map((r) => {
            const accent = STATUS_ACCENT[r.status] || 'var(--border-mid)';
            return (
              <div key={r.id} className="rl-card" style={{ '--rl-accent': accent }}>

                {/* Left: version + dot */}
                <div className="rl-card-version-col">
                  <div className="rl-version-dot" />
                  <div className="rl-version-chip">v{r.version}</div>
                </div>

                {/* Main content */}
                <div className="rl-card-body">
                  <div className="rl-card-top">
                    <div className="rl-card-title">{r.title}</div>
                    <div className="rl-card-badges">
                      {r.is_hotfix && (
                        <span className="rl-hotfix-badge"><Zap size={10} />Hotfix</span>
                      )}
                      <Badge status={r.status} />
                    </div>
                  </div>

                  <div className="rl-card-meta">
                    {r.release_date && (
                      <span className="rl-meta-item">
                        <CalendarDays size={11} />{shortDate(r.release_date)}
                      </span>
                    )}
                    {r.feature_count > 0 && (
                      <span className="rl-meta-item rl-meta-item--green">
                        <Box size={11} />{r.feature_count} feature{r.feature_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {r.bug_count > 0 && (
                      <span className="rl-meta-item rl-meta-item--red">
                        <Bug size={11} />{r.bug_count} fix{r.bug_count !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* ── Create Modal ── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
        title="New Release"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Create</Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Version</label>
            <input placeholder="2.4.1" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Title</label>
            <input placeholder="Release title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Release Date</label>
            <input type="date" value={form.release_date} onChange={(e) => setForm((f) => ({ ...f, release_date: e.target.value }))} />
          </div>
          <div className="form-field" style={{ justifyContent: 'flex-end', paddingTop: 22 }}>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
              <input type="checkbox" checked={form.is_hotfix} onChange={(e) => setForm((f) => ({ ...f, is_hotfix: e.target.checked }))} style={{ width: 'auto', height: 'auto' }} />
              Mark as Hotfix
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
