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

// ==================== TIPOS ====================

interface ItemNotaDebito {
    id?: string;
    produto_id?: string;
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    taxa_iva: number;
}

// ==================== COMPONENTE PRINCIPAL ====================

// src/app/documentos-fiscais/[id]/nota-debito/page.tsx

export default function NotaDebitoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params.id as string;

    // ==================== LOGS DE DEBUG ====================
    console.log('========== DEBUG NOTA DÉBITO PAGE ==========');
    console.log('1. Parâmetros da rota:', params);
    console.log('2. documentoId extraído:', documentoId);
    console.log('3. Tipo do documentoId:', typeof documentoId);
    console.log('4. URL completa:', window.location.href);
    console.log('============================================');

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

    // Carregar dados
    const carregarDados = useCallback(async () => {
        console.log('5. Iniciando carregarDados com documentoId:', documentoId);

        if (!documentoId) {
            console.error('6. ERRO: documentoId está undefined ou null');
            setError("ID do documento não encontrado na URL");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log('7. Chamando API para documentoId:', documentoId);

            const resultadoDoc = await documentoFiscalService.obter(documentoId);
            console.log('8. Resposta da API (bruta):', resultadoDoc);

            if (!resultadoDoc) {
                console.error('9. ERRO: resultadoDoc é null/undefined');
                throw new Error("Resposta da API vazia");
            }

            console.log('10. Estrutura resultadoDoc:', {
                temData: !!resultadoDoc.data,
                temDocumento: !!resultadoDoc.data?.documento,
                dataKeys: resultadoDoc.data ? Object.keys(resultadoDoc.data) : []
            });

            if (!resultadoDoc?.data?.documento) {
                console.error('11. ERRO: documento não encontrado na resposta');
                throw new Error("Documento não encontrado");
            }

            const doc = resultadoDoc.data.documento;
            console.log('12. Documento carregado:', doc);

            // Verificar se pode gerar ND
            if (!['FT', 'FR'].includes(doc.tipo_documento)) {
                console.error('13. ERRO: Tipo de documento inválido:', doc.tipo_documento);
                throw new Error("Apenas Faturas (FT) e Faturas-Recibo (FR) podem gerar Notas de Débito");
            }

            if (doc.estado === 'cancelado') {
                console.error('14. ERRO: Documento cancelado');
                throw new Error("Não é possível gerar Nota de Débito para documento cancelado");
            }

            setDocumentoOrigem(doc);
            console.log('15. Documento origem setado com sucesso');

            // Carregar produtos
            console.log('16. Carregando produtos...');
            const resultadoProdutos = await produtoService.listar({ status: 'ativo' });
            console.log('17. Produtos carregados:', resultadoProdutos);
            setProdutos(Array.isArray(resultadoProdutos.produtos) ? resultadoProdutos.produtos : []);

        } catch (err: any) {
            console.error('18. ERRO em carregarDados:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            setError(err.message || "Erro ao carregar dados");
        } finally {
            setLoading(false);
            console.log('19. Loading finalizado');
        }
    }, [documentoId]);

    useEffect(() => {
        console.log('20. useEffect executado');
        carregarDados();
    }, [carregarDados]);


    // Adicionar item
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

    // Remover item
    const removerItem = (id: string) => {
        setItens(itens.filter(i => i.id !== id));
    };

    // Selecionar produto existente
    const selecionarProduto = (produto: Produto) => {
        setNovoItem({
            ...novoItem,
            produto_id: produto.id,
            descricao: produto.nome,
            preco_unitario: produto.preco_venda,
            taxa_iva: produto.taxa_iva,
        });
    };

    // Calcular totais
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

    // Gerar Nota de Débito
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
                router.push(`/documentos-fiscais?tipo=ND&sucesso=true`);
            } else {
                throw new Error("Erro ao gerar Nota de Débito");
            }
        } catch (err: any) {
            setError(err.message || "Erro ao gerar Nota de Débito");
        } finally {
            setSubmitting(false);
        }
    };

    const formatKz = (valor: number) => {
        return new Intl.NumberFormat("pt-AO", {
            style: "currency",
            currency: "AOA",
            minimumFractionDigits: 2,
        }).format(valor);
    };

    // ==================== RENDER ====================

    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-6 flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#123859]"></div>
                </div>
            </MainEmpresa>
        );
    }

    if (error && !documentoOrigem) {
        return (
            <MainEmpresa>
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700">{error}</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-4 py-2 bg-[#123859] text-white rounded-lg hover:bg-[#0d2840]"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    const totais = calcularTotais();

    return (
        <MainEmpresa>
            <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <button onClick={() => router.back()} className="hover:text-[#123859]">
                            ← Voltar
                        </button>
                        <span>/</span>
                        <span>Nota de Débito</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#123859]">
                        Gerar Nota de Débito
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Documento de origem: <span className="font-semibold">{documentoOrigem?.numero_documento}</span>
                    </p>
                </div>

                {/* Erro */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {/* Info do Documento Origem */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Tipo:</span>
                            <p className="font-semibold text-[#123859]">
                                {documentoOrigem?.tipo_documento === 'FT' ? 'Fatura' : 'Fatura-Recibo'}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-500">Cliente:</span>
                            <p className="font-semibold text-[#123859]">
                                {documentoOrigem?.cliente?.nome || "Consumidor Final"}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-500">Total Original:</span>
                            <p className="font-semibold text-[#123859]">
                                {formatKz(documentoOrigem?.total_liquido || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Motivo */}
                <div className="bg-white rounded-xl shadow border border-gray-200 p-4 sm:p-6 mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Motivo da Nota de Débito *
                    </label>
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ex: Cobrança de serviços adicionais, correção de valores, juros de mora..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent resize-none"
                    />
                </div>

                {/* Itens */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
                    <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-[#123859]">Itens a Debitar</h2>
                        <button
                            onClick={() => setShowAddItem(!showAddItem)}
                            className="px-4 py-2 bg-[#123859] text-white rounded-lg hover:bg-[#0d2840] transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Item
                        </button>
                    </div>

                    {/* Formulário de Novo Item */}
                    {showAddItem && (
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
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
                                        Descrição *
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
                                        Quantidade *
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={novoItem.quantidade}
                                        onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#123859]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Preço Unitário *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={novoItem.preco_unitario}
                                        onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })}
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
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={adicionarItem}
                                    className="px-4 py-2 bg-[#F9941F] text-white rounded-lg hover:bg-[#d9831a] text-sm font-medium"
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
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left text-sm font-medium text-gray-700">Descrição</th>
                                        <th className="p-3 text-center text-sm font-medium text-gray-700">Qtd</th>
                                        <th className="p-3 text-right text-sm font-medium text-gray-700">Preço Unit.</th>
                                        <th className="p-3 text-right text-sm font-medium text-gray-700">IVA</th>
                                        <th className="p-3 text-right text-sm font-medium text-gray-700">Total</th>
                                        <th className="p-3 text-center text-sm font-medium text-gray-700">Ações</th>
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
                                                <td className="p-3 text-right font-semibold text-[#123859]">{formatKz(total)}</td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => removerItem(item.id!)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remover item"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <div className="p-8 text-center text-gray-500">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <p className="text-sm">Nenhum item adicionado</p>
                            <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar Item" para começar</p>
                        </div>
                    )}

                    {/* Totais */}
                    {itens.length > 0 && (
                        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                                <div className="w-full sm:w-80 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Base Tributável:</span>
                                        <span className="font-medium">{formatKz(totais.baseTributavel)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total IVA:</span>
                                        <span className="font-medium">{formatKz(totais.totalIva)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-[#123859] border-t pt-2">
                                        <span>Total a Debitar:</span>
                                        <span>{formatKz(totais.total)}</span>
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
                        className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium min-h-[48px]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={gerarNotaDebito}
                        disabled={submitting || itens.length === 0}
                        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-h-[48px] flex items-center justify-center gap-2"
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