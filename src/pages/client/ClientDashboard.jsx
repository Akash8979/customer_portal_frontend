import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, Zap, Settings2, CheckCircle2,
  Rocket, CalendarDays, Ban, Timer,
  ListChecks, Package, Lightbulb,
} from 'lucide-react';
import { getTicketKpis, listTickets } from '../../api/tickets';
import { listOnboarding, getOnboarding } from '../../api/onboarding';
import { listReleases, listFeatureRequests } from '../../api/releases';
import KpiTile from '../../components/shared/KpiTile';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import SlaTimer from '../../components/shared/SlaTimer';
import { relativeTime, shortDate } from '../../utils/formatters';
import './ClientDashboard.css';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
}


export default function ClientDashboard() {
  const navigate = useNavigate();
  const { data: kpi } = useQuery({
    queryKey: ['ticket-kpis'],
    queryFn: () => getTicketKpis().then((r) => r.data.data),
  });

  const { data: tickets } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => listTickets({ page_size: 5 }).then((r) => r.data.data),
  });

  const { data: onboardingSummary } = useQuery({
    queryKey: ['my-onboarding-id'],
    queryFn: () => listOnboarding({ page_size: 1 }).then((r) => r.data.data?.[0]),
  });

  const { data: onboarding } = useQuery({
    queryKey: ['my-onboarding', onboardingSummary?.id],
    queryFn: () => getOnboarding(onboardingSummary.id).then((r) => r.data.data),
    enabled: !!onboardingSummary?.id,
  });

  const { data: releases } = useQuery({
    queryKey: ['public-releases'],
    queryFn: () => listReleases({ page_size: 4 }).then((r) => r.data.data),
  });

  const { data: featureRequests } = useQuery({
    queryKey: ['my-feature-requests'],
    queryFn: () => listFeatureRequests({ page_size: 3 }).then((r) => r.data.data),
  });

  // Derived metrics
  const daysToGoLive = daysUntil(onboarding?.estimated_go_live);
  const isGoLiveUrgent = daysToGoLive !== null && daysToGoLive > 0 && daysToGoLive <= 14;

  const blockedTasks = (onboarding?.phases || []).reduce(
    (acc, p) => acc + (p.tasks || []).filter((t) => t.status === 'BLOCKED').length,
    0
  );

  const slaAtRisk = (tickets || []).filter((t) => {
    if (!t.sla?.resolution_due_at) return false;
    return (new Date(t.sla.resolution_due_at) - Date.now()) < 4 * 3600000;
  }).length;

  const totalActive = (kpi?.by_status?.open ?? 0) + (kpi?.by_status?.in_progress ?? 0);

  return (
    <div className="page">

      {/* ── KPIs: Support ── */}
      <div className="kpi-section">
        <div className="kpi-section-label">Support Overview</div>
        <div className="dash-kpi-grid">
          <KpiTile
            label="Open Tickets"
            value={kpi?.by_status?.open ?? 0}
            accent="var(--blue)"
            icon={<Ticket size={18} />}
            sublabel={`${totalActive} active total`}
          />
          <KpiTile
            label="Needs Your Input"
            value={kpi?.by_status?.pending_client ?? 0}
            accent="var(--orange)"
            icon={<Zap size={18} />}
            sublabel="Awaiting your response"
          />
          <KpiTile
            label="In Progress"
            value={kpi?.by_status?.in_progress ?? 0}
            accent="var(--amber)"
            icon={<Settings2 size={18} />}
            sublabel="Being worked on"
          />
          <KpiTile
            label="Resolved"
            value={kpi?.by_status?.resolved ?? 0}
            accent="var(--green)"
            icon={<CheckCircle2 size={18} />}
            sublabel={`${kpi?.total ?? 0} total raised`}
          />
        </div>
      </div>

      {/* ── KPIs: Delivery & Product ── */}
      <div className="kpi-section">
        <div className="kpi-section-label">Delivery &amp; Product</div>
        <div className="dash-kpi-grid">
          <KpiTile
            label="Onboarding Progress"
            value={`${onboarding?.overall_completion_pct ?? 0}%`}
            accent="var(--green)"
            icon={<Rocket size={18} />}
            sublabel={
              onboarding?.health_score
                ? `Health: ${onboarding.health_score.replace(/_/g, ' ')}`
                : 'No active project'
            }
          />
          <KpiTile
            label="Days to Go-Live"
            value={
              daysToGoLive === null ? '—'
                : daysToGoLive <= 0 ? 'Live!'
                : daysToGoLive
            }
            accent={isGoLiveUrgent ? 'var(--orange)' : 'var(--purple)'}
            icon={<CalendarDays size={18} />}
            sublabel={onboarding?.estimated_go_live ? shortDate(onboarding.estimated_go_live) : 'No date set'}
          />
          <KpiTile
            label="Blocked Tasks"
            value={blockedTasks}
            accent={blockedTasks > 0 ? 'var(--red)' : 'var(--text-muted)'}
            icon={<Ban size={18} />}
            sublabel={blockedTasks > 0 ? 'Need attention' : 'All clear'}
          />
          <KpiTile
            label="SLA At Risk"
            value={slaAtRisk}
            accent={slaAtRisk > 0 ? 'var(--red)' : 'var(--green)'}
            icon={<Timer size={18} />}
            sublabel={slaAtRisk > 0 ? 'Breaching in < 4h' : 'All on track'}
          />
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="client-dash-grid">

        {/* Tickets */}
        <Card>
          <div className="section-header">
            <h2 className="section-title"><Ticket size={15} className="section-title-icon" />Recent Tickets</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/client/tickets')}>View all</Button>
          </div>

          {(tickets || []).map((t) => (
            <div
              key={t.id}
              className="ticket-row"
              onClick={() => navigate(`/client/tickets/${t.id}`)}
            >
              <div className="ticket-row-left">
                {t.priority && <Badge priority={t.priority} size="sm" />}
                <div>
                  <div className="ticket-title-sm">{t.title}</div>
                  <span className="ticket-time">{relativeTime(t.updated_at)}</span>
                </div>
              </div>
              <div className="ticket-row-right">
                <Badge status={t.status} />
                {t.sla?.resolution_due_at && (
                  <SlaTimer deadline={t.sla.resolution_due_at} label="SLA" />
                )}
              </div>
            </div>
          ))}

          {!tickets?.length && <p className="dim-text">No open tickets — all good!</p>}

          <div className="card-cta-row">
            <Button variant="primary" size="sm" onClick={() => navigate('/client/tickets/new')}>
              + Raise Ticket
            </Button>
          </div>
        </Card>

        {/* Onboarding */}
        <Card>
          <div className="section-header">
            <h2 className="section-title"><ListChecks size={15} className="section-title-icon" />Onboarding Tracker</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/client/onboarding')}>
              Full detail
            </Button>
          </div>

          {onboarding ? (
            <>
              <div className="onboarding-header-row">
                <div className="onboarding-pct">{onboarding.overall_completion_pct}%</div>
                <Badge status={onboarding.health_score} />
              </div>

              <HealthBar score={onboarding.overall_completion_pct} />

              <div className="onboarding-meta">
                <span>Est. go-live: {shortDate(onboarding.estimated_go_live)}</span>
                {daysToGoLive !== null && daysToGoLive > 0 && (
                  <span className={`days-pill${isGoLiveUrgent ? ' days-pill--urgent' : ''}`}>
                    {daysToGoLive}d remaining
                  </span>
                )}
                {daysToGoLive !== null && daysToGoLive <= 0 && (
                  <span className="days-pill days-pill--live">Live!</span>
                )}
              </div>

              <div className="phases-mini">
                {(onboarding.phases || []).slice(0, 5).map((p) => (
                  <div key={p.id} className={`phase-mini-row phase-mini-row--${(p.status || 'NOT_STARTED').toLowerCase()}`}>
                    <div className="phase-mini-left">
                      <span className="phase-mini-num">P{p.order}</span>
                      <span className="phase-mini-name">{p.name}</span>
                    </div>
                    <div className="phase-mini-right">
                      <div className="phase-mini-bar">
                        <div
                          className="phase-mini-fill"
                          style={{ width: `${p.completion_pct ?? 0}%` }}
                        />
                      </div>
                      <span className="phase-mini-pct">{p.completion_pct ?? 0}%</span>
                      <Badge status={p.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>

              {blockedTasks > 0 && (
                <div className="blocked-alert">
                  <span>⚠</span>
                  {blockedTasks} blocked task{blockedTasks > 1 ? 's' : ''} need attention
                </div>
              )}
            </>
          ) : (
            <p className="dim-text">No active onboarding project.</p>
          )}
        </Card>

        {/* Right column */}
        <div className="dash-right-col">

          {/* Releases */}
          <Card>
            <div className="section-header">
              <h2 className="section-title"><Package size={15} className="section-title-icon" />Recent Releases</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/client/releases')}>
                View all
              </Button>
            </div>
            {(releases || []).map((r) => (
              <div key={r.id} className="release-row">
                <div>
                  <div className="release-version">v{r.version}</div>
                  <div className="release-title">{r.title}</div>
                </div>
                <div className="release-row-right">
                  {r.is_hotfix && <Badge label="Hotfix" variant="danger" />}
                  <span className="release-date">{shortDate(r.release_date)}</span>
                </div>
              </div>
            ))}
            {!releases?.length && <p className="dim-text">No releases yet.</p>}
          </Card>

          {/* Feature Requests */}
          <Card>
            <div className="section-header">
              <h2 className="section-title"><Lightbulb size={15} className="section-title-icon" />Feature Requests</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/client/roadmap')}>
                Roadmap
              </Button>
            </div>
            {(featureRequests || []).length > 0
              ? (featureRequests || []).map((fr) => (
                <div key={fr.id} className={`fr-row fr-row--${(fr.status || 'UNDER_REVIEW').toLowerCase()}`}>
                  <div className="fr-row-left">
                    <span className="fr-dot" />
                    <div className="fr-title">{fr.title}</div>
                  </div>
                  <Badge status={fr.status} />
                </div>
              ))
              : <p className="dim-text">No requests submitted yet.</p>
            }
            <div className="card-cta-row">
              <Button variant="primary" size="sm" icon={<Lightbulb size={13} />} onClick={() => navigate('/client/roadmap')}>
                Request a Feature
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
