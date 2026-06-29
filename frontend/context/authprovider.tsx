"use client";

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    ReactNode,
} from "react";
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
    status?: string;
    created_at?: string | null;
}

export interface User {
    printer_ip: string;
    id: string;
    name: string;
    email: string;
    role: string;
    ativo?: boolean;
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
        password: string
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

// Rotas que NÃO precisam de autenticação (não chamam /me)
const NO_AUTH_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

// Roles permitidas no sistema
const ALLOWED_ROLES = [
    "admin",
    "gestor",
    "contablista",
    "operador",
];

// Mapa de redirecionamento por role
const REDIRECT_MAP: Record<string, string> = {
    admin: "/dashboard",
    gestor: "/dashboard/Produtos_servicos/Stock",        
    contablista: "/dashboard/relatorios",                
    operador: "/dashboard/Vendas/Nova_venda",                                  
};

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Ref para evitar fetch duplicado na montagem (React Strict Mode)
    const hasFetched = useRef(false);

    // Verifica se a rota atual NÃO precisa de autenticação
    const isNoAuthRoute = pathname ? NO_AUTH_ROUTES.includes(pathname) : false;

    // ========== FETCH USER ==========
    const fetchUser = useCallback(async (): Promise<void> => {
        console.log("[AuthProvider] fetchUser iniciado");

        if (isNoAuthRoute) {
            setLoading(false);
            return;
        }

        try {
            const response = await authApi.me();

            if (response.data?.success && response.data.user) {
                const userData: User = {
                    ...response.data.user,
                    empresa: response.data.empresa,
                };

                // Verifica se a role é válida
                if (!ALLOWED_ROLES.includes(userData.role)) {
                    console.warn("[AuthProvider] Role não reconhecida:", userData.role);
                    setUser(null);
                    clearTenant();
                    
                    // Se não estiver na página de login, redireciona
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
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("[AuthProvider] fetchUser falhou:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [isNoAuthRoute, pathname, router]);

    // ========== MOUNT EFFECT ==========
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        // ✅ Só executa fetchUser se NÃO for rota sem autenticação
        if (!isNoAuthRoute) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [fetchUser, isNoAuthRoute]);

    // ========== LOGIN ==========
    const login = useCallback(
        async (
            email: string,
            password: string
        ): Promise<{ success: boolean; message?: string }> => {
            setLoading(true);

            try {
                // 1. CSRF cookie (Sanctum requirement)
                await authApi.getCsrf();

                // 2. Login
                const response = await authApi.login(email, password);
                const data: LoginResponse = response.data;

                if (!data.success) {
                    throw new Error(data.message || "Erro no login");
                }

                if (!data.user) {
                    throw new Error("Dados do usuário não retornados");
                }

                // Verifica se a role é válida antes de prosseguir
                if (!ALLOWED_ROLES.includes(data.user.role)) {
                    console.warn("[AuthProvider] Login com role inválida:", data.user.role);
                    toast.error(`Role "${data.user.role}" não autorizada. Contacte o administrador.`);
                    return { success: false, message: "Role não autorizada" };
                }

                // 3. Persiste tenant
                if (data.empresa) {
                    setTenant(data.empresa);
                    console.log("[AuthProvider] Tenant guardado no login:", data.empresa.id);
                } else {
                    console.warn("[AuthProvider] Login sem empresa!");
                }

                // 4. Persiste user DIRETAMENTE
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

                toast.success(`Bem-vindo, ${data.user.name}!`);

                // Pequeno delay para garantir que cookies foram processados
                await new Promise((resolve) => setTimeout(resolve, 100));

                // ========== REDIRECIONAMENTO POR ROLE ==========
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
                const message =
                    axiosError.response?.data?.message ||
                    axiosError.message ||
                    "Erro ao fazer login";

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

        // Sempre limpa estado local
        setUser(null);
        clearTenant();

        toast.success("Logout realizado");

        // Reset do ref para permitir novo fetch após próximo login
        hasFetched.current = false;

        router.replace("/login");

        return {
            success: true,
            message: apiSuccess ? "Logout realizado com sucesso" : "Logout local realizado",
        };
    }, [router]);

    // ========== REFRESH USER ==========
    const refreshUser = useCallback(async (): Promise<void> => {
        console.log("[AuthProvider] refreshUser chamado - Forçando atualização");

        // Força re-fetch sempre que refreshUser for chamado
        hasFetched.current = false;
        setUser(null);        // ← Limpa temporariamente para forçar busca
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

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ========== HOOK ==========
export function useAuth(): AuthContextData {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth deve ser usado dentro de AuthProvider");
    }
    return context;
}
