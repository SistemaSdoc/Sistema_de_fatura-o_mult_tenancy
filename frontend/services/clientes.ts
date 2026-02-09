// src/services/clientes.ts
import api from "./axios";

export type TipoCliente = "consumidor_final" | "empresa";

export interface Cliente {
    id: string;
    nome: string;
    nif: string | null;
    tipo: TipoCliente;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    data_registro: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null; // <- Importante para soft deletes
}

export interface CriarClienteInput {
    nome: string;
    nif?: string;
    tipo?: TipoCliente;
    telefone?: string;
    email?: string;
    endereco?: string;
    data_registro?: string;
}

export interface AtualizarClienteInput extends Partial<CriarClienteInput> {}

const API_PREFIX = "/api";

export const clienteService = {
    // Listar apenas clientes ativos (não deletados)
    async listarClientes(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar clientes - Iniciando...');
        const response = await api.get(`${API_PREFIX}/clientes`);
        console.log('[CLIENTE SERVICE] Listar clientes - Sucesso:', response.data);
        return response.data.clientes || [];
    },

    // Listar todos os clientes, incluindo deletados (para admin/debug)
    async listarTodosClientes(): Promise<Cliente[]> {
        console.log('[CLIENTE SERVICE] Listar todos clientes (com deletados) - Iniciando...');
        const response = await api.get(`${API_PREFIX}/clientes/with-trashed`);
        console.log('[CLIENTE SERVICE] Listar todos clientes - Sucesso:', response.data);
        return response.data.clientes || [];
    },

    async buscarCliente(id: string): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Buscar cliente - ID:', id);
        const response = await api.get(`${API_PREFIX}/clientes/${id}`);
        console.log('[CLIENTE SERVICE] Buscar cliente - Sucesso:', response.data);
        return response.data.cliente;
    },

    async criarCliente(dados: CriarClienteInput): Promise<Cliente> {
        console.log('[CLIENTE SERVICE] Criar cliente - Dados:', dados);
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

// =================== UTILITÁRIOS ===================

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

export default clienteService;
