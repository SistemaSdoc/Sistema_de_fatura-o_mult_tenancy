// @/services/User.ts
import api from "@/services/axios";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Empresa {
  id: string;
  nome: string;
  nif: string;
  email: string;
  telefone?: string | null;
  endereco?: string | null;
  nome_banco?: string | null;
  numero_conta?: string | null;
  iban?: string | null;
  logo?: string | null;
  db_name: string;
  regime_fiscal: "simplificado" | "geral";
  modo: "colectivo" | "singular"; 
  sujeito_iva: boolean;
  status: "ativo" | "suspenso";
  data_registro: string;
  created_at?: string;
  updated_at?: string;
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
    tenant_id?: string;
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
    email: string;          
    password: string;      
    role: "admin" | "operador" | "contablista" | "gestor";
    empresa_id?: string;   
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



// ✅ CORRIGIDO - RegisterResponse pode ter "data" ou "user"
export interface RegisterResponse {
    success?: boolean;
    message: string;
    data?: User;      // ← Para a API que retorna "data"
    user?: User;      // ← Para compatibilidade com versões anteriores
    modo?: string;
}

// ✅ CORRIGIDO - UserResponse usa "data"
export interface UserResponse {
    success: boolean;
    message: string;
    data: User;
    modo?: string;
}

// ✅ CORRIGIDO - UsersListResponse usa "data"
export interface UsersListResponse {
    success: boolean;
    message: string;
    data: User[];
    modo?: string;
}


// ✅ INTERFACES CORRIGIDAS PARA REFLETIR A API
export interface UserResponse {
    success: boolean;
    message: string;
    data: User;  // ← CORRIGIDO: "data" em vez de "user"
    modo?: string;
}

export interface UsersListResponse {
    success: boolean;
    message: string;
    data: User[];  // ← CORRIGIDO: "data" em vez de "users"
    modo?: string;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const fetchUsers = async (
    filters?: UsersFilterParams
): Promise<User[]> => {
    const params: Record<string, string | boolean> = {};
    if (filters?.ativo !== undefined) params.ativo = filters.ativo;
    if (filters?.role) params.role = filters.role;
    
    const response = await api.get<UsersListResponse>("/api/users", { params });
    
    return response.data.data || [];
};

export const fetchUserById = async (id: string): Promise<User> => {
    const response = await api.get<UserResponse>(`/api/users/${id}`);
    
    // ✅ CORRIGIDO - response.data.data
    return response.data.data;
};

export const registerUser = async (
    data: RegisterData
): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>("/api/users", data);
    
    // ✅ CORRIGIDO - A resposta pode ter "user" ou "data"
    if (response.data.user) {
        return response.data;
    }
    return {
        message: response.data.message || "Utilizador criado com sucesso",
        user: response.data.data || response.data.user
    };
};

export const updateUser = async (
    id: string,
    data: UpdateUserData
): Promise<User> => {
    const response = await api.put<UserResponse>(`/api/users/${id}`, data);
    
    // ✅ CORRIGIDO - response.data.data
    return response.data.data;
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

export const isSuperAdmin = (user: User | null): boolean => {
    return user?.role === 'admin';
};

export default api;