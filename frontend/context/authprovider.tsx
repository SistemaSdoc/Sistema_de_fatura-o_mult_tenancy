"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/axios";
import { toast } from "sonner";
import Cookies from "js-cookie";

export interface User {
  id: string;
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
  isAdmin: boolean;
  isOperador: boolean;
  isContablista: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
  fetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperador, setIsOperador] = useState(false);
  const [isContablista, setIsContablista] = useState(false);

  // 🔹 Busca usuário autenticado com dados da empresa
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: User }>("/me");
      const userData = data.user ?? null;
      setUser(userData);

      // Atualiza roles
      if (userData) {
        setIsAdmin(userData.role === "admin");
        setIsOperador(userData.role === "operador");
        setIsContablista(userData.role === "contablista");
      } else {
        setIsAdmin(false);
        setIsOperador(false);
        setIsContablista(false);
      }
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);
    }
  }, []);

  // 🔎 Verifica se já existe sessão
  useEffect(() => {
    const checkUser = async () => {
      try {
        await api.get("/sanctum/csrf-cookie");
        await fetchUser();
      } catch (error) {
        console.error("Erro na inicialização:", error);
        setUser(null);
        setIsAdmin(false);
        setIsOperador(false);
        setIsContablista(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [fetchUser]);

  // 🔑 Login
  const login = useCallback(async (email: string, password: string) => {
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

      // Limpa estado em caso de erro
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);

      return {
        success: false,
        message: errorMessage || "Erro ao fazer login"
      };
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  // 🔒 Logout
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      await api.post("/logout");

      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);

      toast.success("Logout realizado com sucesso");
      router.replace("/login");

      return { success: true };
    } catch (error: unknown) {
      console.error("Erro no logout:", error);
      const errorMessage = error instanceof Error && 'response' in error
        ? (error.response as any).data?.message
        : "Erro ao fazer logout";

      toast.error(errorMessage || "Erro ao fazer logout");

      // Mesmo com erro, limpa o estado local
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);

      return {
        success: false,
        message: errorMessage || "Erro ao fazer logout"
      };
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      isOperador,
      isContablista,
      login,
      logout,
      fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// 🔗 Hook para usar o AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro do AuthProvider");
  return context;
}