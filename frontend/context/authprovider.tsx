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

  // Rotas públicas que não requerem autenticação
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

  // Função para verificar se a rota atual é pública
  const isPublicRoute = useCallback((path: string | null) => {
    if (!path) return false;
    return publicRoutes.some(route => path === route || path.startsWith(route + '/'));
  }, []);

  // 🔹 Busca usuário autenticado com dados da empresa
  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get<{ user: User }>("/me");
      const userData = response.data.user ?? null;
      setUser(userData);

      // Atualiza roles
      if (userData) {
        setIsAdmin(userData.role === "admin");
        setIsOperador(userData.role === "operador");
        setIsContablista(userData.role === "contablista");
        
        // Se está logado e está na página de login/register, redireciona para dashboard
        if (pathname === '/login' || pathname === '/register') {
          router.replace('/dashboard');
        }
      } else {
        setIsAdmin(false);
        setIsOperador(false);
        setIsContablista(false);
        
        // Se não está logado e não está em rota pública, redireciona para login
        if (!isPublicRoute(pathname) && pathname !== '/login' && pathname !== '/register') {
          console.log('Usuário não autenticado, redirecionando para login...');
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);
      
      // Se não está logado e não está em rota pública, redireciona para login
      if (!isPublicRoute(pathname) && pathname !== '/login' && pathname !== '/register') {
        console.log('Erro na autenticação, redirecionando para login...');
        router.replace('/login');
      }
    }
  }, [pathname, router, isPublicRoute]);

  // 🔎 Verifica se já existe sessão
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Tentar obter CSRF cookie (opcional, pode falhar se já existir)
        try {
          await api.get("/sanctum/csrf-cookie");
        } catch (csrfError) {
          console.log("CSRF cookie já existe ou erro ao obter:", csrfError);
        }
        
        await fetchUser();
      } catch (error) {
        console.error("Erro na inicialização:", error);
        setUser(null);
        setIsAdmin(false);
        setIsOperador(false);
        setIsContablista(false);
        
        // Se não está em rota pública, redireciona
        if (!isPublicRoute(pathname) && pathname !== '/login' && pathname !== '/register') {
          router.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [fetchUser, pathname, router, isPublicRoute]);

  // 🔑 Login
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // Obter CSRF token
      await api.get("/sanctum/csrf-cookie");

      const xsrfToken = Cookies.get("XSRF-TOKEN");

      await api.post(
        "/login",
        { email, password },
        {
          headers: xsrfToken ? {
            "X-XSRF-TOKEN": xsrfToken,
          } : {},
        }
      );

      await fetchUser();
      toast.success("Login realizado com sucesso!");
      router.replace("/dashboard");
      
      return { success: true };
    } catch (error: unknown) {
      console.error("Erro no login:", error);
      
      let errorMessage = "Erro ao fazer login";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || "Erro ao fazer login";
      }

      // Limpa estado em caso de erro
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);

      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [fetchUser, router]);

  // 🔒 Logout
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Tentar fazer logout no servidor
      try {
        await api.get("/sanctum/csrf-cookie");
        await api.post("/logout");
      } catch (serverError) {
        console.log("Erro no logout do servidor, continuando com limpeza local:", serverError);
      }

      // Limpar estado
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);
      
      // Limpar cookies manualmente
      Cookies.remove('XSRF-TOKEN', { path: '/' });
      Cookies.remove('laravel_session', { path: '/' });
      
      toast.success("Logout realizado com sucesso");
      router.replace("/login");

      return { success: true };
    } catch (error: unknown) {
      console.error("Erro no logout:", error);
      
      // Mesmo com erro, limpa o estado local
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);
      
      // Limpar cookies manualmente
      Cookies.remove('XSRF-TOKEN', { path: '/' });
      Cookies.remove('laravel_session', { path: '/' });

      toast.success("Logout realizado");
      router.replace("/login");

      return {
        success: true,
        message: "Logout realizado"
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
  if (!context) {
    throw new Error("useAuth deve ser usado dentro do AuthProvider");
  }
  return context;
}