// src/services/estoque.ts

import api from "./axios";
import { Produto } from "./produtos";

// ===== TIPOS =====

export type TipoMovimento = "entrada" | "saida" | "ajuste";

// ===== INTERFACES =====

export interface MovimentoStock {
    id: string;
    produto_id: string;
    produto?: Produto;
    tipo: TipoMovimento;
    quantidade: number;
    quantidade_anterior: number;
    quantidade_nova: number;
    motivo: string;
    documento_ref?: string;
    user_id?: string;
    created_at: string;
}

export interface AjusteStockInput {
    produto_id: string;
    quantidade: number;
    motivo: string;
}

export interface ResumoEstoque {
    totalProdutos: number;
    produtosAtivos: number;
    produtosEstoqueBaixo: number;
    produtosSemEstoque: number;
    valorTotalEstoque: number;
    movimentacoesHoje: number;
}

export interface FiltrosEstoque {
    busca?: string;
    categoria_id?: string;
    status?: "ativo" | "inativo";
    estoque_baixo?: boolean;
    sem_estoque?: boolean;
}

// ===== SERVIÇO =====

const API_PREFIX = "/api";

export const estoqueService = {
    /**
     * Obter resumo do estoque
     */
    async obterResumo(): Promise<ResumoEstoque> {
        try {
            const response = await api.get(`${API_PREFIX}/estoque/resumo`);
            return response.data;
        } catch (error) {
            // Fallback: calcular a partir dos produtos
            const produtos = await this.listarProdutosEstoque();

            const produtosAtivos = produtos.filter(p => p.status === "ativo");
            const estoqueBaixo = produtosAtivos.filter(p =>
                p.estoque_atual <= p.estoque_minimo && p.estoque_atual > 0
            );
            const semEstoque = produtosAtivos.filter(p => p.estoque_atual === 0);

            const valorTotal = produtosAtivos.reduce((acc, p) =>
                acc + (p.estoque_atual * p.preco_venda), 0
            );

            return {
                totalProdutos: produtos.length,
                produtosAtivos: produtosAtivos.length,
                produtosEstoqueBaixo: estoqueBaixo.length,
                produtosSemEstoque: semEstoque.length,
                valorTotalEstoque: valorTotal,
                movimentacoesHoje: 0,
            };
        }
    },

    /**
     * Listar produtos com foco em estoque
     */
    async listarProdutosEstoque(filtros?: FiltrosEstoque): Promise<Produto[]> {
        const params = new URLSearchParams();

        if (filtros?.busca) params.append("busca", filtros.busca);
        if (filtros?.categoria_id) params.append("categoria_id", filtros.categoria_id);
        if (filtros?.status) params.append("status", filtros.status);
        if (filtros?.estoque_baixo) params.append("estoque_baixo", "true");
        if (filtros?.sem_estoque) params.append("sem_estoque", "true");

        const response = await api.get(`${API_PREFIX}/produtos?${params.toString()}`);
        return response.data.produtos || [];
    },

    /**
     * Listar movimentações de stock
     */
    async listarMovimentacoes(produtoId?: string): Promise<MovimentoStock[]> {
        const params = produtoId ? `?produto_id=${produtoId}` : "";
        const response = await api.get(`${API_PREFIX}/movimentos-stock${params}`);
        return response.data.movimentos || response.data || [];
    },

    /**
     * Registrar movimento de entrada
     */
    async registrarEntrada(dados: AjusteStockInput): Promise<MovimentoStock> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
            ...dados,
            tipo: "entrada",
        });
        return response.data.movimento || response.data;
    },

    /**
     * Registrar movimento de saída
     */
    async registrarSaida(dados: AjusteStockInput): Promise<MovimentoStock> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
            ...dados,
            tipo: "saida",
        });
        return response.data.movimento || response.data;
    },

    /**
     * Ajustar stock (correção)
     */
    async ajustarStock(dados: AjusteStockInput): Promise<MovimentoStock> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, dados);
        return response.data.movimento || response.data;
    },
};

export default estoqueService;