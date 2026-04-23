import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Layouts
import InternalLayout from '../components/internal/InternalLayout';
import ClientLayout from '../components/client/ClientLayout';

// Auth
import Login from '../pages/auth/Login';

// Internal pages
import Dashboard from '../pages/internal/Dashboard';
import TicketQueue from '../pages/internal/TicketQueue';
import TicketDetail from '../pages/internal/TicketDetail';
import BugTracker from '../pages/internal/BugTracker';
import ClientList from '../pages/internal/ClientList';
import Client360 from '../pages/internal/Client360';
import DeliveryBoard from '../pages/internal/DeliveryBoard';
import Releases from '../pages/internal/Releases';
import OnboardingList from '../pages/internal/OnboardingList';
import OnboardingDetail from '../pages/internal/OnboardingDetail';
import UserManagement from '../pages/internal/UserManagement';
import UserEditPage from '../pages/internal/UserEditPage';
import AuditLog from '../pages/internal/AuditLog';

// Client pages
import ClientDashboard from '../pages/client/ClientDashboard';
import MyTickets from '../pages/client/MyTickets';
import RaiseTicket from '../pages/client/RaiseTicket';
import ClientReleaseNotes from '../pages/client/ClientReleaseNotes';
import ClientRoadmap from '../pages/client/ClientRoadmap';
import ClientOnboarding from '../pages/client/ClientOnboarding';
import ClientAccount from '../pages/client/ClientAccount';
import ClientTicketDetail from '../pages/client/ClientTicketDetail';

// Shared
import NotificationsPage from '../pages/shared/NotificationsPage';

const INTERNAL_ROLES = ['AGENT', 'LEAD', 'ADMIN'];
const CLIENT_ROLES = ['CLIENT_ADMIN', 'CLIENT_USER'];
const ALL_ROLES = [...INTERNAL_ROLES, ...CLIENT_ROLES];

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/internal',
    element: (
      <ProtectedRoute allowedRoles={INTERNAL_ROLES}>
        <InternalLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'tickets', element: <TicketQueue /> },
      { path: 'tickets/:id', element: <TicketDetail /> },
      { path: 'bugs', element: <BugTracker /> },
      { path: 'clients', element: <ClientList /> },
      { path: 'clients/:id', element: <Client360 /> },
      { path: 'delivery', element: <DeliveryBoard /> },
      { path: 'releases', element: <Releases /> },
      { path: 'onboarding', element: <OnboardingList /> },
      { path: 'onboarding/:id', element: <OnboardingDetail /> },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'CLIENT_ADMIN']}>
            <UserManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'CLIENT_ADMIN']}>
            <UserEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit-log',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AuditLog />
          </ProtectedRoute>
        ),
      },
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },
  {
    path: '/client',
    element: (
      <ProtectedRoute allowedRoles={CLIENT_ROLES}>
        <ClientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <ClientDashboard /> },
      { path: 'tickets', element: <MyTickets /> },
      { path: 'tickets/new', element: <RaiseTicket /> },
      { path: 'tickets/:id', element: <ClientTicketDetail /> },
      { path: 'releases', element: <ClientReleaseNotes /> },
      { path: 'roadmap', element: <ClientRoadmap /> },
      { path: 'onboarding', element: <ClientOnboarding /> },
      { path: 'account',       element: <ProtectedRoute allowedRoles={['CLIENT_ADMIN']}><ClientAccount /></ProtectedRoute> },
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/unauthorized',
    element: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>403 — Unauthorized</h1>
        <p style={{ color: 'var(--text-muted)' }}>You don't have permission to access this page.</p>
        <a href="/login" style={{ color: 'var(--amber)' }}>Back to login</a>
      </div>
    ),
  },
  {
    path: '*',
    element: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>404 — Not Found</h1>
        <a href="/" style={{ color: 'var(--amber)' }}>Go home</a>
      </div>
    ),
  },
]);

export default router;
