// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperador, setIsOperador] = useState(false);
  const [isContablista, setIsContablista] = useState(false);

  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

  const isPublicRoute = useCallback((path: string | null) => {
    if (!path) return false;
    return publicRoutes.some(route => path === route || path.startsWith(route + '/'));
  }, []);

  // Buscar dados do usuário
  const fetchUser = useCallback(async () => {
    if (isPublicRoute(pathname)) {
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);
      return;
    }

    try {
      const response = await api.get<{ user: User }>("/me");
      const userData = response.data.user ?? null;

      setUser(userData);

      if (userData) {
        setIsAdmin(userData.role === "admin");
        setIsOperador(userData.role === "operador");
        setIsContablista(userData.role === "contablista");
      } else {
        setIsAdmin(false);
        setIsOperador(false);
        setIsContablista(false);
        router.replace('/login');
      }
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);

      if (!isPublicRoute(pathname)) {
        router.replace('/login');
      }
    }
  }, [pathname, router, isPublicRoute]);

  // Verifica sessão ao mudar de rota
  useEffect(() => {
    const initAuth = async () => {
      if (isPublicRoute(pathname)) {
        setLoading(false);
        return;
      }

      try {
        await fetchUser();
      } catch (error) {
        console.error("Erro na inicialização da autenticação:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [fetchUser, pathname, isPublicRoute]);

  // ==================== LOGIN ====================
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);

    try {
      // 1. Obter CSRF Cookie (o interceptor do axios já trata disso)
      await api.get("/sanctum/csrf-cookie");

      // 2. Fazer login (o axios já envia o XSRF-TOKEN automaticamente)
      await api.post("/login", { email, password });

      // 3. Buscar dados do usuário
      await fetchUser();

      toast.success("Login realizado com sucesso!");
      router.replace("/dashboard/Faturas/Faturas");

      return { success: true };
    } catch (error: unknown) {
      console.error("Erro no login:", error);

      let errorMessage = "Credenciais inválidas ou erro no servidor";

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchUser, router]);

  // ==================== LOGOUT ====================
  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await api.post("/logout");
    } catch (error) {
      console.log("Erro no logout do servidor (pode ser ignorado):", error);
    }

    // Limpeza local
    setUser(null);
    setIsAdmin(false);
    setIsOperador(false);
    setIsContablista(false);

    Cookies.remove('XSRF-TOKEN', { path: '/' });
    Cookies.remove('laravel_session', { path: '/' });

    toast.success("Sessão terminada com sucesso");
    router.replace("/login");

    return { success: true };
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}