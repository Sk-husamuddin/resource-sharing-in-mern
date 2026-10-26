import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Restoring session on mount

  // Restore session on page load / refresh
  useEffect(() => {
    authApi.me()
      .then(res => setUser(res.data.user))
      .catch(() => {
        // 401 = no session, or any error — user stays null
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);


  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authApi.register(formData);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
