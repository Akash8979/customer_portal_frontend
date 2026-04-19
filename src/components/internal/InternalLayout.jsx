import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';
import ToastContainer from '../shared/Toast';
import NotificationBell from '../shared/NotificationBell';
import ThemeToggle from '../shared/ThemeToggle';
import FloatingAgent from '../shared/FloatingAgent';
import './InternalLayout.css';

const NAV = [
  { to: '/internal/dashboard',   label: 'Dashboard',   icon: '⊞' },
  { to: '/internal/clients',     label: 'Clients',     icon: '◉' },
  { to: '/internal/tickets',     label: 'Tickets',     icon: '◫' },
  { to: '/internal/bugs',        label: 'Bug Tracker', icon: '⊘' },
  { to: '/internal/delivery',    label: 'Delivery',    icon: '◈' },
  { to: '/internal/releases',    label: 'Releases',    icon: '◎' },
  { to: '/internal/onboarding',  label: 'Onboarding',  icon: '◷' },
  { to: '/internal/users',       label: 'Users',       icon: '◡', roles: ['ADMIN'] },
  { to: '/internal/audit-log',   label: 'Audit Log',   icon: '⊟', roles: ['ADMIN'] },
];

export default function InternalLayout() {
  const { user, logout, is } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );

  function toggleSidebar() {
    setCollapsed((v) => {
      localStorage.setItem('sidebar_collapsed', String(!v));
      return !v;
    });
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.some((r) => is(r)));

  return (
    <div className="internal-layout">

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">◈</span>
          {!collapsed && (
            <>
              <span className="brand-name">Meridian</span>
              <span className="brand-badge">Internal</span>
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Avatar name={user?.user_name} size="sm" />
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.user_name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          )}
          {!collapsed && (
            <button className="logout-btn" onClick={handleLogout} title="Logout">⎋</button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="sidebar-toggle" onClick={toggleSidebar} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? '›' : '‹'}
            </button>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {/* ── Aria panel — flex sibling (VS Code style) ── */}
      <FloatingAgent />
      <ToastContainer />
    </div>
  );
}
