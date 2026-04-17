import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listTickets } from '../../api/tickets';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import SlaTimer from '../../components/shared/SlaTimer';
import { relativeTime } from '../../utils/formatters';
import './MyTickets.css';

const PAGE_SIZE = 9;

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
        <Button variant="primary" size="sm" onClick={() => navigate('/client/tickets/new')}>+ Raise Ticket</Button>
      </div>

      <div className="filter-bar">
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {['OPEN','IN_PROGRESS','PENDING_CLIENT','RESOLVED','CLOSED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
          <option value="">All Types</option>
          {['BUG','FEATURE_REQUEST','QUESTION','ONBOARDING_ISSUE','INTEGRATION_ISSUE','PERFORMANCE_ISSUE'].map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
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
              <div className="ticket-card-header">
                <span className="ticket-id">#{t.id}</span>
                <div className="ticket-card-badges">
                  <Badge status={t.status} />
                  {t.priority && <Badge priority={t.priority} />}
                </div>
              </div>
              <h3 className="ticket-card-title">{t.title}</h3>
              <p className="ticket-card-desc">{t.description?.slice(0, 100)}{t.description?.length > 100 ? '…' : ''}</p>
              <div className="ticket-card-footer">
                <span className="ticket-card-type">{t.category?.replace(/_/g, ' ')}</span>
                <span className="ticket-card-time">{relativeTime(t.updated_at)}</span>
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
