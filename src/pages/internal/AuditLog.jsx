import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Search } from 'lucide-react';
import { listAuditLogs } from '../../api/audit';
import FilterSelect from '../../components/shared/FilterSelect';
import Pagination from '../../components/shared/Pagination';
import { relativeTime } from '../../utils/formatters';
import './AuditLog.css';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'TICKET_CREATE',        label: 'Ticket Create' },
  { value: 'TICKET_UPDATE',        label: 'Ticket Update' },
  { value: 'TICKET_STATUS_UPDATE', label: 'Ticket Status' },
  { value: 'COMMENT_CREATE',       label: 'Comment Create' },
  { value: 'BUG_CREATE',           label: 'Bug Create' },
  { value: 'BUG_UPDATE',           label: 'Bug Update' },
  { value: 'BUG_STATUS_UPDATE',    label: 'Bug Status' },
  { value: 'USER_CREATE',          label: 'User Create' },
  { value: 'USER_ACTIVATE',        label: 'User Activate' },
  { value: 'USER_DEACTIVATE',      label: 'User Deactivate' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'TICKET',     label: 'Ticket' },
  { value: 'BUG',        label: 'Bug' },
  { value: 'COMMENT',    label: 'Comment' },
  { value: 'USER',       label: 'User' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'RELEASE',    label: 'Release' },
];

const ACTION_COLOR = {
  TICKET_CREATE:        'var(--blue)',
  TICKET_UPDATE:        'var(--amber)',
  TICKET_STATUS_UPDATE: 'var(--purple)',
  COMMENT_CREATE:       'var(--text-muted)',
  BUG_CREATE:           'var(--red)',
  BUG_UPDATE:           'var(--orange)',
  BUG_STATUS_UPDATE:    'var(--orange)',
  USER_CREATE:          'var(--green)',
  USER_ACTIVATE:        'var(--green)',
  USER_DEACTIVATE:      'var(--red)',
};

const ROLE_COLOR = {
  ADMIN:        'var(--red)',
  LEAD:         'var(--orange)',
  AGENT:        'var(--blue)',
  CLIENT_ADMIN: 'var(--purple)',
  CLIENT_USER:  'var(--text-muted)',
};

function DetailCell({ detail }) {
  if (!detail || !Object.keys(detail).length) return <span className="al-dim">—</span>;
  return (
    <div className="al-detail">
      {Object.entries(detail).map(([k, v]) => (
        <span key={k} className="al-detail-item">
          <span className="al-detail-key">{k}:</span>{' '}
          <span className="al-detail-val">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
        </span>
      ))}
    </div>
  );
}

export default function AuditLog() {
  const [search,       setSearch]       = useState('');
  const [action,       setAction]       = useState('');
  const [resourceType, setResourceType] = useState('');
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [page,         setPage]         = useState(1);

  const PAGE_SIZE = 10;

  const params = { search, action, resource_type: resourceType, from_date: fromDate, to_date: toDate, page, page_size: PAGE_SIZE };

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params).then((r) => r.data),
    keepPreviousData: true,
  });

  const rows       = data?.data || [];
  const total      = data?.total || 0;
  const totalPages = data?.total_pages || 1;
  const hasFilters = search || action || resourceType || fromDate || toDate;

  function clearFilters() {
    setSearch(''); setAction(''); setResourceType('');
    setFromDate(''); setToDate(''); setPage(1);
  }

  return (
    <div className="page al-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">{total} event{total !== 1 ? 's' : ''} recorded</p>
        </div>
        <div className="al-header-icon">
          <ShieldCheck size={20} />
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="al-search-wrap">
          <Search size={13} className="al-search-icon" />
          <input
            className="al-search"
            placeholder="Search user, action, resource…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <FilterSelect value={action}       options={ACTION_OPTIONS}   onChange={(v) => { setAction(v);       setPage(1); }} placeholder="All Actions" />
        <FilterSelect value={resourceType} options={RESOURCE_OPTIONS} onChange={(v) => { setResourceType(v); setPage(1); }} placeholder="All Resources" />
        <input
          type="date"
          className="al-date-input"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          title="From date"
        />
        <input
          type="date"
          className="al-date-input"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          title="To date"
        />
        {hasFilters && (
          <button className="al-clear-btn" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="al-table-wrap">
        {isLoading ? (
          <div className="al-loading">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="al-empty">No audit events found.</div>
        ) : (
          <table className="al-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>ID</th>
                <th>Detail</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="al-td-time" title={row.created_at}>
                    {relativeTime(row.created_at)}
                  </td>
                  <td className="al-td-user">
                    <span className="al-user-name">{row.user_name || row.user_id}</span>
                    {row.tenant_id && <span className="al-tenant-chip">T{row.tenant_id}</span>}
                  </td>
                  <td>
                    <span className="al-role-chip" style={{ color: ROLE_COLOR[row.user_role] || 'var(--text-muted)' }}>
                      {row.user_role || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="al-action-chip" style={{ '--action-color': ACTION_COLOR[row.action] || 'var(--text-muted)' }}>
                      {row.action}
                    </span>
                  </td>
                  <td className="al-td-resource">{row.resource_type || '—'}</td>
                  <td className="al-td-id">
                    {row.resource_id ? <span className="al-id-chip">#{row.resource_id}</span> : '—'}
                  </td>
                  <td><DetailCell detail={row.detail} /></td>
                  <td className="al-td-ip">{row.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
