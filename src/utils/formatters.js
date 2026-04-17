import { formatDistanceToNow, format, parseISO } from 'date-fns';

export function relativeTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function fullDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm');
  } catch {
    return dateStr;
  }
}

export function shortDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function priorityColor(priority) {
  const map = {
    CRITICAL: 'var(--red)',
    HIGH:     'var(--orange)',
    MEDIUM:   'var(--amber)',
    LOW:      'var(--text-muted)',
  };
  return map[priority?.toUpperCase()] || 'var(--text-muted)';
}

export function statusColor(status) {
  const map = {
    NEW:              'var(--text-muted)',
    OPEN:             'var(--blue)',
    TRIAGED:          'var(--purple)',
    ACKNOWLEDGED:     'var(--blue)',
    IN_PROGRESS:      'var(--amber)',
    PENDING_CLIENT:   'var(--orange)',
    PENDING_RELEASE:  'var(--orange)',
    RESOLVED:         'var(--green)',
    CLOSED:           'var(--text-dim)',
    REOPENED:         'var(--red)',
  };
  return map[status?.toUpperCase()] || 'var(--text-muted)';
}

export function sentimentColor(sentiment) {
  const map = {
    POSITIVE:   'var(--green)',
    NEUTRAL:    'var(--text-muted)',
    NEGATIVE:   'var(--orange)',
    FRUSTRATED: 'var(--red)',
  };
  return map[sentiment?.toUpperCase()] || 'var(--text-muted)';
}

export function healthColor(score) {
  if (score >= 70) return 'var(--green)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--red)';
}

export function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function avatarColor(name) {
  const colors = ['#378ADD','#7F77DD','#1D9E75','#EF9F27','#D85A30','#E24B4A'];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}
