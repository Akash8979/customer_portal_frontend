import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, createUser, deactivateUser, activateUser } from '../../api/users';
import { useAuth } from '../../hooks/useAuth';
import useAppStore from '../../stores/useAppStore';
import Avatar from '../../components/shared/Avatar';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import { shortDate, relativeTime } from '../../utils/formatters';
import './ClientAccount.css';

const EMPTY_FORM = { user_name: '', email: '', password: '', role: 'CLIENT_USER' };

export default function ClientAccount() {
  const { user: me } = useAuth();
  const { addToast } = useAppStore();
  const qc = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['org-users'],
    queryFn: () => listUsers({ page_size: 50 }).then((r) => r.data.data || []),
  });

  const createMut = useMutation({
    mutationFn: () => createUser({
      ...form,
      tenant_id: me.tenant_id,
      tenant_name: me.tenant_name,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['org-users']);
      setShowInvite(false);
      setForm(EMPTY_FORM);
      addToast({ type: 'success', message: `${form.user_name} has been added to your org.` });
    },
    onError: (e) => addToast({ type: 'error', message: e?.response?.data?.error || 'Failed to add user.' }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => is_active ? deactivateUser(id) : activateUser(id),
    onSuccess: () => { qc.invalidateQueries(['org-users']); addToast({ type: 'success', message: 'User status updated.' }); },
  });

  const users = data || [];
  const admins = users.filter((u) => u.role === 'CLIENT_ADMIN');
  const members = users.filter((u) => u.role === 'CLIENT_USER');
  const active = users.filter((u) => u.is_active).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account</h1>
          <p className="page-subtitle">{me?.tenant_name} · {me?.tenant_id}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>+ Add User</Button>
      </div>

      {/* Org summary */}
      <div className="account-stats">
        <div className="account-stat">
          <span className="account-stat-val">{users.length}</span>
          <span className="account-stat-label">Total Users</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-val">{active}</span>
          <span className="account-stat-label">Active</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-val">{admins.length}</span>
          <span className="account-stat-label">Admins</span>
        </div>
        <div className="account-stat">
          <span className="account-stat-val">{members.length}</span>
          <span className="account-stat-label">Members</span>
        </div>
      </div>

      {/* User list */}
      <div className="account-section">
        <h2 className="account-section-title">Admins</h2>
        <div className="user-cards">
          {isLoading ? <p className="dim-text">Loading…</p> : admins.map((u) => (
            <UserCard key={u.id} user={u} me={me} onToggle={toggleMut.mutate} />
          ))}
        </div>
      </div>

      <div className="account-section">
        <h2 className="account-section-title">Members</h2>
        <div className="user-cards">
          {isLoading ? <p className="dim-text">Loading…</p> : members.length === 0
            ? <p className="dim-text">No members yet. Add users to get started.</p>
            : members.map((u) => (
              <UserCard key={u.id} user={u} me={me} onToggle={toggleMut.mutate} />
            ))}
        </div>
      </div>

      {/* Invite modal */}
      <Modal
        open={showInvite} onClose={() => { setShowInvite(false); setForm(EMPTY_FORM); }}
        title="Add User" size="md"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowInvite(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button
              variant="primary" loading={createMut.isPending}
              disabled={!form.user_name || !form.email || !form.password}
              onClick={() => createMut.mutate()}
            >
              Add User
            </Button>
          </div>
        }
      >
        <div className="invite-form">
          <div className="form-field">
            <label>Full Name</label>
            <input value={form.user_name} onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))} placeholder="Jane Doe" />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
          </div>
          <div className="form-field">
            <label>Temporary Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Set a temporary password" />
          </div>
          <div className="form-field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="CLIENT_USER">Member — raises and tracks own tickets</option>
              <option value="CLIENT_ADMIN">Admin — manages all org tickets and users</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function UserCard({ user, me, onToggle }) {
  const isMe = user.email === me?.email;
  return (
    <div className={`user-card ${!user.is_active ? 'user-card--inactive' : ''}`}>
      <Avatar name={user.user_name} size={40} />
      <div className="user-card-info">
        <div className="user-card-name">
          {user.user_name}
          {isMe && <span className="you-badge">You</span>}
        </div>
        <div className="user-card-email">{user.email}</div>
        <div className="user-card-meta">
          <span className={`user-card-status ${user.is_active ? 'status--active' : 'status--inactive'}`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
          {user.last_login && (
            <span className="user-card-last">Last seen {relativeTime(user.last_login)}</span>
          )}
        </div>
      </div>
      {!isMe && (
        <Button
          size="sm" variant={user.is_active ? 'danger' : 'secondary'}
          onClick={() => onToggle({ id: user.id, is_active: user.is_active })}
        >
          {user.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      )}
    </div>
  );
}
