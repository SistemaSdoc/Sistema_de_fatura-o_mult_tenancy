import api from "./axios";

export type TipoFornecedor = "Nacional" | "Internacional";
export type StatusFornecedor = "ativo" | "inativo";

export interface Fornecedor {
    id: string; // UUID
    nome: string;
    nif: string;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    tipo: TipoFornecedor;
    status: StatusFornecedor;
    user_id: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface CriarFornecedorInput {
    nome: string;
    nif: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    tipo?: TipoFornecedor;
    status?: StatusFornecedor;
}

export interface AtualizarFornecedorInput extends Partial<CriarFornecedorInput> { }

const API_PREFIX = "/api";

export const fornecedorService = {
    // Listar apenas fornecedores ativos (não deletados)
    async listarFornecedores(): Promise<Fornecedor[]> {
        console.log('[FORNECEDOR SERVICE] Listar fornecedores - Iniciando...');
        const response = await api.get(`${API_PREFIX}/fornecedores`);
        console.log('[FORNECEDOR SERVICE] Listar fornecedores - Sucesso:', response.data);
        return response.data.fornecedores || [];
    },

    // Listar todos incluindo deletados (admin)
    async listarTodosFornecedores(): Promise<Fornecedor[]> {
        console.log('[FORNECEDOR SERVICE] Listar todos fornecedores (com deletados)...');
        const response = await api.get(`${API_PREFIX}/fornecedores/todos`);
        return response.data.fornecedores || [];
    },

    // Listar apenas deletados (lixeira)
    async listarFornecedoresDeletados(): Promise<Fornecedor[]> {
        console.log('[FORNECEDOR SERVICE] Listar fornecedores deletados...');
        const response = await api.get(`${API_PREFIX}/fornecedores/trashed`);
        return response.data.fornecedores || [];
    },

    async buscarFornecedor(id: string): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Buscar fornecedor - ID:', id);
        const response = await api.get(`${API_PREFIX}/fornecedores/${id}`);
        console.log('[FORNECEDOR SERVICE] Buscar fornecedor - Sucesso:', response.data);
        return response.data.fornecedor;
    },

    async criarFornecedor(dados: CriarFornecedorInput): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Criar fornecedor - Dados:', dados);
        const response = await api.post(`${API_PREFIX}/fornecedores`, dados);
        console.log('[FORNECEDOR SERVICE] Criar fornecedor - Sucesso:', response.data);
        return response.data.fornecedor;
    },

    async atualizarFornecedor(id: string, dados: AtualizarFornecedorInput): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Atualizar fornecedor - ID:', id);
        const response = await api.put(`${API_PREFIX}/fornecedores/${id}`, dados);
        console.log('[FORNECEDOR SERVICE] Atualizar fornecedor - Sucesso:', response.status);
        return response.data.fornecedor;
    },

    // Soft Delete - mover para lixeira
    async deletarFornecedor(id: string): Promise<void> {
        console.log('[FORNECEDOR SERVICE] Soft delete fornecedor - ID:', id);
        const response = await api.delete(`${API_PREFIX}/fornecedores/${id}`);
        console.log('[FORNECEDOR SERVICE] Soft delete - Sucesso:', response.status);
    },

    // Restaurar da lixeira
    async restaurarFornecedor(id: string): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Restaurar fornecedor - ID:', id);
        const response = await api.post(`${API_PREFIX}/fornecedores/${id}/restore`);
        console.log('[FORNECEDOR SERVICE] Restaurar - Sucesso:', response.data);
        return response.data.fornecedor;
    },

    // Deletar permanentemente
    async deletarFornecedorPermanente(id: string): Promise<void> {
        console.log('[FORNECEDOR SERVICE] Force delete fornecedor - ID:', id);
        const response = await api.delete(`${API_PREFIX}/fornecedores/${id}/force`);
        console.log('[FORNECEDOR SERVICE] Force delete - Sucesso:', response.status);
    },
};

export function getStatusColor(status: StatusFornecedor): string {
    return status === "ativo"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

export function getTipoColor(tipo: TipoFornecedor): string {
    return tipo === "Nacional"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
}

export function getStatusLabel(status: StatusFornecedor): string {
    return status === "ativo" ? "Ativo" : "Inativo";
}

export function getTipoLabel(tipo: TipoFornecedor): string {
    return tipo === "Nacional" ? "Nacional" : "Internacional";
}

export function formatarNIF(nif: string): string {
    if (!nif) return "-";
    if (nif.length >= 10) {
        return nif.replace(/(\d{10})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return nif;
}

export default fornecedorService;