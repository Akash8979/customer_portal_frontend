import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, createUser, updateUser, deactivateUser, activateUser, rolePermissionMap } from '../../api/users';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import Avatar from '../../components/shared/Avatar';
import { shortDate } from '../../utils/formatters';
import useAppStore from '../../stores/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import './UserManagement.css';

const ALL_ROLES = ['CLIENT_ADMIN', 'CLIENT_USER', 'AGENT', 'LEAD', 'ADMIN'];
const CLIENT_ROLES = ['CLIENT_ADMIN', 'CLIENT_USER'];

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
  const allPerms = Object.keys(PERMISSION_LABELS);

  return (
    <div className="perm-matrix">
      <p className="perm-matrix-hint">
        Base permissions for <strong>{selectedRole}</strong> are pre-granted. Toggle custom additions below.
      </p>
      <div className="perm-grid">
        {allPerms.map((perm) => {
          const isBase = basePerms.includes(perm);
          const isCustom = customPerms.includes(perm);
          const isGranted = isBase || isCustom;
          return (
            <label key={perm} className={`perm-cell ${isBase ? 'perm-cell--base' : ''} ${isCustom ? 'perm-cell--custom' : ''}`}>
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
              {isBase && <span className="perm-tag perm-tag--base">base</span>}
              {isCustom && <span className="perm-tag perm-tag--custom">custom</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_FORM = { user_name: '', email: '', password: '', role: 'CLIENT_USER', tenant_id: '', tenant_name: '', custom_permissions: [] };

export default function UserManagement() {
  const qc = useQueryClient();
  const { addToast } = useAppStore();
  const { user: me, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ role: '', is_active: true, custom_permissions: [] });

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

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => updateUser(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      setEditUser(null);
      addToast({ type: 'success', message: 'User updated.' });
    },
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }) => active ? deactivateUser(id) : activateUser(id),
    onSuccess: () => { qc.invalidateQueries(['users']); addToast({ type: 'success', message: 'User status updated.' }); },
  });

  const availableRoles = isAdmin ? ALL_ROLES : CLIENT_ROLES;

  const columns = [
    {
      key: 'user_name', label: 'User',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={v} size={28} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (v) => <Badge status={v} /> },
    { key: 'tenant_name', label: 'Tenant', render: (v) => v || <span style={{ color: 'var(--text-dim)' }}>—</span> },
    { key: 'is_active', label: 'Status', render: (v) => <span className={`user-status ${v ? 'user-status--active' : 'user-status--inactive'}`}>{v ? 'Active' : 'Inactive'}</span> },
    { key: 'last_login', label: 'Last Login', render: (v) => v ? shortDate(v) : <span style={{ color: 'var(--text-dim)' }}>Never</span> },
    { key: 'created_at', label: 'Created', render: (v) => shortDate(v) },
    {
      key: 'id', label: '', width: 120,
      render: (v, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditUser(row); setEditForm({ role: row.role, is_active: row.is_active, custom_permissions: row.custom_permissions || [] }); }}>Edit</Button>
          <Button size="sm" variant={row.is_active ? 'danger' : 'secondary'} onClick={(e) => { e.stopPropagation(); toggleActiveMut.mutate({ id: v, active: row.is_active }); }}>
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{data?.total ?? 0} users</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ New User</Button>
      </div>

      <div className="filter-bar">
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns} rows={data?.data || []} loading={isLoading}
        page={page} pageSize={20} total={data?.total || 0} onPageChange={setPage}
      />

      {/* Create User Modal */}
      <Modal
        open={showCreate} onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
        title="Create New User" size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Create User</Button>
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

        <div className="um-section-divider">
          <span>Permissions</span>
        </div>
        <PermissionMatrix
          rolePermissions={rolePerms}
          selectedRole={form.role}
          customPerms={form.custom_permissions}
          onChange={(perms) => setForm((f) => ({ ...f, custom_permissions: perms }))}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={!!editUser} onClose={() => setEditUser(null)}
        title={`Edit — ${editUser?.user_name}`} size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="primary" loading={updateMut.isPending} onClick={() => updateMut.mutate({ id: editUser.id, ...editForm })}>Save Changes</Button>
          </div>
        }
      >
        <div className="um-form-grid">
          <div className="form-field">
            <label>Role</label>
            <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value, custom_permissions: [] }))}>
              {availableRoles.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={editForm.is_active ? 'active' : 'inactive'} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === 'active' }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="um-section-divider"><span>Permissions</span></div>
        <PermissionMatrix
          rolePermissions={rolePerms}
          selectedRole={editForm.role}
          customPerms={editForm.custom_permissions}
          onChange={(perms) => setEditForm((f) => ({ ...f, custom_permissions: perms }))}
        />
      </Modal>
    </div>
  );
}
