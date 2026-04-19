import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Compass, Sparkles, Zap, ShieldCheck, BarChart3 } from 'lucide-react';
import Button from '../../components/shared/Button';
import './Login.css';

const AI_FEATURES = [
  { icon: Sparkles,   label: 'AI Thread Summaries',       desc: 'Instant ticket context at a glance' },
  { icon: Zap,        label: 'Smart Auto-triage',          desc: 'Priority & routing on ticket creation' },
  { icon: BarChart3,  label: 'Account Health Insights',   desc: 'Proactive risk detection across accounts' },
  { icon: ShieldCheck,label: 'Churn Risk Analysis',        desc: 'AI-powered early warning signals' },
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="lp-root">

      {/* ── Left — AI brand panel ── */}
      <div className="lp-brand">
        {/* Animated blobs */}
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />
        <div className="lp-grid-overlay" />

        <div className="lp-brand-inner">
          {/* Logo */}
          <div className="lp-logo-wrap">
            <div className="lp-logo">
              <Compass size={28} strokeWidth={1.5} className="lp-logo-icon" />
            </div>
            <div className="lp-ai-badge">
              <Sparkles size={10} /> AI‑Powered
            </div>
          </div>

          <h1 className="lp-brand-name">Meridian</h1>
          <p className="lp-brand-tagline">
            Intelligent customer support &amp; delivery — where every interaction is backed by AI.
          </p>

          {/* AI feature cards */}
          <div className="lp-features">
            {AI_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="lp-feature">
                <div className="lp-feature-icon">
                  <Icon size={14} />
                </div>
                <div>
                  <div className="lp-feature-label">{label}</div>
                  <div className="lp-feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right — form panel ── */}
      <div className="lp-form-panel">
        <div className="lp-form-wrap">

          <div className="lp-form-header">
            <h2 className="lp-form-title">Welcome back</h2>
            <p className="lp-form-sub">Sign in to your Meridian workspace</p>
          </div>

          <form className="lp-form" onSubmit={handleSubmit}>
            <div className="lp-field">
              <label className="lp-label" htmlFor="email">Email address</label>
              <input
                id="email" className="lp-input" type="email"
                value={form.email} autoComplete="email" autoFocus
                placeholder="you@company.com" required
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="lp-field">
              <label className="lp-label" htmlFor="password">Password</label>
              <input
                id="password" className="lp-input" type="password"
                value={form.password} autoComplete="current-password"
                placeholder="••••••••" required
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            {error && (
              <div className="lp-error" role="alert">
                <span className="lp-error-icon">!</span>{error}
              </div>
            )}

            <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: 4 }}>
              Sign In
            </Button>
          </form>

          <p className="lp-hint">Don't have an account? Contact your administrator.</p>
        </div>
      </div>
    </div>
  );
}
