import './Badge.css';

const STATUS_VARIANT = {
  OPEN: 'info', TRIAGED: 'ai', ACKNOWLEDGED: 'info',
  IN_PROGRESS: 'warning', PENDING_CLIENT: 'orange', PENDING_RELEASE: 'orange',
  RESOLVED: 'success', CLOSED: 'dim', REOPENED: 'danger',
  // Bug
  REPORTED: 'muted', REPRODUCED: 'info', ROOT_CAUSE_IDENTIFIED: 'ai',
  FIX_IN_PROGRESS: 'warning', IN_QA: 'info', DEPLOYED: 'success',
  VERIFIED: 'success',
  // Feature
  BACKLOG: 'dim', PLANNED: 'info', IN_DEV: 'warning', IN_STAGING: 'ai', RELEASED: 'success', DECLINED: 'danger',
  // Onboarding
  NOT_STARTED: 'dim', BLOCKED: 'danger', COMPLETED: 'success', ON_TRACK: 'success', AT_RISK: 'orange',
};

const PRIORITY_VARIANT = {
  CRITICAL: 'danger', HIGH: 'orange', MEDIUM: 'warning', LOW: 'muted',
};

export function Badge({ label, variant, status, priority, size = 'sm' }) {
  const v = variant || (status && STATUS_VARIANT[status?.toUpperCase()])
            || (priority && PRIORITY_VARIANT[priority?.toUpperCase()]) || 'muted';
  const text = label || status || priority || '';
  return (
    <span className={`badge badge--${v} badge--${size}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

export default Badge;
