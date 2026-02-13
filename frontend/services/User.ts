// @/services/userService.ts - SIMPLIFICADO PARA CADASTRO PÚBLICO
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

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    empresa_id?: string;
    ativo: boolean;
    created_at: string;
    updated_at: string;
}

export interface RegisterResponse {
    message: string;
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

export default publicApi;