'use client';

import { createContext, useContext, useState } from 'react';
import api from '@/services/axios';

/* ================= TIPOS ================= */
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Tenant {
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/* ================= HELPERS ================= */
function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}

function getStoredTenant(): Tenant | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('tenant');
  return data ? JSON.parse(data) : null;
}

/* ================= CONTEXT ================= */
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/* ================= PROVIDER ================= */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [tenant, setTenant] = useState<Tenant | null>(() => getStoredTenant());

  /* -------- LOGIN -------- */
  async function login(email: string, password: string) {
    const response = await api.post<LoginResponse>('/login', {
      email,
      password,
    });

    const { token, user, tenant } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    api.defaults.headers.common['X-Tenant-ID'] = tenant.id;

    setUser(user);
    setTenant(tenant);
  }

  /* -------- LOGOUT -------- */
  function logout() {
    localStorage.clear();

    delete api.defaults.headers.common.Authorization;
    delete api.defaults.headers.common['X-Tenant-ID'];

    setUser(null);
    setTenant(null);
  }

  return (
    <AuthContext.Provider value={{ user, tenant, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ================= HOOK ================= */
export function useAuth() {
  return useContext(AuthContext);
}
