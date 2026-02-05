// src/services/clientes.ts

import api from "./axios";

// ===== TIPOS =====

export type TipoCliente = "consumidor_final" | "empresa";

// ===== INTERFACES =====

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

export interface AtualizarClienteInput extends Partial<CriarClienteInput> { }

// ===== SERVIÇO =====

const API_PREFIX = "/api";

export const clienteService = {
    /**
     * Listar todos os clientes
     */
    async listarClientes(): Promise<Cliente[]> {
        const response = await api.get(`${API_PREFIX}/clientes`);
        return response.data.clientes || [];
    },

    /**
     * Buscar cliente por ID
     */
    async buscarCliente(id: string): Promise<Cliente> {
        const response = await api.get(`${API_PREFIX}/clientes/${id}`);
        return response.data.cliente;
    },

    /**
     * Criar novo cliente
     */
    async criarCliente(dados: CriarClienteInput): Promise<Cliente> {
        const response = await api.post(`${API_PREFIX}/clientes`, dados);
        return response.data.cliente;
    },

    /**
     * Atualizar cliente
     */
    async atualizarCliente(id: string, dados: AtualizarClienteInput): Promise<Cliente> {
        const response = await api.put(`${API_PREFIX}/clientes/${id}`, dados);
        return response.data.cliente;
    },

    /**
     * Deletar cliente
     */
    async deletarCliente(id: string): Promise<void> {
        await api.delete(`${API_PREFIX}/clientes/${id}`);
    },
};

// ===== UTILITÁRIOS =====

export function formatarNIF(nif: string | null): string {
    if (!nif) return "-";
    // Formato angolano: 000000000LA000
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