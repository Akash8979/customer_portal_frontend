import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/shared/Button';
import './Login.css';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in — redirect
  if (user) {
    const dest = ['AGENT', 'LEAD', 'ADMIN'].includes(user.role) ? '/internal/dashboard' : '/client/dashboard';
    navigate(dest, { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(form.email, form.password);
      const role = loggedIn?.role;
      const from = location.state?.from?.pathname;
      const dest = from || (['AGENT', 'LEAD', 'ADMIN'].includes(role) ? '/internal/dashboard' : '/client/dashboard');
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.detail || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">✦</span>
          <span className="login-brand-name">The Navigators</span>
        </div>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to your portal</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: 8 }}>
            Sign In
          </Button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? Contact your administrator.</p>
        </div>
      </div>
    </div>
  );
}
