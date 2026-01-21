'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/axios';
import { AxiosError } from 'axios';

/* ================= TIPOS ================= */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/* ================= CONTEXT ================= */
const AuthContext = createContext<AuthContextData | null>(null);

/* ================= PROVIDER ================= */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* -------- Inicialização -------- */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }

    setLoading(false);
  }, []);

  /* -------- LOGIN -------- */
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>('/login', { email, password });
      const { token, user } = response.data;

      // Persistência
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } catch (err) {
      if (err instanceof AxiosError) {
        console.error('Erro no login:', err.response?.data || err.message);
      } else {
        console.error('Erro desconhecido no login:', err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /* -------- LOGOUT -------- */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    delete api.defaults.headers.common.Authorization;
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ================= HOOK ================= */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return context;
}
