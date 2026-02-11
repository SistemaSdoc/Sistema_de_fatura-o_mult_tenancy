// src/services/estoque.ts

import api from "./axios";
import { Produto } from "./produtos";

// ===== TIPOS =====

export type TipoMovimento = "entrada" | "saida" | "ajuste";
export type TipoMovimentoContexto = "compra" | "venda" | "ajuste" | "nota_credito" | "devolucao" | "transferencia";

// ===== INTERFACES =====

export interface MovimentoStock {
    id: string;
    produto_id: string;
    produto?: Produto;
    user_id?: string;
    user?: { id: string; name: string };
    tipo: TipoMovimento;
    tipo_movimento: TipoMovimentoContexto;
    quantidade: number;
    estoque_anterior?: number;
    estoque_novo?: number;
    custo_medio?: number;
    custo_unitario?: number;
    motivo?: string;
    observacao?: string;
    referencia?: string;
    created_at: string;
    updated_at?: string;
    // Campos computados
    valor_total?: number;
    tipo_formatado?: string;
}

export interface EntradaStockInput {
    produto_id: string;
    quantidade: number;
    motivo: string;
    tipo_movimento?: TipoMovimentoContexto;
    custo_unitario?: number;
    referencia?: string;
}

export interface SaidaStockInput {
    produto_id: string;
    quantidade: number;
    motivo: string;
    tipo_movimento?: TipoMovimentoContexto;
    referencia?: string;
}

export interface AjusteStockInput {
    produto_id: string;
    quantidade: number; // Quantidade final desejada
    motivo: string;
    custo_medio?: number; // Opcional: atualizar custo médio também
}

export interface TransferenciaInput {
    produto_origem_id: string;
    produto_destino_id: string;
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
    entradasHoje: number;
    saidasHoje: number;
    produtos_criticos: Produto[];
}

export interface EstatisticasMovimento {
    total_movimentos: number;
    total_entradas: number;
    total_saidas: number;
    por_tipo: Array<{ tipo_movimento: string; total: number }>;
    por_mes: Array<{ mes: string; entradas: number; saidas: number }>;
}

export interface FiltrosEstoque {
    busca?: string;
    categoria_id?: string;
    status?: "ativo" | "inativo";
    tipo?: "produto" | "servico";
    estoque_baixo?: boolean;
    sem_estoque?: boolean;
    ordenar?: string;
    direcao?: "asc" | "desc";
    paginar?: boolean;
    per_page?: number;
}

export interface FiltrosMovimento {
    produto_id?: string;
    tipo?: TipoMovimento;
    tipo_movimento?: TipoMovimentoContexto;
    data_inicio?: string;
    data_fim?: string;
    paginar?: boolean;
    per_page?: number;
}

// ===== SERVIÇO =====

const API_PREFIX = "/api";

export const estoqueService = {
    // ============ PRODUTOS ============

    /**
     * Listar produtos com filtros (ativos apenas)
     */
    async listarProdutos(filtros?: FiltrosEstoque): Promise<Produto[]> {
        const params = new URLSearchParams();

        if (filtros?.busca) params.append("busca", filtros.busca);
        if (filtros?.categoria_id) params.append("categoria_id", filtros.categoria_id);
        if (filtros?.status) params.append("status", filtros.status);
        if (filtros?.tipo) params.append("tipo", filtros.tipo);
        if (filtros?.estoque_baixo) params.append("estoque_baixo", "true");
        if (filtros?.sem_estoque) params.append("sem_estoque", "true");
        if (filtros?.ordenar) params.append("ordenar", filtros.ordenar);
        if (filtros?.direcao) params.append("direcao", filtros.direcao);
        if (filtros?.paginar) params.append("paginar", "true");
        if (filtros?.per_page) params.append("per_page", filtros.per_page.toString());

        const response = await api.get(`${API_PREFIX}/produtos?${params.toString()}`);
        return response.data.produtos || [];
    },

    /**
     * Listar todos os produtos incluindo deletados (admin)
     */
    async listarTodosProdutos(filtros?: Omit<FiltrosEstoque, 'status'>): Promise<{
        produtos: Produto[];
        total: number;
        ativos: number;
        deletados: number;
        produtos_fisicos: number;
        servicos: number;
    }> {
        const params = new URLSearchParams();
        if (filtros?.busca) params.append("busca", filtros.busca);
        if (filtros?.tipo) params.append("tipo", filtros.tipo);

        const response = await api.get(`${API_PREFIX}/produtos/with-trashed?${params.toString()}`);
        return response.data;
    },

    /**
     * Listar apenas produtos deletados (lixeira)
     */
    async listarProdutosDeletados(filtros?: { busca?: string; paginar?: boolean; per_page?: number }): Promise<{
        produtos: Produto[];
        total_deletados: number;
    }> {
        const params = new URLSearchParams();
        if (filtros?.busca) params.append("busca", filtros.busca);
        if (filtros?.paginar) params.append("paginar", "true");
        if (filtros?.per_page) params.append("per_page", filtros.per_page.toString());

        const response = await api.get(`${API_PREFIX}/produtos/trashed?${params.toString()}`);
        return response.data;
    },

    /**
     * Buscar produto específico por ID (inclui deletados)
     */
    async buscarProduto(id: string): Promise<Produto> {
        const response = await api.get(`${API_PREFIX}/produtos/${id}`);
        return response.data.produto;
    },

    /**
     * Criar novo produto ou serviço
     */
    async criarProduto(dados: Partial<Produto> & { tipo: "produto" | "servico" }): Promise<Produto> {
        const response = await api.post(`${API_PREFIX}/produtos`, dados);
        return response.data.produto;
    },

    /**
     * Atualizar produto
     */
    async atualizarProduto(id: string, dados: Partial<Produto>): Promise<Produto> {
        const response = await api.put(`${API_PREFIX}/produtos/${id}`, dados);
        return response.data.produto;
    },

    /**
     * Alterar status do produto (ativo/inativo)
     */
    async alterarStatusProduto(id: string, status: "ativo" | "inativo"): Promise<Produto> {
        const response = await api.patch(`${API_PREFIX}/produtos/${id}/status`, { status });
        return response.data.produto;
    },

    /**
     * Deletar produto (soft delete)
     */
    async deletarProduto(id: string): Promise<{
        message: string;
        soft_deleted: boolean;
        id: string;
        deleted_at: string;
    }> {
        const response = await api.delete(`${API_PREFIX}/produtos/${id}`);
        return response.data;
    },

    /**
     * Restaurar produto da lixeira
     */
    async restaurarProduto(id: string): Promise<Produto> {
        const response = await api.post(`${API_PREFIX}/produtos/${id}/restore`);
        return response.data.produto;
    },

    /**
     * Deletar produto permanentemente (force delete) - apenas admin
     */
    async deletarPermanentemente(id: string): Promise<{ message: string; id: string }> {
        const response = await api.delete(`${API_PREFIX}/produtos/${id}/force`);
        return response.data;
    },

    // ============ MOVIMENTAÇÕES ============

    /**
     * Listar movimentações de stock
     */
    async listarMovimentacoes(filtros?: FiltrosMovimento): Promise<MovimentoStock[]> {
        const params = new URLSearchParams();
        if (filtros?.produto_id) params.append("produto_id", filtros.produto_id);
        if (filtros?.tipo) params.append("tipo", filtros.tipo);
        if (filtros?.tipo_movimento) params.append("tipo_movimento", filtros.tipo_movimento);
        if (filtros?.data_inicio) params.append("data_inicio", filtros.data_inicio);
        if (filtros?.data_fim) params.append("data_fim", filtros.data_fim);
        if (filtros?.paginar) params.append("paginar", "true");
        if (filtros?.per_page) params.append("per_page", filtros.per_page.toString());

        const response = await api.get(`${API_PREFIX}/movimentos-stock?${params.toString()}`);
        return response.data.movimentos || [];
    },

    /**
     * Buscar movimento específico
     */
    async buscarMovimento(id: string): Promise<MovimentoStock> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/${id}`);
        return response.data.movimento;
    },

    /**
     * Registrar movimento de entrada
     */
    async registrarEntrada(dados: EntradaStockInput): Promise<{
        message: string;
        movimento: MovimentoStock;
        estoque_atualizado: {
            anterior: number;
            atual: number;
            diferenca: number;
        };
    }> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
            produto_id: dados.produto_id,
            tipo: "entrada",
            tipo_movimento: dados.tipo_movimento || "ajuste",
            quantidade: Math.abs(dados.quantidade),
            motivo: dados.motivo,
            referencia: dados.referencia,
            custo_unitario: dados.custo_unitario,
        });
        return response.data;
    },

    /**
     * Registrar movimento de saída
     */
    async registrarSaida(dados: SaidaStockInput): Promise<{
        message: string;
        movimento: MovimentoStock;
        estoque_atualizado: {
            anterior: number;
            atual: number;
            diferenca: number;
        };
    }> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
            produto_id: dados.produto_id,
            tipo: "saida",
            tipo_movimento: dados.tipo_movimento || "ajuste",
            quantidade: Math.abs(dados.quantidade),
            motivo: dados.motivo,
            referencia: dados.referencia,
        });
        return response.data;
    },

    /**
     * Ajustar stock (correção para quantidade específica)
     */
    async ajustarStock(dados: AjusteStockInput): Promise<{
        message: string;
        movimento?: MovimentoStock;
        ajuste: {
            anterior: number;
            novo: number;
            diferenca: number;
        };
    }> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, {
            produto_id: dados.produto_id,
            quantidade: dados.quantidade, // Quantidade final
            motivo: dados.motivo,
            custo_medio: dados.custo_medio,
        });
        return response.data;
    },

    /**
     * Transferência entre produtos
     */
    async transferirStock(dados: TransferenciaInput): Promise<{
        message: string;
        transferencia: {
            origem: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            destino: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            quantidade: number;
        };
    }> {
        const response = await api.post(`${API_PREFIX}/movimentos-stock/transferencia`, dados);
        return response.data;
    },

    /**
     * Obter histórico de movimentos de um produto específico
     */
    async historicoProduto(produtoId: string, page?: number): Promise<{
        produto: { id: string; nome: string; estoque_atual: number };
        movimentos: MovimentoStock[];
    }> {
        const params = page ? `?page=${page}` : "";
        const response = await api.get(`${API_PREFIX}/movimentos-stock/produto/${produtoId}/historico${params}`);
        return response.data;
    },

    // ============ RESUMOS E ESTATÍSTICAS ============

    /**
     * Obter resumo do estoque (dashboard)
     */
    async obterResumo(): Promise<ResumoEstoque> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/resumo`);
        return response.data;
    },

    /**
     * Obter estatísticas de movimentos (relatório)
     */
    async obterEstatisticas(filtros?: {
        data_inicio?: string;
        data_fim?: string;
        produto_id?: string;
    }): Promise<EstatisticasMovimento> {
        const params = new URLSearchParams();
        if (filtros?.data_inicio) params.append("data_inicio", filtros.data_inicio);
        if (filtros?.data_fim) params.append("data_fim", filtros.data_fim);
        if (filtros?.produto_id) params.append("produto_id", filtros.produto_id);

        const response = await api.get(`${API_PREFIX}/movimentos-stock/estatisticas?${params.toString()}`);
        return response.data.estatisticas;
    },

    // ============ MÉTODOS LEGACY (mantidos para compatibilidade) ============

    /**
     * @deprecated Use listarProdutos() ou listarTodosProdutos()
     */
    async listarProdutosEstoque(filtros?: FiltrosEstoque): Promise<Produto[]> {
        return this.listarProdutos(filtros);
    },

    /**
     * @deprecated Use listarTodosProdutos()
     */
    async listarTodosProdutosLegacy(): Promise<Produto[]> {
        const response = await api.get(`${API_PREFIX}/produtos/with-trashed`);
        return response.data.produtos || [];
    },
};

export default estoqueService;