// @/services/userService.ts - COMPLETO COM DADOS DA EMPRESA
import axios from 'axios';
import Cookies from 'js-cookie';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.31:8000';

// Instância pública simples (sem auth, apenas CSRF)
const publicApi = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // ESSENCIAL para CSRF cookie
    timeout: 10000,
});

// Configuração CSRF
publicApi.defaults.xsrfCookieName = 'XSRF-TOKEN';
publicApi.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'operador' | 'contablista';
    empresa_id?: string;
    ativo?: boolean;
}

export interface Empresa {
    id: string;
    nome: string;
    nif: string;
    email: string;
    logo: string | null;
    status: string;
    endereco: string | null;
    telefone: string | null;
    regime_fiscal: string | null;
    sujeito_iva: boolean;
    data_registro: string;
    created_at?: string;
    updated_at?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    empresa_id?: string;
    empresa?: Empresa; // ✅ Dados completos da empresa
    ativo: boolean;
    created_at: string;
    updated_at: string;
}

export interface RegisterResponse {
    message: string;
    user: User;
}

export interface LoginResponse {
    message: string;
    user: User;
    token?: string;
}

export interface UserResponse {
    user: User;
}

/**
 * Registra um novo usuário (PÚBLICO - qualquer um pode cadastrar)
 */
export const registerUser = async (data: RegisterData): Promise<RegisterResponse> => {
    // 1. Obtém CSRF cookie
    await publicApi.get('/sanctum/csrf-cookie');

    // 2. Pega token XSRF
    const xsrfToken = Cookies.get('XSRF-TOKEN');

    if (!xsrfToken) {
        throw new Error('Token de segurança não disponível. Verifique se cookies estão habilitados.');
    }

    // 3. Faz POST para /api/users
    const response = await publicApi.post<RegisterResponse>(
        '/api/users',
        data,
        {
            headers: {
                'X-XSRF-TOKEN': xsrfToken,
            },
        }
    );

    return response.data;
};

/**
 * Login do usuário (obtém dados com empresa)
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
    // 1. Obtém CSRF cookie
    await publicApi.get('/sanctum/csrf-cookie');

    // 2. Pega token XSRF
    const xsrfToken = Cookies.get('XSRF-TOKEN');

    if (!xsrfToken) {
        throw new Error('Token de segurança não disponível. Verifique se cookies estão habilitados.');
    }

    // 3. Faz login
    const response = await publicApi.post<LoginResponse>(
        '/api/login',
        { email, password },
        {
            headers: {
                'X-XSRF-TOKEN': xsrfToken,
            },
        }
    );

    // 4. Se tiver token, salva no cookie
    if (response.data.token) {
        Cookies.set('auth_token', response.data.token, { expires: 7 });
    }

    return response.data;
};

/**
 * Busca dados do usuário logado com a empresa
 */
export const fetchUser = async (): Promise<User> => {
    const token = Cookies.get('auth_token');

    if (!token) {
        throw new Error('Não autenticado');
    }

    // Instância autenticada
    const authApi = axios.create({
        baseURL: BACKEND_URL,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        withCredentials: true,
        timeout: 10000,
    });

    const response = await authApi.get<UserResponse>('/api/user');
    return response.data.user;
};

/**
 * Logout do usuário
 */
export const logoutUser = async (): Promise<void> => {
    const token = Cookies.get('auth_token');

    if (token) {
        const authApi = axios.create({
            baseURL: BACKEND_URL,
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            withCredentials: true,
        });

        try {
            await authApi.post('/api/logout');
        } catch (error) {
            console.error('Erro no logout:', error);
        }
    }

    // Remove token mesmo se a requisição falhar
    Cookies.remove('auth_token');
};

export default publicApi;