import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Shield, Check, Users, UserCheck, UserX, ShieldCheck, X, ChevronDown } from 'lucide-react';
import { listUsers, createUser, updateUser, deactivateUser, activateUser, rolePermissionMap } from '../../api/users'; // updateUser used in bulk role change
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import Avatar from '../../components/shared/Avatar';
import FilterSelect from '../../components/shared/FilterSelect';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import './UserManagement.css';

const ALL_ROLES = ['CLIENT_ADMIN', 'CLIENT_USER', 'AGENT', 'LEAD', 'ADMIN'];
const CLIENT_ROLES = ['CLIENT_ADMIN', 'CLIENT_USER'];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  ...ALL_ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') })),
];

const PERMISSION_LABELS = {
  view_tickets: 'View Tickets',
  create_ticket: 'Create Ticket',
  update_ticket: 'Update Ticket',
  close_ticket: 'Close Ticket',
  view_internal_notes: 'View Internal Notes',
  add_internal_note: 'Add Internal Note',
  assign_ticket: 'Assign Ticket',
  escalate_ticket: 'Escalate Ticket',
  view_all_tenants: 'View All Tenants',
  manage_onboarding: 'Manage Onboarding',
  view_onboarding: 'View Onboarding',
  complete_onboarding_task: 'Complete Onboarding Task',
  view_releases: 'View Releases',
  manage_releases: 'Manage Releases',
  publish_release: 'Publish Release',
  view_bugs: 'View Bugs',
  create_bug: 'Create Bug',
  manage_bugs: 'Manage Bugs',
  view_features: 'View Features',
  request_feature: 'Request Feature',
  manage_features: 'Manage Features',
  vote_feature: 'Vote Feature',
  manage_users: 'Manage Users',
  view_reports: 'View Reports',
  ai_access: 'AI Access',
};

function PermissionMatrix({ rolePermissions, selectedRole, customPerms, onChange }) {
  if (!rolePermissions || !selectedRole) return null;
  const basePerms = rolePermissions[selectedRole] || [];
  const allPerms  = Object.keys(PERMISSION_LABELS);

  return (
    <div className="perm-matrix">
      <p className="perm-matrix-hint">
        <Shield size={12} style={{ display: 'inline', marginRight: 5 }} />
        Base permissions for <strong>{selectedRole.replace(/_/g, ' ')}</strong> are pre-granted. Toggle custom additions below.
      </p>
      <div className="perm-grid">
        {allPerms.map((perm) => {
          const isBase    = basePerms.includes(perm);
          const isCustom  = customPerms.includes(perm);
          const isGranted = isBase || isCustom;
          return (
            <label
              key={perm}
              className={`perm-cell ${isBase ? 'perm-cell--base' : ''} ${isCustom ? 'perm-cell--custom' : ''}`}
              title={isBase ? 'Base permission — cannot be removed' : ''}
            >
              <span className="perm-check">{isGranted ? <Check size={11} /> : null}</span>
              <input
                type="checkbox"
                checked={isGranted}
                disabled={isBase}
                onChange={() => {
                  if (isBase) return;
                  onChange(isCustom
                    ? customPerms.filter((p) => p !== perm)
                    : [...customPerms, perm]
                  );
                }}
              />
              <span className="perm-name">{PERMISSION_LABELS[perm] ?? perm}</span>
              {isBase   && <span className="perm-tag perm-tag--base">base</span>}
              {isCustom && <span className="perm-tag perm-tag--custom">+extra</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bulk action bar ── */
function BulkBar({ count, onActivate, onDeactivate, onChangeRole, onClear, loading, availableRoles }) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  return (
    <div className="bulk-bar">
      <div className="bulk-bar-left">
        <span className="bulk-count">{count} selected</span>
        <button className="bulk-clear" onClick={onClear} title="Clear selection">
          <X size={13} />
        </button>
      </div>

      <div className="bulk-bar-actions">
        <Button
          size="sm" variant="secondary"
          icon={<UserCheck size={13} />}
          loading={loading === 'activate'}
          onClick={onActivate}
        >
          Activate
        </Button>
        <Button
          size="sm" variant="danger"
          icon={<UserX size={13} />}
          loading={loading === 'deactivate'}
          onClick={onDeactivate}
        >
          Deactivate
        </Button>

        {/* Role picker */}
        <div className="bulk-role-wrap">
          <Button
            size="sm" variant="secondary"
            icon={<ShieldCheck size={13} />}
            onClick={() => setRoleMenuOpen((o) => !o)}
          >
            Change Role <ChevronDown size={11} style={{ marginLeft: 2 }} />
          </Button>
          {roleMenuOpen && (
            <div className="bulk-role-dropdown">
              {availableRoles.map((r) => (
                <button
                  key={r}
                  className="bulk-role-option"
                  onClick={() => { setRoleMenuOpen(false); onChangeRole(r); }}
                >
                  {r.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  user_name: '', email: '', password: '',
  role: 'CLIENT_USER', tenant_id: '', tenant_name: '', custom_permissions: [],
};

export default function UserManagement() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { addToast } = useAppStore();
  const { is } = useAuth();
  const isAdmin = is('ADMIN');

  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);

  /* bulk selection */
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', roleFilter, page],
    queryFn: () => listUsers({ role: roleFilter, page, page_size: 20 }).then((r) => r.data),
  });

  const { data: rolePerms } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => rolePermissionMap().then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      addToast({ type: 'success', message: 'User created successfully.' });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to create user.' }),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }) => active ? deactivateUser(id) : activateUser(id),
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      addToast({ type: 'success', message: 'User status updated.' });
    },
  });

  const rows = data?.data || [];
  const pageIds = rows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  function toggleRow(id, e) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(e) {
    e.stopPropagation();
    if (allPageSelected) {
      setSelected((prev) => { const n = new Set(prev); pageIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); pageIds.forEach((id) => n.add(id)); return n; });
    }
  }

  async function bulkActivate() {
    setBulkLoading('activate');
    const ids = [...selected];
    await Promise.all(ids.map((id) => activateUser(id)));
    qc.invalidateQueries(['users']);
    setSelected(new Set());
    setBulkLoading(null);
    addToast({ type: 'success', message: `${ids.length} user(s) activated.` });
  }

  async function bulkDeactivate() {
    setBulkLoading('deactivate');
    const ids = [...selected];
    await Promise.all(ids.map((id) => deactivateUser(id)));
    qc.invalidateQueries(['users']);
    setSelected(new Set());
    setBulkLoading(null);
    addToast({ type: 'success', message: `${ids.length} user(s) deactivated.` });
  }

  async function bulkChangeRole(role) {
    setBulkLoading('role');
    const ids = [...selected];
    await Promise.all(ids.map((id) => updateUser(id, { role })));
    qc.invalidateQueries(['users']);
    setSelected(new Set());
    setBulkLoading(null);
    addToast({ type: 'success', message: `Role changed to ${role.replace(/_/g, ' ')} for ${ids.length} user(s).` });
  }

  const availableRoles = isAdmin ? ALL_ROLES : CLIENT_ROLES;

  const columns = [
    {
      key: '_select', label: (
        <input
          type="checkbox"
          className="um-checkbox"
          checked={allPageSelected}
          ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
          onChange={toggleAll}
        />
      ),
      width: 40,
      render: (_, row) => (
        <input
          type="checkbox"
          className="um-checkbox"
          checked={selected.has(row.id)}
          onChange={(e) => toggleRow(row.id, e)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'user_name', label: 'User',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={v} size="sm" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role',        label: 'Role',       render: (v) => <Badge status={v} /> },
    { key: 'tenant_name', label: 'Tenant',     render: (v) => v || <span style={{ color: 'var(--text-dim)' }}>—</span> },
    {
      key: 'is_active', label: 'Status',
      render: (v) => (
        <span className={`um-status-pill ${v ? 'um-status--active' : 'um-status--inactive'}`}>
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'last_login', label: 'Last Login', render: (v) => v ? shortDate(v) : <span style={{ color: 'var(--text-dim)' }}>Never</span> },
    { key: 'created_at', label: 'Created',    render: (v) => shortDate(v) },
    {
      key: 'id', label: '', width: 130,
      render: (v, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="sm" variant="ghost"
            onClick={(e) => { e.stopPropagation(); navigate(`/internal/users/${v}/edit`); }}
          >
            Edit
          </Button>
          <Button
            size="sm" variant={row.is_active ? 'danger' : 'secondary'}
            onClick={(e) => { e.stopPropagation(); toggleActiveMut.mutate({ id: v, active: row.is_active }); }}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            <Users size={12} style={{ display: 'inline', marginRight: 5 }} />
            {data?.total ?? 0} users
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<UserPlus size={13} />} onClick={() => setShowCreate(true)}>
          New User
        </Button>
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <FilterSelect
          value={roleFilter}
          options={ROLE_OPTIONS}
          onChange={(v) => { setRoleFilter(v); setPage(1); }}
          placeholder="All Roles"
        />
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          loading={bulkLoading}
          availableRoles={availableRoles}
          onActivate={bulkActivate}
          onDeactivate={bulkDeactivate}
          onChangeRole={bulkChangeRole}
          onClear={() => setSelected(new Set())}
        />
      )}

      {/* ── Table ── */}
      <DataTable
        columns={columns} rows={rows} loading={isLoading}
        page={page} pageSize={20} total={data?.total || 0} onPageChange={setPage}
      />

      {/* ── Create User Modal ── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
        title="Create New User"
        size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>
              Create User
            </Button>
          </div>
        }
      >
        <div className="um-form-grid">
          <div className="form-field">
            <label>Full Name</label>
            <input value={form.user_name} onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))} placeholder="Jane Doe" />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Temporary password" />
          </div>
          <div className="form-field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, custom_permissions: [] }))}>
              {availableRoles.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {(form.role === 'CLIENT_ADMIN' || form.role === 'CLIENT_USER') && (
            <>
              <div className="form-field">
                <label>Tenant ID</label>
                <input value={form.tenant_id} onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))} placeholder="acme-corp" />
              </div>
              <div className="form-field">
                <label>Tenant Name</label>
                <input value={form.tenant_name} onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))} placeholder="Acme Corp" />
              </div>
            </>
          )}
        </div>
        <div className="um-section-divider"><span>Permissions</span></div>
        <PermissionMatrix
          rolePermissions={rolePerms}
          selectedRole={form.role}
          customPerms={form.custom_permissions}
          onChange={(perms) => setForm((f) => ({ ...f, custom_permissions: perms }))}
        />
      </Modal>

    </div>
  );
}
