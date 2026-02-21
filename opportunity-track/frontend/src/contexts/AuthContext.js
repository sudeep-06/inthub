import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('opportuneai_token');
    const savedUser = localStorage.getItem('opportuneai_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        API.get('/auth/me').then(res => {
          setUser(res.data);
          localStorage.setItem('opportuneai_user', JSON.stringify(res.data));
        }).catch(() => {
          localStorage.removeItem('opportuneai_token');
          localStorage.removeItem('opportuneai_user');
          setUser(null);
        }).finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('opportuneai_token', res.data.access_token);
    localStorage.setItem('opportuneai_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const res = await API.post('/auth/signup', { name, email, password });
    localStorage.setItem('opportuneai_token', res.data.access_token);
    localStorage.setItem('opportuneai_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('opportuneai_token');
    localStorage.removeItem('opportuneai_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
