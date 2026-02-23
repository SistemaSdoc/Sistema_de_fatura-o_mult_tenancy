// src/app/documentos-fiscais/[id]/nota-debito/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    produtoService,
    Produto
} from "@/services/vendas";

/* ==================== CONSTANTES ==================== */
const COLORS = {
    primary: '#123859',      // Azul escuro
    secondary: '#F9941F',    // Laranja âmbra
    background: '#F2F2F2',   // Cinza muito claro
    white: '#FFFFFF',
    danger: '#dc3545',
    success: '#28a745',
};

/* ==================== TIPOS ==================== */

interface ItemNotaDebito {
    id?: string;
    produto_id?: string;
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    taxa_iva: number;
}

/* ==================== COMPONENTE PRINCIPAL ==================== */

export default function NotaDebitoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params.id as string;

    // ==================== ESTADOS ====================
    const [documentoOrigem, setDocumentoOrigem] = useState<DocumentoFiscal | null>(null);
    const [itens, setItens] = useState<ItemNotaDebito[]>([]);
    const [motivo, setMotivo] = useState("");
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddItem, setShowAddItem] = useState(false);

    // Novo item
    const [novoItem, setNovoItem] = useState<Partial<ItemNotaDebito>>({
        descricao: "",
        quantidade: 1,
        preco_unitario: 0,
        taxa_iva: 14,
    });

    // ==================== LOGS SEGUROS ====================
    useEffect(() => {
        console.log('========== NOTA DÉBITO PAGE ==========');
        console.log('documentoId:', documentoId);
        console.log('=======================================');
    }, [documentoId]);

    // ==================== CARREGAR DADOS ====================
    const carregarDados = useCallback(async () => {
        if (!documentoId) {
            setError("ID do documento não encontrado na URL");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const resultadoDoc = await documentoFiscalService.obter(documentoId);

            if (!resultadoDoc?.data?.documento) {
                throw new Error("Documento não encontrado");
            }

            const doc = resultadoDoc.data.documento;

            // Verificar se pode gerar ND
            if (!['FT', 'FR'].includes(doc.tipo_documento)) {
                throw new Error("Apenas Faturas (FT) e Faturas-Recibo (FR) podem gerar Notas de Débito");
            }

            if (doc.estado === 'cancelado') {
                throw new Error("Não é possível gerar Nota de Débito para documento cancelado");
            }

            setDocumentoOrigem(doc);

            // Carregar produtos
            const resultadoProdutos = await produtoService.listar({ status: 'ativo' });
            setProdutos(Array.isArray(resultadoProdutos.produtos) ? resultadoProdutos.produtos : []);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Erro ao carregar dados";
            console.error('Erro ao carregar dados:', err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [documentoId]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    // ==================== FUNÇÕES DOS ITENS ====================

    const adicionarItem = () => {
        if (!novoItem.descricao || !novoItem.quantidade || !novoItem.preco_unitario) {
            setError("Preencha todos os campos do item");
            return;
        }

        const item: ItemNotaDebito = {
            id: Date.now().toString(),
            produto_id: novoItem.produto_id,
            descricao: novoItem.descricao,
            quantidade: novoItem.quantidade,
            preco_unitario: novoItem.preco_unitario,
            taxa_iva: novoItem.taxa_iva || 14,
        };

        setItens([...itens, item]);

        // Reset
        setNovoItem({
            descricao: "",
            quantidade: 1,
            preco_unitario: 0,
            taxa_iva: 14,
        });
        setShowAddItem(false);
        setError(null);
    };

    const removerItem = (id: string) => {
        setItens(itens.filter(i => i.id !== id));
    };

    const selecionarProduto = (produto: Produto) => {
        setNovoItem({
            ...novoItem,
            produto_id: produto.id,
            descricao: produto.nome,
            preco_unitario: produto.preco_venda,
            taxa_iva: produto.taxa_iva,
        });
    };

    // ==================== CÁLCULOS ====================

    const calcularTotais = () => {
        let baseTributavel = 0;
        let totalIva = 0;

        itens.forEach(item => {
            const valorUnitario = item.preco_unitario * item.quantidade;
            const iva = valorUnitario * (item.taxa_iva / 100);

            baseTributavel += valorUnitario;
            totalIva += iva;
        });

        return {
            baseTributavel,
            totalIva,
            total: baseTributavel + totalIva
        };
    };

    // ==================== GERAR NOTA DE DÉBITO ====================

    const gerarNotaDebito = async () => {
        try {
            if (itens.length === 0) {
                setError("Adicione pelo menos um item");
                return;
            }

            if (!motivo.trim()) {
                setError("Informe o motivo da Nota de Débito");
                return;
            }

            setSubmitting(true);
            setError(null);

            const payload = {
                itens: itens.map(item => ({
                    produto_id: item.produto_id,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    taxa_iva: item.taxa_iva,
                })),
                motivo: motivo,
            };

            const resultado = await documentoFiscalService.criarNotaDebito(documentoId, payload);

            if (resultado?.documento) {
                router.push(`/dashboard/Faturas/Faturas?tipo=ND&sucesso=true`);
            } else {
                throw new Error("Erro ao gerar Nota de Débito");
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Erro ao gerar Nota de Débito";
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // ==================== UTILITÁRIOS ====================

    const formatKz = (valor: number) => {
        return new Intl.NumberFormat("pt-AO", {
            style: "currency",
            currency: "AOA",
            minimumFractionDigits: 2,
        }).format(valor);
    };

    // ==================== LOADING ====================

    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-6 flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.primary }}></div>
                </div>
            </MainEmpresa>
        );
    }

    // ==================== ERRO ====================

    if (error && !documentoOrigem) {
        return (
            <MainEmpresa>
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md mx-auto">
                        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-700 text-lg font-medium mb-2">Erro</p>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    const totais = calcularTotais();

    // ==================== RENDER ====================

    return (
        <MainEmpresa>
            <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <button 
                            onClick={() => router.back()} 
                            className="hover:underline flex items-center gap-1"
                            style={{ color: COLORS.primary }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Voltar
                        </button>
                        <span>/</span>
                        <span>Nota de Débito</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: COLORS.primary }}>
                        Gerar Nota de Débito
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Documento de origem: <span className="font-semibold" style={{ color: COLORS.secondary }}>{documentoOrigem?.numero_documento}</span>
                    </p>
                </div>

                {/* Erro */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-700 text-sm flex-1">{error}</p>
                    </div>
                )}

                {/* Info do Documento Origem */}
                <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#F0F7FF', borderColor: COLORS.primary }}>
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="py-1 text-gray-600" style={{ width: '120px' }}>Tipo:</td>
                                <td className="py-1 font-semibold" style={{ color: COLORS.primary }}>
                                    {documentoOrigem?.tipo_documento === 'FT' ? 'Fatura' : 'Fatura-Recibo'}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-1 text-gray-600">Cliente:</td>
                                <td className="py-1 font-semibold" style={{ color: COLORS.primary }}>
                                    {documentoOrigem?.cliente?.nome || documentoOrigem?.cliente_nome || "Consumidor Final"}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-1 text-gray-600">Total Original:</td>
                                <td className="py-1 font-semibold" style={{ color: COLORS.primary }}>
                                    {formatKz(documentoOrigem?.total_liquido || 0)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Motivo */}
                <div className="bg-white rounded-xl shadow border border-gray-200 p-4 sm:p-6 mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Motivo da Nota de Débito <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ex: Cobrança de serviços adicionais, correção de valores, juros de mora..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent resize-none"
                        style={{ borderColor: '#e2e8f0' }}
                    />
                </div>

                {/* Itens */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
                    <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold" style={{ color: COLORS.primary }}>Itens a Debitar</h2>
                        <button
                            onClick={() => setShowAddItem(!showAddItem)}
                            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium flex items-center gap-2"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Item
                        </button>
                    </div>

                    {/* Formulário de Novo Item */}
                    {showAddItem && (
                        <div className="p-4" style={{ backgroundColor: COLORS.background }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                {/* Busca de Produto */}
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Produto (opcional)
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const produto = produtos.find(p => p.id === e.target.value);
                                            if (produto) selecionarProduto(produto);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#123859]"
                                        value={novoItem.produto_id || ''}
                                    >
                                        <option value="">Selecione um produto...</option>
                                        {produtos.map(produto => (
                                            <option key={produto.id} value={produto.id}>
                                                {produto.nome} - {formatKz(produto.preco_venda)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Descrição <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={novoItem.descricao}
                                        onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                                        placeholder="Descrição do serviço ou produto"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#123859]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Quantidade <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={novoItem.quantidade}
                                        onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseFloat(e.target.value) || 0 })}
                                        placeholder="Ex: 1.5"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#123859]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Preço Unitário <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={novoItem.preco_unitario}
                                        onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })}
                                        placeholder="Ex: 100.00"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#123859]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Taxa IVA (%)
                                    </label>
                                    <select
                                        value={novoItem.taxa_iva}
                                        onChange={(e) => setNovoItem({ ...novoItem, taxa_iva: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#123859]"
                                    >
                                        <option value="0">Isento (0%)</option>
                                        <option value="7">7%</option>
                                        <option value="14">14%</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowAddItem(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={adicionarItem}
                                    className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
                                    style={{ backgroundColor: COLORS.secondary }}
                                >
                                    Adicionar à Lista
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tabela de Itens */}
                    {itens.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead style={{ backgroundColor: COLORS.primary }}>
                                    <tr>
                                        <th className="p-3 text-left text-sm font-medium text-white">Descrição</th>
                                        <th className="p-3 text-center text-sm font-medium text-white">Qtd</th>
                                        <th className="p-3 text-right text-sm font-medium text-white">Preço Unit.</th>
                                        <th className="p-3 text-right text-sm font-medium text-white">IVA</th>
                                        <th className="p-3 text-right text-sm font-medium text-white">Total</th>
                                        <th className="p-3 text-center text-sm font-medium text-white">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {itens.map((item) => {
                                        const subtotal = item.preco_unitario * item.quantidade;
                                        const iva = subtotal * (item.taxa_iva / 100);
                                        const total = subtotal + iva;

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-medium text-sm">{item.descricao}</div>
                                                    {item.produto_id && (
                                                        <div className="text-xs text-gray-500">Produto ID: {item.produto_id}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center text-sm">{item.quantidade}</td>
                                                <td className="p-3 text-right text-sm">{formatKz(item.preco_unitario)}</td>
                                                <td className="p-3 text-right text-sm">{item.taxa_iva}%</td>
                                                <td className="p-3 text-right font-semibold" style={{ color: COLORS.primary }}>
                                                    {formatKz(total)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => removerItem(item.id!)}
                                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                                                        title="Remover item"
                                                    >
                                                        <svg className="w-4 h-4 text-red-500 group-hover:text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.background }}>
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium">Nenhum item adicionado</p>
                            <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar Item" para começar</p>
                        </div>
                    )}

                    {/* Totais */}
                    {itens.length > 0 && (
                        <div className="p-4 sm:p-6 border-t border-gray-200" style={{ backgroundColor: COLORS.background }}>
                            <div className="flex flex-col sm:flex-row justify-end">
                                <div className="w-full sm:w-80 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Base Tributável:</span>
                                        <span className="font-medium">{formatKz(totais.baseTributavel)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total IVA:</span>
                                        <span className="font-medium">{formatKz(totais.totalIva)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-2 mt-2" style={{ borderTop: `2px solid ${COLORS.primary}` }}>
                                        <span style={{ color: COLORS.primary }}>Total a Debitar:</span>
                                        <span style={{ color: COLORS.primary }}>{formatKz(totais.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        disabled={submitting}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium min-h-[48px]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={gerarNotaDebito}
                        disabled={submitting || itens.length === 0}
                        className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-h-[48px] flex items-center justify-center gap-2"
                        style={{ backgroundColor: COLORS.danger }}
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Gerando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Gerar Nota de Débito</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </MainEmpresa>
    );
}