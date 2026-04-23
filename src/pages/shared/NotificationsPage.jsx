import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ArrowLeft, Filter } from 'lucide-react';
import { getNotifications, markAllRead, markOneRead } from '../../api/notifications';
import useAppStore from '../../stores/useAppStore';
import { relativeTime, fullDate } from '../../utils/formatters';
import './NotificationsPage.css';

const TYPE_ICON = {
  TICKET_CREATED:        '🎫',
  TICKET_STATUS_CHANGED: '🔄',
  TICKET_ASSIGNED:       '👤',
  TICKET_ESCALATED:      '⚠️',
  COMMENT_ADDED:         '💬',
  MENTION:               '@',
};

const TYPE_LABEL = {
  TICKET_CREATED:        'New Ticket',
  TICKET_STATUS_CHANGED: 'Status Change',
  TICKET_ASSIGNED:       'Assignment',
  TICKET_ESCALATED:      'Escalation',
  COMMENT_ADDED:         'Comment',
  MENTION:               'Mention',
};

const FILTER_OPTIONS = [
  { value: 'ALL',    label: 'All' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'TICKET_CREATED',        label: 'New Tickets' },
  { value: 'TICKET_STATUS_CHANGED', label: 'Status Changes' },
  { value: 'TICKET_ASSIGNED',       label: 'Assignments' },
  { value: 'TICKET_ESCALATED',      label: 'Escalations' },
  { value: 'COMMENT_ADDED',         label: 'Comments' },
  { value: 'MENTION',               label: 'Mentions' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setNotifications, markAllRead: storeMarkAll, markOneRead: storeMarkOne, addToast } = useAppStore();
  const [filter, setFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: async () => {
      const res = await getNotifications();
      setNotifications(res.data.data || []);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const allNotifs  = data?.data || [];
  const unreadCount = data?.unread_count ?? 0;

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      storeMarkAll();
      qc.invalidateQueries(['notifications-page']);
      addToast({ type: 'success', message: 'All notifications marked as read.' });
    },
  });

  const markOneMut = useMutation({
    mutationFn: (id) => markOneRead(id),
    onSuccess: (_, id) => {
      storeMarkOne(id);
      qc.invalidateQueries(['notifications-page']);
    },
  });

  async function handleItemClick(notif) {
    if (!notif.is_read) markOneMut.mutate(notif.id);
    if (notif.link) navigate(notif.link);
  }

  // Apply client-side filter
  const visible = allNotifs.filter((n) => {
    if (filter === 'ALL')    return true;
    if (filter === 'UNREAD') return !n.is_read;
    return n.type === filter;
  });

  const isInternal = window.location.pathname.startsWith('/internal');

  return (
    <div className="np-page">
      {/* Page header */}
      <div className="np-header">
        <button className="np-back" onClick={() => navigate(isInternal ? '/internal/dashboard' : '/client/dashboard')}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="np-header-title">
          <Bell size={20} />
          <h1>Notifications</h1>
          {unreadCount > 0 && <span className="np-unread-badge">{unreadCount} unread</span>}
        </div>
        {unreadCount > 0 && (
          <button
            className="np-mark-all"
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="np-filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`np-filter-tab ${filter === opt.value ? 'np-filter-tab--active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            {opt.value === 'UNREAD' && unreadCount > 0 && (
              <span className="np-filter-count">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="np-list">
        {isLoading ? (
          <div className="np-loading">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="np-empty">
            <Bell size={36} strokeWidth={1.2} />
            <p>{filter === 'UNREAD' ? 'No unread notifications.' : 'No notifications found.'}</p>
          </div>
        ) : (
          visible.map((n) => (
            <button
              key={n.id}
              className={`np-item ${n.is_read ? '' : 'np-item--unread'}`}
              onClick={() => handleItemClick(n)}
            >
              {/* Icon */}
              <div className="np-item-icon">{TYPE_ICON[n.type] || '🔔'}</div>

              {/* Body */}
              <div className="np-item-body">
                <div className="np-item-top">
                  <span className="np-item-title">{n.title}</span>
                  <span className="np-item-type-chip">{TYPE_LABEL[n.type] || n.type}</span>
                </div>
                <p className="np-item-msg">{n.message}</p>
                <span className="np-item-time" title={fullDate(n.created_at)}>
                  {relativeTime(n.created_at)}
                </span>
              </div>

              {/* Unread dot */}
              {!n.is_read && <span className="np-item-dot" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
