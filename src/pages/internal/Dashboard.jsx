import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, AlertTriangle, Clock, CheckCircle2,
  Bug, Timer, Users, Rocket,
  LayoutDashboard, ListChecks,
} from 'lucide-react';
import { getTicketKpis } from '../../api/tickets';
import { bugStats } from '../../api/bugs';
import { listOnboarding } from '../../api/onboarding';
import KpiTile from '../../components/shared/KpiTile';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import HealthBar from '../../components/shared/HealthBar';
import PageSkeleton from '../../components/shared/PageSkeleton';
import './Dashboard.css';

export default function InternalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['ticket-kpis'],
    queryFn: () => getTicketKpis().then((r) => r.data.data),
  });

  const { data: bugData } = useQuery({
    queryKey: ['bug-stats'],
    queryFn: () => bugStats().then((r) => r.data.data),
  });

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-list-dashboard'],
    queryFn: () => listOnboarding({ page_size: 5 }).then((r) => r.data.data || []),
  });

  if (kpiLoading) return <PageSkeleton />;

  const kpi    = kpiData || {};
  const atRisk = (onboardingData || []).filter((o) => o.health_score !== 'ON_TRACK');

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Good morning, {user?.user_name?.split(' ')[0]}. Here's what needs your attention today.
          </p>
        </div>
      </div>

      {/* ── KPI Group: Support ── */}
      <div className="kpi-section">
        <div className="kpi-section-label">Support Overview</div>
        <div className="dash-kpi-grid">
          <KpiTile
            label="Open Tickets"
            value={kpi.by_status?.open ?? 0}
            accent="var(--blue)"
            icon={<Ticket size={18} />}
            sublabel={`${(kpi.by_status?.open ?? 0) + (kpi.by_status?.in_progress ?? 0)} active total`}
          />
          <KpiTile
            label="In Progress"
            value={kpi.by_status?.in_progress ?? 0}
            accent="var(--amber)"
            icon={<Clock size={18} />}
            sublabel="Being worked on"
          />
          <KpiTile
            label="Critical Tickets"
            value={kpi.by_priority?.critical ?? 0}
            accent="var(--red)"
            icon={<AlertTriangle size={18} />}
            sublabel="Needs immediate action"
          />
          <KpiTile
            label="Resolved"
            value={kpi.by_status?.resolved ?? 0}
            accent="var(--green)"
            icon={<CheckCircle2 size={18} />}
            sublabel={`${kpi.total ?? 0} total raised`}
          />
        </div>
      </div>

      {/* ── KPI Group: Bugs & Health ── */}
      <div className="kpi-section">
        <div className="kpi-section-label">Bugs &amp; Health</div>
        <div className="dash-kpi-grid">
          <KpiTile
            label="Open Bugs"
            value={bugData?.total_open ?? 0}
            accent="var(--red)"
            icon={<Bug size={18} />}
            sublabel={`${bugData?.critical ?? 0} critical`}
          />
          <KpiTile
            label="Bugs > 7 days"
            value={bugData?.aging_7d ?? 0}
            accent={(bugData?.aging_7d ?? 0) > 0 ? 'var(--orange)' : 'var(--text-muted)'}
            icon={<Timer size={18} />}
            sublabel={`${bugData?.aging_30d ?? 0} over 30 days`}
          />
          <KpiTile
            label="At-Risk Accounts"
            value={atRisk.length}
            accent={atRisk.length > 0 ? 'var(--orange)' : 'var(--green)'}
            icon={<Users size={18} />}
            sublabel={atRisk.length > 0 ? 'Need attention' : 'All on track'}
          />
          <KpiTile
            label="Onboarding Active"
            value={(onboardingData || []).length}
            accent="var(--purple)"
            icon={<Rocket size={18} />}
            sublabel={`${atRisk.length} at risk`}
          />
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="dash-content-grid">

        {/* At-risk onboarding */}
        <Card>
          <div className="dash-section-header">
            <h2 className="section-title">
              <ListChecks size={15} className="section-title-icon" />
              At-Risk Onboarding
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/internal/onboarding')}>
              View all
            </Button>
          </div>
          {atRisk.length === 0 ? (
            <p className="dim-text">All onboarding projects are on track.</p>
          ) : atRisk.map((o) => {
            const accent = o.health_score === 'AT_RISK' ? 'var(--red)' : o.health_score === 'NEEDS_ATTENTION' ? 'var(--orange)' : 'var(--amber)';
            return (
              <div
                key={o.id}
                className="ob-risk-row"
                style={{ '--ob-accent': accent }}
                onClick={() => navigate(`/internal/onboarding/${o.id}`)}
              >
                <div style={{ flex: 1 }}>
                  <div className="ob-risk-name">{o.tenant_name}</div>
                  <HealthBar score={o.overall_completion_pct} />
                </div>
                <Badge status={o.health_score} />
              </div>
            );
          })}
        </Card>

        {/* Ticket breakdown */}
        <Card>
          <div className="dash-section-header">
            <h2 className="section-title">
              <LayoutDashboard size={15} className="section-title-icon" />
              Ticket Breakdown
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/internal/tickets')}>
              View queue
            </Button>
          </div>
          <div className="breakdown-list">
            {[
              { label: 'New',            value: kpi.by_status?.new            ?? 0, color: 'var(--text-muted)' },
              { label: 'Open',           value: kpi.by_status?.open           ?? 0, color: 'var(--blue)' },
              { label: 'In Progress',    value: kpi.by_status?.in_progress    ?? 0, color: 'var(--amber)' },
              { label: 'Pending Client', value: kpi.by_status?.pending_client ?? 0, color: 'var(--orange)' },
              { label: 'Resolved',       value: kpi.by_status?.resolved       ?? 0, color: 'var(--green)' },
            ].map((row) => (
              <div key={row.label} className="breakdown-row">
                <span className="breakdown-dot" style={{ background: row.color }} />
                <span style={{ color: row.color, flex: 1 }}>{row.label}</span>
                <span className="breakdown-val" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bug aging */}
        <Card>
          <div className="dash-section-header">
            <h2 className="section-title">
              <Bug size={15} className="section-title-icon" />
              Bug Aging
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/internal/bugs')}>
              View bugs
            </Button>
          </div>
          <div className="breakdown-list">
            {[
              { label: 'Open (total)',  value: bugData?.total_open ?? 0, color: 'var(--text-secondary)' },
              { label: 'Open > 7 days',  value: bugData?.aging_7d   ?? 0, color: 'var(--orange)' },
              { label: 'Open > 14 days', value: bugData?.aging_14d  ?? 0, color: 'var(--orange)' },
              { label: 'Open > 30 days', value: bugData?.aging_30d  ?? 0, color: 'var(--red)' },
            ].map((row) => (
              <div key={row.label} className="breakdown-row">
                <span className="breakdown-dot" style={{ background: row.value > 0 ? row.color : 'var(--text-dim)' }} />
                <span style={{ flex: 1 }}>{row.label}</span>
                <span className="breakdown-val" style={{ color: row.value > 0 ? row.color : 'var(--text-dim)' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
