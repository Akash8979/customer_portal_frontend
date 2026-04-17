import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listBugs, createBug, getBug, updateBug, bugStats } from '../../api/bugs';
import { useAI } from '../../hooks/useAI';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import KpiTile from '../../components/shared/KpiTile';
import Modal from '../../components/shared/Modal';
import { relativeTime } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import './BugTracker.css';

const SEVERITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['', 'REPORTED', 'REPRODUCED', 'ROOT_CAUSE_IDENTIFIED', 'FIX_IN_PROGRESS', 'IN_QA', 'DEPLOYED', 'VERIFIED', 'CLOSED'];

export default function BugTracker() {
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const ai = useAI();
  const [filters, setFilters] = useState({ severity: '', status: '' });
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'HIGH', steps_to_reproduce: '', environment: 'Production', client_impact: '' });

  const { data: stats } = useQuery({ queryKey: ['bug-stats'], queryFn: () => bugStats().then((r) => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['bugs', filters, page],
    queryFn: () => listBugs({ ...filters, page, page_size: 20 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => createBug(d),
    onSuccess: () => { qc.invalidateQueries(['bugs']); qc.invalidateQueries(['bug-stats']); setShowCreate(false); addToast({ type: 'success', message: 'Bug created.' }); },
  });

  const columns = [
    { key: 'id', label: '#', width: 50, render: (v) => <span className="ticket-id">#{v}</span> },
    { key: 'title', label: 'Title' },
    { key: 'severity', label: 'Severity', render: (v) => <Badge priority={v} /> },
    { key: 'status', label: 'Status', render: (v) => <Badge status={v} /> },
    { key: 'assignee', label: 'Assignee', render: (v) => v || '—' },
    { key: 'affected_tenants', label: 'Clients', render: (v) => Array.isArray(v) ? v.join(', ') || '—' : '—' },
    { key: 'created_at', label: 'Reported', render: (v) => relativeTime(v) },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Bug Tracker</h1></div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ Report Bug</Button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        <KpiTile label="Open" value={stats?.total_open ?? 0} accent="var(--red)" />
        <KpiTile label="Critical" value={stats?.critical ?? 0} accent="var(--red)" />
        <KpiTile label="High" value={stats?.high ?? 0} accent="var(--orange)" />
        <KpiTile label=">7 days" value={stats?.aging_7d ?? 0} accent="var(--orange)" />
        <KpiTile label=">30 days" value={stats?.aging_30d ?? 0} accent="var(--red)" />
      </div>

      <div className="filter-bar">
        {[
          { key: 'severity', options: SEVERITY_OPTIONS, label: 'Severity' },
          { key: 'status', options: STATUS_OPTIONS, label: 'Status' },
        ].map(({ key, options, label }) => (
          <select key={key} value={filters[key]} onChange={(e) => { setFilters((f) => ({ ...f, [key]: e.target.value })); setPage(1); }}>
            <option value="">{label}</option>
            {options.filter(Boolean).map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select>
        ))}
      </div>

      <DataTable
        columns={columns} rows={data?.data || []} loading={isLoading}
        page={page} pageSize={20} total={data?.total || 0} onPageChange={setPage}
        onRowClick={(row) => {/* open drawer or route */}}
      />

      {/* Create Bug Modal */}
      <Modal
        open={showCreate} onClose={() => setShowCreate(false)} title="Report Bug" size="lg"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Create Bug</Button>
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
        <div style={{ marginTop: 12 }}>
          <Button variant="ai" size="sm" onClick={() => ai.agentRun({ user_prompt: 'Suggest likely root cause and affected clients for this bug', context_data: form })}>✦ AI Analysis</Button>
        </div>
      </Modal>
    </div>
  );
}
