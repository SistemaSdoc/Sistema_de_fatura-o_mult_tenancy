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
  ativo?: boolean;
  ultimo_login?: string | null;
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
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
  fetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData | null>(null);

// Retorna a rota inicial com base no role do utilizador
function getHomeByRole(role: string): string {
  switch (role) {
    case "contablista":
      return "/dashboard/relatorios";
    case "admin":
    case "operador":
    default:
      return "/dashboard/Faturas/Faturas";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperador, setIsOperador] = useState(false);
  const [isContablista, setIsContablista] = useState(false);

  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

  const isPublicRoute = useCallback((path: string | null) => {
    if (!path) return false;
    return publicRoutes.some(route => path === route || path.startsWith(route + '/'));
  }, []);

  const applyUser = useCallback((userData: User | null) => {
    setUserState(userData);
    if (userData) {
      setIsAdmin(userData.role === "admin");
      setIsOperador(userData.role === "operador");
      setIsContablista(userData.role === "contablista");
    } else {
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);
    }
  }, []);

  // fetchUser apenas valida a sessão — NÃO faz redirect para home,
  // só redireciona para /login se a sessão expirou
  const fetchUser = useCallback(async () => {
    if (isPublicRoute(pathname)) {
      applyUser(null);
      return;
    }

    try {
      const response = await api.get<{ user: User }>("/api/me");
      const userData = response.data.user ?? null;

      if (userData) {
        applyUser(userData);
      } else {
        applyUser(null);
        router.replace('/login');
      }
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      applyUser(null);
      if (!isPublicRoute(pathname)) {
        router.replace('/login');
      }
    }
  }, [pathname, router, isPublicRoute, applyUser]);

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
      await api.get("/sanctum/csrf-cookie");
      await api.post("/login", { email, password });

      // Buscar utilizador diretamente para ter o role antes de redirecionar
      const response = await api.get<{ user: User }>("/api/me");
      const userData = response.data.user ?? null;

      if (!userData) {
        throw new Error("Não foi possível obter os dados do utilizador.");
      }

      applyUser(userData);

      toast.success("Login realizado com sucesso!");

      // Redirecionar com base no role
      router.replace(getHomeByRole(userData.role));

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
  }, [router, applyUser]);

  // ==================== LOGOUT ====================
  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await api.post("/logout");
    } catch (error) {
      console.log("Erro no logout do servidor (pode ser ignorado):", error);
    }

    applyUser(null);
    Cookies.remove('XSRF-TOKEN', { path: '/' });
    Cookies.remove('laravel_session', { path: '/' });

    toast.success("Sessão terminada com sucesso");
    router.replace("/login");

    setLoading(false);
    return { success: true };
  }, [router, applyUser]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin,
      isOperador,
      isContablista,
      setUser: applyUser,
      login,
      logout,
      fetchUser,
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