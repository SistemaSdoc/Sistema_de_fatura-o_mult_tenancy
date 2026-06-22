// src/services/estoque.ts

import api from "./axios";
import { Produto, isServico } from "./produtos";

// ===== TIPOS =====

export type TipoMovimento = "entrada" | "saida";

// Alinhado com MovimentoStockController PHP
// NOTA: 'nota_credito' = ENTRADA de stock (devolução)
// NOTA: 'venda' = SAÍDA de stock (FT/FR)
// NOTA: 'nota_debito' NÃO movimenta stock (apenas financeiro)
export type TipoMovimentoContexto =
    | "compra"
    | "venda"
    | "venda_cancelada"
    | "ajuste"
    | "nota_credito"
    | "devolucao"
    | "transferencia";  // NOVO: para transferências entre produtos

/**
 * Tipos de documento fiscal que afetam stock
 * 
 * REGRAS (Angola):
 * - FT (Fatura) → Saída de stock (venda)
 * - FR (Fatura-Recibo) → Saída de stock (venda)
 * - NC (Nota de Crédito) → Entrada de stock (devolução)
 * - ND (Nota de Débito) → NÃO movimenta stock
 * - FP (Proforma) → NÃO movimenta stock
 * - FA (Adiantamento) → NÃO movimenta stock
 * - RC (Recibo) → NÃO movimenta stock
 */
export const TIPOS_DOCUMENTO_AFETAM_STOCK = ['FT', 'FR', 'NC'] as const;
export const TIPOS_DOCUMENTO_ENTRADA_STOCK = ['NC'] as const;
export const TIPOS_DOCUMENTO_SAIDA_STOCK = ['FT', 'FR'] as const;

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
    documento_fiscal_id?: string;  // NOVO: referência ao documento fiscal
    documentoFiscal?: {           // NOVO: relação com documento fiscal
        id: string;
        numero_documento: string;
        tipo_documento: string;
    };
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
    documento_fiscal_id?: string;  // NOVO
}

export interface SaidaStockInput {
    produto_id: string;
    quantidade: number;
    motivo: string;
    tipo_movimento?: TipoMovimentoContexto;
    referencia?: string;
    documento_fiscal_id?: string;  // NOVO
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
    // NOVOS campos para distinguir tipos de movimento
    saidasPorVenda: number;
    entradasPorNotaCredito: number;
    movimentosPorTipo: Array<{
        tipo_movimento: string;
        total: number;
        quantidade_total: number;
    }>;
    produtos_criticos: Produto[];
}

export interface EstatisticasMovimento {
    total_movimentos: number;
    total_entradas: number;
    total_saidas: number;
    por_tipo: Array<{ tipo_movimento: string; total: number }>;
    por_mes: Array<{ mes: string; entradas: number; saidas: number }>;
    por_documento_fiscal?: Array<{
        tipo_movimento: string;
        total: number;
        quantidade_entrada: number;
        quantidade_saida: number;
    }>;
    por_documento?: Array<{
        documento_fiscal_id: string;
        tipo_movimento: string;
        total: number;
        entrada_total: number;
        saida_total: number;
        documentoFiscal?: {
            id: string;
            numero_documento: string;
            tipo_documento: string;
        };
    }>;
}

export interface FiltrosMovimento {
    produto_id?: string;
    tipo?: TipoMovimento;
    tipo_movimento?: TipoMovimentoContexto;
    data_inicio?: string;
    data_fim?: string;
    documento_fiscal_id?: string;  // NOVO
    paginar?: boolean;
    per_page?: number;
}

// ===== FUNÇÕES AUXILIARES =====

/** Verifica se um tipo de documento afeta o stock */
function _documentoAfetaStock(tipo: string): boolean {
    return TIPOS_DOCUMENTO_AFETAM_STOCK.includes(tipo as typeof TIPOS_DOCUMENTO_AFETAM_STOCK[number]);
}

/** Verifica se é uma entrada de stock */
function _ehEntradaStock(tipo: string): boolean {
    return TIPOS_DOCUMENTO_ENTRADA_STOCK.includes(tipo as typeof TIPOS_DOCUMENTO_ENTRADA_STOCK[number]);
}

/** Verifica se é uma saída de stock */
function _ehSaidaStock(tipo: string): boolean {
    return TIPOS_DOCUMENTO_SAIDA_STOCK.includes(tipo as typeof TIPOS_DOCUMENTO_SAIDA_STOCK[number]);
}

// ===== SERVIÇO =====

const API_PREFIX = "/api";

export const estoqueService = {

    async listarMovimentacoes(filtros?: FiltrosMovimento): Promise<MovimentoStock[]> {
        const q = new URLSearchParams();
        if (filtros?.produto_id)        q.append("produto_id", filtros.produto_id);
        if (filtros?.tipo)              q.append("tipo", filtros.tipo);
        if (filtros?.tipo_movimento)    q.append("tipo_movimento", filtros.tipo_movimento);
        if (filtros?.data_inicio)       q.append("data_inicio", filtros.data_inicio);
        if (filtros?.data_fim)          q.append("data_fim", filtros.data_fim);
        if (filtros?.documento_fiscal_id) q.append("documento_fiscal_id", filtros.documento_fiscal_id);
        if (filtros?.paginar)           q.append("paginar", "true");
        if (filtros?.per_page)          q.append("per_page", filtros.per_page.toString());

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
            documento_fiscal_id: dados.documento_fiscal_id,
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
            documento_fiscal_id: dados.documento_fiscal_id,
        });
        return response.data;
    },

    /** 
     * Registrar Nota de Crédito (entrada de stock - devolução)
     * 
     * REGRA: NC = entrada de stock (devolução de mercadoria)
     */
    async registrarNotaCredito(dados: Omit<EntradaStockInput, 'tipo_movimento'>): Promise<{
        message: string;
        movimento: MovimentoStock;
        estoque_atualizado: { anterior: number; atual: number; diferenca: number };
    }> {
        return this.registrarEntrada({
            ...dados,
            tipo_movimento: "nota_credito",
        });
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

    /**
     * Processa um documento fiscal para movimentar stock
     * 
     * REGRAS:
     * - FT/FR → Saída de stock (venda)
     * - NC → Entrada de stock (devolução)
     * - ND → NÃO movimenta stock
     * - FP → NÃO movimenta stock (apenas orçamento)
     * - FA → NÃO movimenta stock (apenas adiantamento)
     * - RC → NÃO movimenta stock (apenas recibo)
     * 
     * @param documentoId - ID do documento fiscal
     * @param tipoDocumento - Tipo do documento (FT, FR, NC, etc.)
     * @param itens - Itens do documento com produto_id e quantidade
     * @param motivo - Motivo da movimentação
     * @returns Resultado do processamento
     */
    async processarDocumentoFiscal(
        documentoId: string,
        tipoDocumento: string,
        itens: Array<{ produto_id?: string | null; quantidade: number; descricao?: string }>,
        motivo?: string
    ): Promise<{
        processados: number;
        ignorados: number;
        movimentos: MovimentoStock[];
        erros: Array<{ item: string; error: string }>;
    }> {
        // Verificar se o documento afeta stock
        if (!_documentoAfetaStock(tipoDocumento)) {
            return {
                processados: 0,
                ignorados: itens.length,
                movimentos: [],
                erros: [{ 
                    item: 'documento', 
                    error: `Documento tipo ${tipoDocumento} não afeta stock` 
                }]
            };
        }

        // Determinar direção do movimento
        const isEntrada = _ehEntradaStock(tipoDocumento);
        const isSaida = _ehSaidaStock(tipoDocumento);
        
        // ND não afeta stock (já validado acima)
        const tipoMovimento = tipoDocumento === 'NC' ? 'nota_credito' : 'venda';
        const tipo = isEntrada ? 'entrada' : 'saida';

        const resultados = {
            processados: 0,
            ignorados: 0,
            movimentos: [] as MovimentoStock[],
            erros: [] as Array<{ item: string; error: string }>
        };

        for (const item of itens) {
            // Verificar se tem produto_id
            if (!item.produto_id) {
                resultados.ignorados++;
                resultados.erros.push({
                    item: item.descricao || 'item sem descrição',
                    error: 'Item sem produto_id'
                });
                continue;
            }

            try {
                // Verificar se o produto existe e não é serviço
                const produto = await _verificarProdutoNaoServico(item.produto_id);
                if (!produto) {
                    resultados.ignorados++;
                    resultados.erros.push({
                        item: item.descricao || item.produto_id,
                        error: 'Produto é um serviço ou não encontrado'
                    });
                    continue;
                }

                // Para NC, validar se a quantidade não excede o estoque
                if (isEntrada) {
                    // Entrada não precisa validar estoque
                } else if (isSaida) {
                    // Saída precisa validar estoque
                    const disponibilidade = await this.verificarDisponibilidade(
                        item.produto_id,
                        item.quantidade
                    );
                    if (!disponibilidade.disponivel) {
                        resultados.ignorados++;
                        resultados.erros.push({
                            item: produto.nome || item.descricao || item.produto_id,
                            error: disponibilidade.mensagem || 'Stock insuficiente'
                        });
                        continue;
                    }
                }

                // Executar o movimento
                const movimento = tipo === 'entrada'
                    ? await this.registrarEntrada({
                        produto_id: item.produto_id,
                        quantidade: item.quantidade,
                        motivo: motivo || `Movimento gerado por ${tipoDocumento}`,
                        tipo_movimento: tipoMovimento,
                        documento_fiscal_id: documentoId,
                    })
                    : await this.registrarSaida({
                        produto_id: item.produto_id,
                        quantidade: item.quantidade,
                        motivo: motivo || `Movimento gerado por ${tipoDocumento}`,
                        tipo_movimento: tipoMovimento,
                        documento_fiscal_id: documentoId,
                    });

                resultados.movimentos.push(movimento.movimento);
                resultados.processados++;

            } catch (error) {
                resultados.ignorados++;
                resultados.erros.push({
                    item: item.descricao || item.produto_id || 'item',
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        }

        return resultados;
    },

    /**
     * Reverte os movimentos de stock de um documento fiscal
     * Usado quando um documento é cancelado
     */
    async reverterDocumentoFiscal(documentoId: string): Promise<{
        revertidos: number;
        erros: Array<{ movimento_id: string; error: string }>;
    }> {
        try {
            // Buscar movimentos do documento
            const movimentos = await this.listarMovimentacoes({
                documento_fiscal_id: documentoId
            });

            if (movimentos.length === 0) {
                return { revertidos: 0, erros: [] };
            }

            const resultados = {
                revertidos: 0,
                erros: [] as Array<{ movimento_id: string; error: string }>
            };

            for (const movimento of movimentos) {
                try {
                    // Reverter o movimento (inverter direção)
                    const tipoReversao = movimento.tipo === 'entrada' ? 'saida' : 'entrada';
                    
                    if (tipoReversao === 'entrada') {
                        await this.registrarEntrada({
                            produto_id: movimento.produto_id,
                            quantidade: movimento.quantidade,
                            motivo: `Reversão do movimento #${movimento.id} - Cancelamento do documento`,
                            tipo_movimento: 'ajuste',
                            documento_fiscal_id: documentoId,
                        });
                    } else {
                        await this.registrarSaida({
                            produto_id: movimento.produto_id,
                            quantidade: movimento.quantidade,
                            motivo: `Reversão do movimento #${movimento.id} - Cancelamento do documento`,
                            tipo_movimento: 'ajuste',
                            documento_fiscal_id: documentoId,
                        });
                    }
                    resultados.revertidos++;
                } catch (error) {
                    resultados.erros.push({
                        movimento_id: movimento.id,
                        error: error instanceof Error ? error.message : 'Erro desconhecido'
                    });
                }
            }

            return resultados;
        } catch (error) {
            throw new Error(
                `Erro ao reverter movimentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            );
        }
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

    // ===== HELPERS PÚBLICOS =====

    /**
     * Verifica se um documento fiscal afeta o stock
     */
    documentoAfetaStock(tipoDocumento: string): boolean {
        return _documentoAfetaStock(tipoDocumento);
    },

    /**
     * Obtém a direção do movimento para um tipo de documento
     * @returns 'entrada', 'saida' ou null (se não afetar stock)
     */
    getDirecaoMovimento(tipoDocumento: string): 'entrada' | 'saida' | null {
        if (_ehEntradaStock(tipoDocumento)) {
            return 'entrada';
        }
        if (_ehSaidaStock(tipoDocumento)) {
            return 'saida';
        }
        return null;
    },

    /**
     * Obtém o tipo de movimento para um tipo de documento
     */
    getTipoMovimento(tipoDocumento: string): TipoMovimentoContexto | null {
        const mapa: Record<string, TipoMovimentoContexto> = {
            'FT': 'venda',
            'FR': 'venda',
            'NC': 'nota_credito',
        };
        return mapa[tipoDocumento] ?? null;
    },

    /**
     * Obtém a descrição do efeito no stock para um tipo de documento
     */
    getEfeitoStock(tipoDocumento: string): string {
        if (_ehEntradaStock(tipoDocumento)) {
            return 'Entrada de stock (devolução)';
        }
        if (_ehSaidaStock(tipoDocumento)) {
            return 'Saída de stock (venda)';
        }
        return 'Não afeta stock';
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