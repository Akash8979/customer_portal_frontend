import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthActions } from '../context/AuthContext';
import { isInternal } from '../utils/rbac';
import './Login.css';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuthActions();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const dest = from || (isInternal(user) ? '/internal/dashboard' : '/client/dashboard');
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">◈</span>
          <span className="login-product">Navigator Portal</span>
        </div>
        <h1 className="login-title">Sign in to your account</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email" value={email} autoComplete="email" autoFocus
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-hint">
          <p>Dev credentials — password is <code>test</code> for all accounts.</p>
        </div>
      </div>
    </div>
  );
}
