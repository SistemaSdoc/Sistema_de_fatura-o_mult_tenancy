// src/app/documentos-fiscais/[id]/nota-credito/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    ItemDocumentoFiscal,
    produtoService,
    Produto
} from "@/services/vendas";

// ==================== TIPOS ====================

interface ItemNotaCredito {
    item_origem_id: string;
    produto_id?: string;
    descricao: string;
    quantidade_original: number;
    quantidade_creditar: number;
    preco_unitario: number;
    taxa_iva: number;
    motivo: string;
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function NotaCreditoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params.id as string;

    const [documentoOrigem, setDocumentoOrigem] = useState<DocumentoFiscal | null>(null);
    const [itens, setItens] = useState<ItemNotaCredito[]>([]);
    const [motivoGeral, setMotivoGeral] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carregar documento de origem
    const carregarDocumento = useCallback(async () => {
        try {
            setLoading(true);
            const resultado = await documentoFiscalService.obter(documentoId);

            if (!resultado?.data?.documento) {
                throw new Error("Documento não encontrado");
            }

            const doc = resultado.data.documento;

            // Verificar se pode gerar NC
            if (!['FT', 'FR'].includes(doc.tipo_documento)) {
                throw new Error("Apenas Faturas (FT) e Faturas-Recibo (FR) podem gerar Notas de Crédito");
            }

            if (doc.estado === 'cancelado') {
                throw new Error("Não é possível gerar Nota de Crédito para documento cancelado");
            }

            setDocumentoOrigem(doc);

            // Inicializar itens
            const itensIniciais: ItemNotaCredito[] = doc.itens?.map(item => ({
                item_origem_id: item.id,
                produto_id: item.produto_id || undefined,
                descricao: item.descricao,
                quantidade_original: item.quantidade,
                quantidade_creditar: 0, // Usuário define quantidade a creditar
                preco_unitario: item.preco_unitario,
                taxa_iva: item.taxa_iva,
                motivo: "",
            })) || [];

            setItens(itensIniciais);
        } catch (err: any) {
            setError(err.message || "Erro ao carregar documento");
        } finally {
            setLoading(false);
        }
    }, [documentoId]);

    useEffect(() => {
        carregarDocumento();
    }, [carregarDocumento]);

    // Calcular totais
    const calcularTotais = () => {
        let baseTributavel = 0;
        let totalIva = 0;
        let total = 0;

        itens.forEach(item => {
            if (item.quantidade_creditar > 0) {
                const valorUnitario = item.preco_unitario * item.quantidade_creditar;
                const iva = valorUnitario * (item.taxa_iva / 100);

                baseTributavel += valorUnitario;
                totalIva += iva;
                total += valorUnitario + iva;
            }
        });

        return { baseTributavel, totalIva, total };
    };

    // Atualizar quantidade a creditar
    const atualizarQuantidade = (index: number, quantidade: number) => {
        const novosItens = [...itens];
        const maxQuantidade = novosItens[index].quantidade_original;

        // Limitar à quantidade original
        novosItens[index].quantidade_creditar = Math.min(Math.max(0, quantidade), maxQuantidade);
        setItens(novosItens);
    };

    // Atualizar motivo do item
    const atualizarMotivoItem = (index: number, motivo: string) => {
        const novosItens = [...itens];
        novosItens[index].motivo = motivo;
        setItens(novosItens);
    };

    // Gerar Nota de Crédito
    const gerarNotaCredito = async () => {
        try {
            // Validações
            const itensValidos = itens.filter(i => i.quantidade_creditar > 0);

            if (itensValidos.length === 0) {
                setError("Selecione pelo menos um item para creditar");
                return;
            }

            const itensSemMotivo = itensValidos.filter(i => !i.motivo.trim());
            if (itensSemMotivo.length > 0) {
                setError("Informe o motivo para todos os itens a creditar");
                return;
            }

            if (!motivoGeral.trim()) {
                setError("Informe o motivo geral da Nota de Crédito");
                return;
            }

            setSubmitting(true);
            setError(null);

            const payload = {
                itens: itensValidos.map(item => ({
                    produto_id: item.produto_id,
                    descricao: `${item.descricao} (NC: ${item.motivo})`,
                    quantidade: item.quantidade_creditar,
                    preco_unitario: item.preco_unitario,
                    taxa_iva: item.taxa_iva,
                })),
                motivo: motivoGeral,
            };

            const resultado = await documentoFiscalService.criarNotaCredito(documentoId, payload);

            if (resultado?.documento) {
                router.push(`/documentos-fiscais?tipo=NC&sucesso=true`);
            } else {
                throw new Error("Erro ao gerar Nota de Crédito");
            }
        } catch (err: any) {
            setError(err.message || "Erro ao gerar Nota de Crédito");
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
                        <span>Nota de Crédito</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#123859]">
                        Gerar Nota de Crédito
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

                {/* Formulário */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Motivo Geral */}
                    <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Motivo da Nota de Crédito *
                        </label>
                        <input
                            type="text"
                            value={motivoGeral}
                            onChange={(e) => setMotivoGeral(e.target.value)}
                            placeholder="Ex: Devolução de mercadoria, erro de faturação, desconto concedido..."
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent"
                        />
                    </div>

                    {/* Tabela de Itens */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead className="bg-[#123859] text-white">
                                <tr>
                                    <th className="p-3 text-left text-sm">Descrição</th>
                                    <th className="p-3 text-center text-sm">Qtd. Original</th>
                                    <th className="p-3 text-center text-sm">Qtd. a Creditar</th>
                                    <th className="p-3 text-right text-sm">Preço Unit.</th>
                                    <th className="p-3 text-right text-sm">Total NC</th>
                                    <th className="p-3 text-left text-sm">Motivo do Item</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {itens.map((item, index) => {
                                    const totalItem = item.quantidade_creditar * item.preco_unitario * (1 + item.taxa_iva / 100);

                                    return (
                                        <tr key={item.item_origem_id} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                <div className="font-medium text-sm">{item.descricao}</div>
                                                {item.produto_id && (
                                                    <div className="text-xs text-gray-500">ID: {item.produto_id}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-sm text-gray-600">
                                                {item.quantidade_original}
                                            </td>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantidade_original}
                                                    step="0.01"
                                                    value={item.quantidade_creditar || ""}
                                                    onChange={(e) => atualizarQuantidade(index, parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#123859] focus:border-transparent"
                                                />
                                            </td>
                                            <td className="p-3 text-right text-sm">
                                                {formatKz(item.preco_unitario)}
                                            </td>
                                            <td className="p-3 text-right font-semibold text-[#123859]">
                                                {item.quantidade_creditar > 0 ? formatKz(totalItem) : "-"}
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    value={item.motivo}
                                                    onChange={(e) => atualizarMotivoItem(index, e.target.value)}
                                                    placeholder="Motivo específico..."
                                                    disabled={item.quantidade_creditar === 0}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#123859] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totais */}
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
                                    <span>Total a Creditar:</span>
                                    <span>{formatKz(totais.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ações */}
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        disabled={submitting}
                        className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium min-h-[48px]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={gerarNotaCredito}
                        disabled={submitting || totais.total === 0}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-h-[48px] flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Gerando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                                <span>Gerar Nota de Crédito</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </MainEmpresa>
    );
}