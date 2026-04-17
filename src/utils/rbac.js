export const INTERNAL_ROLES = ['AGENT', 'LEAD', 'ADMIN'];
export const CLIENT_ROLES   = ['CLIENT_ADMIN', 'CLIENT_USER'];

export function isInternal(user) {
  return INTERNAL_ROLES.includes(user?.role);
}

export function isClient(user) {
  return CLIENT_ROLES.includes(user?.role);
}

export function hasPermission(user, permission) {
  if (!user) return false;
  return (user.permissions || []).includes(permission);
}

export function hasRole(user, ...roles) {
  return roles.includes(user?.role);
}

export function canAccess(user, allowedRoles) {
  return allowedRoles.includes(user?.role);
}
