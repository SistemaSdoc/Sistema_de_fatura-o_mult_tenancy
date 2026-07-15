// @/services/pagamentosplanos.ts
import api from "@/services/axios";

export type MetodoPagamento = "transferencia" | "multicaixa" | "cartao_credito";
export type EstadoPagamento = "pendente" | "em_analise" | "pago" | "rejeitado";

export interface Pagamento {
    id: string;
    empresa_id: string;
    subscricao_id: string | null;
    plano_id: string;
    valor: number;
    metodo_pagamento: MetodoPagamento;
    referencia: string | null;
    status: EstadoPagamento;
    motivo_rejeicao: string | null;
    comprovativo_path: string | null;
    data_pagamento: string | null;
    created_at: string;
    updated_at: string;
}

export interface CriarPagamentoInput {
    empresa_id: string;
    plano_id: string;
    valor: number;
    metodo_pagamento: MetodoPagamento;
    referencia?: string;
}

export interface PagamentoResponse {
    message: string;
    pagamento: Pagamento;
}

export interface ListaPagamentosResponse {
    pagamentos: Pagamento[];
}

export interface DeleteResponse {
    message: string;
}

export interface UploadResponse {
    message: string;
    pagamento: Pagamento;
}

export const pagamentoService = {
    /**
     * Listar pagamentos (ADMIN/LANDLORD) — vê pagamentos de qualquer empresa
     */
    listar: async (params?: {
        empresa_id?: string;
        subscricao_id?: string;
        status?: EstadoPagamento;
    }): Promise<ListaPagamentosResponse> => {
        const response = await api.get<ListaPagamentosResponse>("/api/landlord/pagamentos-plano", { params });
        return response.data;
    },

    /**
     * Mostrar detalhes de um pagamento (ADMIN/LANDLORD)
     */
    mostrar: async (id: string): Promise<PagamentoResponse> => {
        const response = await api.get<PagamentoResponse>(`/api/landlord/pagamentos-plano/${id}`);
        return response.data;
    },

    /**
     * Criar novo pagamento (EMPRESA/TENANT) — início do fluxo, feito pela própria empresa
     */
    criar: async (data: CriarPagamentoInput): Promise<PagamentoResponse> => {
        const response = await api.post<PagamentoResponse>("/api/pagamentos-plano", data);
        return response.data;
    },

    /**
     * Upload do comprovativo (EMPRESA/TENANT)
     */
    enviarComprovativo: async (id: string, file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('comprovativo', file);
        const response = await api.post<UploadResponse>(
            `/api/pagamentos-plano/${id}/upload-comprovativo`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    /**
     * Confirmar pagamento (ADMIN/LANDLORD) → status 'pago'
     */
    confirmar: async (id: string): Promise<{ message: string; subscricao_id?: string }> => {
        const response = await api.post(`/api/landlord/pagamentos-plano/${id}/confirmar`);
        return response.data;
    },

    /**
     * Rejeitar pagamento (ADMIN/LANDLORD) → status 'rejeitado'
     */
    rejeitar: async (id: string, motivo: string): Promise<PagamentoResponse> => {
        const response = await api.post<PagamentoResponse>(`/api/landlord/pagamentos-plano/${id}/rejeitar`, { motivo });
        return response.data;
    },

    /**
     * Deletar pagamento (ADMIN/LANDLORD)
     */
    deletar: async (id: string): Promise<DeleteResponse> => {
        const response = await api.delete<DeleteResponse>(`/api/landlord/pagamentos-plano/${id}`);
        return response.data;
    },
};

export const formatMetodoPagamento = (metodo: MetodoPagamento): string => {
    const labels: Record<MetodoPagamento, string> = {
        transferencia: "Transferência bancária",
        multicaixa: "Multicaixa",
        cartao_credito: "Cartão de crédito",
    };
    return labels[metodo] || metodo;
};

export const formatEstadoPagamento = (status: EstadoPagamento): string => {
    const labels: Record<EstadoPagamento, string> = {
        pendente: "Pendente",
        em_analise: "Em análise",
        pago: "Pago",
        rejeitado: "Rejeitado",
    };
    return labels[status] || status;
};