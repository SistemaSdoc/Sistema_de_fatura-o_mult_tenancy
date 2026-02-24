// src/services/estoque.ts

import api from "./axios";
import { Produto, isServico } from "./produtos";

// ===== TIPOS =====

export type TipoMovimento = "entrada" | "saida";
export type TipoMovimentoContexto = "compra" | "venda" | "ajuste" | "nota_credito" | "devolucao";

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
    // ============ MOVIMENTAÇÕES ============

    /**
     * Listar movimentações de stock (apenas produtos, serviços são ignorados)
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
     * ✅ Registrar movimento de entrada (apenas para produtos)
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
        // Buscar produto para verificar se é serviço
        try {
            const produtoResponse = await api.get(`${API_PREFIX}/produtos/${dados.produto_id}`);
            const produto = produtoResponse.data.produto;

            // ✅ Impedir movimentação em serviços
            if (isServico(produto)) {
                throw new Error("Serviços não possuem controle de stock");
            }
        } catch (error) {
            console.error("[EstoqueService] Erro ao verificar produto:", error);
        }

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
     * ✅ Registrar movimento de saída (apenas para produtos)
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
        // Buscar produto para verificar se é serviço
        try {
            const produtoResponse = await api.get(`${API_PREFIX}/produtos/${dados.produto_id}`);
            const produto = produtoResponse.data.produto;

            // ✅ Impedir movimentação em serviços
            if (isServico(produto)) {
                throw new Error("Serviços não possuem controle de stock");
            }
        } catch (error) {
            console.error("[EstoqueService] Erro ao verificar produto:", error);
        }

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
     * ✅ Ajustar stock (apenas para produtos)
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
        // Buscar produto para verificar se é serviço
        try {
            const produtoResponse = await api.get(`${API_PREFIX}/produtos/${dados.produto_id}`);
            const produto = produtoResponse.data.produto;

            // ✅ Impedir ajuste em serviços
            if (isServico(produto)) {
                throw new Error("Serviços não possuem controle de stock");
            }
        } catch (error) {
            console.error("[EstoqueService] Erro ao verificar produto:", error);
        }

        const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, {
            produto_id: dados.produto_id,
            quantidade: dados.quantidade,
            motivo: dados.motivo,
            custo_medio: dados.custo_medio,
        });
        return response.data;
    },

    /**
     * ✅ Transferência entre produtos (apenas produtos)
     */
    async transferirStock(dados: TransferenciaInput): Promise<{
        message: string;
        transferencia: {
            origem: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            destino: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            quantidade: number;
        };
    }> {
        // Verificar produtos de origem e destino
        try {
            const [origemRes, destinoRes] = await Promise.all([
                api.get(`${API_PREFIX}/produtos/${dados.produto_origem_id}`),
                api.get(`${API_PREFIX}/produtos/${dados.produto_destino_id}`)
            ]);

            const origem = origemRes.data.produto;
            const destino = destinoRes.data.produto;

            // ✅ Impedir transferência se algum for serviço
            if (isServico(origem) || isServico(destino)) {
                throw new Error("Transferência de stock não é permitida para serviços");
            }
        } catch (error) {
            console.error("[EstoqueService] Erro ao verificar produtos:", error);
        }

        const response = await api.post(`${API_PREFIX}/movimentos-stock/transferencia`, dados);
        return response.data;
    },

    /**
     * ✅ Obter histórico de movimentos de um produto específico
     */
    async historicoProduto(produtoId: string, page?: number): Promise<{
        produto: { id: string; nome: string; estoque_atual: number };
        movimentos: MovimentoStock[];
    }> {
        const params = page ? `?page=${page}` : "";
        const response = await api.get(`${API_PREFIX}/movimentos-stock/produto/${produtoId}${params}`);
        return response.data;
    },

    // ============ RESUMOS E ESTATÍSTICAS ============

    /**
     * ✅ Obter resumo do estoque (dashboard) - apenas produtos
     */
    async obterResumo(): Promise<ResumoEstoque> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/resumo`);
        return response.data;
    },

    /**
     * ✅ Obter estatísticas de movimentos (relatório) - apenas produtos
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

    // ============ UTILITÁRIOS ============

    /**
     * ✅ Verificar disponibilidade de estoque (apenas produtos)
     */
    async verificarDisponibilidade(produtoId: string, quantidade: number): Promise<{
        disponivel: boolean;
        estoque_atual: number;
        mensagem?: string;
    }> {
        try {
            const response = await api.get(`${API_PREFIX}/produtos/${produtoId}`);
            const produto = response.data.produto;

            // ✅ Serviços sempre disponíveis
            if (isServico(produto)) {
                return {
                    disponivel: true,
                    estoque_atual: 0,
                    mensagem: "Serviço não possui controle de estoque"
                };
            }

            const disponivel = produto.estoque_atual >= quantidade;

            return {
                disponivel,
                estoque_atual: produto.estoque_atual,
                mensagem: disponivel
                    ? undefined
                    : `Estoque insuficiente. Disponível: ${produto.estoque_atual}, Necessário: ${quantidade}`
            };
        } catch (error) {
            console.error("[EstoqueService] Erro ao verificar disponibilidade:", error);
            throw new Error("Erro ao verificar disponibilidade do produto");
        }
    },

    /**
     * ✅ Calcular valor total do estoque
     */
    async calcularValorTotal(): Promise<number> {
        const resumo = await this.obterResumo();
        return resumo.valorTotalEstoque;
    },
};

export default estoqueService;