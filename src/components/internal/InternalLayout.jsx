import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';
import AIOutputPanel from '../shared/AIOutputPanel';
import ToastContainer from '../shared/Toast';
import NotificationBell from '../shared/NotificationBell';
import ThemeToggle from '../shared/ThemeToggle';
import './InternalLayout.css';

const NAV = [
  { to: '/internal/dashboard',   label: 'Dashboard',     icon: '⊞' },
  { to: '/internal/clients',     label: 'Clients',       icon: '◉' },
  { to: '/internal/tickets',     label: 'Tickets',       icon: '◫' },
  { to: '/internal/bugs',        label: 'Bug Tracker',   icon: '⊘' },
  { to: '/internal/delivery',    label: 'Delivery',      icon: '◈' },
  { to: '/internal/releases',    label: 'Releases',      icon: '◎' },
  { to: '/internal/onboarding',  label: 'Onboarding',    icon: '◷' },
  { to: '/internal/agent',       label: 'AI Console',    icon: '✦', roles: ['ADMIN', 'LEAD'] },
  { to: '/internal/users',       label: 'Users',         icon: '◡', roles: ['ADMIN'] },
];

export default function InternalLayout() {
  const { user, logout, is } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.some((r) => is(r)));

  return (
    <div className="internal-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">◈</span>
          <span className="brand-name">Navigator</span>
          <span className="brand-badge">Internal</span>
        </div>
        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to} to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar name={user?.user_name} size="sm" />
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.user_name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⎋</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left" />
          <div className="topbar-right">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <AIOutputPanel />
      <ToastContainer />
    </div>
  );
}
