import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useAI } from '../../hooks/useAI';
import { getTicketKpis } from '../../api/tickets';
import { bugStats } from '../../api/bugs';
import { listOnboarding } from '../../api/onboarding';
import KpiTile from '../../components/shared/KpiTile';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import HealthBar from '../../components/shared/HealthBar';
import PageSkeleton from '../../components/shared/PageSkeleton';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function InternalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ai = useAI();

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['ticket-kpis'],
    queryFn: () => getTicketKpis().then((r) => r.data.data),
  });

  const { data: bugData } = useQuery({
    queryKey: ['bug-stats'],
    queryFn: () => bugStats().then((r) => r.data.data),
  });

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-list'],
    queryFn: () => listOnboarding({ page_size: 5 }).then((r) => r.data.data),
  });

  if (kpiLoading) return <PageSkeleton />;

  const kpi = kpiData || {};
  const atRisk = (onboardingData || []).filter((o) => o.health_score !== 'ON_TRACK');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Good morning, {user?.user_name?.split(' ')[0]}. Here's what needs your attention today.</p>
        </div>
        <Button variant="ai" size="sm" onClick={() => ai.agentRun({ user_prompt: 'Give me a daily briefing of the most important items across all clients', context_data: { kpis: kpi, bugs: bugData } })}>
          ✦ AI Daily Digest
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="kpi-grid">
        <KpiTile label="Total Open" value={kpi.by_status?.open ?? 0} accent="var(--blue)" icon="◫" />
        <KpiTile label="In Progress" value={kpi.by_status?.in_progress ?? 0} accent="var(--amber)" icon="⟳" />
        <KpiTile label="Critical Tickets" value={kpi.by_priority?.critical ?? 0} accent="var(--red)" icon="⚠" />
        <KpiTile label="Open Bugs (Critical)" value={bugData?.critical ?? 0} accent="var(--red)" icon="⊘" />
        <KpiTile label="Resolved" value={kpi.by_status?.resolved ?? 0} accent="var(--green)" icon="✓" />
        <KpiTile label="Bugs >7 days" value={bugData?.aging_7d ?? 0} accent="var(--orange)" icon="⌚" />
      </div>

      <div className="dashboard-grid">
        {/* At-risk onboarding */}
        <Card>
          <div className="section-header">
            <h2 className="section-title">At-Risk Onboarding</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/internal/onboarding')}>View all</Button>
          </div>
          {atRisk.length === 0 ? (
            <p className="dim-text">All onboarding projects are on track.</p>
          ) : atRisk.map((o) => (
            <div key={o.id} className="onboarding-row" onClick={() => navigate(`/internal/onboarding/${o.id}`)}>
              <div>
                <div className="row-title">{o.tenant_name}</div>
                <HealthBar score={o.overall_completion_pct} />
              </div>
              <Badge status={o.health_score} />
            </div>
          ))}
        </Card>

        {/* Ticket breakdown */}
        <Card>
          <div className="section-header">
            <h2 className="section-title">Ticket Breakdown</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/internal/tickets')}>View queue</Button>
          </div>
          <div className="breakdown-list">
            {[
              { label: 'New', value: kpi.by_status?.new ?? 0, color: 'var(--text-muted)' },
              { label: 'Open', value: kpi.by_status?.open ?? 0, color: 'var(--blue)' },
              { label: 'In Progress', value: kpi.by_status?.in_progress ?? 0, color: 'var(--amber)' },
              { label: 'Pending Client', value: kpi.by_status?.pending_client ?? 0, color: 'var(--orange)' },
              { label: 'Resolved', value: kpi.by_status?.resolved ?? 0, color: 'var(--green)' },
            ].map((row) => (
              <div key={row.label} className="breakdown-row">
                <span style={{ color: row.color }}>{row.label}</span>
                <span className="breakdown-val">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bug aging */}
        <Card>
          <div className="section-header">
            <h2 className="section-title">Bug Aging</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/internal/bugs')}>View bugs</Button>
          </div>
          <div className="breakdown-list">
            {[
              { label: 'Open (total)', value: bugData?.total_open ?? 0 },
              { label: 'Open >7 days', value: bugData?.aging_7d ?? 0 },
              { label: 'Open >14 days', value: bugData?.aging_14d ?? 0 },
              { label: 'Open >30 days', value: bugData?.aging_30d ?? 0 },
            ].map((row) => (
              <div key={row.label} className="breakdown-row">
                <span>{row.label}</span>
                <span className="breakdown-val" style={{ color: row.value > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
