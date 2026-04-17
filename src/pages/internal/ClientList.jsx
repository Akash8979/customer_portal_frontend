import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listOnboarding } from '../../api/onboarding';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import HealthBar from '../../components/shared/HealthBar';
import { shortDate } from '../../utils/formatters';
import './ClientList.css';

export default function ClientList() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-all'],
    queryFn: () => listOnboarding({ page_size: 100 }).then((r) => r.data),
  });

  const columns = [
    { key: 'tenant_name', label: 'Client' },
    { key: 'tenant_id', label: 'Tenant ID', render: (v) => <span className="ticket-id">{v}</span> },
    { key: 'assigned_lead', label: 'Lead', render: (v) => v || '—' },
    { key: 'overall_completion_pct', label: 'Onboarding', render: (v, row) => (
      <div style={{ minWidth: 120 }}>
        <HealthBar score={v} />
      </div>
    )},
    { key: 'health_score', label: 'Health', render: (v) => <Badge status={v} /> },
    { key: 'estimated_go_live', label: 'Go-Live', render: (v) => shortDate(v) },
    { key: 'blocker_count', label: 'Blockers', render: (v) => v > 0 ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{v}</span> : <span style={{ color: 'var(--text-dim)' }}>0</span> },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{data?.total ?? 0} clients</p>
        </div>
      </div>
      <DataTable
        columns={columns} rows={data?.data || []} loading={isLoading}
        total={data?.total || 0} page={1} pageSize={100}
        onRowClick={(row) => navigate(`/internal/clients/${row.id}`)}
      />
    </div>
  );
}
