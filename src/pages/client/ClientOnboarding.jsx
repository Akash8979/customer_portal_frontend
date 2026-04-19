import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Circle, AlertTriangle,
  Calendar, Rocket, Layers, ListChecks, Clock,
} from 'lucide-react';
import { listOnboarding, getOnboarding, updateTask } from '../../api/onboarding';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import './ClientOnboarding.css';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
}

export default function ClientOnboarding() {
  const { addToast } = useAppStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ['my-onboarding-id'],
    queryFn: () => listOnboarding({ page_size: 1 }).then((r) => r.data.data?.[0]),
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ['my-onboarding', summary?.id],
    queryFn: () => getOnboarding(summary.id).then((r) => r.data.data),
    enabled: !!summary?.id,
  });

  const taskMut = useMutation({
    mutationFn: ({ id, status }) => updateTask(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-onboarding'] });
      addToast({ message: 'Task marked complete', type: 'success' });
    },
  });

  if (isLoading) return <div className="page"><p>Loading…</p></div>;
  if (!project)  return <div className="page"><p className="dim-text">No onboarding project found.</p></div>;

  const allTasks      = (project.phases || []).flatMap((p) => p.tasks || []);
  const doneTasks     = allTasks.filter((t) => t.status === 'COMPLETED').length;
  const blockerTasks  = allTasks.filter((t) => t.is_blocker && t.status !== 'COMPLETED').length;
  const daysToGoLive  = daysUntil(project.estimated_go_live);

  return (
    <div className="page">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Onboarding Tracker</h1>
          <p className="page-subtitle">{project.tenant_name}</p>
        </div>
        <Badge status={project.health_score} />
      </div>

      {/* ── Hero summary card ── */}
      <div className="ob-hero">

        {/* Left — big percentage */}
        <div className="ob-hero-left">
          <div className="ob-pct">
            {project.overall_completion_pct ?? 0}<span className="ob-pct-unit">%</span>
          </div>
          <div className="ob-pct-label">Overall Progress</div>
          <HealthBar score={project.overall_completion_pct ?? 0} />
        </div>

        {/* Right — stats grid */}
        <div className="ob-hero-right">
          <div className="ob-stat-grid">
            <div className="ob-stat">
              <span className="ob-stat-icon ob-stat-icon--blue"><Rocket size={14} /></span>
              <div>
                <div className="ob-stat-value">
                  {daysToGoLive === null ? '—' : daysToGoLive <= 0 ? 'Live!' : `${daysToGoLive}d`}
                </div>
                <div className="ob-stat-label">Days to Go-Live</div>
              </div>
            </div>

            <div className="ob-stat">
              <span className="ob-stat-icon ob-stat-icon--purple"><Layers size={14} /></span>
              <div>
                <div className="ob-stat-value">{(project.phases || []).length}</div>
                <div className="ob-stat-label">Phases</div>
              </div>
            </div>

            <div className="ob-stat">
              <span className="ob-stat-icon ob-stat-icon--green"><ListChecks size={14} /></span>
              <div>
                <div className="ob-stat-value">{doneTasks} / {allTasks.length}</div>
                <div className="ob-stat-label">Tasks Done</div>
              </div>
            </div>

            <div className={`ob-stat ${blockerTasks > 0 ? 'ob-stat--danger' : ''}`}>
              <span className="ob-stat-icon ob-stat-icon--red"><AlertTriangle size={14} /></span>
              <div>
                <div className="ob-stat-value">{blockerTasks}</div>
                <div className="ob-stat-label">Blockers</div>
              </div>
            </div>
          </div>

          <div className="ob-hero-meta">
            <span className="ob-meta-item">
              <Calendar size={11} />
              Est. go-live: <strong>{shortDate(project.estimated_go_live) || '—'}</strong>
            </span>
            {project.assigned_lead && (
              <span className="ob-meta-item">
                <Clock size={11} />
                Lead: <strong>{project.assigned_lead}</strong>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── Phase list ── */}
      <div className="ob-phases">
        {(project.phases || []).map((phase) => {
          const statusKey = (phase.status || 'NOT_STARTED').toLowerCase();
          return (
            <div key={phase.id} className={`ob-phase ob-phase--${statusKey}`}>

              {/* Phase header */}
              <div className="ob-phase-header">
                <div className="ob-phase-header-left">
                  <span className="ob-phase-num">P{phase.order}</span>
                  <div>
                    <div className="ob-phase-name">{phase.name}</div>
                    {phase.due_date && (
                      <div className="ob-phase-due">
                        <Calendar size={10} /> Due {shortDate(phase.due_date)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ob-phase-header-right">
                  <span className="ob-phase-pct">{phase.completion_pct ?? 0}%</span>
                  <Badge status={phase.status} />
                </div>
              </div>

              {/* Phase progress bar */}
              <div className="ob-phase-bar">
                <div className="ob-phase-bar-fill" style={{ width: `${phase.completion_pct ?? 0}%` }} />
              </div>

              {/* Task list */}
              <div className="ob-task-list">
                {(phase.tasks || []).map((task) => {
                  const isDone    = task.status === 'COMPLETED';
                  const isBlocker = task.is_blocker && !isDone;
                  const canCheck  = task.owner === 'CLIENT' && !isDone;

                  return (
                    <div
                      key={task.id}
                      className={`ob-task ${isDone ? 'ob-task--done' : ''} ${isBlocker ? 'ob-task--blocker' : ''}`}
                    >
                      {/* Check icon / button */}
                      <div className="ob-task-check">
                        {isDone ? (
                          <CheckCircle2 size={18} className="ob-check-done" />
                        ) : canCheck ? (
                          <button
                            className="ob-check-btn"
                            onClick={() => taskMut.mutate({ id: task.id, status: 'COMPLETED' })}
                            title="Mark complete"
                          >
                            <Circle size={18} />
                          </button>
                        ) : (
                          <Circle size={18} className="ob-check-pending" />
                        )}
                      </div>

                      {/* Task body */}
                      <div className="ob-task-body">
                        <div className="ob-task-title">{task.title}</div>
                        {task.description && (
                          <div className="ob-task-desc">{task.description}</div>
                        )}
                        <div className="ob-task-meta">
                          <span className={`ob-owner ob-owner--${task.owner.toLowerCase()}`}>
                            {task.owner === 'CLIENT' ? 'Your team' : 'Navigator team'}
                          </span>
                          {task.due_date && (
                            <span className="ob-task-due">
                              <Calendar size={10} />{shortDate(task.due_date)}
                            </span>
                          )}
                          {isBlocker && (
                            <span className="ob-blocker-tag">
                              <AlertTriangle size={10} />Blocker
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right actions */}
                      <div className="ob-task-right">
                        <Badge status={task.status} />
                        {isBlocker && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => navigate('/client/tickets/new')}
                          >
                            Raise Ticket
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
