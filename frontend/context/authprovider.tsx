"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, clearTenant, setTenant } from "@/services/axios";
import { toast } from "sonner";

// ============ TYPES ============

export interface Empresa {
    id: string;
    nome: string;
    nif: string;
    subdomain: string;
    email: string;
    logo: string | null;
    nome_banco?: string | null;
    numero_conta?: string | null;
    iban?: string | null;
    telefone: string | null;
    endereco: string | null;
    regime_fiscal?: string | null;
    sujeito_iva?: boolean;
    iva_padrao?: number;
    subscricao?: string;
    modo?: string;
    status?: string;
    created_at?: string | null;
    pagamento?: {
        id: string;
        valor: number;
        data_vencimento: string;
        codigo_transacao: string;
        status: string;
        metodo_pagamento: string | null;
    };
}

export interface User {
  printer_ip: string;
  id: string;
  name: string;
  email: string;
  role: string;
  ativo?: boolean;
  oauth_verified?: boolean | null;
  empresa?: Empresa;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
  empresa?: Empresa;
}

interface LogoutResult {
  success: boolean;
  message: string;
}

interface AuthContextData {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (
        email: string,
        password: string,
        redirectTo?: string
    ) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<LogoutResult>;
    refreshUser: () => Promise<void>;
}

// ============ CONTEXT ============

export const AuthContext = createContext<AuthContextData | null>(null);

// ============ COMPONENT ============

interface AuthProviderProps {
  children: ReactNode;
}

const NO_AUTH_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/auth/callback", "/onboarding"];

const REQUIRED_BILLING_FIELDS = ["nif", "telefone", "endereco"] as const;

const FIELD_LABELS: Record<string, string> = {
  nif: "NIF",
  telefone: "telefone",
  endereco: "endereço",
  regime_fiscal: "regime fiscal",
  nome_banco: "nome do banco",
  numero_conta: "número da conta",
  iban: "IBAN",
  logo: "logo",
};

export const getIncompleteEmpresaFields = (empresa?: Empresa | null): string[] => {
  if (!empresa) return [];

  const missing: string[] = [];

  REQUIRED_BILLING_FIELDS.forEach((field) => {
    const value = empresa[field as keyof Empresa];
    if (value === null || value === undefined || String(value).trim() === "") {
      missing.push(field);
    }
  });

  if (empresa.modo === "singular" && (!empresa.logo || String(empresa.logo).trim() === "")) {
    missing.push("logo");
  }

  return missing;
};

export const formatIncompleteFields = (fields: string[]): string => fields.map((field) => FIELD_LABELS[field] || field).join(", ");

export const hasIncompleteEmpresaConfig = (empresa?: Empresa | null): boolean => {
  return getIncompleteEmpresaFields(empresa).length > 0;
};

const shouldRedirectToOnboarding = (pathname: string | null, user: User | null): boolean => {
  if (!pathname || !pathname.startsWith("/dashboard")) return false;
  if (!user) return false;
  return !user.empresa?.id;
};

const shouldRedirectToConfiguracoes = (pathname: string | null, user: User | null): boolean => {
  if (!pathname || !pathname.startsWith("/dashboard")) return false;
  if (!user || !user.empresa?.id) return false;
  if (pathname === "/dashboard") return false;
  return hasIncompleteEmpresaConfig(user.empresa);
};

const ALLOWED_ROLES = ["admin", "gestor", "contablista", "operador"];
const REDIRECT_MAP: Record<string, string> = {
  admin: "/dashboard",
  gestor: "/dashboard/Produtos_servicos/Stock",
  contablista: "/dashboard/relatorios",
  operador: "/dashboard/Vendas",
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const hasFetched = useRef(false);

  const isNoAuthRoute = pathname ? NO_AUTH_ROUTES.includes(pathname) : false;

  // ========== FETCH USER ==========
  const fetchUser = useCallback(async (): Promise<void> => {
    console.log("[AuthProvider] fetchUser iniciado");

    if (isLoggingOut) {
      console.log("[AuthProvider] fetchUser cancelado (logout em andamento)");
      setLoading(false);
      return;
    }

    if (isNoAuthRoute) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.me();

      if (response.data?.success && response.data.user) {
        const userData: User = {
          ...response.data.user,
          empresa: response.data.empresa,
        };

        if (!ALLOWED_ROLES.includes(userData.role)) {
          console.warn("[AuthProvider] Role não reconhecida:", userData.role);
          setUser(null);
          clearTenant();
          if (!isNoAuthRoute && pathname !== "/login") {
            router.replace("/login");
            toast.error(`Role "${userData.role}" não autorizada. Contacte o administrador.`);
          }
          return;
        }

        setUser(userData);

        if (response.data.empresa?.id) {
          setTenant({
            id: response.data.empresa.id,
            subdomain: response.data.empresa.subdomain,
          });
        }

        console.log("[AuthProvider] User atualizado com sucesso:", {
          id: userData.id,
          role: userData.role,
          empresa: userData.empresa?.nome,
        });

        if (shouldRedirectToOnboarding(pathname, userData)) {
          router.replace("/onboarding");
          return;
        }

        if (shouldRedirectToConfiguracoes(pathname, userData)) {
          router.replace("/dashboard");
          return;
        }
      } else {
        setUser(null);
        if (!isNoAuthRoute && pathname !== "/login") {
          router.replace("/login");
        }
      }
    } catch (error: any) {
      if (error._silenced) {
        console.log("[AuthProvider] Erro silenciado (400/401) – ignorado");
      } else {
        console.error("[AuthProvider] fetchUser falhou:", error);
      }
      setUser(null);
      if (!isNoAuthRoute && pathname !== "/login") {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [isNoAuthRoute, pathname, router, isLoggingOut]);

  // ========== MOUNT / PATHNAME-CHANGE EFFECT ==========
  useEffect(() => {
    if (isNoAuthRoute) {
      setLoading(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchUser();
  }, [fetchUser, isNoAuthRoute]);

  // ========== LOGIN ==========
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
      setLoading(true);

      try {
        await authApi.getCsrf();

        const response = await authApi.login(email, password);
        const data: LoginResponse = response.data;

        if (!data.success) {
          throw new Error(data.message || "Erro no login");
        }

        if (!data.user) {
          throw new Error("Dados do usuário não retornados");
        }

        if (!ALLOWED_ROLES.includes(data.user.role)) {
          console.warn("[AuthProvider] Login com role inválida:", data.user.role);
          toast.error(`Role "${data.user.role}" não autorizada. Contacte o administrador.`);
          return { success: false, message: "Role não autorizada" };
        }

        if (data.empresa) {
          setTenant(data.empresa);
          console.log("[AuthProvider] Tenant guardado no login:", data.empresa.id);
        } else {
          console.warn("[AuthProvider] Login sem empresa!");
        }

        const userData: User = {
          ...data.user,
          empresa: data.empresa,
        };
        setUser(userData);

        console.log("[AuthProvider] Login bem-sucedido:", {
          id: userData.id,
          role: userData.role,
          name: userData.name,
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        const destination = REDIRECT_MAP[userData.role] || "/dashboard";
        console.log("[AuthProvider] Redirecionando para:", {
          role: userData.role,
          destination,
        });

        router.replace(destination);

        return { success: true };
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const message = axiosError.response?.data?.message || axiosError.message || "Erro ao fazer login";

        toast.error(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // ========== LOGOUT ==========
  const logout = useCallback(async (): Promise<LogoutResult> => {
    setIsLoggingOut(true);
    setLoading(true);

    let apiSuccess = false;
    let apiMessage = "";

    try {
      await authApi.logout();
      apiSuccess = true;
      apiMessage = "Logout no servidor realizado";
      console.log("[AuthProvider]", apiMessage);
    } catch (error) {
      apiMessage = "Erro no logout do servidor";
      console.warn("[AuthProvider]", apiMessage, error);
    }

    // Limpa estado local
    setUser(null);
    clearTenant();
    localStorage.removeItem("landlord_user");
    sessionStorage.clear();

    hasFetched.current = false;
    setIsLoggingOut(false);

    // Redireciona para login
    router.replace("/login");

    // Aguarda a página de login ser renderizada e recarrega para limpar completamente
    setTimeout(() => {
      window.location.reload();
    }, 900);

    return {
      success: true,
      message: apiSuccess ? "Logout realizado com sucesso" : "Logout local realizado",
    };
  }, [router]);

  // ========== REFRESH USER ==========
  const refreshUser = useCallback(async (): Promise<void> => {
    console.log("[AuthProvider] refreshUser chamado - Forçando atualização");
    hasFetched.current = false;
    setUser(null);
    setLoading(true);
    try {
      await fetchUser();
    } catch (error) {
      console.error("[AuthProvider] Erro no refreshUser", error);
    }
  }, [fetchUser]);

  // ========== CONTEXT VALUE ==========
  const value: AuthContextData = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ========== HOOK ==========
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}