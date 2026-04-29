// @/services/User.ts
import api from "@/services/axios";

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

// ─── CRUD — todos os paths incluem /api/ explicitamente ───────────────────────

export const fetchUsers = async (
    filters?: UsersFilterParams
): Promise<User[]> => {
    const params: Record<string, string | boolean> = {};
    if (filters?.ativo !== undefined) params.ativo = filters.ativo;
    if (filters?.role)                params.role  = filters.role;
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

export const updateUltimoLogin = async (id: string): Promise<User> => {
    const response = await api.patch<UserResponse>(`/api/users/${id}/ultimo-login`);
    return response.data.user;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export const hasRole = (user: User | null, role: User["role"]): boolean =>
    user?.role === role;

export const isAdmin = (user: User | null): boolean =>
    hasRole(user, "admin");

export default api;