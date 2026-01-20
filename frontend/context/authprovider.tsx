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

export interface Tenant {
  id: string;
  nome: string;
  email: string;
}

interface LoginResponse {
  token: string;
  user: User;
  tenant: Tenant;
}

interface AuthContextData {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/* ================= CONTEXT ================= */
const AuthContext = createContext<AuthContextData | null>(null);

/* ================= PROVIDER ================= */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  /* -------- Inicialização -------- */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedTenant = localStorage.getItem('tenant');

    if (token && savedUser && savedTenant) {
      setUser(JSON.parse(savedUser));
      setTenant(JSON.parse(savedTenant));

      // 🔐 Apenas o token
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }

    setLoading(false);
  }, []);

  /* -------- LOGIN -------- */
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>('/login', {
        email,
        password,
      });

      const { token, user, tenant } = response.data;

      // Persistência
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenant', JSON.stringify(tenant));

      setUser(user);
      setTenant(tenant);

      // 🔐 Apenas Authorization
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
    localStorage.removeItem('tenant');

    delete api.defaults.headers.common.Authorization;

    
    setUser(null);
    setTenant(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, logout }}>
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
