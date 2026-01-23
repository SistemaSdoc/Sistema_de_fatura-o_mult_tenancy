'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/services/axios";
import Cookies from "js-cookie"; // 🔹 para ler o cookie XSRF-TOKEN

export interface User {
  id: number;
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

const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Busca usuário autenticado
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: User }>("/me");
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  // 🔹 Inicialização SPA
  useEffect(() => {
    const init = async () => {
      try {
        // 1️⃣ Pega CSRF cookie
        await api.get("/sanctum/csrf-cookie");

        // 2️⃣ Tenta buscar usuário se já estiver logado
        await fetchUser();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchUser]);

  // 🔹 Login
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        // ✅ Garante CSRF cookie antes do login
        await api.get("/sanctum/csrf-cookie");

        // ✅ Captura token do cookie e envia no header
        const xsrfToken = Cookies.get("XSRF-TOKEN");

        await api.post(
          "/login",
          { email, password },
          {
            headers: {
              "X-XSRF-TOKEN": xsrfToken,
            },
          }
        );

        // ✅ Atualiza estado do usuário
        await fetchUser();
      } finally {
        setLoading(false);
      }
    },
    [fetchUser]
  );

  // 🔹 Logout
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.post("/logout");
      setUser(null);

      // Prepara próximo login
      await api.get("/sanctum/csrf-cookie");
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

// 🔹 Hook para consumir contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return context;
}