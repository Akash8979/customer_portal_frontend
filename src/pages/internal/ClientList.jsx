import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, CheckCircle2, AlertTriangle, ShieldAlert,
  Search, Building2, User, CalendarDays, ArrowRight,
} from 'lucide-react';
import { listOnboarding } from '../../api/onboarding';
import Badge from '../../components/shared/Badge';
import HealthBar from '../../components/shared/HealthBar';
import FilterSelect from '../../components/shared/FilterSelect';
import Pagination from '../../components/shared/Pagination';
import { shortDate } from '../../utils/formatters';
import './ClientList.css';

const PAGE_SIZE = 10;

const HEALTH_OPTIONS = [
  { value: '', label: 'All Health' },
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'NEEDS_ATTENTION', label: 'Needs Attention' },
  { value: 'AT_RISK', label: 'At Risk' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const HEALTH_ACCENT = {
  ON_TRACK:        'var(--green)',
  NEEDS_ATTENTION: 'var(--orange)',
  AT_RISK:         'var(--red)',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
}

export default function ClientList() {
  const navigate   = useNavigate();
  const [search, setSearch]         = useState('');
  const [healthFilter, setHealth]   = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page, setPage]             = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-all'],
    queryFn:  () => listOnboarding({ page_size: 200 }).then((r) => r.data),
  });

  const rows = data?.data || [];

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      const matchSearch = !search ||
        c.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.tenant_id?.toLowerCase().includes(search.toLowerCase()) ||
        c.assigned_lead?.toLowerCase().includes(search.toLowerCase());
      const matchHealth = !healthFilter || c.health_score === healthFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchHealth && matchStatus;
    });
  }, [rows, search, healthFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pagedRows  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onTrack  = rows.filter((c) => c.health_score === 'ON_TRACK').length;
  const atRisk   = rows.filter((c) => c.health_score === 'AT_RISK').length;
  const blockers = rows.reduce((acc, c) => acc + (c.blocker_count || 0), 0);

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{rows.length} active client{rows.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="cl-stats-grid">
        <div className="cl-stat">
          <div className="cl-stat-icon cl-stat-icon--blue"><Users size={16} /></div>
          <div>
            <div className="cl-stat-value">{rows.length}</div>
            <div className="cl-stat-label">Total Clients</div>
          </div>
        </div>
        <div className="cl-stat">
          <div className="cl-stat-icon cl-stat-icon--green"><CheckCircle2 size={16} /></div>
          <div>
            <div className="cl-stat-value">{onTrack}</div>
            <div className="cl-stat-label">On Track</div>
          </div>
        </div>
        <div className="cl-stat">
          <div className="cl-stat-icon cl-stat-icon--orange"><AlertTriangle size={16} /></div>
          <div>
            <div className="cl-stat-value">{atRisk}</div>
            <div className="cl-stat-label">At Risk</div>
          </div>
        </div>
        <div className="cl-stat">
          <div className="cl-stat-icon cl-stat-icon--red"><ShieldAlert size={16} /></div>
          <div>
            <div className="cl-stat-value">{blockers}</div>
            <div className="cl-stat-label">Open Blockers</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="cl-search-wrap">
          <Search size={13} className="cl-search-icon" />
          <input
            className="cl-search"
            placeholder="Search clients, tenant ID, lead…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <FilterSelect value={healthFilter} options={HEALTH_OPTIONS} onChange={(v) => { setHealth(v); setPage(1); }} placeholder="All Health" />
        <FilterSelect value={statusFilter} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="All Status" />
        {(search || healthFilter || statusFilter) && (
          <button className="cl-clear-btn" onClick={() => { setSearch(''); setHealth(''); setStatus(''); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Card grid ── */}
      {isLoading ? (
        <div className="cl-card-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="cl-skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="cl-empty">
          <Building2 size={32} />
          <p>No clients match your filters.</p>
        </div>
      ) : (
        <div className="cl-card-grid">
          {pagedRows.map((client) => {
            const accent   = HEALTH_ACCENT[client.health_score] || 'var(--border-mid)';
            const days     = daysUntil(client.estimated_go_live);
            const isUrgent = days !== null && days > 0 && days <= 14;
            return (
              <div
                key={client.id}
                className="cl-card"
                style={{ '--cl-accent': accent }}
                onClick={() => navigate(`/internal/clients/${client.id}`)}
              >
                {/* Card top */}
                <div className="cl-card-top">
                  <div className="cl-card-avatar">
                    {(client.tenant_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="cl-card-identity">
                    <div className="cl-card-name">{client.tenant_name}</div>
                    <span className="cl-tenant-id">{client.tenant_id}</span>
                  </div>
                  <Badge status={client.health_score} />
                </div>

                {/* Progress */}
                <div className="cl-card-progress">
                  <div className="cl-progress-label">
                    <span>Onboarding</span>
                    <span className="cl-pct">{client.overall_completion_pct ?? 0}%</span>
                  </div>
                  <HealthBar score={client.overall_completion_pct ?? 0} />
                </div>

                {/* Meta row */}
                <div className="cl-card-meta">
                  {client.assigned_lead && (
                    <span className="cl-meta-item">
                      <User size={11} />{client.assigned_lead}
                    </span>
                  )}
                  {client.estimated_go_live && (
                    <span className={`cl-meta-item ${isUrgent ? 'cl-meta-item--urgent' : ''}`}>
                      <CalendarDays size={11} />{shortDate(client.estimated_go_live)}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="cl-card-footer">
                  <Badge status={client.status} />
                  <div className="cl-card-footer-right">
                    {client.blocker_count > 0 && (
                      <span className="cl-blocker-pill">
                        {client.blocker_count} blocker{client.blocker_count > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="cl-view-link">
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
    </div>
  );
}
