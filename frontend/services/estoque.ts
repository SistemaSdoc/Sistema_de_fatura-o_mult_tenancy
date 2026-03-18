// src/services/estoque.ts

import api from "./axios";
import { Produto, isServico } from "./produtos";

// ===== TIPOS =====

export type TipoMovimento = "entrada" | "saida";

// venda_cancelada adicionado — alinhado com VendaService::cancelarVenda() PHP
export type TipoMovimentoContexto =
    | "compra"
    | "venda"
    | "venda_cancelada"
    | "ajuste"
    | "nota_credito"
    | "devolucao";

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
    quantidade: number;
    motivo: string;
    custo_medio?: number;
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

    async listarMovimentacoes(filtros?: FiltrosMovimento): Promise<MovimentoStock[]> {
        const q = new URLSearchParams();
        if (filtros?.produto_id)    q.append("produto_id", filtros.produto_id);
        if (filtros?.tipo)          q.append("tipo", filtros.tipo);
        if (filtros?.tipo_movimento) q.append("tipo_movimento", filtros.tipo_movimento);
        if (filtros?.data_inicio)   q.append("data_inicio", filtros.data_inicio);
        if (filtros?.data_fim)      q.append("data_fim", filtros.data_fim);
        if (filtros?.paginar)       q.append("paginar", "true");
        if (filtros?.per_page)      q.append("per_page", filtros.per_page.toString());

        const response = await api.get(`${API_PREFIX}/movimentos-stock${q.toString() ? `?${q}` : ""}`);
        return response.data.movimentos || [];
    },

    async buscarMovimento(id: string): Promise<MovimentoStock> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/${id}`);
        return response.data.movimento;
    },

    /** Registrar entrada — apenas produtos, serviços não têm stock */
    async registrarEntrada(dados: EntradaStockInput): Promise<{
        message: string;
        movimento: MovimentoStock;
        estoque_atualizado: { anterior: number; atual: number; diferenca: number };
    }> {
        const produto = await _verificarProdutoNaoServico(dados.produto_id);
        if (!produto) throw new Error("Serviços não possuem controlo de stock");

        const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
            produto_id:     dados.produto_id,
            tipo:           "entrada",
            tipo_movimento: dados.tipo_movimento || "ajuste",
            quantidade:     Math.abs(dados.quantidade),
            motivo:         dados.motivo,
            referencia:     dados.referencia,
            custo_unitario: dados.custo_unitario,
        });
        return response.data;
    },

    /** Registrar saída — apenas produtos */
    async registrarSaida(dados: SaidaStockInput): Promise<{
        message: string;
        movimento: MovimentoStock;
        estoque_atualizado: { anterior: number; atual: number; diferenca: number };
    }> {
        const produto = await _verificarProdutoNaoServico(dados.produto_id);
        if (!produto) throw new Error("Serviços não possuem controlo de stock");

        const response = await api.post(`${API_PREFIX}/movimentos-stock`, {
            produto_id:     dados.produto_id,
            tipo:           "saida",
            tipo_movimento: dados.tipo_movimento || "ajuste",
            quantidade:     Math.abs(dados.quantidade),
            motivo:         dados.motivo,
            referencia:     dados.referencia,
        });
        return response.data;
    },

    /** Ajuste de stock — apenas produtos */
    async ajustarStock(dados: AjusteStockInput): Promise<{
        message: string;
        movimento?: MovimentoStock;
        ajuste: { anterior: number; novo: number; diferenca: number };
    }> {
        const produto = await _verificarProdutoNaoServico(dados.produto_id);
        if (!produto) throw new Error("Serviços não possuem controlo de stock");

        const response = await api.post(`${API_PREFIX}/movimentos-stock/ajuste`, {
            produto_id:  dados.produto_id,
            quantidade:  dados.quantidade,
            motivo:      dados.motivo,
            custo_medio: dados.custo_medio,
        });
        return response.data;
    },

    /** Transferência entre produtos — serviços não permitidos */
    async transferirStock(dados: TransferenciaInput): Promise<{
        message: string;
        transferencia: {
            origem: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            destino: { id: string; nome: string; estoque_anterior: number; estoque_novo: number };
            quantidade: number;
        };
    }> {
        const [origem, destino] = await Promise.all([
            _verificarProdutoNaoServico(dados.produto_origem_id),
            _verificarProdutoNaoServico(dados.produto_destino_id),
        ]);

        if (!origem || !destino) {
            throw new Error("Transferência de stock não é permitida para serviços");
        }

        const response = await api.post(`${API_PREFIX}/movimentos-stock/transferencia`, dados);
        return response.data;
    },

    async historicoProduto(produtoId: string, page?: number): Promise<{
        produto: { id: string; nome: string; estoque_atual: number };
        movimentos: MovimentoStock[];
    }> {
        const params = page ? `?page=${page}` : "";
        const response = await api.get(`${API_PREFIX}/movimentos-stock/produto/${produtoId}${params}`);
        return response.data;
    },

    async obterResumo(): Promise<ResumoEstoque> {
        const response = await api.get(`${API_PREFIX}/movimentos-stock/resumo`);
        return response.data;
    },

    async obterEstatisticas(filtros?: {
        data_inicio?: string;
        data_fim?: string;
        produto_id?: string;
    }): Promise<EstatisticasMovimento> {
        const q = new URLSearchParams();
        if (filtros?.data_inicio) q.append("data_inicio", filtros.data_inicio);
        if (filtros?.data_fim)    q.append("data_fim", filtros.data_fim);
        if (filtros?.produto_id)  q.append("produto_id", filtros.produto_id);

        const response = await api.get(`${API_PREFIX}/movimentos-stock/estatisticas${q.toString() ? `?${q}` : ""}`);
        return response.data.estatisticas;
    },

    /** Serviços são sempre disponíveis; produtos verificam stock actual */
    async verificarDisponibilidade(produtoId: string, quantidade: number): Promise<{
        disponivel: boolean;
        estoque_atual: number;
        mensagem?: string;
    }> {
        const response = await api.get(`${API_PREFIX}/produtos/${produtoId}`);
        const produto: Produto = response.data.produto;

        if (isServico(produto)) {
            return { disponivel: true, estoque_atual: 0, mensagem: "Serviço não possui controlo de stock" };
        }

        const disponivel = produto.estoque_atual >= quantidade;
        return {
            disponivel,
            estoque_atual: produto.estoque_atual,
            mensagem: disponivel
                ? undefined
                : `Stock insuficiente. Disponível: ${produto.estoque_atual}, Necessário: ${quantidade}`,
        };
    },

    async calcularValorTotal(): Promise<number> {
        const resumo = await this.obterResumo();
        return resumo.valorTotalEstoque;
    },
};

// ===== HELPERS INTERNOS =====

/** Devolve o produto se for produto físico, null se for serviço */
async function _verificarProdutoNaoServico(produtoId: string): Promise<Produto | null> {
    const response = await api.get(`/api/produtos/${produtoId}`);
    const produto: Produto = response.data.produto;
    return isServico(produto) ? null : produto;
}

export default estoqueService;