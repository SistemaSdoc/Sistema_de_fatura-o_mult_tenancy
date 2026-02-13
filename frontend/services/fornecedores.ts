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

// Helper para log detalhado
const logError = (context: string, error: any) => {
    console.error(`[FORNECEDOR SERVICE] ${context} - ERRO:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
    });
};

// Helper para limpar cache do navegador (se houver)
const clearFornecedorCache = () => {
    // Se você estiver usando React Query/SWR, invalidate aqui
    console.log('[FORNECEDOR SERVICE] Cache limpo');
};

export const fornecedorService = {
    // Listar apenas fornecedores ativos (não deletados) - COM TIMESTAMP PARA EVITAR CACHE
    async listarFornecedores(): Promise<Fornecedor[]> {
        console.log('[FORNECEDOR SERVICE] Listar fornecedores - Iniciando...');
        try {
            // CORREÇÃO: Adicionar timestamp para evitar cache do navegador
            const timestamp = new Date().getTime();
            const response = await api.get(`${API_PREFIX}/fornecedores?_t=${timestamp}`);
            console.log('[FORNECEDOR SERVICE] Listar fornecedores - Sucesso:', response.data);
            
            // Filtrar explicitamente apenas os não deletados (segurança extra)
            const fornecedores = response.data.fornecedores || [];
            const ativos = fornecedores.filter((f: Fornecedor) => !f.deleted_at);
            console.log(`[FORNECEDOR SERVICE] Total: ${fornecedores.length}, Ativos filtrados: ${ativos.length}`);
            
            return ativos;
        } catch (error: any) {
            logError('Listar fornecedores', error);
            throw error;
        }
    },

    // Listar todos incluindo deletados
    async listarTodosFornecedores(): Promise<Fornecedor[]> {
        console.log('[FORNECEDOR SERVICE] Listar todos fornecedores...');
        try {
            const timestamp = new Date().getTime();
            const response = await api.get(`${API_PREFIX}/fornecedores/todos?_t=${timestamp}`);
            return response.data.fornecedores || [];
        } catch (error: any) {
            logError('Listar todos fornecedores', error);
            throw error;
        }
    },

    // Listar apenas deletados (lixeira) - COM TIMESTAMP
    async listarFornecedoresDeletados(): Promise<Fornecedor[]> {
        console.log('[FORNECEDOR SERVICE] Listar fornecedores deletados...');
        try {
            const timestamp = new Date().getTime();
            const response = await api.get(`${API_PREFIX}/fornecedores/trashed?_t=${timestamp}`);
            console.log('[FORNECEDOR SERVICE] Deletados recebidos:', response.data.fornecedores?.length || 0);
            return response.data.fornecedores || [];
        } catch (error: any) {
            logError('Listar fornecedores deletados', error);
            throw error;
        }
    },

    async buscarFornecedor(id: string): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Buscar fornecedor - ID:', id);
        try {
            const response = await api.get(`${API_PREFIX}/fornecedores/${encodeURIComponent(id)}`);
            return response.data.fornecedor;
        } catch (error: any) {
            logError('Buscar fornecedor', error);
            throw error;
        }
    },

    async criarFornecedor(dados: CriarFornecedorInput): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Criar fornecedor - Dados:', dados);
        try {
            const response = await api.post(`${API_PREFIX}/fornecedores`, dados);
            clearFornecedorCache();
            return response.data.fornecedor;
        } catch (error: any) {
            logError('Criar fornecedor', error);
            throw error;
        }
    },

    async atualizarFornecedor(id: string, dados: AtualizarFornecedorInput): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Atualizar fornecedor - ID:', id);
        console.log('[FORNECEDOR SERVICE] Dados enviados:', JSON.stringify(dados, null, 2));
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}`;
            console.log('[FORNECEDOR SERVICE] URL PUT:', url);
            
            const response = await api.put(url, dados, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }
            });
            
            console.log('[FORNECEDOR SERVICE] Atualizar - Resposta:', response.data);
            clearFornecedorCache();
            return response.data.fornecedor;
        } catch (error: any) {
            logError('Atualizar fornecedor', error);
            throw error;
        }
    },

    // Soft Delete - mover para lixeira
    async deletarFornecedor(id: string): Promise<void> {
        console.log('[FORNECEDOR SERVICE] Soft delete fornecedor - ID:', id);
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}`;
            console.log('[FORNECEDOR SERVICE] URL DELETE:', url);
            
            const response = await api.delete(url);
            
            console.log('[FORNECEDOR SERVICE] Soft delete - Resposta:', response.data);
            clearFornecedorCache();
        } catch (error: any) {
            logError('Soft delete fornecedor', error);
            throw error;
        }
    },

    // Restaurar da lixeira
    async restaurarFornecedor(id: string): Promise<Fornecedor> {
        console.log('[FORNECEDOR SERVICE] Restaurar fornecedor - ID:', id);
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}/restore`;
            const response = await api.post(url);
            
            console.log('[FORNECEDOR SERVICE] Restaurar - Sucesso:', response.data);
            clearFornecedorCache();
            return response.data.fornecedor;
        } catch (error: any) {
            logError('Restaurar fornecedor', error);
            throw error;
        }
    },

    // Deletar permanentemente
    async deletarFornecedorPermanente(id: string): Promise<void> {
        console.log('[FORNECEDOR SERVICE] Force delete fornecedor - ID:', id);
        
        try {
            const url = `${API_PREFIX}/fornecedores/${encodeURIComponent(id)}/force`;
            const response = await api.delete(url);
            
            console.log('[FORNECEDOR SERVICE] Force delete - Sucesso:', response.status);
            clearFornecedorCache();
        } catch (error: any) {
            logError('Force delete fornecedor', error);
            throw error;
        }
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