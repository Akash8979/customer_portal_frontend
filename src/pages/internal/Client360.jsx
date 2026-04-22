import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, ShieldCheck, Edit3, Check, X } from 'lucide-react';
import { getOnboarding } from '../../api/onboarding';
import { listTickets } from '../../api/tickets';
import { listSlaPolicies, upsertSlaPolicy } from '../../api/sla';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import HealthBar from '../../components/shared/HealthBar';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import './Client360.css';

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const PRIORITY_META = {
  CRITICAL: { color: 'var(--red)',    label: 'Critical' },
  HIGH:     { color: 'var(--orange)', label: 'High' },
  MEDIUM:   { color: 'var(--amber)',  label: 'Medium' },
  LOW:      { color: 'var(--green)',  label: 'Low' },
};

function minutesToDisplay(mins) {
  if (!mins && mins !== 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function SlaCard({ tenantId }) {
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({ response_time_minutes: '', resolution_time_minutes: '' });

  const { data: slaData, isLoading } = useQuery({
    queryKey: ['sla-policies', tenantId],
    queryFn: () => listSlaPolicies({ tenant_id: tenantId }).then((r) => r.data.data),
    enabled: !!tenantId,
  });

  const upsertMut = useMutation({
    mutationFn: upsertSlaPolicy,
    onSuccess: () => {
      qc.invalidateQueries(['sla-policies', tenantId]);
      setEditingRow(null);
      addToast({ type: 'success', message: 'SLA policy saved.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to save SLA.' }),
  });

  const policyMap = Object.fromEntries((slaData || []).map((p) => [p.priority, p]));

  function startEdit(priority) {
    const p = policyMap[priority];
    setEditForm({
      response_time_minutes:   p?.response_time_minutes ?? '',
      resolution_time_minutes: p?.resolution_time_minutes ?? '',
    });
    setEditingRow(priority);
  }

  function save(priority) {
    const resp  = parseInt(editForm.response_time_minutes, 10);
    const resol = parseInt(editForm.resolution_time_minutes, 10);
    if (!resp || !resol || resp < 1 || resol < 1) {
      addToast({ type: 'error', message: 'Enter valid positive numbers.' });
      return;
    }
    upsertMut.mutate({ tenant_id: tenantId, priority, response_time_minutes: resp, resolution_time_minutes: resol });
  }

  return (
    <div className="c360-sla-section">
      <div className="c360-sla-header">
        <span className="c360-sla-title">
          <ShieldCheck size={14} />
          SLA Policies
        </span>
        <span className="c360-sla-subtitle">Per-priority response &amp; resolution targets for this client</span>
      </div>

      <div className="datatable-scroll">
        <table className="datatable c360-sla-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Response Target</th>
              <th>Resolution Target</th>
              <th>Last Updated</th>
              <th style={{ width: 88 }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="loading-row">Loading…</td></tr>
            ) : PRIORITIES.map((priority) => {
              const p       = policyMap[priority];
              const meta    = PRIORITY_META[priority];
              const editing = editingRow === priority;

              return (
                <tr key={priority} className={editing ? 'c360-sla-row--editing' : ''}>

                  {/* Priority */}
                  <td>
                    <span className="c360-sla-priority" style={{ '--p-color': meta.color }}>
                      <span className="c360-sla-dot" />
                      {meta.label}
                    </span>
                  </td>

                  {/* Response */}
                  <td>
                    {editing ? (
                      <div className="c360-sla-input-wrap">
                        <input
                          autoFocus
                          type="number" min="1"
                          className="c360-sla-input"
                          placeholder="e.g. 60"
                          value={editForm.response_time_minutes}
                          onChange={(e) => setEditForm((f) => ({ ...f, response_time_minutes: e.target.value }))}
                        />
                        <span className="c360-sla-unit">min</span>
                      </div>
                    ) : (
                      <span className={p ? 'c360-sla-val' : 'c360-sla-val--empty'}>
                        {p ? (
                          <><Clock size={11} className="c360-sla-clock" />{minutesToDisplay(p.response_time_minutes)}</>
                        ) : 'Not configured'}
                      </span>
                    )}
                  </td>

                  {/* Resolution */}
                  <td>
                    {editing ? (
                      <div className="c360-sla-input-wrap">
                        <input
                          type="number" min="1"
                          className="c360-sla-input"
                          placeholder="e.g. 480"
                          value={editForm.resolution_time_minutes}
                          onChange={(e) => setEditForm((f) => ({ ...f, resolution_time_minutes: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') save(priority); if (e.key === 'Escape') setEditingRow(null); }}
                        />
                        <span className="c360-sla-unit">min</span>
                      </div>
                    ) : (
                      <span className={p ? 'c360-sla-val' : 'c360-sla-val--empty'}>
                        {p ? (
                          <><Clock size={11} className="c360-sla-clock" />{minutesToDisplay(p.resolution_time_minutes)}</>
                        ) : 'Not configured'}
                      </span>
                    )}
                  </td>

                  {/* Last updated */}
                  <td>
                    <span className="c360-sla-updated">
                      {p ? shortDate(p.updated_at) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    {editing ? (
                      <div className="c360-sla-actions">
                        <button
                          className="c360-sla-btn c360-sla-btn--save"
                          onClick={() => save(priority)}
                          disabled={upsertMut.isPending}
                          title="Save"
                        >
                          <Check size={13} /> Save
                        </button>
                        <button
                          className="c360-sla-btn c360-sla-btn--cancel"
                          onClick={() => setEditingRow(null)}
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="c360-sla-btn c360-sla-btn--edit"
                        onClick={() => startEdit(priority)}
                      >
                        <Edit3 size={12} /> {p ? 'Edit' : 'Set'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="c360-sla-hint">
        <Clock size={10} /> Response = time to first agent reply &nbsp;·&nbsp; Resolution = time to close ticket &nbsp;·&nbsp; All times in minutes
      </p>
    </div>
  );
}

export default function Client360() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ['onboarding', id],
    queryFn: () => getOnboarding(id).then((r) => r.data.data),
  });

  const { data: ticketData } = useQuery({
    queryKey: ['tickets-client', project?.tenant_id],
    enabled: !!project?.tenant_id,
    queryFn: () => listTickets({ tenant_id: project.tenant_id, page_size: 5 }).then((r) => r.data),
  });

  if (isLoading || !project) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/internal/clients')}>
            <ArrowLeft size={13} /> Clients
          </button>
          <h1 className="page-title">{project.tenant_name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Badge label={`Tenant ${project.tenant_id}`} variant="muted" />
            <Badge status={project.health_score} />
            <Badge status={project.status} />
          </div>
        </div>
      </div>

      <div className="c360-grid">

        {/* Account Info */}
        <Card>
          <div className="section-header"><h2 className="section-title">Account Info</h2></div>
          <div className="meta-grid">
            <span className="meta-key">Assigned Lead</span><span>{project.assigned_lead || '—'}</span>
            <span className="meta-key">Est. Go-Live</span><span>{project.estimated_go_live ? shortDate(project.estimated_go_live) : '—'}</span>
            <span className="meta-key">Actual Go-Live</span><span>{project.actual_go_live ? shortDate(project.actual_go_live) : '—'}</span>
            <span className="meta-key">Onboarding</span><span><Badge status={project.status} /></span>
          </div>
        </Card>

        {/* Onboarding Progress */}
        <Card>
          <div className="section-header">
            <h2 className="section-title">Onboarding Progress</h2>
            <span className="pct-label">{project.overall_completion_pct ?? 0}%</span>
          </div>
          <HealthBar score={project.overall_completion_pct ?? 0} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(project.phases || []).map((phase) => {
              const accent =
                phase.status === 'COMPLETED'   ? 'var(--green)' :
                phase.status === 'IN_PROGRESS' ? 'var(--amber)' :
                phase.status === 'BLOCKED'     ? 'var(--red)'   : 'var(--border-mid)';
              return (
                <div key={phase.id} className="phase-row" style={{ '--phase-accent': accent }}>
                  <span className="phase-name">{phase.name}</span>
                  <div style={{ flex: 1 }}><HealthBar score={phase.completion_pct ?? 0} showLabel={false} /></div>
                  <Badge status={phase.status} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <div className="section-header"><h2 className="section-title">Recent Tickets</h2></div>
          {(ticketData?.data || []).map((t) => (
            <div key={t.id} className="ticket-row">
              <span className="ticket-id">#{t.id}</span>
              <span className="ticket-title-sm truncate">{t.title}</span>
              <Badge status={t.status} />
            </div>
          ))}
          {!ticketData?.data?.length && <p className="dim-text">No recent tickets.</p>}
        </Card>

      </div>

      {/* SLA Policies — full width below the grid */}
      <SlaCard tenantId={project.tenant_id} />
    </div>
  );
}
