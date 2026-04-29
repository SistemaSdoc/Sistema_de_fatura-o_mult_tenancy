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
    telefone: string | null;
    endereco: string | null;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
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

const AuthContext = createContext<AuthContextData | null>(null);

// ============ COMPONENT ============

interface AuthProviderProps {
    children: ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Ref para evitar fetch duplicado na montagem (React Strict Mode)
    const hasFetched = useRef(false);

    const isPublicRoute = pathname
        ? PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
        : false;

    // ========== FETCH USER ==========
    const fetchUser = useCallback(async (): Promise<void> => {
        console.log("[AuthProvider] fetchUser iniciado", {
            hasUser: !!user,
            isPublicRoute,
            pathname,
        });

        if (isPublicRoute) {
            setLoading(false);
            return;
        }

        // Se já temos user, não precisamos buscar novamente
        // (a menos que refreshUser seja chamado explicitamente)
        if (user) {
            console.log("[AuthProvider] User já existe, skip fetchUser");
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
                setUser(userData);
                console.log("[AuthProvider] User carregado via /me:", userData);
            } else {
                throw new Error("Não autenticado");
            }
        } catch (error) {
            console.log("[AuthProvider] fetchUser falhou:", (error as Error).message);
            setUser(null);
            // NÃO redireciona aqui — deixa o componente de página decidir
        } finally {
            setLoading(false);
        }
    }, [isPublicRoute, user]); // ← user nas deps para skip inteligente

    // ========== MOUNT EFFECT ==========
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        if (!isPublicRoute) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [fetchUser, isPublicRoute]);

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

                // 3. Persiste tenant
                if (data.empresa) {
                    setTenant(data.empresa);
                }

                // 4. Persiste user DIRETAMENTE (evita chamar /me imediatamente)
                const userData: User = {
                    ...data.user,
                    empresa: data.empresa,
                };
                setUser(userData);

                toast.success(`Bem-vindo, ${data.user.name}!`);

                // Pequeno delay para garantir que cookies foram processados pelo browser
                // antes de navegar (não é gambiarra, é necessário para cookie persistence)
                await new Promise((resolve) => setTimeout(resolve, 50));

                router.replace("/dashboard");

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
    // ⭐ CORREÇÃO: NUNCA remove cookies manualmente (laravel_session, XSRF-TOKEN)
    // O backend gerencia a sessão. Remover cookies manualmente quebra a sessão Laravel.
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
            // Continua para limpar estado local mesmo com erro na API
        }

        // Sempre limpa estado local
        setUser(null);
        clearTenant();

        // ⭐ REMOVIDO: NUNCA remova cookies manualmente!
        // Cookies.remove("XSRF-TOKEN");      // ❌ QUEBRA SESSÃO
        // Cookies.remove("laravel_session"); // ❌ QUEBRA SESSÃO
        // 
        // O backend já gerencia a sessão via logout().
        // O cookie laravel_session deve permanecer para que o tenant_id
        // continue na sessão e o middleware ResolveTenant funcione.

        toast.success("Logout realizado");

        // Reset do ref para permitir novo fetch após próximo login
        hasFetched.current = false;

        router.replace("/login");

        return {
            success: true, // Sempre true porque estado local foi limpo
            message: apiSuccess ? "Logout realizado com sucesso" : "Logout local realizado",
        };
    }, [router]);

    // ========== REFRESH USER ==========
    const refreshUser = useCallback(async (): Promise<void> => {
        console.log("[AuthProvider] refreshUser chamado");
        // Força re-fetch ignorando cache
        hasFetched.current = false;
        await fetchUser();
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