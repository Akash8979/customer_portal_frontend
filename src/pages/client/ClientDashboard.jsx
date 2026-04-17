import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAI } from '../../hooks/useAI';
import { getTicketKpis, listTickets } from '../../api/tickets';
import { listOnboarding } from '../../api/onboarding';
import { listReleases } from '../../api/releases';
import KpiTile from '../../components/shared/KpiTile';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import SlaTimer from '../../components/shared/SlaTimer';
import { relativeTime, shortDate } from '../../utils/formatters';
import './ClientDashboard.css';

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ai = useAI();

  const { data: kpi } = useQuery({ queryKey: ['ticket-kpis'], queryFn: () => getTicketKpis().then((r) => r.data.data) });
  const { data: tickets } = useQuery({ queryKey: ['my-tickets'], queryFn: () => listTickets({ page_size: 5 }).then((r) => r.data.data) });
  const { data: onboarding } = useQuery({ queryKey: ['my-onboarding-id'], queryFn: () => listOnboarding({ page_size: 1 }).then((r) => r.data.data?.[0]) });
  const { data: releases } = useQuery({ queryKey: ['public-releases'], queryFn: () => listReleases({ page_size: 3 }).then((r) => r.data.data) });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.user_name?.split(' ')[0]}</h1>
          <p className="page-subtitle">{user?.tenant_name} · Customer Portal</p>
        </div>
        <Button variant="ai" size="sm" onClick={() => ai.agentRun({ user_prompt: 'Give me a summary of my account status including open tickets, onboarding progress, and any SLA issues', context_data: { kpis: kpi, onboarding } })}>
          ✦ AI Briefing
        </Button>
      </div>

      <div className="kpi-grid">
        <KpiTile label="Open Tickets" value={kpi?.by_status?.open ?? 0} accent="var(--blue)" />
        <KpiTile label="In Progress" value={kpi?.by_status?.in_progress ?? 0} accent="var(--amber)" />
        <KpiTile label="Resolved" value={kpi?.by_status?.resolved ?? 0} accent="var(--green)" />
        <KpiTile label="Total" value={kpi?.total ?? 0} accent="var(--text-muted)" />
      </div>

      <div className="client-dash-grid">
        {/* My recent tickets */}
        <Card>
          <div className="section-header">
            <h2 className="section-title">My Tickets</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/client/tickets')}>View all</Button>
          </div>
          {(tickets || []).map((t) => (
            <div key={t.id} className="ticket-row" onClick={() => navigate(`/client/tickets/${t.id}`)}>
              <div>
                <div className="ticket-title-sm">{t.title}</div>
                <span className="ticket-time">{relativeTime(t.updated_at)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <Badge status={t.status} />
                {t.sla?.resolution_due_at && <SlaTimer deadline={t.sla.resolution_due_at} label="SLA" />}
              </div>
            </div>
          ))}
          {!tickets?.length && <p className="dim-text">No open tickets.</p>}
        </Card>

        {/* Onboarding */}
        {onboarding && (
          <Card>
            <div className="section-header">
              <h2 className="section-title">Onboarding Progress</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/client/onboarding')}>View</Button>
            </div>
            <div className="onboarding-pct">{onboarding.overall_completion_pct}%</div>
            <HealthBar score={onboarding.overall_completion_pct} />
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              Est. go-live: {shortDate(onboarding.estimated_go_live)}
            </div>
            <Badge status={onboarding.health_score} />
          </Card>
        )}

        {/* Recent releases */}
        <Card>
          <div className="section-header">
            <h2 className="section-title">Recent Releases</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/client/releases')}>View all</Button>
          </div>
          {(releases || []).map((r) => (
            <div key={r.id} className="release-row">
              <div>
                <div className="release-version">v{r.version}</div>
                <div className="release-title">{r.title}</div>
              </div>
              <span className="release-date">{shortDate(r.release_date)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
