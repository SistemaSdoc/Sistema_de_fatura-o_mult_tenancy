// src/services/clientes.ts
import api from "./axios";

export type TipoCliente = "consumidor_final" | "empresa";
export type StatusCliente = "ativo" | "inativo";

export interface Cliente {
    id: string;
    nome: string;
    nif: string | null;
    tipo: TipoCliente;
    status: StatusCliente; // NOVO: campo status
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    data_registro: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface CriarClienteInput {
    nome: string;
    nif?: string;
    tipo?: TipoCliente;
    status?: StatusCliente; // NOVO: campo status opcional
    telefone?: string;
    email?: string;
    endereco?: string;
    data_registro?: string;
}

export interface AtualizarClienteInput extends Partial<CriarClienteInput> { }

const API_PREFIX = "/api";

// Configuração para evitar cache
const noCacheConfig = {
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
};

export const clienteService = {
    /**
     * Listar clientes ativos (padrão)
     * @param incluirInativos Se true, inclui também clientes inativos
     */
    async listarClientes(incluirInativos: boolean = false): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar clientes - Iniciando...');
        const timestamp = new Date().getTime();
        
        let url = `${API_PREFIX}/clientes?t=${timestamp}`;
        if (incluirInativos) {
            url += '&status=todos';
        }
        
        const response = await api.get(url, noCacheConfig);
        console.log('[CLIENTE SERVICE] Listar clientes - Sucesso:', response.data);
        return response.data.clientes || [];
    },

    /**
     * Listar apenas clientes ativos
     */
    async listarClientesAtivos(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar clientes ativos - Iniciando...');
        const timestamp = new Date().getTime();
        const response = await api.get(`${API_PREFIX}/clientes?t=${timestamp}&status=ativos`, noCacheConfig);
        console.log('[CLIENTE SERVICE] Listar clientes ativos - Sucesso:', response.data);
        return response.data.clientes || [];
    },

    /**
     * Listar apenas clientes inativos
     */
    async listarClientesInativos(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar clientes inativos - Iniciando...');
        const timestamp = new Date().getTime();
        const response = await api.get(`${API_PREFIX}/clientes?t=${timestamp}&status=inativos`, noCacheConfig);
        console.log('[CLIENTE SERVICE] Listar clientes inativos - Sucesso:', response.data);
        return response.data.clientes || [];
    },

    /**
     * Listar todos os clientes (ativos, inativos e deletados)
     */
    async listarTodosClientes(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar todos clientes (com deletados) - Iniciando...');
        const timestamp = new Date().getTime();
        const response = await api.get(`${API_PREFIX}/clientes/todos?t=${timestamp}`, noCacheConfig);
        console.log('[CLIENTE SERVICE] Listar todos clientes - Sucesso:', response.data);
        return response.data.clientes || [];
    },

    async buscarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Buscar cliente - ID:', id);
        const timestamp = new Date().getTime();
        const response = await api.get(`${API_PREFIX}/clientes/${id}?t=${timestamp}`, noCacheConfig);
        console.log('[CLIENTE SERVICE] Buscar cliente - Sucesso:', response.data);
        return response.data.cliente;
    },

    async criarCliente(dados: CriarClienteInput): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Criar cliente - Dados:', dados);
        
        // Se não especificar status, o backend vai definir 'ativo' como padrão
        const response = await api.post(`${API_PREFIX}/clientes`, dados);
        
        console.log('[CLIENTE SERVICE] Criar cliente - Sucesso:', response.data);
        return response.data.cliente;
    },

    async atualizarCliente(id: string, dados: AtualizarClienteInput): Promise<Cliente> {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║ [CLIENTE SERVICE] ATUALIZAR CLIENTE - INÍCIO            ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('[CLIENTE SERVICE] ID recebido:', id);
        console.log('[CLIENTE SERVICE] Dados:', dados);

        const url = `${API_PREFIX}/clientes/${id}`;
        console.log('[CLIENTE SERVICE] URL completa:', url);

        try {
            const response = await api.put(url, dados);
            console.log('[CLIENTE SERVICE] Resposta sucesso:', response.status, response.data);
            return response.data.cliente;
        } catch (error: any) {
            console.error('[CLIENTE SERVICE] ERRO na requisição PUT:', error.response?.data?.message || error.message);
            throw error;
        }
    },

    /**
     * NOVO: Ativar cliente
     */
    async ativarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Ativar cliente - ID:', id);
        const response = await api.post(`${API_PREFIX}/clientes/${id}/ativar`);
        console.log('[CLIENTE SERVICE] Cliente ativado - Sucesso:', response.data);
        return response.data.cliente;
    },

    /**
     * NOVO: Inativar cliente
     */
    async inativarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Inativar cliente - ID:', id);
        const response = await api.post(`${API_PREFIX}/clientes/${id}/inativar`);
        console.log('[CLIENTE SERVICE] Cliente inativado - Sucesso:', response.data);
        return response.data.cliente;
    },

    async deletarCliente(id: string): Promise<void> {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║ [CLIENTE SERVICE] DELETAR CLIENTE - INÍCIO              ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('[CLIENTE SERVICE] ID recebido:', id);

        try {
            const response = await api.delete(`${API_PREFIX}/clientes/${id}`);
            console.log('[CLIENTE SERVICE] Resposta sucesso:', response.status, response.data);
        } catch (error: any) {
            console.error('[CLIENTE SERVICE] ERRO na requisição DELETE:', error.response?.data?.message || error.message);
            throw error;
        }
    },

    async restaurarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Restaurar cliente - ID:', id);
        const response = await api.post(`${API_PREFIX}/clientes/${id}/restore`);
        console.log('[CLIENTE SERVICE] Cliente restaurado - Sucesso:', response.data);
        return response.data.cliente;
    },

    async removerClientePermanentemente(id: string): Promise<void> {
        console.log('[CLIENTE SERVICE] Remover cliente permanentemente - ID:', id);
        const response = await api.delete(`${API_PREFIX}/clientes/${id}/force`);
        console.log('[CLIENTE SERVICE] Cliente removido permanentemente - Sucesso:', response.data);
    },
};

export function formatarNIF(nif: string | null): string {
    if (!nif) return "-";
    if (nif.length === 14) {
        return `${nif.slice(0, 9)} ${nif.slice(9, 11)} ${nif.slice(11)}`;
    }
    return nif;
}

export function getTipoClienteLabel(tipo: TipoCliente): string {
    const labels: Record<TipoCliente, string> = {
        consumidor_final: "Consumidor Final",
        empresa: "Empresa",
    };
    return labels[tipo] || tipo;
}

export function getTipoClienteColor(tipo: TipoCliente): string {
    return tipo === "empresa" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700";
}

// NOVAS FUNÇÕES PARA STATUS
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

export function getStatusClienteBadge(status: StatusCliente): { texto: string; cor: string } {
    return {
        texto: getStatusClienteLabel(status),
        cor: getStatusClienteColor(status),
    };
}

export default clienteService;