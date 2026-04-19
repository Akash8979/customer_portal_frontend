import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, Tag } from 'lucide-react';
import { listTickets } from '../../api/tickets';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import SlaTimer from '../../components/shared/SlaTimer';
import FilterSelect from '../../components/shared/FilterSelect';
import { relativeTime } from '../../utils/formatters';
import './MyTickets.css';

const STATUS_OPTIONS = [
  { value: 'OPEN',           label: 'Open' },
  { value: 'IN_PROGRESS',    label: 'In Progress' },
  { value: 'PENDING_CLIENT', label: 'Pending Client' },
  { value: 'RESOLVED',       label: 'Resolved' },
  { value: 'CLOSED',         label: 'Closed' },
];

const CATEGORY_OPTIONS = [
  { value: 'BUG',                  label: 'Bug' },
  { value: 'FEATURE_REQUEST',      label: 'Feature Request' },
  { value: 'QUESTION',             label: 'Question' },
  { value: 'ONBOARDING_ISSUE',     label: 'Onboarding Issue' },
  { value: 'INTEGRATION_ISSUE',    label: 'Integration Issue' },
  { value: 'PERFORMANCE_ISSUE',    label: 'Performance Issue' },
];

const PAGE_SIZE = 10;

export default function MyTickets() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', category: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filters, page],
    queryFn: () => listTickets({ ...filters, page, page_size: PAGE_SIZE }).then((r) => r.data),
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const setFilter = (key, val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tickets</h1>
          <p className="page-subtitle">{total} ticket{total !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/client/tickets/new')}>+ Raise Ticket</Button>
      </div>

      <div className="filter-bar">
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
        />
        <FilterSelect
          value={filters.category}
          onChange={(v) => setFilter('category', v)}
          options={CATEGORY_OPTIONS}
          placeholder="All Types"
        />
        {(filters.status || filters.category) && (
          <button className="filter-clear-btn" onClick={() => { setFilters({ status: '', category: '' }); setPage(1); }}>
            Clear ×
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="ticket-grid">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <div key={i} className="ticket-card ticket-card--skeleton" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="tickets-empty">
          <p>No tickets found.</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/client/tickets/new')}>Raise your first ticket</Button>
        </div>
      ) : (
        <div className="ticket-grid">
          {tickets.map((t) => (
            <div key={t.id} className={`ticket-card priority--${(t.priority || 'low').toLowerCase()}`} onClick={() => navigate(`/client/tickets/${t.id}`)}>

              <div className="ticket-card-top">
                <span className="ticket-id-chip">#{t.id}</span>
                <Badge status={t.status} />
              </div>

              <div className="ticket-card-body">
                <h3 className="ticket-card-title">{t.title}</h3>
                <p className="ticket-card-desc">{t.description?.slice(0, 110)}{t.description?.length > 110 ? '…' : ''}</p>
              </div>

              <div className="ticket-card-footer">
                <div className="ticket-card-meta">
                  {t.category && (
                    <span className="ticket-card-type">
                      <Tag size={10} />{t.category.replace(/_/g, ' ')}
                    </span>
                  )}
                  {t.priority && <Badge priority={t.priority} />}
                </div>
                <span className="ticket-card-time">
                  <Clock size={10} />{relativeTime(t.updated_at)}
                </span>
              </div>

              {t.sla?.resolution_due_at && (
                <div className="ticket-card-sla">
                  <SlaTimer deadline={t.sla.resolution_due_at} label="SLA" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                : <button key={p} className={`page-btn ${p === page ? 'page-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )}
          </div>
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
