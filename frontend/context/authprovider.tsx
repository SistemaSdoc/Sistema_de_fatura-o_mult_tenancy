'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/services/axios";
import { AxiosError } from "axios";

/* -------- Tipos -------- */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

/* -------- Context -------- */
const AuthContext = createContext<AuthContextData | null>(null);

/* -------- Provider -------- */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca usuário logado no backend via cookie
  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<User>("/api/me");
      setUser(response.data);
    } catch (err) {
      setUser(null);
      console.error("Erro ao buscar usuário:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Inicializa usuário quando o app carrega
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Login usando cookies (Sanctum)
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // 1️⃣ Pega CSRF cookie
      await api.get("/sanctum/csrf-cookie");

      // 2️⃣ Faz login
      await api.post("/login", { email, password });

      // 3️⃣ Atualiza usuário logado
      await fetchUser();
    } catch (err) {
      if (err instanceof AxiosError) console.error("Erro login:", err.response?.data?.message || err.message);
      else console.error("Erro login desconhecido:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  // Logout usando cookies
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.post("/logout");
      setUser(null);
    } catch (err) {
      console.error("Erro logout:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/* -------- Hook -------- */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return context;
}
