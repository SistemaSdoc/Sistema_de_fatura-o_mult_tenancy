"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, clearTenant, setTenant } from "@/services/axios";
import { toast } from "sonner";

// ============ TYPES (alinhados com WebAuthController) ============

export interface PlanoFeature {
  id: string | number;
  nome: string;
  descricao?: string | null;
  icone?: string | null;
  ativo?: boolean;
  pivot?: { quantidade: number | null; unidade: string | null };
}

export interface Plano {
  id: string | number;
  nome: string;
  valor_mensal: number | string;
  valor_anual: number | string;
  duracao_meses: number;
  features: PlanoFeature[];
}

/** Devolvida apenas por GET /me (não vem no login). */
export interface Subscricao {
  id: string | number;
  plano: Plano | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
  forma_pagamento?: string | null;
  renovacao_automatica?: boolean;
  cancelado_em?: string | null;
}

export interface Empresa {
  id: string;
  nome: string;
  nif: string | null;
  subdomain: string;
  email: string;
  logo: string | null;
  telefone: string | null;
  endereco: string | null;
  regime_fiscal?: string | null;
  sujeito_iva?: boolean;
  is_seguradora?: boolean;
  iva_padrao?: number;
  status?: string;
  data_registro?: string | null;
  modo?: "singular" | "colectivo" | string;
  // só em /me
  nome_banco?: string | null;
  numero_conta?: string | null;
  iban?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  subscricao?: Subscricao | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo?: boolean;
  ultimo_login?: string | null;
  created_at?: string | null;
  email_verified_at?: string | null;
  // campos legados (o controller não os devolve)
  printer_ip?: string;
  oauth_verified?: boolean | null;
  empresa?: Empresa;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  redirect_url?: string; // URL do tenant (https://acme.app.factura-ja.ao/)
  user?: User;
  empresa?: Empresa;
  errors?: Record<string, string[]>;
}

interface MeResponse {
  success: boolean;
  message?: string;
  user?: User;
  empresa?: Empresa;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
  redirect_url?: string; // domínio base
}

interface LogoutResult {
  success: boolean;
  message: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<LogoutResult>;
  refreshUser: () => Promise<void>;
}

// ============ CONTEXT ============

export const AuthContext = createContext<AuthContextData | null>(null);

// ============ CONSTANTS / HELPERS ============

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

export const formatIncompleteFields = (fields: string[]): string =>
  fields.map((field) => FIELD_LABELS[field] || field).join(", ");

export const hasIncompleteEmpresaConfig = (empresa?: Empresa | null): boolean =>
  getIncompleteEmpresaFields(empresa).length > 0;

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

/** Estados HTTP do /me que significam "sessão inválida" → voltar ao login. */
const SESSION_INVALID_STATUS = [401, 403, 404];

/** Extrai a melhor mensagem de erro de uma resposta do controller (401/403/422/500). */
const extractErrorMessage = (error: unknown, fallback: string): string => {
  const e = error as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
    message?: string;
  };
  const data = e.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors)[0]?.[0];
    if (first) return first;
  }
  return data?.message || e.message || fallback;
};

/**
 * Navega para `path` no host indicado por `baseUrl` (redirect_url do controller).
 * - Mesma origem  → router (SPA)
 * - Outra origem (ex.: app.factura-ja.ao → acme.app.factura-ja.ao) → navegação completa
 * Devolve true se foi feita navegação completa.
 */
const navigateToTenant = (
  router: ReturnType<typeof useRouter>,
  path: string,
  baseUrl?: string
): boolean => {
  if (baseUrl) {
    try {
      const target = new URL(path, baseUrl);
      if (target.origin !== window.location.origin) {
        window.location.assign(target.toString());
        return true;
      }
    } catch {
      /* redirect_url inválido → fallback SPA */
    }
  }
  router.replace(path);
  return false;
};

// ============ COMPONENT ============

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const hasFetched = useRef(false);

  const isNoAuthRoute = pathname
    ? NO_AUTH_ROUTES.includes(pathname) || pathname.startsWith("/landlord")
    : false;

  // ========== FETCH USER (GET /me) ==========
  const fetchUser = useCallback(async (): Promise<void> => {
    if (isLoggingOut) {
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
      const data: MeResponse = response.data;

      if (data?.success && data.user) {
        const userData: User = {
          ...data.user,
          empresa: data.empresa,
        };

        if (!ALLOWED_ROLES.includes(userData.role)) {
          console.warn("[AuthProvider] Role não reconhecida:", userData.role);
          setUser(null);
          clearTenant();
          router.replace("/login");
          toast.error(`Role "${userData.role}" não autorizada. Contacte o administrador.`);
          return;
        }

        setUser(userData);

        if (data.empresa?.id) {
          setTenant({
            id: data.empresa.id,
            subdomain: data.empresa.subdomain,
          });
        }

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
        clearTenant();
        router.replace("/login");
      }
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;

      setUser(null);

      if (error?._silenced || (status && SESSION_INVALID_STATUS.includes(status))) {
        // 401 não autenticado | 403 sessão sem tenant | 404 empresa/utilizador inexistente
        clearTenant();
        router.replace("/login");
      } else {
        // erro de rede / 5xx: não é problema de sessão, não limpa o tenant
        console.error("[AuthProvider] fetchUser falhou:", error);
        toast.error("Não foi possível validar a sessão. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }, [isNoAuthRoute, pathname, router, isLoggingOut]);

  // ========== MOUNT EFFECT ==========
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
    async (
      email: string,
      password: string,
      redirectTo?: string
    ): Promise<{ success: boolean; message?: string }> => {
      setLoading(true);

      try {
        // Importante: um tenant antigo guardado enviaria X-Tenant-ID e forçaria a
        // Estratégia 1 do controller, impedindo o cross-tenant search (app.factura-ja.ao).
        // Em subdomínio o tenant continua a ser resolvido pelo host.
        clearTenant();

        await authApi.getCsrf();

        const response = await authApi.login(email, password);
        const data: LoginResponse = response.data;

        if (!data.success) {
          throw new Error(data.message || "Erro no login");
        }

        if (!data.user) {
          throw new Error("Dados do utilizador não retornados");
        }

        if (!ALLOWED_ROLES.includes(data.user.role)) {
          console.warn("[AuthProvider] Login com role inválida:", data.user.role);
          toast.error(`Role "${data.user.role}" não autorizada. Contacte o administrador.`);
          return { success: false, message: "Role não autorizada" };
        }

        if (data.empresa) {
          // mesmo formato usado no fetchUser
          setTenant({ id: data.empresa.id, subdomain: data.empresa.subdomain });
        } else {
          console.warn("[AuthProvider] Login sem empresa!");
        }

        const userData: User = {
          ...data.user,
          empresa: data.empresa,
        };
        setUser(userData);

        const destination =
          redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
            ? redirectTo
            : REDIRECT_MAP[userData.role] || "/dashboard";

        // O controller devolve `redirect_url` (https://<subdomain>.<domínio>/).
        // Se estamos no domínio base (cross-tenant), é preciso mudar de host.
        const fullNavigation = navigateToTenant(router, destination, data.redirect_url);

        if (!fullNavigation) {
          // já temos o user: evita um /me redundante no primeiro render do dashboard
          hasFetched.current = true;
        }

        return { success: true };
      } catch (error: unknown) {
        const message = extractErrorMessage(error, "Erro ao fazer login");
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
    let redirectUrl: string | undefined;

    try {
      const response = await authApi.logout();
      const data: LogoutResponse = response.data;
      apiSuccess = !!data?.success;
      redirectUrl = data?.redirect_url;
    } catch (error) {
      console.warn("[AuthProvider] Erro no logout do servidor", error);
    }

    // Limpa estado local
    setUser(null);
    clearTenant();
    try {
      localStorage.removeItem("landlord_user");
      sessionStorage.clear();
    } catch {
      /* storage indisponível */
    }

    hasFetched.current = false;
    setIsLoggingOut(false);
    setLoading(false);

    // Navegação completa: sai do subdomínio do tenant para o domínio base
    // (redirect_url do controller) e limpa todo o estado em memória.
    let loginUrl = "/login";
    if (redirectUrl) {
      try {
        loginUrl = new URL("/login", redirectUrl).toString();
      } catch {
        /* mantém /login relativo */
      }
    }
    window.location.assign(loginUrl);

    return {
      success: true,
      message: apiSuccess ? "Logout realizado com sucesso" : "Logout local realizado",
    };
  }, []);

  // ========== REFRESH USER ==========
  const refreshUser = useCallback(async (): Promise<void> => {
    hasFetched.current = true; // evita que o efeito dispare um segundo fetch
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