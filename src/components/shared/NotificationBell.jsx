import { useState } from 'react';
import useAppStore from '../../stores/useAppStore';
import { relativeTime } from '../../utils/formatters';
import './NotificationBell.css';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useAppStore();

  return (
    <div className="notif-wrap">
      <button className="notif-btn" onClick={() => setOpen((o) => !o)}>
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-read" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">No notifications</div>
            )}
            {notifications.map((n) => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'notif-item--unread'}`}>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{relativeTime(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
