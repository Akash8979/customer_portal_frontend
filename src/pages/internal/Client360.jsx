import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOnboarding } from '../../api/onboarding';
import { listTickets } from '../../api/tickets';
import { useAI } from '../../hooks/useAI';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import KpiTile from '../../components/shared/KpiTile';
import { shortDate } from '../../utils/formatters';
import './Client360.css';

export default function Client360() {
  const { id } = useParams();
  const ai = useAI();

  const { data: project, isLoading } = useQuery({
    queryKey: ['onboarding', id],
    queryFn: () => getOnboarding(id).then((r) => r.data.data),
  });

  const { data: ticketData } = useQuery({
    queryKey: ['tickets-client', project?.tenant_id],
    enabled: !!project?.tenant_id,
    queryFn: () => listTickets({ page_size: 5 }).then((r) => r.data),
  });

  if (isLoading || !project) return <div className="page"><p>Loading…</p></div>;

  const accountData = {
    tenant_name: project.tenant_name,
    assigned_lead: project.assigned_lead,
    health_score: project.health_score,
    onboarding_status: project.status,
    estimated_go_live: project.estimated_go_live,
    ticket_count: ticketData?.total,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => window.history.back()}>← Clients</button>
          <h1 className="page-title">{project.tenant_name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Badge label={`Tenant ${project.tenant_id}`} variant="muted" />
            <Badge status={project.health_score} />
            <Badge status={project.status} />
          </div>
        </div>
      </div>

      {/* AI Actions */}
      <Card>
        <div className="section-header">
          <h2 className="section-title">✦ AI Actions</h2>
        </div>
        <div className="ai-actions-grid">
          {[
            { label: 'Account Health', fn: () => ai.accountHealth(accountData) },
            { label: 'Churn Risk', fn: () => ai.churnRisk(accountData) },
            { label: 'Draft Outreach', fn: () => ai.draftOutreach({ account_data: accountData, purpose: 'Quarterly check-in and relationship building' }) },
            { label: 'Generate QBR Summary', fn: () => ai.agentRun({ user_prompt: 'Generate a quarterly business review summary for this client', context_data: accountData }) },
            { label: 'Create 30-day Plan', fn: () => ai.agentRun({ user_prompt: 'Create a 30-day success plan for this client', context_data: accountData }) },
          ].map((a) => (
            <Button key={a.label} variant="ai" size="sm" onClick={a.fn}>✦ {a.label}</Button>
          ))}
        </div>
      </Card>

      <div className="c360-grid">
        {/* Account Info */}
        <Card>
          <div className="section-header"><h2 className="section-title">Account Info</h2></div>
          <div className="meta-grid">
            <span className="meta-key">Assigned Lead</span><span>{project.assigned_lead || '—'}</span>
            <span className="meta-key">Est. Go-Live</span><span>{shortDate(project.estimated_go_live)}</span>
            <span className="meta-key">Actual Go-Live</span><span>{shortDate(project.actual_go_live)}</span>
            <span className="meta-key">Onboarding</span><span><Badge status={project.status} /></span>
          </div>
        </Card>

        {/* Onboarding */}
        <Card>
          <div className="section-header">
            <h2 className="section-title">Onboarding Progress</h2>
            <span className="pct-label">{project.overall_completion_pct}%</span>
          </div>
          <HealthBar score={project.overall_completion_pct} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(project.phases || []).map((phase) => (
              <div key={phase.id} className="phase-row">
                <span className="phase-name">{phase.name}</span>
                <div style={{ flex: 1 }}><HealthBar score={phase.completion_pct} showLabel={false} /></div>
                <Badge status={phase.status} />
              </div>
            ))}
          </div>
          {project.health_score === 'AT_RISK' && (
            <div style={{ marginTop: 12 }}>
              <Button variant="ai" size="sm" onClick={() => ai.onboardingRecovery({ onboarding_data: project, days_behind: 14 })}>
                ✦ Recovery Plan
              </Button>
            </div>
          )}
        </Card>

        {/* Recent tickets */}
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
    </div>
  );
}
