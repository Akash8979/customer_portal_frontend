import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, User, Shield, Building2, ToggleLeft, ToggleRight,
  Check, Save, Clock, Calendar, AlertTriangle,
} from 'lucide-react';
import { getUser, updateUser, activateUser, deactivateUser, rolePermissionMap } from '../../api/users';
import Avatar from '../../components/shared/Avatar';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import useAppStore from '../../stores/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { shortDate, relativeTime } from '../../utils/formatters';
import './UserEditPage.css';

const ALL_ROLES    = ['CLIENT_ADMIN', 'CLIENT_USER', 'AGENT', 'LEAD', 'ADMIN'];
const CLIENT_ROLES = ['CLIENT_ADMIN', 'CLIENT_USER'];

const PERM_GROUPS = [
  { label: 'Tickets',    keys: ['view_tickets','create_ticket','update_ticket','close_ticket'] },
  { label: 'Internal',   keys: ['view_internal_notes','add_internal_note','assign_ticket','escalate_ticket','view_all_tenants'] },
  { label: 'Onboarding', keys: ['manage_onboarding','view_onboarding','complete_onboarding_task'] },
  { label: 'Releases',   keys: ['view_releases','manage_releases','publish_release'] },
  { label: 'Bugs',       keys: ['view_bugs','create_bug','manage_bugs'] },
  { label: 'Features',   keys: ['view_features','request_feature','manage_features','vote_feature'] },
  { label: 'Admin',      keys: ['manage_users','view_reports','ai_access'] },
];

const PERM_LABEL = {
  view_tickets: 'View Tickets', create_ticket: 'Create Ticket',
  update_ticket: 'Update Ticket', close_ticket: 'Close Ticket',
  view_internal_notes: 'Internal Notes', add_internal_note: 'Add Note',
  assign_ticket: 'Assign Ticket', escalate_ticket: 'Escalate',
  view_all_tenants: 'All Tenants', manage_onboarding: 'Manage Onboarding',
  view_onboarding: 'View Onboarding', complete_onboarding_task: 'Complete Task',
  view_releases: 'View Releases', manage_releases: 'Manage Releases',
  publish_release: 'Publish Release', view_bugs: 'View Bugs',
  create_bug: 'Create Bug', manage_bugs: 'Manage Bugs',
  view_features: 'View Features', request_feature: 'Request Feature',
  manage_features: 'Manage Features', vote_feature: 'Vote Feature',
  manage_users: 'Manage Users', view_reports: 'Reports',
  ai_access: 'AI Access',
};

function useFormState(user) {
  const init = user ? {
    user_name:          user.user_name,
    role:               user.role,
    tenant_id:          user.tenant_id || '',
    tenant_name:        user.tenant_name || '',
    is_active:          user.is_active,
    custom_permissions: user.custom_permissions || [],
  } : null;

  const [form, setForm]   = useState(init);
  const [dirty, setDirty] = useState(false);

  function reset() { setForm(init); setDirty(false); }
  function patch(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  return { form, dirty, patch, reset };
}

export default function UserEditPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { addToast } = useAppStore();
  const { is }    = useAuth();
  const isAdmin   = is('ADMIN');
  const availableRoles = isAdmin ? ALL_ROLES : CLIENT_ROLES;

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user-edit', id],
    queryFn:  () => getUser(id).then((r) => r.data.data),
    enabled:  !!id,
  });

  const { data: rolePerms } = useQuery({
    queryKey: ['role-permissions'],
    queryFn:  () => rolePermissionMap().then((r) => r.data.data),
  });

  const { form, dirty, patch, reset } = useFormState(user);

  const updateMut = useMutation({
    mutationFn: (data) => updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['user-edit', id]);
      qc.invalidateQueries(['users']);
      addToast({ type: 'success', message: 'Changes saved.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Save failed.' }),
  });

  const [toggling, setToggling] = useState(false);
  async function toggleActive() {
    if (!form) return;
    setToggling(true);
    try {
      if (form.is_active) await deactivateUser(id);
      else await activateUser(id);
      patch('is_active', !form.is_active);
      qc.invalidateQueries(['users']);
      addToast({ type: 'success', message: `User ${form.is_active ? 'deactivated' : 'activated'}.` });
    } catch {
      addToast({ type: 'error', message: 'Failed to update status.' });
    } finally {
      setToggling(false);
    }
  }

  function togglePerm(perm) {
    if (!form) return;
    const basePerms = rolePerms?.[form.role] || [];
    if (basePerms.includes(perm)) return;
    const has = form.custom_permissions.includes(perm);
    patch('custom_permissions', has
      ? form.custom_permissions.filter((p) => p !== perm)
      : [...form.custom_permissions, perm]
    );
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="page">
        <div className="ue-skeleton-hero" />
        <div className="ue-skeleton-body" />
      </div>
    );
  }

  /* ── Error ── */
  if (isError || !user) {
    return (
      <div className="page">
        <div className="ue-error-state">
          <AlertTriangle size={28} />
          <p>Could not load user. They may not exist or you don't have access.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/internal/users')}>
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const basePerms    = rolePerms?.[form?.role] || [];
  const isClientRole = form?.role === 'CLIENT_ADMIN' || form?.role === 'CLIENT_USER';

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <button className="ue-back-btn" onClick={() => navigate('/internal/users')}>
          <ArrowLeft size={14} />
          User Management
        </button>
        {dirty && (
          <Button
            variant="primary" size="sm"
            icon={<Save size={13} />}
            loading={updateMut.isPending}
            onClick={() => updateMut.mutate(form)}
          >
            Save Changes
          </Button>
        )}
      </div>

      {/* ── Identity hero ── */}
      <div className={`ue-hero ${form?.is_active ? '' : 'ue-hero--inactive'}`}>
        <div className="ue-hero-avatar">
          <Avatar name={user.user_name} size="lg" />
          <div className={`ue-avatar-dot ${form?.is_active ? 'ue-avatar-dot--active' : 'ue-avatar-dot--inactive'}`} />
        </div>

        <div className="ue-hero-info">
          <div className="ue-hero-name">{user.user_name}</div>
          <div className="ue-hero-email">{user.email}</div>
          <div className="ue-hero-badges">
            <Badge status={form?.role || user.role} />
            <span className={`ue-status-pill ${form?.is_active ? 'ue-status--active' : 'ue-status--inactive'}`}>
              {form?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="ue-hero-meta">
          {user.last_login && (
            <span className="ue-meta-item">
              <Clock size={11} />Last seen <strong>{relativeTime(user.last_login)}</strong>
            </span>
          )}
          <span className="ue-meta-item">
            <Calendar size={11} />Joined <strong>{shortDate(user.created_at)}</strong>
          </span>
        </div>

        <button
          className={`ue-toggle-btn ${form?.is_active ? 'ue-toggle--active' : 'ue-toggle--inactive'}`}
          onClick={toggleActive}
          disabled={toggling}
        >
          {form?.is_active
            ? <><ToggleRight size={18} /> Active</>
            : <><ToggleLeft  size={18} /> Inactive</>
          }
        </button>
      </div>

      {/* ── Body ── */}
      <div className="ue-body">

        {/* Left — Basic info + Role */}
        <div className="ue-col">

          <div className="ue-card">
            <div className="ue-card-header">
              <User size={13} className="ue-card-icon ue-card-icon--blue" />
              <h2 className="ue-card-title">Basic Info</h2>
            </div>
            <div className="ue-card-body">
              <div className="form-field">
                <label>Full Name</label>
                <input
                  value={form?.user_name || ''}
                  onChange={(e) => patch('user_name', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input value={user.email} disabled className="ue-input-disabled" />
                <span className="ue-field-hint">Email cannot be changed.</span>
              </div>
            </div>
          </div>

          <div className="ue-card">
            <div className="ue-card-header">
              <Shield size={13} className="ue-card-icon ue-card-icon--purple" />
              <h2 className="ue-card-title">Role & Access</h2>
            </div>
            <div className="ue-card-body">
              <div className="form-field">
                <label>Role</label>
                <select
                  value={form?.role || ''}
                  onChange={(e) => patch('role', e.target.value)}
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              {isClientRole && (
                <>
                  <div className="form-field">
                    <label>Tenant ID</label>
                    <input
                      value={form?.tenant_id || ''}
                      onChange={(e) => patch('tenant_id', e.target.value)}
                      placeholder="acme-corp"
                    />
                  </div>
                  <div className="form-field">
                    <label>Tenant Name</label>
                    <input
                      value={form?.tenant_name || ''}
                      onChange={(e) => patch('tenant_name', e.target.value)}
                      placeholder="Acme Corp"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Right — Permissions */}
        <div className="ue-col ue-col--wide">
          <div className="ue-card">
            <div className="ue-card-header">
              <Building2 size={13} className="ue-card-icon ue-card-icon--amber" />
              <h2 className="ue-card-title">Permissions</h2>
              <span className="ue-perm-hint">Base role grants are locked. Toggle extras below.</span>
            </div>

            <div className="ue-perm-groups">
              {PERM_GROUPS.map((group) => (
                <div key={group.label} className="ue-perm-group">
                  <div className="ue-perm-group-label">{group.label}</div>
                  <div className="ue-perm-row">
                    {group.keys.map((perm) => {
                      const isBase    = basePerms.includes(perm);
                      const isCustom  = form?.custom_permissions.includes(perm);
                      const isGranted = isBase || isCustom;
                      return (
                        <button
                          key={perm}
                          disabled={isBase}
                          onClick={() => togglePerm(perm)}
                          className={[
                            'ue-perm-chip',
                            isBase   ? 'ue-perm-chip--base'   : '',
                            isCustom ? 'ue-perm-chip--custom' : '',
                            !isGranted ? 'ue-perm-chip--off'  : '',
                          ].join(' ')}
                          title={isBase ? 'Base permission — cannot be removed' : undefined}
                        >
                          {isGranted && <Check size={10} />}
                          {PERM_LABEL[perm] ?? perm}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Sticky save footer ── */}
      {dirty && (
        <div className="ue-save-footer">
          <span className="ue-save-hint">Unsaved changes</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={reset}>Discard</Button>
            <Button
              variant="primary" size="sm"
              icon={<Save size={13} />}
              loading={updateMut.isPending}
              onClick={() => updateMut.mutate(form)}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
