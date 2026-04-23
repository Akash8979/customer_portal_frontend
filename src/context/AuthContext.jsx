import { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, logout as apiLogout } from '../api/auth';
import useAppStore from '../stores/useAppStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setUser, clearUser, addToast } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, [setUser]);

  async function login(email, password) {
    const { data } = await apiLogin(email, password);
    const { tokens, user } = data;
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    if (user.tenant_id) {
      localStorage.setItem('tenant_id', user.tenant_id);
    } else {
      localStorage.removeItem('tenant_id');
    }
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  async function logout() {
    try { await apiLogout(); } catch {}
    localStorage.clear();
    clearUser();
  }

  return (
    <AuthContext.Provider value={{ login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthActions() {
  return useContext(AuthContext);
}
