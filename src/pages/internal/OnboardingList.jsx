import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Rocket, CheckCircle2, AlertTriangle, ShieldAlert,
  Search, User, CalendarDays, ArrowRight, Plus,
  TrendingUp, Clock, BarChart3,
} from 'lucide-react';
import { listOnboarding, createOnboarding, getOnboardingStats } from '../../api/onboarding';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import Modal from '../../components/shared/Modal';
import FilterSelect from '../../components/shared/FilterSelect';
import Pagination from '../../components/shared/Pagination';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import './OnboardingList.css';

const PAGE_SIZE = 10;

const HEALTH_OPTIONS = [
  { value: '',          label: 'All Health' },
  { value: 'ON_TRACK',  label: 'On Track' },
  { value: 'AT_RISK',   label: 'At Risk' },
  { value: 'BLOCKED',   label: 'Blocked' },
];

const STATUS_OPTIONS = [
  { value: '',            label: 'All Status' },
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_TRACK',    label: 'On Track' },
  { value: 'AT_RISK',     label: 'At Risk' },
  { value: 'BLOCKED',     label: 'Blocked' },
  { value: 'COMPLETED',   label: 'Completed' },
];

const HEALTH_ACCENT = {
  ON_TRACK: 'var(--green)',
  AT_RISK:  'var(--orange)',
  BLOCKED:  'var(--red)',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
}

const EMPTY_FORM = { tenant_id: '', tenant_name: '', assigned_lead: '', estimated_go_live: '' };

export default function OnboardingList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const [search,       setSearch]      = useState('');
  const [healthFilter, setHealth]      = useState('');
  const [statusFilter, setStatus]      = useState('');
  const [page,         setPage]        = useState(1);
  const [showCreate,   setShowCreate]  = useState(false);
  const [form,         setForm]        = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-list'],
    queryFn:  () => listOnboarding({ page_size: 200 }).then((r) => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['onboarding-stats'],
    queryFn:  () => getOnboardingStats().then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: createOnboarding,
    onSuccess: () => {
      qc.invalidateQueries(['onboarding-list']);
      qc.invalidateQueries(['onboarding-stats']);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      addToast({ type: 'success', message: 'Onboarding project created.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to create project.' }),
  });

  const rows = data?.data || [];

  const filtered = useMemo(() => rows.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      c.tenant_name?.toLowerCase().includes(q) ||
      c.tenant_id?.toLowerCase().includes(q) ||
      c.assigned_lead?.toLowerCase().includes(q);
    return matchSearch &&
      (!healthFilter || c.health_score === healthFilter) &&
      (!statusFilter || c.status === statusFilter);
  }), [rows, search, healthFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pagedRows  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = search || healthFilter || statusFilter;

  const s = statsData || {};

  const insightCards = [
    {
      icon: <Rocket size={16} />,
      color: 'purple',
      value: s.total ?? rows.length,
      label: 'Total Projects',
      sub: s.status ? `${s.status.IN_PROGRESS ?? 0} in progress` : null,
    },
    {
      icon: <CheckCircle2 size={16} />,
      color: 'green',
      value: s.health?.ON_TRACK ?? rows.filter((r) => r.health_score === 'ON_TRACK').length,
      label: 'On Track',
      sub: s.completed_this_month != null ? `${s.completed_this_month} completed this month` : null,
    },
    {
      icon: <AlertTriangle size={16} />,
      color: 'orange',
      value: (s.health?.AT_RISK ?? 0) + (s.health?.BLOCKED ?? 0) || rows.filter((r) => r.health_score === 'AT_RISK' || r.health_score === 'BLOCKED').length,
      label: 'At Risk / Blocked',
      sub: s.overdue != null ? `${s.overdue} overdue` : null,
    },
    {
      icon: <ShieldAlert size={16} />,
      color: 'red',
      value: s.open_blockers ?? rows.reduce((acc, r) => acc + (r.blocker_count || 0), 0),
      label: 'Open Blockers',
      sub: null,
    },
    {
      icon: <CalendarDays size={16} />,
      color: 'amber',
      value: s.going_live_soon ?? '—',
      label: 'Going Live (30d)',
      sub: s.overdue != null ? `${s.overdue} overdue` : null,
    },
    {
      icon: <TrendingUp size={16} />,
      color: 'blue',
      value: s.avg_completion_pct != null ? `${s.avg_completion_pct}%` : '—',
      label: 'Avg Completion',
      sub: null,
    },
  ];

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Onboarding</h1>
          <p className="page-subtitle">{rows.length} project{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
          New Project
        </Button>
      </div>

      {/* ── Insight strip ── */}
      <div className="ob-stats-grid ob-stats-grid--6">
        {insightCards.map((card) => (
          <div key={card.label} className="ob-stat">
            <div className={`ob-stat-icon ob-stat-icon--${card.color}`}>{card.icon}</div>
            <div>
              <div className="ob-stat-value">{card.value}</div>
              <div className="ob-stat-label">{card.label}</div>
              {card.sub && <div className="ob-stat-sub">{card.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="ob-search-wrap">
          <Search size={13} className="ob-search-icon" />
          <input
            className="ob-search"
            placeholder="Search client, lead…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <FilterSelect value={healthFilter} options={HEALTH_OPTIONS} onChange={(v) => { setHealth(v); setPage(1); }} placeholder="All Health" />
        <FilterSelect value={statusFilter} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="All Status" />
        {hasFilters && (
          <button className="ob-clear-btn" onClick={() => { setSearch(''); setHealth(''); setStatus(''); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Card Grid ── */}
      {isLoading ? (
        <div className="ob-card-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="ob-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ob-empty">
          <Rocket size={32} />
          <p>No onboarding projects match your filters.</p>
        </div>
      ) : (
        <div className="ob-card-grid">
          {pagedRows.map((project) => {
            const accent   = HEALTH_ACCENT[project.health_score] || 'var(--border-mid)';
            const days     = daysUntil(project.estimated_go_live);
            const isUrgent = days !== null && days > 0 && days <= 14;
            const isOverdue = days !== null && days < 0 && project.status !== 'COMPLETED';
            return (
              <div
                key={project.id}
                className="ob-card"
                style={{ '--ob-accent': accent }}
                onClick={() => navigate(`/internal/onboarding/${project.id}`)}
              >
                <div className="ob-card-top">
                  <div className="ob-card-avatar">
                    {(project.tenant_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="ob-card-identity">
                    <div className="ob-card-name">{project.tenant_name}</div>
                    <span className="ob-tenant-id">{project.tenant_id}</span>
                  </div>
                  <Badge status={project.health_score} />
                </div>

                <div className="ob-card-progress">
                  <div className="ob-progress-label">
                    <span>Progress</span>
                    <span className="ob-pct">{project.overall_completion_pct ?? 0}%</span>
                  </div>
                  <HealthBar score={project.overall_completion_pct ?? 0} />
                </div>

                <div className="ob-card-meta">
                  {project.assigned_lead && (
                    <span className="ob-meta-item">
                      <User size={11} />{project.assigned_lead}
                    </span>
                  )}
                  {project.estimated_go_live && (
                    <span className={`ob-meta-item${isUrgent ? ' ob-meta-item--urgent' : ''}${isOverdue ? ' ob-meta-item--overdue' : ''}`}>
                      <CalendarDays size={11} />{shortDate(project.estimated_go_live)}
                      {isUrgent  && <span className="ob-days-pill">{days}d left</span>}
                      {isOverdue && <span className="ob-days-pill ob-days-pill--overdue">{Math.abs(days)}d overdue</span>}
                    </span>
                  )}
                </div>

                <div className="ob-card-footer">
                  <Badge status={project.status} />
                  <div className="ob-card-footer-right">
                    {project.blocker_count > 0 && (
                      <span className="ob-blocker-pill">
                        {project.blocker_count} blocker{project.blocker_count > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="ob-view-link">
                      View <ArrowRight size={12} />
                    </span>
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
        title="New Onboarding Project"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Create</Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field">
            <label>Tenant ID</label>
            <input placeholder="acme-corp" value={form.tenant_id} onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Client Name</label>
            <input placeholder="Acme Corp" value={form.tenant_name} onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Assigned Lead</label>
            <input placeholder="Jane Doe" value={form.assigned_lead} onChange={(e) => setForm((f) => ({ ...f, assigned_lead: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Est. Go-Live</label>
            <input type="date" value={form.estimated_go_live} onChange={(e) => setForm((f) => ({ ...f, estimated_go_live: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
