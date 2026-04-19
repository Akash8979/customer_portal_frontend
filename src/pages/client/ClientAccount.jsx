import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldCheck, UserCheck, UserX, Clock, UserPlus } from 'lucide-react';
import { listUsers, createUser, deactivateUser, activateUser } from '../../api/users';
import { useAuth } from '../../hooks/useAuth';
import useAppStore from '../../stores/useAppStore';
import Avatar from '../../components/shared/Avatar';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import { relativeTime } from '../../utils/formatters';
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
    mutationFn: () => createUser({ ...form, tenant_id: me.tenant_id, tenant_name: me.tenant_name }),
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
    onSuccess: () => {
      qc.invalidateQueries(['org-users']);
      addToast({ type: 'success', message: 'User status updated.' });
    },
  });

  const users   = data || [];
  const admins  = users.filter((u) => u.role === 'CLIENT_ADMIN');
  const members = users.filter((u) => u.role === 'CLIENT_USER');
  const active  = users.filter((u) => u.is_active).length;
  const inactive = users.length - active;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Account</h1>
          <p className="page-subtitle">{me?.tenant_name} · {me?.tenant_id}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus size={13} />}
          onClick={() => setShowInvite(true)}
        >
          Add User
        </Button>
      </div>

      {/* ── Stat row ── */}
      <div className="ac-stat-grid">
        <div className="ac-stat">
          <span className="ac-stat-icon ac-stat-icon--blue"><Users size={15} /></span>
          <div>
            <div className="ac-stat-value">{users.length}</div>
            <div className="ac-stat-label">Total Users</div>
          </div>
        </div>
        <div className="ac-stat">
          <span className="ac-stat-icon ac-stat-icon--green"><UserCheck size={15} /></span>
          <div>
            <div className="ac-stat-value">{active}</div>
            <div className="ac-stat-label">Active</div>
          </div>
        </div>
        <div className="ac-stat">
          <span className="ac-stat-icon ac-stat-icon--purple"><ShieldCheck size={15} /></span>
          <div>
            <div className="ac-stat-value">{admins.length}</div>
            <div className="ac-stat-label">Admins</div>
          </div>
        </div>
        <div className="ac-stat">
          <span className="ac-stat-icon ac-stat-icon--red"><UserX size={15} /></span>
          <div>
            <div className="ac-stat-value">{inactive}</div>
            <div className="ac-stat-label">Inactive</div>
          </div>
        </div>
      </div>

      {/* ── Admins ── */}
      <div className="ac-section">
        <div className="ac-section-header">
          <h2 className="ac-section-title">
            <ShieldCheck size={13} className="ac-section-icon ac-section-icon--purple" />
            Admins
          </h2>
          <span className="ac-section-count">{admins.length}</span>
        </div>
        <div className="ac-user-list">
          {isLoading
            ? [1, 2].map((i) => <div key={i} className="ac-user-card ac-user-card--skeleton" />)
            : admins.map((u) => (
              <UserCard key={u.id} user={u} me={me} onToggle={toggleMut.mutate} />
            ))
          }
        </div>
      </div>

      {/* ── Members ── */}
      <div className="ac-section">
        <div className="ac-section-header">
          <h2 className="ac-section-title">
            <Users size={13} className="ac-section-icon ac-section-icon--blue" />
            Members
          </h2>
          <span className="ac-section-count">{members.length}</span>
        </div>
        <div className="ac-user-list">
          {isLoading
            ? [1, 2, 3].map((i) => <div key={i} className="ac-user-card ac-user-card--skeleton" />)
            : members.length === 0
              ? <p className="dim-text">No members yet. Add users to get started.</p>
              : members.map((u) => (
                <UserCard key={u.id} user={u} me={me} onToggle={toggleMut.mutate} />
              ))
          }
        </div>
      </div>

      {/* ── Add user modal ── */}
      <Modal
        open={showInvite}
        onClose={() => { setShowInvite(false); setForm(EMPTY_FORM); }}
        title="Add User"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowInvite(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button
              variant="primary"
              loading={createMut.isPending}
              disabled={!form.user_name || !form.email || !form.password}
              onClick={() => createMut.mutate()}
            >
              Add User
            </Button>
          </div>
        }
      >
        <div className="ac-invite-form">
          <div className="form-field">
            <label>Full Name</label>
            <input
              value={form.user_name}
              onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))}
              placeholder="Jane Doe"
            />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@company.com"
            />
          </div>
          <div className="form-field">
            <label>Temporary Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Set a temporary password"
            />
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
    <div className={`ac-user-card ${!user.is_active ? 'ac-user-card--inactive' : ''}`}>

      <Avatar name={user.user_name} size="md" />

      <div className="ac-user-info">
        <div className="ac-user-name">
          {user.user_name}
          {isMe && <span className="ac-you-badge">You</span>}
        </div>
        <div className="ac-user-email">{user.email}</div>
        <div className="ac-user-meta">
          <span className={`ac-status-pill ${user.is_active ? 'ac-status--active' : 'ac-status--inactive'}`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
          {user.last_login && (
            <span className="ac-last-seen">
              <Clock size={10} />
              {relativeTime(user.last_login)}
            </span>
          )}
        </div>
      </div>

      {!isMe && (
        <Button
          size="sm"
          variant={user.is_active ? 'danger' : 'secondary'}
          onClick={() => onToggle({ id: user.id, is_active: user.is_active })}
        >
          {user.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      )}
    </div>
  );
}
