import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, AlertTriangle, Clock, UserX, Search,
} from 'lucide-react';
import { listTickets, getTicketKpis } from '../../api/tickets';
import SlaTimer from '../../components/shared/SlaTimer';
import FilterSelect from '../../components/shared/FilterSelect';
import { relativeTime } from '../../utils/formatters';
import './TicketQueue.css';

const COLUMNS = [
  { key: 'OPEN',            label: 'Open',             accent: 'var(--blue)' },
  { key: 'TRIAGED',         label: 'Triaged',          accent: 'var(--purple)' },
  { key: 'IN_PROGRESS',     label: 'In Progress',      accent: 'var(--amber)' },
  { key: 'PENDING_CLIENT',  label: 'Pending Client',   accent: 'var(--orange)' },
  { key: 'PENDING_RELEASE', label: 'Pending Release',  accent: 'var(--text-muted)' },
  { key: 'RESOLVED',        label: 'Resolved',         accent: 'var(--green)' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  ...['CRITICAL','HIGH','MEDIUM','LOW'].map((v) => ({ value: v, label: v })),
];
const CATEGORY_OPTIONS = [
  { value: '', label: 'All Types' },
  ...['BUG','FEATURE_REQUEST','QUESTION','ONBOARDING_ISSUE','INTEGRATION_ISSUE','PERFORMANCE_ISSUE']
    .map((v) => ({ value: v, label: v.replace(/_/g, ' ') })),
];

const PRIORITY_DOT = {
  CRITICAL: 'var(--red)',
  HIGH:     'var(--orange)',
  MEDIUM:   'var(--amber)',
  LOW:      'var(--blue)',
};

function assigneeInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function TicketQueue() {
  const navigate = useNavigate();
  const [search,   setSearch]   = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');

  const { data: kpi } = useQuery({
    queryKey: ['ticket-kpis'],
    queryFn:  () => getTicketKpis().then((r) => r.data.data),
  });

  // Fetch all active tickets for the board (no status filter, large page)
  const { data, isLoading } = useQuery({
    queryKey: ['tickets-board', { priority, category, search }],
    queryFn:  () => listTickets({ priority, category, search, page_size: 200 }).then((r) => r.data),
  });

  const allTickets = data?.data || [];
  const total      = data?.total || 0;

  const hasFilters = search || priority || category;

  const byStatus = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => { map[c.key] = []; });
    allTickets.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [allTickets]);

  return (
    <div className="page tq-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ticket Board</h1>
          <p className="page-subtitle">{total} ticket{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="tq-stats-grid">
        <div className="tq-stat">
          <div className="tq-stat-icon tq-stat-icon--blue"><Ticket size={16} /></div>
          <div>
            <div className="tq-stat-value">{kpi?.by_status?.open ?? 0}</div>
            <div className="tq-stat-label">Open</div>
          </div>
        </div>
        <div className="tq-stat">
          <div className="tq-stat-icon tq-stat-icon--amber"><Clock size={16} /></div>
          <div>
            <div className="tq-stat-value">{kpi?.by_status?.in_progress ?? 0}</div>
            <div className="tq-stat-label">In Progress</div>
          </div>
        </div>
        <div className="tq-stat">
          <div className="tq-stat-icon tq-stat-icon--red"><AlertTriangle size={16} /></div>
          <div>
            <div className="tq-stat-value">{kpi?.by_priority?.critical ?? 0}</div>
            <div className="tq-stat-label">Critical</div>
          </div>
        </div>
        <div className="tq-stat">
          <div className="tq-stat-icon tq-stat-icon--orange"><UserX size={16} /></div>
          <div>
            <div className="tq-stat-value">{kpi?.by_status?.pending_client ?? 0}</div>
            <div className="tq-stat-label">Pending Client</div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="tq-search-wrap">
          <Search size={13} className="tq-search-icon" />
          <input
            className="tq-search"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} placeholder="All Priorities" />
        <FilterSelect value={category} options={CATEGORY_OPTIONS} onChange={setCategory} placeholder="All Types" />
        {hasFilters && (
          <button className="tq-clear-btn" onClick={() => { setSearch(''); setPriority(''); setCategory(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Kanban Board ── */}
      {isLoading ? (
        <div className="tq-board">
          {COLUMNS.map((col) => (
            <div key={col.key} className="tq-col" style={{ '--col-accent': col.accent }}>
              <div className="tq-col-header">
                <span className="tq-col-title">{col.label}</span>
                <span className="tq-col-count">—</span>
              </div>
              <div className="tq-col-cards">
                {[1, 2, 3].map((i) => <div key={i} className="tq-card-skeleton" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tq-board">
          {COLUMNS.map((col) => {
            const colTickets = byStatus[col.key] || [];
            return (
              <div key={col.key} className="tq-col" style={{ '--col-accent': col.accent }}>
                {/* Column header */}
                <div className="tq-col-header">
                  <span className="tq-col-title">{col.label}</span>
                  <span className="tq-col-count">{colTickets.length}</span>
                </div>

                {/* Cards */}
                <div className="tq-col-cards">
                  {colTickets.length === 0 && (
                    <div className="tq-col-empty">No tickets</div>
                  )}
                  {colTickets.map((t) => (
                    <div
                      key={t.id}
                      className="tq-card"
                      style={{ '--priority-dot': PRIORITY_DOT[t.priority] || 'var(--border-mid)' }}
                      onClick={() => navigate(`/internal/tickets/${t.id}`)}
                    >
                      {/* Top: type chip + priority dot */}
                      <div className="tq-card-top">
                        {t.category && (
                          <span className="tq-cat-chip">
                            {t.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        {t.priority && (
                          <span className="tq-priority-dot" title={t.priority} />
                        )}
                      </div>

                      {/* Title */}
                      <div className="tq-card-title">{t.title}</div>

                      {/* SLA if present */}
                      {t.sla?.resolution_due_at && (
                        <SlaTimer deadline={t.sla.resolution_due_at} label="SLA" />
                      )}

                      {/* Footer: ID + time + assignee avatar */}
                      <div className="tq-card-footer">
                        <span className="tq-id-chip">#{t.id}</span>
                        <span className="tq-card-time">{relativeTime(t.created_at)}</span>
                        <div
                          className="tq-avatar"
                          title={t.assigned_to || 'Unassigned'}
                          style={t.assigned_to ? {} : { opacity: 0.4 }}
                        >
                          {assigneeInitials(t.assigned_to)}
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
    </div>
  );
}
