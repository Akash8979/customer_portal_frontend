import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../stores/useAppStore';
import { getNotifications, markAllRead as apiMarkAll, markOneRead as apiMarkOne } from '../../api/notifications';
import { relativeTime } from '../../utils/formatters';
import './NotificationBell.css';

const TYPE_ICON = {
  TICKET_CREATED:        '🎫',
  TICKET_STATUS_CHANGED: '🔄',
  TICKET_ASSIGNED:       '👤',
  TICKET_ESCALATED:      '⚠️',
  COMMENT_ADDED:         '💬',
  MENTION:               '@',
};

// Detect the right "all notifications" route based on current URL
function notifRoute() {
  return window.location.pathname.startsWith('/client')
    ? '/client/notifications'
    : '/internal/notifications';
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef  = useRef(null);
  const prevCount = useRef(null);   // tracks unread count between polls
  const navigate  = useNavigate();

  const { notifications, unreadCount, setNotifications, markAllRead, markOneRead, addToast, user } =
    useAppStore();

  // ── Fetch & poll every 30 s ──────────────────────────────────────────────
  async function fetchNotifs() {
    try {
      const res  = await getNotifications();
      const list = res.data.data || [];
      const newUnread = res.data.unread_count ?? 0;

      // Show toast only when unread count increases after first load
      if (prevCount.current !== null && newUnread > prevCount.current) {
        const diff = newUnread - prevCount.current;
        addToast({
          type: 'info',
          message: `You have ${diff} new notification${diff > 1 ? 's' : ''} 🔔`,
        });
      }
      prevCount.current = newUnread;
      setNotifications(list);
    } catch (err) {
      console.error('[NotificationBell] fetch failed:', err?.response?.status, err?.message);
    }
  }

  const userId = user?.user_id;

  useEffect(() => {
    prevCount.current = null;
    fetchNotifs();
    const timer = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(timer);
  }, [userId]);

  // ── Close panel on outside click ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  // ── Mark all read ────────────────────────────────────────────────────────
  async function handleMarkAll(e) {
    e.stopPropagation();
    markAllRead();
    prevCount.current = 0;
    try { await apiMarkAll(); } catch { /* ignore */ }
  }

  // ── Click individual notification ────────────────────────────────────────
  async function handleItemClick(notif) {
    if (!notif.is_read) {
      markOneRead(notif.id);
      if (prevCount.current > 0) prevCount.current -= 1;
      try { await apiMarkOne(notif.id); } catch { /* ignore */ }
    }
    setOpen(false);
    if (notif.link) navigate(notif.link);
  }

  // ── View all ─────────────────────────────────────────────────────────────
  function handleViewAll() {
    setOpen(false);
    navigate(notifRoute());
  }

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        className="notif-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          {/* Header */}
          <div className="notif-header">
            <span className="notif-header-title">
              Notifications
              {unreadCount > 0 && (
                <span className="notif-header-count">{unreadCount}</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button className="notif-mark-read" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          {/* List — show latest 5 in the dropdown */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <p>You're all caught up!</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  className={`notif-item ${n.is_read ? '' : 'notif-item--unread'}`}
                  onClick={() => handleItemClick(n)}
                >
                  <span className="notif-type-icon">{TYPE_ICON[n.type] || '🔔'}</span>
                  <div className="notif-content">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{relativeTime(n.created_at)}</div>
                  </div>
                  {!n.is_read && <span className="notif-dot" />}
                </button>
              ))
            )}
          </div>

          {/* Footer — View all */}
          <button className="notif-footer" onClick={handleViewAll}>
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
