// @/services/User.ts
import api from "@/services/axios";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Empresa {
    id: string;
    nome: string;
    nif: string;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
    subdomain: string | null;
    logo: string | null;
    regime_fiscal: string;
    sujeito_iva: boolean;
    status: "ativo" | "suspenso";
    data_registro: string | null;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "operador" | "contablista" | "gestor";
    ativo: boolean;
    printer_ip: string | null;
    ultimo_login: string | null;
    created_at: string | null;
    updated_at: string | null;
    email_verified_at: string | null;
}

// Resposta do /me — EXATAMENTE como o backend retorna
export interface MeResponse {
    success?: boolean;
    message?: string;
    user: User;
    empresa: Empresa | null;
}

export interface RegisterData {
    name: string;
    role: "admin" | "operador" | "contablista" | "gestor";
    ativo?: boolean;
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "operador" | "contablista" | "gestor";
    ativo?: boolean;
    printer_ip?: string;
}

export interface UsersFilterParams {
    ativo?: boolean;
    role?: User["role"];
}

export interface LoginResponse {
    success: boolean;
    message: string;
    user: User;
    empresa?: Empresa;
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

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const fetchUsers = async (
    filters?: UsersFilterParams
): Promise<User[]> => {
    const params: Record<string, string | boolean> = {};
    if (filters?.ativo !== undefined) params.ativo = filters.ativo;
    if (filters?.role) params.role = filters.role;
    const response = await api.get<UsersListResponse>("/api/users", { params });
    return response.data.users;
};

export const fetchUserById = async (id: string): Promise<User> => {
    const response = await api.get<UserResponse>(`/api/users/${id}`);
    return response.data.user;
};

export const registerUser = async (
    data: RegisterData
): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>("/api/users", data);
    return response.data;
};

export const updateUser = async (
    id: string,
    data: UpdateUserData
): Promise<User> => {
    const response = await api.put<UserResponse>(`/api/users/${id}`, data);
    return response.data.user;
};

export const deleteUser = async (id: string): Promise<void> => {
    await api.delete(`/api/users/${id}`);
};

/**
 * Buscar o utilizador atual com empresa
 */
export const fetchCurrentUser = async (): Promise<MeResponse> => {
    const response = await api.get<MeResponse>("/me");
    return response.data;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export const hasRole = (user: User | null, role: User["role"]): boolean =>
    user?.role === role;

export const isAdmin = (user: User | null): boolean =>
    hasRole(user, "admin");

export default api;