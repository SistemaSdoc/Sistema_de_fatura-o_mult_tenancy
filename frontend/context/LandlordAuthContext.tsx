// contexts/LandlordAuthContext.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { landAuthApi, clearTenant } from "@/services/axios";
import { usePathname, useRouter } from "next/navigation";

/**
 * Roles que podem entrar no PAINEL landlord.
 * `admin_empresa` (Google/freelancer) e `user` (espelho de operadores de tenant)
 * têm sessão no guard landlord_api, mas NÃO entram no painel.
 */
const LANDLORD_ROLES = ["super_admin", "suporte"] as const;
type LandlordRole = (typeof LANDLORD_ROLES)[number];

const isLandlordRole = (role: unknown): role is LandlordRole =>
  typeof role === "string" && (LANDLORD_ROLES as readonly string[]).includes(role);

export interface LandlordUser {
  id: string;
  name: string;
  email: string;
  role: LandlordRole;
}

interface LandlordAuthContextType {
  user: LandlordUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const LandlordAuthContext = createContext<LandlordAuthContextType | null>(null);

export const useLandlordAuth = (): LandlordAuthContextType => {
  const ctx = useContext(LandlordAuthContext);
  if (!ctx) throw new Error("useLandlordAuth deve ser usado dentro de LandlordAuthProvider");
  return ctx;
};

const PUBLIC_PATHS = ["/landlord/login", "/landlord/register"];
const HOME_PATH = "/landlord/dashboard/empresas";

const extractErrorMessage = (error: unknown, fallback: string): string => {
  const e = error as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
    message?: string;
  };
  const data = e.response?.data;
  const firstValidation = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return firstValidation || data?.message || e.message || fallback;
};

export function LandlordAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LandlordUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // ========== ME ==========
  const fetchMe = useCallback(async (): Promise<void> => {
    try {
      const response = await landAuthApi.me();
      const data = response.data?.user;

      // Sessão partilhada com os tenants: só aceita roles do landlord.
      // Não faz logout no servidor — isso derrubaria também a sessão do tenant.
      if (data && isLandlordRole(data.role)) {
        setUser(data as LandlordUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // ========== GUARD DE ROTAS ==========
  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicPath) {
      router.replace("/landlord/login");
      return;
    }

    // já autenticado e a abrir login/register → vai para o painel
    if (user && isPublicPath) {
      router.replace(HOME_PATH);
    }
  }, [loading, user, isPublicPath, router]);

  // ========== LOGIN ==========
  const login = async (email: string, password: string): Promise<void> => {
    // evita que um X-Tenant-ID antigo contamine o login do landlord
    clearTenant();

    try {
      await landAuthApi.getCsrf(); // sempre antes do login
      const response = await landAuthApi.login(email, password);
      const data = response.data?.user;

      if (!data || !isLandlordRole(data.role)) {
        // credenciais válidas mas utilizador não é do landlord (ex.: tenant)
        try {
          await landAuthApi.logout();
        } catch {
          /* ignora */
        }
        setUser(null);
        throw new Error("Sem permissão para aceder ao painel landlord.");
      }

      setUser(data as LandlordUser);
      router.push(HOME_PATH);
    } catch (error) {
      // o chamador (formulário) mostra a mensagem
      throw new Error(extractErrorMessage(error, "Erro ao fazer login"));
    }
  };

  // ========== LOGOUT ==========
  const logout = async (): Promise<void> => {
    try {
      await landAuthApi.logout();
    } catch (error) {
      console.warn("[LandlordAuth] Erro no logout do servidor", error);
    } finally {
      // limpa sempre o estado local, mesmo que a API falhe
      setUser(null);
      clearTenant();
      router.push("/landlord/login");
    }
  };

  return (
    <LandlordAuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchMe }}>
      {children}
    </LandlordAuthContext.Provider>
  );
}