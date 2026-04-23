import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, CheckCircle2, Circle, AlertTriangle, Clock,
  User, CalendarDays, ChevronDown, ChevronRight, Plus,
  ShieldAlert, Edit3, Save, X, BarChart3,
} from 'lucide-react';
import { getOnboarding, updateOnboarding, createPhase, updatePhase, createTask, updateTask } from '../../api/onboarding';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import HealthBar from '../../components/shared/HealthBar';
import Modal from '../../components/shared/Modal';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import './OnboardingDetail.css';

const HEALTH_OPTIONS  = ['ON_TRACK', 'AT_RISK', 'BLOCKED'];
const STATUS_OPTIONS  = ['NOT_STARTED', 'IN_PROGRESS', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED'];
const PHASE_STATUSES  = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];
const TASK_STATUSES   = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

const TASK_ICONS = {
  COMPLETED:   <CheckCircle2 size={14} className="od-task-icon od-task-icon--done" />,
  BLOCKED:     <AlertTriangle size={14} className="od-task-icon od-task-icon--blocked" />,
  IN_PROGRESS: <Clock size={14} className="od-task-icon od-task-icon--progress" />,
  TODO:        <Circle size={14} className="od-task-icon od-task-icon--todo" />,
};

const EMPTY_PHASE = { name: '', description: '', due_date: '' };
const EMPTY_TASK  = { title: '', description: '', owner: 'DELIVERY', assigned_to: '', due_date: '', is_blocker: false };

export default function OnboardingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { addToast } = useAppStore();

  const [expandedPhases, setExpandedPhases] = useState({});
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState(null);

  const [addPhaseOpen, setAddPhaseOpen]  = useState(false);
  const [phaseForm, setPhaseForm]        = useState(EMPTY_PHASE);

  const [addTaskPhase, setAddTaskPhase]  = useState(null);
  const [taskForm, setTaskForm]          = useState(EMPTY_TASK);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['onboarding-detail', id],
    queryFn: () => getOnboarding(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const updateProjMut = useMutation({
    mutationFn: (d) => updateOnboarding(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['onboarding-detail', id]);
      qc.invalidateQueries(['onboarding-list']);
      qc.invalidateQueries(['onboarding-stats']);
      setEditingProject(false);
      addToast({ type: 'success', message: 'Project updated.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Update failed.' }),
  });

  const createPhaseMut = useMutation({
    mutationFn: (d) => createPhase(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['onboarding-detail', id]);
      setAddPhaseOpen(false);
      setPhaseForm(EMPTY_PHASE);
      addToast({ type: 'success', message: 'Phase added.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to add phase.' }),
  });

  const updatePhaseMut = useMutation({
    mutationFn: ({ phaseId, data: d }) => updatePhase(phaseId, d),
    onSuccess: () => qc.invalidateQueries(['onboarding-detail', id]),
  });

  const createTaskMut = useMutation({
    mutationFn: ({ phaseId, data: d }) => createTask(phaseId, d),
    onSuccess: () => {
      qc.invalidateQueries(['onboarding-detail', id]);
      setAddTaskPhase(null);
      setTaskForm(EMPTY_TASK);
      addToast({ type: 'success', message: 'Task added.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to add task.' }),
  });

  const updateTaskMut = useMutation({
    mutationFn: ({ taskId, data: d }) => updateTask(taskId, d),
    onSuccess: () => qc.invalidateQueries(['onboarding-detail', id]),
  });

  function togglePhase(phaseId) {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  }

  function startEditProject() {
    setProjectForm({
      assigned_lead:     data.assigned_lead || '',
      status:            data.status,
      health_score:      data.health_score,
      estimated_go_live: data.estimated_go_live || '',
      notes:             data.notes || '',
    });
    setEditingProject(true);
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="od-skeleton-hero" />
        <div className="od-skeleton-body" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page">
        <div className="od-error">
          <AlertTriangle size={28} />
          <p>Onboarding project not found.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/internal/onboarding')}>Back</Button>
        </div>
      </div>
    );
  }

  const project = data;
  const phases  = project.phases || [];
  const allTasks = phases.flatMap((p) => p.tasks || []);
  const blockers = allTasks.filter((t) => t.is_blocker && t.status !== 'COMPLETED');

  const completedPhases = phases.filter((p) => p.status === 'COMPLETED').length;
  const daysLeft = project.estimated_go_live
    ? Math.ceil((new Date(project.estimated_go_live) - Date.now()) / 86400000)
    : null;

  const pct = project.overall_completion_pct ?? 0;

  return (
    <div className="page">

      {/* ── Top navigation row ── */}
      <div className="od-nav-row">
        <button className="od-back-btn" onClick={() => navigate('/internal/onboarding')}>
          <ChevronLeft size={15} /> Back to Onboarding
        </button>
        {!editingProject && (
          <Button variant="ghost" size="sm" icon={<Edit3 size={13} />} onClick={startEditProject}>
            Edit Project
          </Button>
        )}
      </div>

      {/* ── Hero card ── */}
      <div className="od-hero">
        <div className="od-hero-top">
          <div className="od-hero-avatar">{(project.tenant_name || '?')[0].toUpperCase()}</div>
          <div className="od-hero-identity">
            <h1 className="od-hero-name">{project.tenant_name}</h1>
            <span className="od-hero-tenant-id">{project.tenant_id}</span>
          </div>
          <div className="od-hero-badges">
            <Badge status={project.health_score} />
            <Badge status={project.status} />
          </div>
        </div>

        <div className="od-hero-divider" />

        <div className="od-hero-bottom">
          <div className="od-kpi-strip">
            <div className="od-kpi">
              <div className="od-kpi-value">{pct}%</div>
              <div className="od-kpi-label">Complete</div>
            </div>
            <div className="od-kpi-sep" />
            <div className="od-kpi">
              <div className="od-kpi-value">{completedPhases}/{phases.length}</div>
              <div className="od-kpi-label">Phases Done</div>
            </div>
            <div className="od-kpi-sep" />
            <div className="od-kpi">
              <div className={`od-kpi-value ${blockers.length > 0 ? 'od-kpi-value--red' : ''}`}>{blockers.length}</div>
              <div className="od-kpi-label">Blockers</div>
            </div>
            {daysLeft !== null && (
              <>
                <div className="od-kpi-sep" />
                <div className="od-kpi">
                  <div className={`od-kpi-value ${daysLeft < 0 ? 'od-kpi-value--red' : daysLeft <= 14 ? 'od-kpi-value--orange' : ''}`}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
                  </div>
                  <div className="od-kpi-label">{daysLeft < 0 ? 'Overdue' : 'To Go-Live'}</div>
                </div>
              </>
            )}
          </div>

          <div className="od-hero-progress">
            <div className="od-hero-progress-label">
              <span><BarChart3 size={11} /> Progress</span>
              <span className="od-hero-progress-pct">{pct}%</span>
            </div>
            <HealthBar score={pct} />
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + main ── */}
      <div className="od-body">

        {/* ── Sidebar ── */}
        <div className="od-sidebar">

          {/* Project Details card */}
          <div className="od-card">
            <div className="od-card-title">Project Details</div>

            {editingProject ? (
              <div className="od-edit-form">
                <div className="od-field">
                  <label className="od-field-label">Status</label>
                  <select className="od-field-input" value={projectForm.status} onChange={(e) => setProjectForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="od-field">
                  <label className="od-field-label">Health</label>
                  <select className="od-field-input" value={projectForm.health_score} onChange={(e) => setProjectForm((f) => ({ ...f, health_score: e.target.value }))}>
                    {HEALTH_OPTIONS.map((h) => <option key={h} value={h}>{h.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="od-field">
                  <label className="od-field-label">Assigned Lead</label>
                  <input className="od-field-input" value={projectForm.assigned_lead} onChange={(e) => setProjectForm((f) => ({ ...f, assigned_lead: e.target.value }))} placeholder="Name" />
                </div>
                <div className="od-field">
                  <label className="od-field-label">Est. Go-Live</label>
                  <input className="od-field-input" type="date" value={projectForm.estimated_go_live} onChange={(e) => setProjectForm((f) => ({ ...f, estimated_go_live: e.target.value }))} />
                </div>
                <div className="od-field">
                  <label className="od-field-label">Notes</label>
                  <textarea className="od-field-input od-field-textarea" rows={3} value={projectForm.notes} onChange={(e) => setProjectForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="od-edit-actions">
                  <Button variant="ghost" size="sm" icon={<X size={12} />} onClick={() => setEditingProject(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" icon={<Save size={12} />} loading={updateProjMut.isPending} onClick={() => updateProjMut.mutate(projectForm)}>Save</Button>
                </div>
              </div>
            ) : (
              <dl className="od-meta-list">
                <dt><User size={11} /> Lead</dt>
                <dd>{project.assigned_lead || <span className="od-dim">—</span>}</dd>
                <dt><CalendarDays size={11} /> Est. Go-Live</dt>
                <dd>{project.estimated_go_live ? shortDate(project.estimated_go_live) : <span className="od-dim">—</span>}</dd>
                {project.actual_go_live && (
                  <>
                    <dt><CheckCircle2 size={11} /> Actual Go-Live</dt>
                    <dd>{shortDate(project.actual_go_live)}</dd>
                  </>
                )}
                <dt><Clock size={11} /> Created</dt>
                <dd>{shortDate(project.created_at)}</dd>
                {project.notes && (
                  <>
                    <dt>Notes</dt>
                    <dd className="od-notes">{project.notes}</dd>
                  </>
                )}
              </dl>
            )}
          </div>

          {/* Blockers card */}
          {blockers.length > 0 && (
            <div className="od-card od-card--danger">
              <div className="od-card-title od-card-title--danger">
                <ShieldAlert size={13} /> {blockers.length} Open Blocker{blockers.length > 1 ? 's' : ''}
              </div>
              <ul className="od-blocker-list">
                {blockers.map((t) => (
                  <li key={t.id} className="od-blocker-item">
                    <span className="od-blocker-title">{t.title}</span>
                    {t.blocker_reason && <span className="od-blocker-reason">{t.blocker_reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Main: phases & tasks ── */}
        <div className="od-main">
          <div className="od-phases-header">
            <div>
              <span className="od-section-title">Phases &amp; Tasks</span>
              <span className="od-phase-total-badge">{phases.length} phase{phases.length !== 1 ? 's' : ''}</span>
            </div>
            <Button variant="ghost" size="sm" icon={<Plus size={12} />} onClick={() => setAddPhaseOpen(true)}>
              Add Phase
            </Button>
          </div>

          {phases.length === 0 ? (
            <div className="od-empty-phases">
              <Plus size={22} className="od-empty-icon" />
              <p>No phases yet.</p>
              <span>Add the first phase to start tracking progress.</span>
            </div>
          ) : (
            phases.map((phase, phaseIndex) => {
              const isOpen   = expandedPhases[phase.id] !== false;
              const tasks    = phase.tasks || [];
              const done     = tasks.filter((t) => t.status === 'COMPLETED').length;
              const phasePct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
              const statusKey = (phase.status || 'NOT_STARTED').toLowerCase().replace(/_/g, '-');
              return (
                <div key={phase.id} className={`od-phase od-phase--${statusKey}`}>

                  {/* ── Phase header ── */}
                  <div className="od-phase-header" onClick={() => togglePhase(phase.id)}>
                    <div className={`od-phase-num od-phase-num--${statusKey}`}>
                      {phaseIndex + 1}
                    </div>

                    <div className="od-phase-info">
                      <div className="od-phase-name-row">
                        <span className="od-phase-name">{phase.name}</span>
                        {phase.status === 'COMPLETED' && (
                          <CheckCircle2 size={14} className="od-phase-done-icon" />
                        )}
                      </div>
                      <div className="od-phase-sub">
                        {phase.due_date && (
                          <span className="od-phase-sub-item">
                            <CalendarDays size={10} /> Due {shortDate(phase.due_date)}
                          </span>
                        )}
                        <span className="od-phase-sub-item">
                          {phasePct}% complete
                        </span>
                      </div>
                    </div>

                    <div className="od-phase-right" onClick={(e) => e.stopPropagation()}>
                      <span className="od-phase-count">
                        {done}/{tasks.length}
                      </span>
                      <select
                        className={`od-phase-status-select od-phase-status-select--${statusKey}`}
                        value={phase.status}
                        onChange={(e) => updatePhaseMut.mutate({ phaseId: phase.id, data: { status: e.target.value } })}
                      >
                        {PHASE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>

                    <span className={`od-phase-chevron${isOpen ? ' od-phase-chevron--open' : ''}`}>
                      <ChevronRight size={15} />
                    </span>
                  </div>

                  {/* ── Progress bar ── */}
                  <div className="od-phase-bar-wrap">
                    <div className="od-phase-bar-fill" style={{ width: `${phasePct}%` }} />
                  </div>

                  {/* ── Task list ── */}
                  {isOpen && (
                    <div className="od-task-list">
                      {tasks.length === 0 ? (
                        <div className="od-task-empty">
                          No tasks in this phase yet.
                        </div>
                      ) : (
                        <div className="od-task-rows">
                          {tasks.map((task, taskIndex) => {
                            const isDone    = task.status === 'COMPLETED';
                            const isBlocker = task.is_blocker && !isDone;
                            const tKey      = task.status.toLowerCase().replace(/_/g, '-');
                            return (
                              <div
                                key={task.id}
                                className={`od-task od-task--${tKey}${isBlocker ? ' od-task--blocker' : ''}`}
                              >
                                {/* Timeline connector */}
                                <div className="od-task-timeline-col">
                                  <div className={`od-task-dot od-task-dot--${tKey}`} />
                                  {taskIndex < tasks.length - 1 && (
                                    <div className="od-task-line" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="od-task-content">
                                  <div className="od-task-row1">
                                    <span className={`od-task-name${isDone ? ' od-task-name--done' : ''}`}>
                                      {task.title}
                                    </span>
                                    {isBlocker && (
                                      <span className="od-task-blocker-chip">⚠ Blocker</span>
                                    )}
                                  </div>
                                  {(task.assigned_to || task.due_date) && (
                                    <div className="od-task-meta">
                                      {task.assigned_to && (
                                        <span className="od-task-meta-item">
                                          <User size={9} />{task.assigned_to}
                                        </span>
                                      )}
                                      {task.due_date && (
                                        <span className="od-task-meta-item">
                                          <CalendarDays size={9} />{shortDate(task.due_date)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Status select */}
                                <select
                                  className={`od-task-status-select od-task-status-select--${tKey}`}
                                  value={task.status}
                                  onChange={(e) => updateTaskMut.mutate({ taskId: task.id, data: { status: e.target.value } })}
                                >
                                  {TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <button
                        className="od-add-task-btn"
                        onClick={() => { setAddTaskPhase(phase.id); setTaskForm(EMPTY_TASK); }}
                      >
                        <Plus size={12} /> Add Task
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Add Phase Modal ── */}
      <Modal
        open={addPhaseOpen}
        onClose={() => { setAddPhaseOpen(false); setPhaseForm(EMPTY_PHASE); }}
        title="Add Phase"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setAddPhaseOpen(false); setPhaseForm(EMPTY_PHASE); }}>Cancel</Button>
            <Button variant="primary" loading={createPhaseMut.isPending} onClick={() => createPhaseMut.mutate(phaseForm)}>Add Phase</Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Phase Name</label>
            <input placeholder="e.g. Technical Setup" value={phaseForm.name} onChange={(e) => setPhaseForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea rows={2} value={phaseForm.description} onChange={(e) => setPhaseForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Due Date</label>
            <input type="date" value={phaseForm.due_date} onChange={(e) => setPhaseForm((f) => ({ ...f, due_date: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Add Task Modal ── */}
      <Modal
        open={addTaskPhase !== null}
        onClose={() => { setAddTaskPhase(null); setTaskForm(EMPTY_TASK); }}
        title="Add Task"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setAddTaskPhase(null); setTaskForm(EMPTY_TASK); }}>Cancel</Button>
            <Button
              variant="primary"
              loading={createTaskMut.isPending}
              onClick={() => createTaskMut.mutate({ phaseId: addTaskPhase, data: taskForm })}
            >
              Add Task
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Task Title</label>
            <input placeholder="e.g. Configure SSO" value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Owner</label>
            <select value={taskForm.owner} onChange={(e) => setTaskForm((f) => ({ ...f, owner: e.target.value }))}>
              <option value="DELIVERY">Delivery Team</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>
          <div className="form-field">
            <label>Assigned To</label>
            <input placeholder="Name" value={taskForm.assigned_to} onChange={(e) => setTaskForm((f) => ({ ...f, assigned_to: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Due Date</label>
            <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="form-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={taskForm.is_blocker} onChange={(e) => setTaskForm((f) => ({ ...f, is_blocker: e.target.checked }))} />
              Mark as Blocker
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
