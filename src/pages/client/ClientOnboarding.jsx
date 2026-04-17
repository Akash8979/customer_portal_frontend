import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listOnboarding, getOnboarding, updateTask } from '../../api/onboarding';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import './ClientOnboarding.css';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-onboarding'] }),
  });

  if (isLoading) return <div className="page"><p>Loading…</p></div>;
  if (!project) return <div className="page"><p className="dim-text">No onboarding project found.</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Onboarding Tracker</h1>
          <p className="page-subtitle">Est. go-live: {shortDate(project.estimated_go_live)}</p>
        </div>
        <Badge status={project.health_score} />
      </div>

      <div className="onboarding-summary">
        <div className="pct-big">{project.overall_completion_pct}% complete</div>
        <HealthBar score={project.overall_completion_pct} />
      </div>

      <div className="phases-list">
        {(project.phases || []).map((phase) => (
          <div key={phase.id} className="phase-block">
            <div className="phase-header">
              <div>
                <span className="phase-num">Phase {phase.order}</span>
                <span className="phase-name">{phase.name}</span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                <span className="phase-pct">{phase.completion_pct}%</span>
                <Badge status={phase.status} />
              </div>
            </div>
            <HealthBar score={phase.completion_pct} showLabel={false} />

            <div className="task-list">
              {(phase.tasks || []).map((task) => (
                <div key={task.id} className={`task-row ${task.status === 'COMPLETED' ? 'task--done' : ''} ${task.is_blocker ? 'task--blocked' : ''}`}>
                  <div className="task-check">
                    {task.status === 'COMPLETED'
                      ? <span className="check-done">✓</span>
                      : task.owner === 'CLIENT' && task.status !== 'COMPLETED'
                        ? <button className="check-btn" onClick={() => taskMut.mutate({ id: task.id, status: 'COMPLETED' })}>○</button>
                        : <span className="check-pending">○</span>}
                  </div>
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    {task.description && <div className="task-desc">{task.description}</div>}
                    <div className="task-meta">
                      <span className={`task-owner task-owner--${task.owner.toLowerCase()}`}>{task.owner}</span>
                      {task.due_date && <span className="task-due">Due: {shortDate(task.due_date)}</span>}
                      {task.is_blocker && <span className="task-blocker-label">Blocker</span>}
                    </div>
                  </div>
                  <Badge status={task.status} />
                  {task.is_blocker && task.status !== 'COMPLETED' && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/client/tickets/new')}>
                      Raise Ticket
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
