import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, Circle, AlertTriangle, Clock,
  User, CalendarDays, ChevronDown, ChevronRight, Plus,
  ShieldAlert, Edit3, Save, X,
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
      assigned_lead:    data.assigned_lead || '',
      status:           data.status,
      health_score:     data.health_score,
      estimated_go_live: data.estimated_go_live || '',
      notes:            data.notes || '',
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

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <button className="od-back-btn" onClick={() => navigate('/internal/onboarding')}>
          <ArrowLeft size={14} /> Onboarding
        </button>
        {!editingProject && (
          <Button variant="ghost" size="sm" icon={<Edit3 size={13} />} onClick={startEditProject}>
            Edit
          </Button>
        )}
      </div>

      {/* ── Hero ── */}
      <div className="od-hero">
        <div className="od-hero-avatar">{(project.tenant_name || '?')[0].toUpperCase()}</div>
        <div className="od-hero-info">
          <h1 className="od-hero-name">{project.tenant_name}</h1>
          <span className="od-hero-tenant">{project.tenant_id}</span>
          <div className="od-hero-badges">
            <Badge status={project.health_score} />
            <Badge status={project.status} />
          </div>
        </div>

        <div className="od-hero-kpis">
          <div className="od-kpi">
            <div className="od-kpi-value">{project.overall_completion_pct ?? 0}%</div>
            <div className="od-kpi-label">Complete</div>
          </div>
          <div className="od-kpi">
            <div className="od-kpi-value">{completedPhases}/{phases.length}</div>
            <div className="od-kpi-label">Phases Done</div>
          </div>
          <div className="od-kpi">
            <div className={`od-kpi-value ${blockers.length > 0 ? 'od-kpi-value--red' : ''}`}>{blockers.length}</div>
            <div className="od-kpi-label">Blockers</div>
          </div>
          {daysLeft !== null && (
            <div className="od-kpi">
              <div className={`od-kpi-value ${daysLeft < 0 ? 'od-kpi-value--red' : daysLeft <= 14 ? 'od-kpi-value--orange' : ''}`}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
              </div>
              <div className="od-kpi-label">{daysLeft < 0 ? 'Overdue' : 'To Go-Live'}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="od-progress-wrap">
        <HealthBar score={project.overall_completion_pct ?? 0} />
      </div>

      <div className="od-body">

        {/* ── Left: meta / edit ── */}
        <div className="od-sidebar">
          <div className="od-card">
            <div className="od-card-title">Project Details</div>

            {editingProject ? (
              <div className="od-edit-form">
                <div className="form-field">
                  <label>Status</label>
                  <select value={projectForm.status} onChange={(e) => setProjectForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Health</label>
                  <select value={projectForm.health_score} onChange={(e) => setProjectForm((f) => ({ ...f, health_score: e.target.value }))}>
                    {HEALTH_OPTIONS.map((h) => <option key={h} value={h}>{h.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Assigned Lead</label>
                  <input value={projectForm.assigned_lead} onChange={(e) => setProjectForm((f) => ({ ...f, assigned_lead: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Est. Go-Live</label>
                  <input type="date" value={projectForm.estimated_go_live} onChange={(e) => setProjectForm((f) => ({ ...f, estimated_go_live: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Notes</label>
                  <textarea rows={3} value={projectForm.notes} onChange={(e) => setProjectForm((f) => ({ ...f, notes: e.target.value }))} />
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

          {/* Blockers panel */}
          {blockers.length > 0 && (
            <div className="od-card od-card--danger">
              <div className="od-card-title">
                <ShieldAlert size={13} style={{ color: 'var(--red)' }} /> Open Blockers
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

        {/* ── Right: phases + tasks ── */}
        <div className="od-main">
          <div className="od-phases-header">
            <span className="od-section-title">Phases & Tasks</span>
            <Button variant="ghost" size="sm" icon={<Plus size={12} />} onClick={() => setAddPhaseOpen(true)}>
              Add Phase
            </Button>
          </div>

          {phases.length === 0 ? (
            <div className="od-empty-phases">
              <p>No phases yet. Add the first phase to get started.</p>
            </div>
          ) : (
            phases.map((phase) => {
              const isOpen = expandedPhases[phase.id] !== false;
              const tasks  = phase.tasks || [];
              const done   = tasks.filter((t) => t.status === 'COMPLETED').length;
              return (
                <div key={phase.id} className="od-phase">
                  <div className="od-phase-header" onClick={() => togglePhase(phase.id)}>
                    <span className="od-phase-toggle">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="od-phase-name">{phase.name}</span>
                    <span className="od-phase-meta">
                      {done}/{tasks.length} tasks
                      {phase.due_date && <> · <CalendarDays size={10} /> {shortDate(phase.due_date)}</>}
                    </span>
                    <Badge status={phase.status} />
                    <select
                      className="od-phase-status-select"
                      value={phase.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        updatePhaseMut.mutate({ phaseId: phase.id, data: { status: e.target.value } });
                      }}
                    >
                      {PHASE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>

                  {isOpen && (
                    <div className="od-task-list">
                      {tasks.map((task) => (
                        <div key={task.id} className={`od-task ${task.is_blocker ? 'od-task--blocker' : ''}`}>
                          <span className="od-task-status-icon">{TASK_ICONS[task.status] || TASK_ICONS.TODO}</span>
                          <div className="od-task-body">
                            <span className="od-task-title">{task.title}</span>
                            {task.assigned_to && <span className="od-task-assignee"><User size={10} />{task.assigned_to}</span>}
                          </div>
                          {task.is_blocker && task.status !== 'COMPLETED' && (
                            <span className="od-task-blocker-tag">blocker</span>
                          )}
                          <select
                            className="od-task-status-select"
                            value={task.status}
                            onChange={(e) => updateTaskMut.mutate({ taskId: task.id, data: { status: e.target.value } })}
                          >
                            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                      ))}
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
