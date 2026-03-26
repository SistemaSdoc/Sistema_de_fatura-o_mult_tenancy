"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
    ArrowLeft,
    CreditCard,
    Loader2,
    Info,
    MinusCircle,
    PlusCircle,
    Save,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Package
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    ItemDocumento
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";

/* ==================== FUNÇÕES UTILITÁRIAS ==================== */
const formatarPreco = (valor: number | undefined | null): string => {
    if (valor === undefined || valor === null) return '0,00 Kz';
    return valor.toLocaleString('pt-AO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' Kz';
};

const formatarData = (data: string | undefined | null): string => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-AO');
};

const formatarQuantidade = (valor: number | undefined | null): string => {
    if (valor === undefined || valor === null) return '0,0000';
    return valor.toFixed(4);
};

/* ==================== COMPONENTE PRINCIPAL ==================== */
export default function NovaNotaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const { id } = params;
    const colors = useThemeColors();

    const tipo = searchParams.get('tipo') as 'NC' | 'ND' | null;
    const origemId = searchParams.get('origem');

    const [documentoOrigem, setDocumentoOrigem] = useState<DocumentoFiscal | null>(null);
    const [loadingOrigem, setLoadingOrigem] = useState(true);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);

    const [itens, setItens] = useState<ItemDocumento[]>([]);
    const [motivo, setMotivo] = useState('');
    const [observacoes, setObservacoes] = useState('');

    const [sucesso, setSucesso] = useState<string | null>(null);

    const isNC = tipo === 'NC';
    const isND = tipo === 'ND';

    // ==================== CARREGAR DOCUMENTO ORIGEM ====================
    useEffect(() => {
        const carregarDocumentoOrigem = async () => {
            if (!origemId) {
                setError('ID do documento de origem não fornecido');
                setLoadingOrigem(false);
                return;
            }

            if (!tipo || (!isNC && !isND)) {
                setError('Tipo de nota inválido');
                setLoadingOrigem(false);
                return;
            }

            try {
                setLoadingOrigem(true);
                setError(null);
                const doc = await documentoFiscalService.buscarPorId(origemId);
                setDocumentoOrigem(doc);

                // Inicializar itens com quantidade 0
                if (doc.itens && doc.itens.length > 0) {
                    const itensInicializados = doc.itens.map(item => ({
                        ...item,
                        quantidade_original: Number(item.quantidade) || 0,
                        quantidade: 0,
                        valor_iva: 0,
                        valor_retencao: 0,
                        total_linha: 0,
                        preco_unitario: Number(item.preco_unitario) || 0,
                        desconto: Number(item.desconto) || 0,
                        taxa_iva: Number(item.taxa_iva) || 0,
                        taxa_retencao: Number(item.taxa_retencao) || 0,
                        produto_id: item.produto_id || null
                    }));
                    setItens(itensInicializados);
                } else {
                    setError('Documento de origem não possui itens detalhados');
                }
            } catch (err) {
                console.error('Erro ao carregar documento origem:', err);
                setError(err instanceof Error ? err.message : 'Erro ao carregar documento origem');
            } finally {
                setLoadingOrigem(false);
            }
        };

        carregarDocumentoOrigem();
    }, [origemId, tipo, isNC, isND]);

    // ==================== HANDLERS ====================
    const handleQuantidadeChange = (index: number, valor: number) => {
        const item = itens[index];
        if (!item) return;

        const quantidadeOriginal = Number((item as any).quantidade_original) || 0;
        const quantidadeValida = Math.max(0, Math.min(valor, quantidadeOriginal));

        const novosItens = [...itens];
        const itemAtual = novosItens[index];

        const precoUnitario = Number(itemAtual.preco_unitario) || 0;
        const desconto = Number(itemAtual.desconto) || 0;
        const taxaIva = Number(itemAtual.taxa_iva) || 0;
        const taxaRetencao = Number(itemAtual.taxa_retencao) || 0;

        // Cálculos
        const valorDesconto = precoUnitario * (desconto / 100);
        const precoComDesconto = precoUnitario - valorDesconto;
        const subtotal = quantidadeValida * precoComDesconto;
        const valorIva = subtotal * (taxaIva / 100);
        const valorRetencao = subtotal * (taxaRetencao / 100);
        const totalLinha = subtotal + valorIva - (isNC ? valorRetencao : 0);

        novosItens[index] = {
            ...itemAtual,
            quantidade: quantidadeValida,
            valor_iva: valorIva,
            valor_retencao: valorRetencao,
            total_linha: totalLinha
        };

        setItens(novosItens);
    };

    const handleSelecionarTodos = () => {
        const todosItens = itens.map(item => {
            const quantidadeOriginal = Number((item as any).quantidade_original) || 0;
            const precoUnitario = Number(item.preco_unitario) || 0;
            const desconto = Number(item.desconto) || 0;
            const taxaIva = Number(item.taxa_iva) || 0;
            const taxaRetencao = Number(item.taxa_retencao) || 0;

            const valorDesconto = precoUnitario * (desconto / 100);
            const precoComDesconto = precoUnitario - valorDesconto;
            const subtotal = quantidadeOriginal * precoComDesconto;
            const valorIva = subtotal * (taxaIva / 100);
            const valorRetencao = subtotal * (taxaRetencao / 100);
            const totalLinha = subtotal + valorIva - (isNC ? valorRetencao : 0);

            return {
                ...item,
                quantidade: quantidadeOriginal,
                valor_iva: valorIva,
                valor_retencao: valorRetencao,
                total_linha: totalLinha
            };
        });
        setItens(todosItens);
    };

    const handleLimparTodos = () => {
        const itensZerados = itens.map(item => ({
            ...item,
            quantidade: 0,
            valor_iva: 0,
            valor_retencao: 0,
            total_linha: 0
        }));
        setItens(itensZerados);
    };

    const calcularTotais = () => {
        const itensValidos = itens.filter(item => Number(item.quantidade) > 0);

        const baseTributavel = itensValidos.reduce((sum, item) => {
            const precoUnitario = Number(item.preco_unitario) || 0;
            const desconto = Number(item.desconto) || 0;
            const quantidade = Number(item.quantidade) || 0;
            const valorDesconto = precoUnitario * (desconto / 100);
            const precoComDesconto = precoUnitario - valorDesconto;
            return sum + (quantidade * precoComDesconto);
        }, 0);

        const totalIva = itensValidos.reduce((sum, item) => sum + (Number(item.valor_iva) || 0), 0);
        const totalRetencao = itensValidos.reduce((sum, item) => sum + (Number(item.valor_retencao) || 0), 0);
        const totalLiquido = itensValidos.reduce((sum, item) => sum + (Number(item.total_linha) || 0), 0);

        return {
            baseTributavel,
            totalIva,
            totalRetencao,
            totalLiquido,
            itensValidos
        };
    };

    const handleSubmit = async () => {
        if (!documentoOrigem || !origemId) return;

        const { itensValidos } = calcularTotais();

        if (itensValidos.length === 0) {
            alert('Selecione pelo menos um item');
            return;
        }

        if (!motivo.trim()) {
            alert('Informe o motivo');
            return;
        }

        try {
            setLoadingSubmit(true);
            setError(null);
            setValidationErrors(null);

            // Preparar payload com tipos CORRETOS
            const dados = {
                itens: itensValidos.map(item => ({
                    produto_id: item.produto_id,
                    descricao: item.descricao,
                    quantidade: Number(item.quantidade),
                    preco_unitario: Number(item.preco_unitario),
                    desconto: Number(item.desconto),
                    taxa_iva: Number(item.taxa_iva),
                    taxa_retencao: Number(item.taxa_retencao),
                    eh_servico: Boolean(item.eh_servico),
                    codigo_produto: item.codigo_produto, // undefined é aceito
                })),
                motivo: motivo.trim(),
                observacoes: observacoes.trim() || undefined, // ← undefined, não null
            };

            console.log('📤 Enviando payload:', JSON.stringify(dados, null, 2));

            let notaGerada: DocumentoFiscal;

            if (isNC) {
                notaGerada = await documentoFiscalService.criarNotaCredito(origemId, dados);
            } else {
                notaGerada = await documentoFiscalService.criarNotaDebito(origemId, dados);
            }

            setSucesso(`${isNC ? 'Nota de Crédito' : 'Nota de Débito'} gerada com sucesso! Nº: ${notaGerada.numero_documento}`);

            setTimeout(() => {
                router.push(`/dashboard/Faturas/Faturas/${origemId}/Ver_NC_ND?notaId=${notaGerada.id}`);
            }, 2000);

        } catch (err: any) {
            console.error('❌ Erro ao gerar nota:', err);

            // Verificar se é um erro de validação (422)
            if (err.response?.status === 422) {
                const errors = err.response?.data?.errors;
                setValidationErrors(errors);

                // Formatar mensagem de erro
                let errorMessage = 'Erro de validação:\n';
                if (errors) {
                    Object.keys(errors).forEach(key => {
                        errorMessage += `\n• ${key}: ${errors[key].join(', ')}`;
                    });
                } else {
                    errorMessage += `\n${err.response?.data?.message || 'Dados inválidos'}`;
                }
                setError(errorMessage);
            } else {
                setError(err instanceof Error ? err.message : 'Erro ao gerar nota');
            }
        } finally {
            setLoadingSubmit(false);
        }
    };
    // ==================== RENDER ====================
    if (loadingOrigem) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-5xl mx-auto">
                    <div className="bg-white rounded-lg border p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
                        <p className="text-gray-600">Carregando documento de origem...</p>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    if (error && !documentoOrigem) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-5xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-red-700 font-medium mb-2">Erro ao carregar documento</p>
                        <p className="text-red-600 text-sm mb-4">{error || 'Documento não encontrado'}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.primary }}
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    if (!documentoOrigem) {
        return null;
    }

    const { baseTributavel, totalIva, totalRetencao, totalLiquido, itensValidos } = calcularTotais();
    const totalItensSelecionados = itensValidos.length;

    return (
        <MainEmpresa>
            <div className="p-3 sm:p-4 max-w-5xl mx-auto space-y-3">
                {/* Header */}
                <div className="bg-white rounded-lg border p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.back()}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" style={{ color: colors.primary }} />
                            </button>
                            <div>
                                <h1 className="text-base sm:text-lg font-bold flex items-center gap-1.5" style={{ color: colors.primary }}>
                                    {isNC ? <MinusCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                    Nova Nota de {isNC ? 'Crédito' : 'Débito'}
                                </h1>
                                <p className="text-xs text-gray-500">
                                    Documento de origem: {documentoOrigem.numero_documento}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSelecionarTodos}
                                className="px-2 py-1 text-xs font-medium rounded-md border hover:bg-gray-50"
                                style={{ borderColor: colors.border }}
                            >
                                Selecionar Todos
                            </button>
                            <button
                                onClick={handleLimparTodos}
                                className="px-2 py-1 text-xs font-medium rounded-md border hover:bg-gray-50"
                                style={{ borderColor: colors.border }}
                            >
                                Limpar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
                        </div>
                    </div>
                )}

                {/* Mensagem de Sucesso */}
                {sucesso && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-700">{sucesso}</p>
                    </div>
                )}

                {/* Card Principal */}
                <div className="bg-white rounded-lg border overflow-hidden">
                    {/* Informações do Documento Origem */}
                    <div className="p-4 border-b bg-gray-50">
                        <div className="flex items-start gap-2 text-sm">
                            <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                                <p className="font-medium">{documentoOrigem.numero_documento}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {documentoFiscalService.getTipoDocumentoNome(documentoOrigem.tipo_documento)} •
                                    Emitido em {formatarData(documentoOrigem.data_emissao)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Cliente: {documentoFiscalService.getNomeCliente(documentoOrigem)}
                                    {documentoFiscalService.getNifCliente(documentoOrigem) && ` • NIF: ${documentoFiscalService.getNifCliente(documentoOrigem)}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Motivo */}
                    <div className="p-4 border-b">
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                            Motivo <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder={`Informe o motivo da nota de ${isNC ? 'crédito' : 'débito'}...`}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                            style={{
                                borderColor: validationErrors?.motivo ? '#dc3545' : colors.border,
                                backgroundColor: colors.card,
                                color: colors.text
                            }}
                            rows={2}
                        />
                        {validationErrors?.motivo && (
                            <p className="text-xs text-red-600 mt-1">{validationErrors.motivo[0]}</p>
                        )}
                    </div>

                    {/* Itens */}
                    <div className="p-4 border-b">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.primary }}>
                            <Package className="w-4 h-4" />
                            Itens do Documento Origem
                        </h3>

                        {itens.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                <p className="text-sm text-yellow-700">Documento sem itens detalhados</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Descrição</th>
                                            <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Disp.</th>
                                            <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Selecionar</th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700 w-28">Preço Unit.</th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700 w-28">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {itens.map((item, index) => {
                                            const quantidadeOriginal = Number((item as any).quantidade_original) || 0;
                                            const quantidadeSelecionada = Number(item.quantidade) || 0;

                                            return (
                                                <tr key={item.id || index} className={quantidadeSelecionada > 0 ? 'bg-blue-50' : ''}>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium">{item.descricao}</div>
                                                        {item.codigo_produto && (
                                                            <div className="text-xs text-gray-500">Ref: {item.codigo_produto}</div>
                                                        )}
                                                        {item.eh_servico && (
                                                            <span className="text-xs text-blue-600">Serviço</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-gray-600">
                                                        {formatarQuantidade(quantidadeOriginal)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={quantidadeOriginal}
                                                            step="0.0001"
                                                            value={quantidadeSelecionada}
                                                            onChange={(e) => handleQuantidadeChange(index, parseFloat(e.target.value) || 0)}
                                                            className="w-20 px-2 py-1 border rounded text-center text-sm mx-auto block"
                                                            style={{ borderColor: colors.border }}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {formatarPreco(item.preco_unitario)}
                                                        {item.desconto ? Number(item.desconto) > 0 && (
                                                            <div className="text-xs text-green-600">-{item.desconto}%</div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {formatarPreco(item.total_linha)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {validationErrors?.['itens'] && (
                            <p className="text-xs text-red-600 mt-2">{validationErrors['itens'][0]}</p>
                        )}
                    </div>

                    {/* Observações */}
                    <div className="p-4 border-b">
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                            Observações (opcional)
                        </label>
                        <input
                            type="text"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Observações adicionais..."
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                            style={{
                                borderColor: colors.border,
                                backgroundColor: colors.card,
                                color: colors.text
                            }}
                        />
                    </div>

                    {/* Resumo */}
                    <div className="p-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.primary }}>
                            <CreditCard className="w-4 h-4" />
                            Resumo da {isNC ? 'Nota de Crédito' : 'Nota de Débito'}
                        </h3>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Itens selecionados:</span>
                                    <span className="font-medium">{totalItensSelecionados}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Base Tributável:</span>
                                    <span className="font-medium">{formatarPreco(baseTributavel)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total IVA:</span>
                                    <span className="font-medium">{formatarPreco(totalIva)}</span>
                                </div>
                                {totalRetencao > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Retenção:</span>
                                        <span className="font-medium text-red-600">-{formatarPreco(totalRetencao)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-3 text-base font-bold border-t" style={{ color: colors.secondary }}>
                                    <span>TOTAL:</span>
                                    <span>{formatarPreco(totalLiquido)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
                        style={{ borderColor: colors.border }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loadingSubmit || totalItensSelecionados === 0 || !motivo.trim()}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        style={{ backgroundColor: isNC ? '#dc3545' : '#ffc107' }}
                    >
                        {loadingSubmit ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Gerar Nota de {isNC ? 'Crédito' : 'Débito'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </MainEmpresa>
    );
}