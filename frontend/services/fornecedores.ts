// src/services/fornecedores.ts

import api from "./axios";

export type TipoFornecedor = "nacional" | "internacional";
export type StatusFornecedor = "ativo" | "inativo";

export interface Fornecedor {
    id: string;
    nome: string;
    nif: string;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    tipo: TipoFornecedor;
    status: StatusFornecedor;
    user_id: string;
    tenant_id?: string;
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

export type AtualizarFornecedorInput = Partial<CriarFornecedorInput>;
type TipoDocumento = 'NIF' | 'BI' | 'INVALIDO';

export interface ListarFornecedoresResponse {
    message: string;
    fornecedores: Fornecedor[];
    total?: number;
}

export interface FornecedorResponse {
    message: string;
    fornecedor: Fornecedor;
}

export interface DeletarFornecedorResponse {
    message: string;
    fornecedor?: Fornecedor;
    deleted?: boolean;
}

export interface RestaurarFornecedorResponse {
    message: string;
    fornecedor: Fornecedor;
}

const API_PREFIX = "/api";

// Helper para log detalhado
type ApiErrorLike = {
    response?: {
        status?: number;
        statusText?: string;
        data?: unknown;
    };
    message?: string;
};

const logError = (context: string, error: unknown) => {
    const err = error as ApiErrorLike;
    console.error(`[FORNECEDOR SERVICE] ${context} - ERRO:`, {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
    });
};

// Helper para limpar cache
const clearFornecedorCache = () => {
    console.log('[FORNECEDOR SERVICE] Cache limpo');
};

export const fornecedorService = {
    /**
     * Listar apenas fornecedores ativos (não deletados)
     * ✅ CORRIGIDO: Mapeia response.data.data para fornecedores
     */
    async listarFornecedores(): Promise<ListarFornecedoresResponse> {
        console.log('[FORNECEDOR SERVICE] Listar fornecedores - Iniciando...');
        try {
            const response = await api.get<{
                success: boolean;
                message: string;
                data: Fornecedor[];
                modo?: string;
            }>(`${API_PREFIX}/fornecedores`);
            
            console.log('[FORNECEDOR SERVICE] Listar fornecedores - Sucesso:', response.data);
            
            const fornecedores = response.data.data || [];
            
            // Filtrar explicitamente apenas os não deletados (segurança extra)
            const ativos = fornecedores.filter((f: Fornecedor) => !f.deleted_at);
            console.log(`[FORNECEDOR SERVICE] Total: ${fornecedores.length}, Ativos filtrados: ${ativos.length}`);
            
            return {
                message: response.data.message || "Lista de fornecedores carregada com sucesso",
                fornecedores: ativos,
                total: ativos.length,
            };
        } catch (error: unknown) {
            logError('Listar fornecedores', error);
            throw error;
        }
    },

    /**
     * Listar todos os fornecedores (incluindo deletados)
     * ✅ CORRIGIDO
     */
    async listarTodosFornecedores(): Promise<ListarFornecedoresResponse> {
        console.log('[FORNECEDOR SERVICE] Listar todos fornecedores...');
        try {
            const response = await api.get<{
                success: boolean;
                message: string;
                data: Fornecedor[];
                modo?: string;
            }>(`${API_PREFIX}/fornecedores/todos`);
            
            const fornecedores = response.data.data || [];
            
            return {
                message: response.data.message || "Lista completa de fornecedores carregada com sucesso",
                fornecedores: fornecedores,
                total: fornecedores.length,
            };
        } catch (error: unknown) {
            logError('Listar todos fornecedores', error);
            throw error;
        }
    },

    /**
     * Listar apenas fornecedores deletados (lixeira)
     * ✅ CORRIGIDO
     */
    async listarFornecedoresDeletados(): Promise<ListarFornecedoresResponse> {
        console.log('[FORNECEDOR SERVICE] Listar fornecedores deletados...');
        try {
            const response = await api.get<{
                success: boolean;
                message: string;
                data: Fornecedor[];
                modo?: string;
            }>(`${API_PREFIX}/fornecedores/deletados`);
            
            const fornecedores = response.data.data || [];
            console.log('[FORNECEDOR SERVICE] Deletados recebidos:', fornecedores.length);
            
            return {
                message: response.data.message || "Lista de fornecedores na lixeira carregada com sucesso",
                fornecedores: fornecedores,
                total: fornecedores.length,
            };
        } catch (error: unknown) {
            logError('Listar fornecedores deletados', error);
            throw error;
        }
    },

    /**
     * Listar APENAS fornecedores deletados (alias)
     */
    async listarFornecedoresTrashed(): Promise<ListarFornecedoresResponse> {
        return this.listarFornecedoresDeletados();
    },

    /**
     * Buscar fornecedor específico
     * ✅ CORRIGIDO
     */
    async buscarFornecedor(id: string): Promise<FornecedorResponse> {
        console.log('[FORNECEDOR SERVICE] Buscar fornecedor - ID:', id);
        try {
            const response = await api.get<{
                success: boolean;
                message: string;
                data: Fornecedor;
                modo?: string;
            }>(`${API_PREFIX}/fornecedores/${encodeURIComponent(id)}`);
            
            return {
                message: response.data.message || "Fornecedor carregado com sucesso",
                fornecedor: response.data.data,
            };
        } catch (error: unknown) {
            logError('Buscar fornecedor', error);
            throw error;
        }
    },

    /**
     * Criar novo fornecedor
     * ✅ CORRIGIDO
     */
    async criarFornecedor(dados: CriarFornecedorInput): Promise<FornecedorResponse> {
        console.log('[FORNECEDOR SERVICE] Criar fornecedor - Dados:', dados);
        try {
            const response = await api.post<{
                success: boolean;
                message: string;
                data: Fornecedor;
                modo?: string;
            }>(`${API_PREFIX}/fornecedores`, dados);
            
            clearFornecedorCache();
            
            return {
                message: response.data.message || "Fornecedor criado com sucesso",
                fornecedor: response.data.data,
            };
        } catch (error: unknown) {
            logError('Criar fornecedor', error);
            throw error;
        }
    },

    /**
     * Atualizar fornecedor
     * ✅ CORRIGIDO
     */
    async atualizarFornecedor(id: string, dados: AtualizarFornecedorInput): Promise<FornecedorResponse> {
        console.log('[FORNECEDOR SERVICE] Atualizar fornecedor - ID:', id);
        console.log('[FORNECEDOR SERVICE] Dados enviados:', JSON.stringify(dados, null, 2));
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}`;
            console.log('[FORNECEDOR SERVICE] URL PUT:', url);
            
            const response = await api.put<{
                success: boolean;
                message: string;
                data: Fornecedor;
                modo?: string;
            }>(url, dados, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }
            });
            
            console.log('[FORNECEDOR SERVICE] Atualizar - Resposta:', response.data);
            clearFornecedorCache();
            
            return {
                message: response.data.message || "Fornecedor atualizado com sucesso",
                fornecedor: response.data.data,
            };
        } catch (error: unknown) {
            logError('Atualizar fornecedor', error);
            throw error;
        }
    },

    /**
     * Soft Delete - mover para lixeira
     */
    async deletarFornecedor(id: string): Promise<DeletarFornecedorResponse> {
        console.log('[FORNECEDOR SERVICE] Soft delete fornecedor - ID:', id);
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}`;
            console.log('[FORNECEDOR SERVICE] URL DELETE:', url);
            
            const response = await api.delete<{
                success: boolean;
                message: string;
                data?: Fornecedor;
                deleted?: boolean;
                modo?: string;
            }>(url);
            
            console.log('[FORNECEDOR SERVICE] Soft delete - Resposta:', response.data);
            clearFornecedorCache();
            
            return {
                message: response.data.message || "Fornecedor movido para a lixeira com sucesso",
                fornecedor: response.data.data,
                deleted: response.data.deleted ?? true,
            };
        } catch (error: unknown) {
            logError('Soft delete fornecedor', error);
            throw error;
        }
    },

    /**
     * Restaurar da lixeira
     * ✅ CORRIGIDO
     */
    async restaurarFornecedor(id: string): Promise<RestaurarFornecedorResponse> {
        console.log('[FORNECEDOR SERVICE] Restaurar fornecedor - ID:', id);
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}/restore`;
            const response = await api.post<{
                success: boolean;
                message: string;
                data: Fornecedor;
                modo?: string;
            }>(url);
            
            console.log('[FORNECEDOR SERVICE] Restaurar - Sucesso:', response.data);
            clearFornecedorCache();
            
            return {
                message: response.data.message || "Fornecedor restaurado com sucesso",
                fornecedor: response.data.data,
            };
        } catch (error: unknown) {
            logError('Restaurar fornecedor', error);
            throw error;
        }
    },

    /**
     * Deletar permanentemente
     */
    async deletarFornecedorPermanente(id: string): Promise<{ message: string }> {
        console.log('[FORNECEDOR SERVICE] Force delete fornecedor - ID:', id);
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}/force`;
            const response = await api.delete<{
                success: boolean;
                message: string;
                modo?: string;
            }>(url);
            
            console.log('[FORNECEDOR SERVICE] Force delete - Sucesso:', response.status);
            clearFornecedorCache();
            
            return {
                message: response.data.message || "Fornecedor removido permanentemente",
            };
        } catch (error: unknown) {
            logError('Force delete fornecedor', error);
            throw error;
        }
    },
};

/* =====================================================================
 | HELPERS DE FORMATAÇÃO
 | ================================================================== */

export function getStatusColor(status: StatusFornecedor): string {
    return status === "ativo"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

export function getTipoColor(tipo: TipoFornecedor): string {
    return tipo === "nacional"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        : "bg-[#123859] text-[#F2F2F2] dark:bg-[#123859] dark:text-[#F2F2F2]";
}

export function getStatusLabel(status: StatusFornecedor): string {
    return status === "ativo" ? "Ativo" : "Inativo";
}

export function getTipoLabel(tipo: TipoFornecedor): string {
    return tipo === "nacional" ? "nacional" : "internacional";
}

export function getStatusBadgeVariant(status: StatusFornecedor): "success" | "destructive" {
    return status === "ativo" ? "success" : "destructive";
}

export function getTipoBadgeVariant(tipo: TipoFornecedor): "default" | "secondary" {
    return tipo === "nacional" ? "default" : "secondary";
}

/**
 * Identifica se o documento é NIF ou BI
 */
export function identificarDocumento(valor: string): TipoDocumento {
    const clean = valor.replace(/[^a-zA-Z0-9]/g, '');
    
    // NIF: 10 dígitos
    if (/^[0-9]{10}$/.test(clean)) {
        return 'NIF';
    }
    
    // BI: 9 números + 2 letras + 3 números
    if (/^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/.test(clean)) {
        return 'BI';
    }
    
    return 'INVALIDO';
}

/**
 * Formata NIF ou BI para exibição
 */
export function formatarNIF(nif: string): string {
    if (!nif) return '-';
    
    const clean = nif.replace(/[^a-zA-Z0-9]/g, '');
    const tipo = identificarDocumento(clean);
    
    if (tipo === 'NIF') {
        // 1234567890 -> 123 456 7890
        return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    
    if (tipo === 'BI') {
        // 123456789AB123 -> 123 456 789 AB 123
        return clean.replace(/(\d{3})(\d{3})(\d{3})([A-Za-z]{2})(\d{3})/, '$1 $2 $3 $4 $5');
    }
    
    return clean;
}

/**
 * Valida NIF/BI
 */
export function validarNIF(nif: string): boolean {
    if (!nif) return false;
    const clean = nif.replace(/[^a-zA-Z0-9]/g, '');
    const tipo = identificarDocumento(clean);
    return tipo !== 'INVALIDO';
}

/**
 * Normaliza NIF/BI (remove caracteres especiais)
 */
export function normalizarNIF(nif: string): string {
    return nif.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Filtra fornecedores por texto de busca
 */
export function filtrarFornecedores(
    fornecedores: Fornecedor[], 
    searchTerm: string
): Fornecedor[] {
    if (!searchTerm.trim()) return fornecedores;
    
    const term = searchTerm.toLowerCase().trim();
    return fornecedores.filter(f => 
        f.nome.toLowerCase().includes(term) ||
        f.nif.includes(term) ||
        (f.email && f.email.toLowerCase().includes(term)) ||
        (f.telefone && f.telefone.includes(term))
    );
}

/**
 * Agrupa fornecedores por status
 */
export function groupFornecedoresByStatus(fornecedores: Fornecedor[]): {
    ativos: Fornecedor[];
    inativos: Fornecedor[];
} {
    return {
        ativos: fornecedores.filter(f => f.status === "ativo"),
        inativos: fornecedores.filter(f => f.status === "inativo"),
    };
}

/**
 * Agrupa fornecedores por tipo
 */
export function groupFornecedoresByTipo(fornecedores: Fornecedor[]): {
    nacional: Fornecedor[];
    internacional: Fornecedor[];
} {
    return {
        nacional: fornecedores.filter(f => f.tipo === "nacional"),
        internacional: fornecedores.filter(f => f.tipo === "internacional"),
    };
}

export default fornecedorService;
