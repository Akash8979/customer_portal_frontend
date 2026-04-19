import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bug, AlertTriangle, Clock, CheckCircle2, Search, Plus } from 'lucide-react';
import { listBugs, createBug, bugStats } from '../../api/bugs';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import FilterSelect from '../../components/shared/FilterSelect';
import { relativeTime } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import './BugTracker.css';

const COLUMNS = [
  { key: 'REPORTED',               label: 'Reported',            accent: 'var(--blue)' },
  { key: 'REPRODUCED',             label: 'Reproduced',          accent: 'var(--purple)' },
  { key: 'ROOT_CAUSE_IDENTIFIED',  label: 'Root Cause',          accent: 'var(--orange)' },
  { key: 'FIX_IN_PROGRESS',        label: 'Fix In Progress',     accent: 'var(--amber)' },
  { key: 'IN_QA',                  label: 'In QA',               accent: 'var(--blue)' },
  { key: 'DEPLOYED',               label: 'Deployed',            accent: 'var(--green)' },
  { key: 'VERIFIED',               label: 'Verified',            accent: 'var(--green)' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  ...['CRITICAL','HIGH','MEDIUM','LOW'].map((v) => ({ value: v, label: v })),
];

const SEVERITY_DOT = {
  CRITICAL: 'var(--red)',
  HIGH:     'var(--orange)',
  MEDIUM:   'var(--amber)',
  LOW:      'var(--blue)',
};

function assigneeInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const EMPTY_FORM = {
  title: '', description: '', severity: 'HIGH',
  steps_to_reproduce: '', environment: 'Production', client_impact: '',
};

export default function BugTracker() {
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const [search,     setSearch]     = useState('');
  const [severity,   setSeverity]   = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);

  const { data: stats } = useQuery({
    queryKey: ['bug-stats'],
    queryFn:  () => bugStats().then((r) => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['bugs-board', { severity, search }],
    queryFn:  () => listBugs({ severity, search, page_size: 200 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: createBug,
    onSuccess: () => {
      qc.invalidateQueries(['bugs-board']);
      qc.invalidateQueries(['bug-stats']);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      addToast({ type: 'success', message: 'Bug reported.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to create bug.' }),
  });

  const allBugs = data?.data || [];

  const byStatus = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => { map[c.key] = []; });
    allBugs.forEach((b) => {
      if (map[b.status]) map[b.status].push(b);
    });
    return map;
  }, [allBugs]);

  const hasFilters = search || severity;

  return (
    <div className="page bt-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bug Tracker</h1>
          <p className="page-subtitle">{allBugs.length} bug{allBugs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
          Report Bug
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="bt-stats-grid">
        <div className="bt-stat">
          <div className="bt-stat-icon bt-stat-icon--red"><Bug size={16} /></div>
          <div>
            <div className="bt-stat-value">{stats?.total_open ?? 0}</div>
            <div className="bt-stat-label">Open</div>
          </div>
        </div>
        <div className="bt-stat">
          <div className="bt-stat-icon bt-stat-icon--red"><AlertTriangle size={16} /></div>
          <div>
            <div className="bt-stat-value">{stats?.critical ?? 0}</div>
            <div className="bt-stat-label">Critical</div>
          </div>
        </div>
        <div className="bt-stat">
          <div className="bt-stat-icon bt-stat-icon--orange"><AlertTriangle size={16} /></div>
          <div>
            <div className="bt-stat-value">{stats?.high ?? 0}</div>
            <div className="bt-stat-label">High</div>
          </div>
        </div>
        <div className="bt-stat">
          <div className="bt-stat-icon bt-stat-icon--amber"><Clock size={16} /></div>
          <div>
            <div className="bt-stat-value">{stats?.aging_7d ?? 0}</div>
            <div className="bt-stat-label">&gt;7 Days Old</div>
          </div>
        </div>
        <div className="bt-stat">
          <div className="bt-stat-icon bt-stat-icon--green"><CheckCircle2 size={16} /></div>
          <div>
            <div className="bt-stat-value">{stats?.aging_30d ?? 0}</div>
            <div className="bt-stat-label">&gt;30 Days Old</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="bt-search-wrap">
          <Search size={13} className="bt-search-icon" />
          <input
            className="bt-search"
            placeholder="Search bugs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={severity} options={SEVERITY_OPTIONS} onChange={setSeverity} placeholder="All Severities" />
        {hasFilters && (
          <button className="bt-clear-btn" onClick={() => { setSearch(''); setSeverity(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Kanban Board ── */}
      {isLoading ? (
        <div className="bt-board">
          {COLUMNS.map((col) => (
            <div key={col.key} className="bt-col" style={{ '--col-accent': col.accent }}>
              <div className="bt-col-header">
                <span className="bt-col-title">{col.label}</span>
                <span className="bt-col-count">—</span>
              </div>
              <div className="bt-col-cards">
                {[1, 2].map((i) => <div key={i} className="bt-card-skeleton" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bt-board">
          {COLUMNS.map((col) => {
            const colBugs = byStatus[col.key] || [];
            return (
              <div key={col.key} className="bt-col" style={{ '--col-accent': col.accent }}>
                <div className="bt-col-header">
                  <span className="bt-col-title">{col.label}</span>
                  <span className="bt-col-count">{colBugs.length}</span>
                </div>

                <div className="bt-col-cards">
                  {colBugs.length === 0 && (
                    <div className="bt-col-empty">No bugs</div>
                  )}
                  {colBugs.map((b) => (
                    <div
                      key={b.id}
                      className="bt-card"
                      style={{ '--sev-dot': SEVERITY_DOT[b.severity] || 'var(--border-mid)' }}
                    >
                      {/* Top: environment chip + severity dot */}
                      <div className="bt-card-top">
                        {b.environment && (
                          <span className="bt-env-chip">{b.environment}</span>
                        )}
                        {b.severity && (
                          <span className="bt-sev-dot" title={b.severity} />
                        )}
                      </div>

                      {/* Title */}
                      <div className="bt-card-title">{b.title}</div>

                      {/* Affected clients */}
                      {Array.isArray(b.affected_tenants) && b.affected_tenants.length > 0 && (
                        <div className="bt-affected">
                          {b.affected_tenants.slice(0, 2).join(', ')}
                          {b.affected_tenants.length > 2 && ` +${b.affected_tenants.length - 2}`}
                        </div>
                      )}

                      {/* Footer: ID + time + assignee */}
                      <div className="bt-card-footer">
                        <span className="bt-id-chip">#{b.id}</span>
                        <span className="bt-card-time">{relativeTime(b.created_at)}</span>
                        <div
                          className="bt-avatar"
                          title={b.assignee || 'Unassigned'}
                          style={b.assignee ? {} : { opacity: 0.35 }}
                        >
                          {assigneeInitials(b.assignee)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Bug Modal ── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
        title="Report Bug"
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>
              Create Bug
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field form-field--full">
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief description of the bug" />
          </div>
          <div className="form-field form-field--full">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Severity</label>
            <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
              {['LOW','MEDIUM','HIGH','CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Environment</label>
            <select value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}>
              {['Production','Staging','Development'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field form-field--full">
            <label>Steps to Reproduce</label>
            <textarea rows={3} value={form.steps_to_reproduce} onChange={(e) => setForm((f) => ({ ...f, steps_to_reproduce: e.target.value }))} />
          </div>
          <div className="form-field form-field--full">
            <label>Client Impact</label>
            <textarea rows={2} value={form.client_impact} onChange={(e) => setForm((f) => ({ ...f, client_impact: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
