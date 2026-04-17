import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listOnboarding, createOnboarding } from '../../api/onboarding';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import Modal from '../../components/shared/Modal';
import { shortDate } from '../../utils/formatters';
import './OnboardingList.css';

export default function OnboardingList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ tenant_id: '', tenant_name: '', assigned_lead: '', estimated_go_live: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-list'],
    queryFn: () => listOnboarding({ page_size: 100 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: createOnboarding,
    onSuccess: () => { qc.invalidateQueries(['onboarding-list']); setShowCreate(false); },
  });

  const columns = [
    { key: 'tenant_name', label: 'Client' },
    { key: 'assigned_lead', label: 'Lead', render: (v) => v || '—' },
    { key: 'overall_completion_pct', label: 'Progress', render: (v) => <HealthBar score={v} /> },
    { key: 'health_score', label: 'Health', render: (v) => <Badge status={v} /> },
    { key: 'status', label: 'Status', render: (v) => <Badge status={v} /> },
    { key: 'estimated_go_live', label: 'Go-Live', render: (v) => shortDate(v) },
    { key: 'blocker_count', label: 'Blockers', render: (v) => v > 0 ? <span style={{ color: 'var(--red)' }}>{v}</span> : '0' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Onboarding</h1>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ New Project</Button>
      </div>
      <DataTable
        columns={columns} rows={data?.data || []} loading={isLoading}
        total={data?.total || 0} page={1} pageSize={100}
        onRowClick={(row) => navigate(`/internal/onboarding/${row.id}`)}
      />

      <Modal
        open={showCreate} onClose={() => setShowCreate(false)} title="New Onboarding Project"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Create</Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field"><label>Tenant ID</label><input value={form.tenant_id} onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))} /></div>
          <div className="form-field"><label>Client Name</label><input value={form.tenant_name} onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))} /></div>
          <div className="form-field"><label>Assigned Lead</label><input value={form.assigned_lead} onChange={(e) => setForm((f) => ({ ...f, assigned_lead: e.target.value }))} /></div>
          <div className="form-field"><label>Est. Go-Live</label><input type="date" value={form.estimated_go_live} onChange={(e) => setForm((f) => ({ ...f, estimated_go_live: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}
