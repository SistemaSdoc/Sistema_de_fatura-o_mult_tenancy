// @/services/User.ts
import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";

const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.1.192:8000   ";

// ─── AXIOS BASE (rotas públicas) ──────────────────────────────────────────────

const publicApi = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
    timeout: 10000,
});

// ─── AXIOS COM AUTH (Bearer Token) ────────────────────────────────────────────

const createAuthApi = (): AxiosInstance => {
    const token = Cookies.get("auth_token");

    if (!token) {
        throw new Error("Utilizador não autenticado");
    }

    return axios.create({
        baseURL: BACKEND_URL,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
    });
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

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
    empresa_id?: string | null;
    empresa?: Empresa;
    name: string;
    email: string;
    role: "admin" | "operador" | "contablista";
    ativo: boolean;
    ultimo_login?: string | null;
    email_verified_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    role: "admin" | "operador" | "contablista";
    empresa_id?: string;
    ativo?: boolean;
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "operador" | "contablista";
    ativo?: boolean;
    empresa_id?: string;
}

export interface UsersFilterParams {
    ativo?: boolean;
    role?: User["role"];
}

// ─── RESPONSE TYPES ───────────────────────────────────────────────────────────

export interface LoginResponse {
    message: string;
    user: User;
    token: string;
}

export interface RegisterResponse {
    message: string;
    user: User;
}

export interface UserResponse {
    message: string;
    user: User;
}

export interface UsersListResponse {
    message: string;
    users: User[];
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const loginUser = async (
    email: string,
    password: string
): Promise<LoginResponse> => {
    const response = await publicApi.post<LoginResponse>("/api/login", {
        email,
        password,
    });
    Cookies.set("auth_token", response.data.token, { expires: 7 });
    return response.data;
};

export const logoutUser = async (): Promise<void> => {
    const token = Cookies.get("auth_token");
    if (token) {
        try {
            const authApi = createAuthApi();
            await authApi.post("/api/logout");
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    }
    Cookies.remove("auth_token");
};

// ─── UTILIZADOR LOGADO ────────────────────────────────────────────────────────

export const fetchUser = async (): Promise<User> => {
    const authApi = createAuthApi();
    const response = await authApi.get<UserResponse>("/api/user");
    return response.data.user;
};

export const fetchMe = async (): Promise<User> => {
    const authApi = createAuthApi();
    const response = await authApi.get<UserResponse>("/api/me");
    return response.data.user;
};

// ─── CRUD USUÁRIOS ────────────────────────────────────────────────────────────

export const registerUser = async (
    data: RegisterData
): Promise<RegisterResponse> => {
    const authApi = createAuthApi();
    const response = await authApi.post<RegisterResponse>("/api/users", data);
    return response.data;
};

export const fetchUsers = async (
    filters?: UsersFilterParams
): Promise<User[]> => {
    const authApi = createAuthApi();
    const params: Record<string, string | boolean> = {};
    if (filters?.ativo !== undefined) params.ativo = filters.ativo;
    if (filters?.role)                params.role  = filters.role;
    const response = await authApi.get<UsersListResponse>("/api/users", { params });
    return response.data.users;
};

export const fetchUserById = async (id: string): Promise<User> => {
    const authApi = createAuthApi();
    const response = await authApi.get<UserResponse>(`/api/users/${id}`);
    return response.data.user;
};

export const updateUser = async (
    id: string,
    data: UpdateUserData
): Promise<User> => {
    const authApi = createAuthApi();
    const response = await authApi.put<UserResponse>(`/api/users/${id}`, data);
    return response.data.user;
};

export const deleteUser = async (id: string): Promise<void> => {
    const authApi = createAuthApi();
    await authApi.delete(`/api/users/${id}`);
};

export const updateUltimoLogin = async (id: string): Promise<User> => {
    const authApi = createAuthApi();
    const response = await authApi.patch<UserResponse>(
        `/api/users/${id}/ultimo-login`
    );
    return response.data.user;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export const hasRole = (user: User | null, role: User["role"]): boolean =>
    user?.role === role;

export const isAdmin = (user: User | null): boolean =>
    hasRole(user, "admin");

export default publicApi;