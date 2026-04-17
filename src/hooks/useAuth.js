import useAppStore from '../stores/useAppStore';
import { useAuthActions } from '../context/AuthContext';
import { hasPermission, hasRole, isInternal, isClient } from '../utils/rbac';

export function useAuth() {
  const user = useAppStore((s) => s.user);
  const { login, logout, loading } = useAuthActions();

  return {
    user,
    loading,
    login,
    logout,
    isInternal: isInternal(user),
    isClient: isClient(user),
    can: (permission) => hasPermission(user, permission),
    is: (...roles) => hasRole(user, ...roles),
  };
}
