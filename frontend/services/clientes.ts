// src/services/clientes.ts
import api from "./axios";

export type TipoCliente = "consumidor_final" | "empresa";
export type StatusCliente = "ativo" | "inativo";

export interface Cliente {
    id: string;
    nome: string;
    nif: string | null;
    tipo: TipoCliente;
    status: StatusCliente;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    data_registro: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
    // Accessors do backend
    nif_formatado?: string;
    tipo_label?: string;
    status_label?: string;
    nif_com_tipo?: string;
    esta_ativo?: boolean;
    esta_inativo?: boolean;
}

export interface CriarClienteInput {
    nome: string;
    nif?: string;
    tipo?: TipoCliente;
    status?: StatusCliente;
    telefone?: string;  
    email?: string;
    endereco?: string;
    data_registro?: string;
    iso_pais?: string;        // ← adicionado
}

export interface AtualizarClienteInput extends Partial<CriarClienteInput> { }

// ─── Estrutura de Resposta da API ──────────────────────────────────
export interface PaginatedResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface ListarClientesParams {
    page?: number;
    per_page?: number;
    search?: string;
    tipo?: TipoCliente;
    status?: StatusCliente | 'todos';
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

const API_PREFIX = "/api";

// ─── Funções de formatação ──────────────────────────────────────────
export function formatarNIF(nif: string | null): string {
    if (!nif || nif.trim() === '') return "-";
    
    const limpo = nif.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // NIF (10 dígitos)
    if (/^[0-9]{10}$/.test(limpo)) {
        return limpo.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    
    // BI (9 números + 2 letras + 3 números)
    if (/^[0-9]{9}[A-Z]{2}[0-9]{3}$/.test(limpo)) {
        return limpo.replace(/(\d{3})(\d{3})(\d{3})([A-Z]{2})(\d{3})/, '$1 $2 $3 $4 $5');
    }
    
    return limpo;
}

export function identificarTipoDocumento(nif: string | null): 'NIF' | 'BI' | 'DESCONHECIDO' {
    if (!nif || nif.trim() === '') return 'DESCONHECIDO';
    
    const clean = nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (/^[0-9]{10}$/.test(clean)) return 'NIF';
    if (/^[0-9]{9}[A-Z]{2}[0-9]{3}$/.test(clean)) return 'BI';
    
    return 'DESCONHECIDO';
}

export function getTipoClienteLabel(tipo: TipoCliente): string {
    const labels: Record<TipoCliente, string> = {
        consumidor_final: "Consumidor Final",
        empresa: "Empresa",
    };
    return labels[tipo] || tipo;
}

export function getTipoClienteColor(tipo: TipoCliente): string {
    return tipo === "empresa" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700";
}

export function getStatusClienteLabel(status: StatusCliente): string {
    const labels: Record<StatusCliente, string> = {
        ativo: "Ativo",
        inativo: "Inativo",
    };
    return labels[status] || status;
}

export function getStatusClienteColor(status: StatusCliente): string {
    const colors: Record<StatusCliente, string> = {
        ativo: "bg-green-100 text-green-700",
        inativo: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
}

// ─── Serviço Principal ──────────────────────────────────────────────
export const clienteService = {
    /**
     * Listar clientes com paginação e filtros
     */
    async listar(params: ListarClientesParams = {}): Promise<PaginatedResponse<Cliente>> {
        console.log('[CLIENTE SERVICE] Listar clientes - Params:', params);
        
        const queryParams: any = {
            page: params.page || 1,
            per_page: params.per_page || 15,
        };
        
        if (params.search) queryParams.search = params.search;
        if (params.tipo) queryParams.tipo = params.tipo;
        if (params.status && params.status !== 'todos') {
            // 🔥 CORREÇÃO: Usa "ativo" (singular) em vez de "ativos" (plural)
            queryParams.status = params.status;
        }
        if (params.sort_by) queryParams.sort_by = params.sort_by;
        if (params.sort_order) queryParams.sort_order = params.sort_order;
        
        const response = await api.get(`${API_PREFIX}/clientes`, { params: queryParams });
        
        console.log('[CLIENTE SERVICE] Listar clientes - Sucesso:', response.data);
        
        // A resposta da API já vem com a estrutura PaginatedResponse
        return response.data.data;
    },

    /**
     * Listar clientes ativos (mantido para compatibilidade)
     */
    async listarClientesAtivos(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar clientes ativos - Iniciando...');
        const response = await this.listar({ status: 'ativo', per_page: 15 });
        return response.data || [];
    },

    /**
     * Listar clientes inativos
     */
    async listarClientesInativos(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar clientes inativos - Iniciando...');
        const response = await this.listar({ status: 'inativo', per_page: 15 });
        return response.data || [];
    },

    /**
     * Listar todos os clientes (sem filtro de status)
     */
    async listarTodosClientes(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar todos clientes - Iniciando...');
        const response = await this.listar({ status: 'todos', per_page: 15 });
        return response.data || [];
    },

    /**
     * Buscar cliente por ID
     */
    async buscarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Buscar cliente - ID:', id);
        const response = await api.get(`${API_PREFIX}/clientes/${id}`);
        console.log('[CLIENTE SERVICE] Buscar cliente - Sucesso:', response.data);
        return response.data.cliente;
    },

    /**
     * Criar novo cliente
     */
    async criarCliente(dados: CriarClienteInput): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Criar cliente - Dados:', dados);
        
        // Normaliza o NIF antes de enviar
        const dadosNormalizados = {
            ...dados,
            nif: dados.nif ? dados.nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : undefined,
        };
        
        const response = await api.post(`${API_PREFIX}/clientes`, dadosNormalizados);
        console.log('[CLIENTE SERVICE] Criar cliente - Sucesso:', response.data);
        return response.data.cliente;
    },

    /**
     * Atualizar cliente
     */
    async atualizarCliente(id: string, dados: AtualizarClienteInput): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Atualizar cliente - ID:', id);
        console.log('[CLIENTE SERVICE] Dados:', dados);
        
        // Normaliza o NIF se presente
        const dadosNormalizados = {
            ...dados,
            nif: dados.nif ? dados.nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : dados.nif,
        };
        
        const response = await api.put(`${API_PREFIX}/clientes/${id}`, dadosNormalizados);
        console.log('[CLIENTE SERVICE] Atualizar cliente - Sucesso:', response.data);
        return response.data.cliente;
    },

    /**
     * Ativar cliente
     */
    async ativarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Ativar cliente - ID:', id);
        const response = await api.post(`${API_PREFIX}/clientes/${id}/ativar`);
        console.log('[CLIENTE SERVICE] Cliente ativado - Sucesso:', response.data);
        return response.data.cliente;
    },

    /**
     * Inativar cliente
     */
    async inativarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Inativar cliente - ID:', id);
        const response = await api.post(`${API_PREFIX}/clientes/${id}/inativar`);
        console.log('[CLIENTE SERVICE] Cliente inativado - Sucesso:', response.data);
        return response.data.cliente;
    },

    /**
     * Soft delete (arquivar)
     */
    async deletarCliente(id: string): Promise<void> {
        console.log('[CLIENTE SERVICE] Deletar cliente - ID:', id);
        await api.delete(`${API_PREFIX}/clientes/${id}`);
        console.log('[CLIENTE SERVICE] Cliente deletado com sucesso');
    },

    /**
     * Restaurar cliente
     */
    async restaurarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Restaurar cliente - ID:', id);
        const response = await api.post(`${API_PREFIX}/clientes/${id}/restore`);
        console.log('[CLIENTE SERVICE] Cliente restaurado - Sucesso:', response.data);
        return response.data.cliente;
    },

    /**
     * Excluir permanentemente
     */
    async removerClientePermanentemente(id: string): Promise<void> {
        console.log('[CLIENTE SERVICE] Remover cliente permanentemente - ID:', id);
        await api.delete(`${API_PREFIX}/clientes/${id}/force`);
        console.log('[CLIENTE SERVICE] Cliente removido permanentemente');
    },

    /**
     * Listar clientes deletados (lixeira)
     */
    async listarDeletados(params: { page?: number; per_page?: number; search?: string } = {}): Promise<PaginatedResponse<Cliente>> {
        console.log('[CLIENTE SERVICE] Listar clientes deletados - Params:', params);
        const response = await api.get(`${API_PREFIX}/clientes/deleted`, { params });
        return response.data.data;
    },
};

// ─── Helpers para componentes ──────────────────────────────────────
export function getClienteBadgeStatus(cliente: Cliente): { texto: string; cor: string } {
    return {
        texto: getStatusClienteLabel(cliente.status),
        cor: getStatusClienteColor(cliente.status),
    };
}

export function getClienteBadgeTipo(cliente: Cliente): { texto: string; cor: string } {
    return {
        texto: getTipoClienteLabel(cliente.tipo),
        cor: getTipoClienteColor(cliente.tipo),
    };
}

export function getClienteNIFInfo(cliente: Cliente): { 
    formatado: string; 
    tipo: 'NIF' | 'BI' | 'DESCONHECIDO';
    exibicao: string;
} {
    const tipo = identificarTipoDocumento(cliente.nif);
    const formatado = formatarNIF(cliente.nif);
    
    let exibicao = formatado;
    if (tipo !== 'DESCONHECIDO') {
        exibicao = `${formatado} (${tipo})`;
    }
    
    return { formatado, tipo, exibicao };
}

export default clienteService;