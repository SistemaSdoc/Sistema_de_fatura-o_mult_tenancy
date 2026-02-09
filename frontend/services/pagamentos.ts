// @/services/pagamentos.ts
import api from "@/services/axios";

export type MetodoPagamento = "dinheiro" | "cartao" | "transferencia";

// Interface compatível com o retorno do Laravel (inclui relations quando carregadas)
export interface Pagamento {
    id: string;
    fatura_id: string;
    user_id: string;
    metodo: MetodoPagamento;
    valor_pago: number;
    troco: number;
    referencia: string | null;
    data_pagamento: string;
    hora_pagamento: string;
    created_at: string;
    updated_at: string;
    // Relations (quando carregadas com load no backend)
    user?: {
        id: string;
        name: string;
        email?: string;
    };
    fatura?: {
        id: string;
        numero?: string;
        valor_total?: number;
    };
}

// Interface para criação - campos exigidos pelo store do controller
export interface CriarPagamentoInput {
    user_id: string;
    fatura_id: string;
    metodo: MetodoPagamento;
    valor_pago: number;
    troco?: number; // nullable no backend (default 0)
    referencia?: string; // nullable no backend
    data_pagamento: string; // required - formato date
    hora_pagamento: string; // required - formato H:i:s
}

// Interface para atualização - todos os campos são sometimes|required
export interface AtualizarPagamentoInput {
    user_id?: string;
    fatura_id?: string;
    metodo?: MetodoPagamento;
    valor_pago?: number;
    troco?: number; // nullable no backend
    referencia?: string; // nullable no backend
    data_pagamento?: string; // sometimes|required
    hora_pagamento?: string; // sometimes|required
}

// Interfaces de resposta compatíveis com o controller
export interface PagamentoResponse {
    message: string;
    pagamento: Pagamento;
}

export interface ListaPagamentosResponse {
    message: string;
    pagamentos: Pagamento[];
}

export interface DeleteResponse {
    message: string;
}

export const pagamentoService = {
    /**
     * Listar todos os pagamentos
     * GET /api/pagamentos
     * Corresponde ao método index do controller
     * Aceita filtros opcionais: fatura_id, user_id, metodo
     */
    listar: async (params?: {
        fatura_id?: string;
        user_id?: string;
        metodo?: MetodoPagamento;
    }): Promise<ListaPagamentosResponse> => {
        const response = await api.get<ListaPagamentosResponse>("/api/pagamentos", {
            params,
        });
        return response.data;
    },

    /**
     * Mostrar pagamento específico
     * GET /api/pagamentos/{id}
     * Corresponde ao método show do controller
     */
    mostrar: async (id: string): Promise<PagamentoResponse> => {
        const response = await api.get<PagamentoResponse>(`/api/pagamentos/${id}`);
        return response.data;
    },

    /**
     * Criar novo pagamento
     * POST /api/pagamentos
     * Corresponde ao método store do controller
     * Campos obrigatórios: user_id, fatura_id, metodo, valor_pago, data_pagamento, hora_pagamento
     * Campos opcionais: troco (default 0), referencia (nullable)
     */
    criar: async (data: CriarPagamentoInput): Promise<PagamentoResponse> => {
        const response = await api.post<PagamentoResponse>("/api/pagamentos", data);
        return response.data;
    },

    /**
     * Atualizar pagamento
     * PUT /api/pagamentos/{id}
     * Corresponde ao método update do controller
     * Todos os campos são sometimes|required (podem ser enviados parcialmente)
     */
    atualizar: async (
        id: string, 
        data: AtualizarPagamentoInput
    ): Promise<PagamentoResponse> => {
        const response = await api.put<PagamentoResponse>(`/api/pagamentos/${id}`, data);
        return response.data;
    },

    /**
     * Deletar pagamento
     * DELETE /api/pagamentos/{id}
     * Corresponde ao método destroy do controller
     */
    deletar: async (id: string): Promise<DeleteResponse> => {
        const response = await api.delete<DeleteResponse>(`/api/pagamentos/${id}`);
        return response.data;
    },
};

// Helpers para formatação (não afetam a API, apenas UI)
export const formatMetodoPagamento = (metodo: MetodoPagamento): string => {
    const labels: Record<MetodoPagamento, string> = {
        dinheiro: "Dinheiro",
        cartao: "Cartão",
        transferencia: "Transferência",
    };
    return labels[metodo] || metodo;
};