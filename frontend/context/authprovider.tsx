// src/context/authprovider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/services/axios";
import Cookies from "js-cookie";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  empresa_id?: string;
  empresa?: {
    id: string;
    nome: string;
    nif: string;
    email: string;
    logo: string | null;
    telefone: string | null;
    endereco: string | null;
  };
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Busca usuário autenticado com dados da empresa
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: User }>("/me");
      setUser(data.user ?? null);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
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
      } catch (error) {
        console.error("Erro na inicialização:", error);
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
        await api.get("/sanctum/csrf-cookie");

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

        await fetchUser();
        return { success: true };
      } catch (error: unknown) {
        console.error("Erro no login:", error);
        const errorMessage = error instanceof Error && 'response' in error
          ? (error.response as any).data?.message
          : "Erro ao fazer login";
        return {
          success: false,
          message: errorMessage || "Erro ao fazer login"
        };
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
      return { success: true };
    } catch (error: unknown) {
      console.error("Erro no logout:", error);
      const errorMessage = error instanceof Error && 'response' in error
        ? (error.response as any).data?.message
        : "Erro ao fazer logout";
      return {
        success: false,
        message: errorMessage || "Erro ao fazer logout"
      };
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