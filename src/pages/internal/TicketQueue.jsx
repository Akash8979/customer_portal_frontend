import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listTickets, updateStatus } from '../../api/tickets';
import { useAI } from '../../hooks/useAI';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import SlaTimer from '../../components/shared/SlaTimer';
import Button from '../../components/shared/Button';
import { relativeTime } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import './TicketQueue.css';

const STATUS_OPTIONS = ['', 'OPEN', 'TRIAGED', 'IN_PROGRESS', 'PENDING_CLIENT', 'PENDING_RELEASE', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const CATEGORY_OPTIONS = ['', 'BUG', 'FEATURE_REQUEST', 'QUESTION', 'ONBOARDING_ISSUE', 'INTEGRATION_ISSUE', 'PERFORMANCE_ISSUE'];

export default function TicketQueue() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const ai = useAI();

  const [filters, setFilters] = useState({ status: '', priority: '', category: '', search: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filters, page],
    queryFn: () => listTickets({ ...filters, page, page_size: 20 }).then((r) => r.data),
  });

  const columns = [
    { key: 'id', label: '#', width: 60, render: (v) => <span className="ticket-id">#{v}</span> },
    { key: 'title', label: 'Title', render: (v) => <span className="truncate">{v}</span> },
    { key: 'category', label: 'Type', render: (v) => <Badge status={v} /> },
    { key: 'priority', label: 'Priority', render: (v) => v ? <Badge priority={v} /> : '—' },
    { key: 'status', label: 'Status', render: (v) => <Badge status={v} /> },
    { key: 'sla', label: 'SLA', render: (_, row) => row.sla?.resolution_due_at ? <SlaTimer deadline={row.sla.resolution_due_at} label="Res" /> : '—' },
    { key: 'assigned_to', label: 'Assignee', render: (v) => v || <span className="dim">Unassigned</span> },
    { key: 'created_at', label: 'Raised', render: (v) => <span title={v}>{relativeTime(v)}</span> },
  ];

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ticket Queue</h1>
          <p className="page-subtitle">{data?.total ?? 0} tickets</p>
        </div>
        <div className="header-actions">
          <Button variant="ai" size="sm" onClick={() => ai.agentRun({ user_prompt: 'Triage all new tickets — classify and prioritise each one', context_data: {} })}>
            ✦ Triage All New
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="filter-search" placeholder="Search tickets…"
          value={filters.search} onChange={(e) => setFilter('search', e.target.value)}
        />
        {[
          { key: 'status', options: STATUS_OPTIONS, label: 'Status' },
          { key: 'priority', options: PRIORITY_OPTIONS, label: 'Priority' },
          { key: 'category', options: CATEGORY_OPTIONS, label: 'Type' },
        ].map(({ key, options, label }) => (
          <select key={key} value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}>
            <option value="">{label}</option>
            {options.filter(Boolean).map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select>
        ))}
        {Object.values(filters).some(Boolean) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilters({ status: '', priority: '', category: '', search: '' }); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        page={page}
        pageSize={20}
        total={data?.total || 0}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/internal/tickets/${row.id}`)}
      />
    </div>
  );
}
