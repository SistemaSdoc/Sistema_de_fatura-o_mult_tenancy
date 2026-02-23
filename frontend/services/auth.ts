// src/services/auth.ts
import api from "./axios";
import { AxiosError } from "axios";

/* ================== HELPERS ================== */
function handleAxiosError(err: unknown, prefix: string) {
    if (err instanceof AxiosError) {
        const msg = err.response?.data?.message || err.message || "Erro desconhecido";
        console.error(`${prefix}:`, msg);
    } else {
        console.error(`${prefix}:`, err);
    }
}

/* ================== TIPOS ================== */
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'operador' | 'contabilista';
    ultimo_login?: string | null;
    remember_token?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    user?: User;
    token?: string;
}

export interface LogoutResponse {
    success: boolean;
    message: string;
}

export interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

/* ================== AUTH SERVICE ================== */
export const authService = {
    /**
     * Obter dados do usuário atual
     */
    async getMe(): Promise<User | null> {
        try {
            const response = await api.get('/api/me');
            return response.data.user;
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao obter usuário");
            return null;
        }
    },

    /**
     * Atualizar último login do usuário
     */
    async updateUltimoLogin(userId: string): Promise<boolean> {
        try {
            await api.post(`/api/users/${userId}/ultimo-login`);
            return true;
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao atualizar último login");
            return false;
        }
    },

    /**
     * Login do usuário - Versão para Sanctum
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse | null> {
        try {
            // Para Sanctum, geralmente usamos CSRF primeiro
            await api.get('/sanctum/csrf-cookie');
            
            const response = await api.post('/api/login', credentials);

            // Se a API retornar token, salva
            if (response.data.token) {
                localStorage.setItem('auth_token', response.data.token);
            }

            // Salvar dados do usuário
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            return {
                success: true,
                message: response.data.message || 'Login realizado com sucesso',
                user: response.data.user,
                token: response.data.token
            };
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao fazer login");

            if (err instanceof AxiosError && err.response) {
                return {
                    success: false,
                    message: err.response.data?.message || 'Erro ao fazer login',
                };
            }

            return {
                success: false,
                message: 'Erro de conexão com o servidor',
            };
        }
    },

    /**
     * Logout do usuário - Versão otimizada para Sanctum
     * Primeiro tenta chamar a API, se falhar, apenas limpa dados locais
     */
    async logout(): Promise<LogoutResponse> {
        try {
            // Tentar fazer logout no servidor
            try {
                await api.post('/api/logout');
                console.log("[AUTH] Logout no servidor realizado com sucesso");
            } catch (serverError) {
                // Se for erro 500 (Method does not exist), sabemos que a rota não está configurada
                if (serverError instanceof AxiosError && serverError.response?.status === 500) {
                    console.warn("[AUTH] Rota de logout não configurada no servidor. Continuando com limpeza local...");
                } else {
                    console.warn("[AUTH] Erro no logout do servidor, continuando com limpeza local...");
                }
            }

            // Limpar dados locais (sempre fazemos isso, independente do resultado da API)
            this.clearLocalData();

            return {
                success: true,
                message: 'Logout realizado com sucesso'
            };
        } catch (err) {
            console.error("[AUTH] Erro ao fazer logout:", err);

            // Mesmo com erro, tenta limpar os dados locais
            this.clearLocalData();

            return {
                success: false,
                message: 'Erro ao fazer logout, mas dados locais foram limpos'
            };
        }
    },

    /**
     * Logout simplificado - Apenas limpa dados locais (recomendado para Sanctum)
     * Use esta versão se a rota de logout não existir no backend
     */
    async simpleLogout(): Promise<LogoutResponse> {
        try {
            console.log("[AUTH] Executando logout simplificado (apenas limpeza local)");
            this.clearLocalData();
            return {
                success: true,
                message: 'Logout realizado com sucesso'
            };
        } catch (err) {
            console.error("[AUTH] Erro ao fazer logout simplificado:", err);
            return {
                success: false,
                message: 'Erro ao fazer logout'
            };
        }
    },

    /**
     * Limpar todos os dados locais (localStorage, sessionStorage, cookies)
     */
    clearLocalData(): void {
        if (typeof window === 'undefined') return;

        console.log("[AUTH] Limpando dados locais...");

        // Remover tokens do localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('remember_me');
        localStorage.removeItem('XSRF-TOKEN');

        // Limpar sessionStorage completamente
        sessionStorage.clear();

        // Limpar todos os cookies relacionados à autenticação
        this.clearAllCookies();

        console.log("[AUTH] Dados locais limpos com sucesso");
    },

    /**
     * Limpar todos os cookies do navegador
     */
    clearAllCookies(): void {
        if (typeof document === 'undefined') return;

        const cookies = document.cookie.split(";");

        // Lista de cookies comuns que devem ser removidos
        const cookiesToRemove = [
            'auth_token',
            'remember_token',
            'remember_web',
            'laravel_session',
            'laravel_token',
            'XSRF-TOKEN',
            'session',
            'user_session',
            'token'
        ];

        // Remover cookies específicos
        cookiesToRemove.forEach(cookieName => {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        });

        // Remover todos os cookies existentes
        cookies.forEach(function (c) {
            const cookieName = c.split('=')[0].trim();
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        });
    },

    /**
     * Verificar se o usuário está autenticado
     */
    isAuthenticated(): boolean {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem('auth_token');
    },

    /**
     * Obter usuário do localStorage
     */
    getUserFromStorage(): User | null {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    /**
     * Obter token de autenticação
     */
    getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('auth_token');
    },

    /**
     * Verificar se o usuário tem determinada role
     */
    hasRole(role: string | string[]): boolean {
        const user = this.getUserFromStorage();
        if (!user) return false;

        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    },

    /**
     * Verificar se é admin
     */
    isAdmin(): boolean {
        return this.hasRole('admin');
    },

    /**
     * Verificar se é operador
     */
    isOperador(): boolean {
        return this.hasRole('operador');
    },

    /**
     * Verificar se é contabilista
     */
    isContabilista(): boolean {
        return this.hasRole('contabilista');
    },

    /**
     * Registrar usuário
     */
    async register(userData: {
        name: string;
        email: string;
        password: string;
        password_confirmation?: string;
        role?: string;
    }): Promise<LoginResponse | null> {
        try {
            const response = await api.post('/api/register', userData);

            if (response.data.token) {
                localStorage.setItem('auth_token', response.data.token);
            }

            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            return {
                success: true,
                message: response.data.message || 'Registro realizado com sucesso',
                user: response.data.user,
                token: response.data.token
            };
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao registrar");

            if (err instanceof AxiosError && err.response) {
                return {
                    success: false,
                    message: err.response.data?.message || 'Erro ao registrar',
                };
            }

            return {
                success: false,
                message: 'Erro de conexão com o servidor',
            };
        }
    },

    /**
     * Solicitar redefinição de senha
     */
    async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
        try {
            await api.post('/api/forgot-password', { email });
            return {
                success: true,
                message: 'Email de recuperação enviado com sucesso'
            };
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao solicitar redefinição de senha");

            if (err instanceof AxiosError && err.response) {
                return {
                    success: false,
                    message: err.response.data?.message || 'Erro ao solicitar redefinição',
                };
            }

            return {
                success: false,
                message: 'Erro de conexão com o servidor',
            };
        }
    },

    /**
     * Redefinir senha
     */
    async resetPassword(token: string, email: string, password: string, passwordConfirmation: string): Promise<{ success: boolean; message: string }> {
        try {
            await api.post('/api/reset-password', {
                token,
                email,
                password,
                password_confirmation: passwordConfirmation
            });
            return {
                success: true,
                message: 'Senha redefinida com sucesso'
            };
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao redefinir senha");

            if (err instanceof AxiosError && err.response) {
                return {
                    success: false,
                    message: err.response.data?.message || 'Erro ao redefinir senha',
                };
            }

            return {
                success: false,
                message: 'Erro de conexão com o servidor',
            };
        }
    },

    /**
     * Verificar email (se necessário)
     */
    async verifyEmail(id: string, hash: string): Promise<{ success: boolean; message: string }> {
        try {
            await api.get(`/api/email/verify/${id}/${hash}`);
            return {
                success: true,
                message: 'Email verificado com sucesso'
            };
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao verificar email");
            return {
                success: false,
                message: 'Erro ao verificar email'
            };
        }
    },

    /**
     * Reenviar email de verificação
     */
    async resendVerificationEmail(): Promise<{ success: boolean; message: string }> {
        try {
            await api.post('/api/email/resend');
            return {
                success: true,
                message: 'Email de verificação reenviado'
            };
        } catch (err) {
            handleAxiosError(err, "[AUTH] Erro ao reenviar email");
            return {
                success: false,
                message: 'Erro ao reenviar email'
            };
        }
    }
};

/* ================== HOOK PARA USAR EM COMPONENTES REACT ================== */

/**
 * Hook para usar autenticação em componentes React
 * Este hook deve ser importado de @/hooks/useAuth, não daqui
 * Estamos mantendo apenas por compatibilidade, mas o recomendado é usar o serviço diretamente
 */
export const useAuth = () => {
    console.warn(
        "[AUTH] AVISO: Você está importando useAuth de @/services/auth. " +
        "O recomendado é importar de @/hooks/useAuth ou usar authService diretamente."
    );

    const getUser = async () => {
        return await authService.getMe();
    };

    const login = async (email: string, password: string, remember?: boolean) => {
        return await authService.login({ email, password, remember });
    };

    const logout = async () => {
        return await authService.simpleLogout();
    };

    const forceLogout = async () => {
        return await authService.simpleLogout();
    };

    const isAuthenticated = authService.isAuthenticated();
    const user = authService.getUserFromStorage();
    const isAdmin = authService.isAdmin();
    const isOperador = authService.isOperador();
    const isContabilista = authService.isContabilista();

    return {
        // Estados
        user,
        isAuthenticated,
        isAdmin,
        isOperador,
        isContabilista,

        // Métodos
        getUser,
        login,
        logout,
        forceLogout,
        getToken: authService.getToken,
        hasRole: authService.hasRole,
        clearLocalData: authService.clearLocalData,
    };
};

// Exportação padrão do serviço
export default authService;