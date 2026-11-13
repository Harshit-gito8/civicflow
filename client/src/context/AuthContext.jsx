import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('civicflow_token') || null);
  const [loading, setLoading] = useState(true);

  // Load user profile on initial mount if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('civicflow_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      localStorage.setItem('civicflow_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const demoLogin = async (role) => {
    const credentials = {
      CITIZEN: { email: 'citizen@civicflow.gov.in', password: 'password123' },
      ADMIN: { email: 'admin@civicflow.gov.in', password: 'password123' },
      CONTRACTOR: { email: 'contractor@civicflow.gov.in', password: 'password123' },
      AUDITOR: { email: 'auditor@civicflow.gov.in', password: 'password123' },
    };

    const creds = credentials[role];
    if (!creds) throw new Error('Invalid demo role');
    return await login(creds.email, creds.password);
  };

  const logout = () => {
    localStorage.removeItem('civicflow_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        demoLogin,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isContractor: user?.role === 'CONTRACTOR',
        isAuditor: user?.role === 'AUDITOR',
        isCitizen: user?.role === 'CITIZEN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
