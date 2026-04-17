import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';
import AIOutputPanel from '../shared/AIOutputPanel';
import ToastContainer from '../shared/Toast';
import NotificationBell from '../shared/NotificationBell';
import './ClientLayout.css';

const NAV = [
  { to: '/client/dashboard',    label: 'Dashboard',      icon: '⊞' },
  { to: '/client/tickets',      label: 'My Tickets',     icon: '◫' },
  { to: '/client/onboarding',   label: 'Onboarding',     icon: '◷' },
  { to: '/client/roadmap',      label: 'Roadmap',        icon: '◎' },
  { to: '/client/releases',     label: 'Release Notes',  icon: '◈' },
  { to: '/client/account',      label: 'Account',        icon: '◡', roles: ['CLIENT_ADMIN'] },
];

export default function ClientLayout() {
  const { user, logout, is } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.some((r) => is(r)));

  return (
    <div className="client-layout">
      <aside className="client-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">◈</span>
          <div>
            <div className="brand-name">{user?.tenant_name || 'Portal'}</div>
            <div className="brand-sub">Customer Portal</div>
          </div>
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
              <span className="sidebar-user-role">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⎋</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left" />
          <div className="topbar-right">
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
