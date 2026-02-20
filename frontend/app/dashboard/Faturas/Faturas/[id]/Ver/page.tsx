"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    Calendar,
    User,
    Package,
    CreditCard,
    Banknote,
    Smartphone,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Download,
    Printer,
    Mail,
    Edit3,
    Trash2,
    PlusCircle,
    MinusCircle,
    Link2,
    Copy,
    Loader2
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    ItemDocumento,
    formatarPreco,
    formatarData,
    formatarDataHora,
    getNomeTipoDocumento,
    getEstadoDocumentoColor,
    getMetodoPagamentoNome
} from "@/services/vendas";

type TabType = 'detalhes' | 'itens' | 'recibos' | 'documentos-relacionados';

export default function VisualizarDocumentoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params?.id as string;

    const [documento, setDocumento] = useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('detalhes');
    const [acaoLoading, setAcaoLoading] = useState<string | null>(null);

    const carregarDocumento = useCallback(async () => {
        if (!documentoId) {
            setError('ID do documento não fornecido');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log('Carregando documento:', documentoId);

            // Verificar se o serviço existe
            if (!documentoFiscalService) {
                throw new Error('Serviço de documentos não disponível');
            }

            // Usar o método correto - pode ser obter() ou buscarPorId()
            let doc;
            if (typeof documentoFiscalService.buscarPorId === 'function') {
                doc = await documentoFiscalService.buscarPorId(documentoId);
            } else if (typeof documentoFiscalService.obter === 'function') {
                const response = await documentoFiscalService.obter(documentoId);
                doc = response?.data?.documento;
            } else {
                throw new Error('Método de busca não encontrado no serviço');
            }

            if (!doc) {
                throw new Error('Documento não encontrado');
            }

            setDocumento(doc);
        } catch (err: any) {
            console.error('Erro ao carregar documento:', err);
            setError(err?.message || 'Erro ao carregar documento');
        } finally {
            setLoading(false);
        }
    }, [documentoId]);

    useEffect(() => {
        carregarDocumento();
    }, [carregarDocumento]);

    const handleGerarRecibo = async () => {
        if (!documento) return;

        try {
            setAcaoLoading('recibo');
            router.push(`/dashboard/Faturas/Faturas/${documento.id}/recibo`);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleGerarNotaCredito = async () => {
        if (!documento) return;

        try {
            setAcaoLoading('nc');
            router.push(`/dashboard/Faturas/Faturas/${documento.id}/nota-credito`);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleGerarNotaDebito = async () => {
        if (!documento) return;

        try {
            setAcaoLoading('nd');
            router.push(`/dashboard/Faturas/Faturas/${documento.id}/nota-debito`);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleVincularAdiantamento = async () => {
        if (!documento) return;

        try {
            setAcaoLoading('vincular');
            router.push(`/dashboard/Faturas/Faturas/${documento.id}/vincular-adiantamento`);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleConverterProforma = async () => {
        if (!documento) return;

        try {
            setAcaoLoading('converter');
            router.push(`/dashboard/Faturas/Faturas/${documento.id}/converter`);
        } catch (err) {
            console.error('Erro:', err);
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleCancelar = async () => {
        if (!documento) return;

        if (!confirm('Tem certeza que deseja cancelar este documento?')) return;

        try {
            setAcaoLoading('cancelar');
            const motivo = prompt('Motivo do cancelamento:');
            if (!motivo) return;

            if (typeof documentoFiscalService.cancelar === 'function') {
                await documentoFiscalService.cancelar(documento.id, { motivo });
            } else {
                throw new Error('Método de cancelamento não disponível');
            }

            await carregarDocumento();
        } catch (err: any) {
            console.error('Erro ao cancelar:', err);
            alert(err?.message || 'Erro ao cancelar documento');
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleImprimir = () => {
        window.print();
    };

    const getEstadoBadge = (estado: string) => {
        const config: Record<string, { bg: string; text: string; icon: JSX.Element; label: string }> = {
            emitido: {
                bg: 'bg-blue-100',
                text: 'text-blue-700',
                icon: <Clock className="w-4 h-4" />,
                label: 'Emitido'
            },
            paga: {
                bg: 'bg-green-100',
                text: 'text-green-700',
                icon: <CheckCircle2 className="w-4 h-4" />,
                label: 'Pago'
            },
            parcialmente_paga: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-700',
                icon: <AlertTriangle className="w-4 h-4" />,
                label: 'Parcial'
            },
            cancelado: {
                bg: 'bg-red-100',
                text: 'text-red-700',
                icon: <XCircle className="w-4 h-4" />,
                label: 'Cancelado'
            },
            expirado: {
                bg: 'bg-gray-100',
                text: 'text-gray-700',
                icon: <AlertTriangle className="w-4 h-4" />,
                label: 'Expirado'
            },
        };
        return config[estado] || config.emitido;
    };

    const getTipoIcone = (tipo: string) => {
        const icons: Record<string, JSX.Element> = {
            FT: <FileText className="w-5 h-5" />,
            FR: <FileText className="w-5 h-5" />,
            FP: <FileText className="w-5 h-5" />,
            FA: <CreditCard className="w-5 h-5" />,
            NC: <MinusCircle className="w-5 h-5" />,
            ND: <PlusCircle className="w-5 h-5" />,
            RC: <Banknote className="w-5 h-5" />,
            FRt: <Edit3 className="w-5 h-5" />,
        };
        return icons[tipo] || <FileText className="w-5 h-5" />;
    };

    const podeGerarRecibo = useMemo(() => {
        return documento && ['FT', 'FA'].includes(documento.tipo_documento) &&
            ['emitido', 'parcialmente_paga'].includes(documento.estado);
    }, [documento]);

    const podeGerarNotaCredito = useMemo(() => {
        return documento && ['FT', 'FR'].includes(documento.tipo_documento) &&
            !['cancelado'].includes(documento.estado);
    }, [documento]);

    const podeGerarNotaDebito = useMemo(() => {
        return documento && ['FT', 'FR'].includes(documento.tipo_documento) &&
            !['cancelado'].includes(documento.estado);
    }, [documento]);

    const podeVincularAdiantamento = useMemo(() => {
        return documento && documento.tipo_documento === 'FT' &&
            !['cancelado', 'paga'].includes(documento.estado);
    }, [documento]);

    const podeConverterProforma = useMemo(() => {
        return documento && documento.tipo_documento === 'FP' &&
            !['cancelado'].includes(documento.estado);
    }, [documento]);

    const podeCancelar = useMemo(() => {
        return documento && !['cancelado', 'expirado'].includes(documento.estado);
    }, [documento]);

    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-6 max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-[#F9941F]" />
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    if (error || !documento) {
        return (
            <MainEmpresa>
                <div className="p-6 max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-700 text-lg font-medium mb-2">Erro ao carregar documento</p>
                        <p className="text-red-600 mb-4">{error || 'Documento não encontrado'}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    const estadoConfig = getEstadoBadge(documento.estado);
    const nomeCliente = documento.cliente?.nome || documento.cliente_nome || 'Consumidor Final';
    const nifCliente = documento.cliente?.nif || documento.cliente_nif;

    return (
        <MainEmpresa>
            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#123859]" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-[#123859] flex items-center gap-2">
                                {getTipoIcone(documento.tipo_documento)}
                                {documento.numero_documento}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {getNomeTipoDocumento(documento.tipo_documento)} • {formatarData(documento.data_emissao)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${estadoConfig.bg} ${estadoConfig.text}`}>
                            {estadoConfig.icon}
                            {estadoConfig.label}
                        </span>
                    </div>
                </div>

                {/* Ações Rápidas */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h2 className="text-sm font-medium text-gray-700 mb-3">Ações</h2>
                    <div className="flex flex-wrap gap-2">

                        {podeGerarRecibo && (
                            <button
                                onClick={handleGerarRecibo}
                                disabled={acaoLoading === 'recibo'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {acaoLoading === 'recibo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                                Gerar Recibo
                            </button>
                        )}

                        {podeGerarNotaCredito && (
                            <button
                                onClick={handleGerarNotaCredito}
                                disabled={acaoLoading === 'nc'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                            >
                                {acaoLoading === 'nc' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MinusCircle className="w-4 h-4" />}
                                Nota Crédito
                            </button>
                        )}

                        {podeGerarNotaDebito && (
                            <button
                                onClick={handleGerarNotaDebito}
                                disabled={acaoLoading === 'nd'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {acaoLoading === 'nd' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                Nota Débito
                            </button>
                        )}

                        {podeVincularAdiantamento && (
                            <button
                                onClick={handleVincularAdiantamento}
                                disabled={acaoLoading === 'vincular'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                {acaoLoading === 'vincular' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                Vincular Adiantamento
                            </button>
                        )}

                        {podeConverterProforma && (
                            <button
                                onClick={handleConverterProforma}
                                disabled={acaoLoading === 'converter'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                            >
                                {acaoLoading === 'converter' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                Converter para Fatura
                            </button>
                        )}

                        {podeCancelar && (
                            <button
                                onClick={handleCancelar}
                                disabled={acaoLoading === 'cancelar'}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                                {acaoLoading === 'cancelar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex gap-4 overflow-x-auto pb-1">
                        <button
                            onClick={() => setActiveTab('detalhes')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'detalhes'
                                    ? 'border-[#F9941F] text-[#F9941F]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Detalhes
                        </button>
                        <button
                            onClick={() => setActiveTab('itens')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'itens'
                                    ? 'border-[#F9941F] text-[#F9941F]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Itens ({documento.itens?.length || 0})
                        </button>
                        {(documento.tipo_documento === 'FT' || documento.tipo_documento === 'FA') && (
                            <button
                                onClick={() => setActiveTab('recibos')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'recibos'
                                        ? 'border-[#F9941F] text-[#F9941F]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Recibos ({documento.recibos?.length || 0})
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('documentos-relacionados')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documentos-relacionados'
                                    ? 'border-[#F9941F] text-[#F9941F]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Documentos Relacionados
                        </button>
                    </nav>
                </div>

                {/* Conteúdo das Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {activeTab === 'detalhes' && (
                        <div className="space-y-6">
                            {/* Informações do Cliente */}
                            <div>
                                <h3 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Cliente
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="font-medium">{nomeCliente}</p>
                                    {nifCliente && <p className="text-sm text-gray-600 mt-1">NIF: {nifCliente}</p>}
                                    {documento.cliente?.endereco && (
                                        <p className="text-sm text-gray-600 mt-1">{documento.cliente.endereco}</p>
                                    )}
                                    {documento.cliente?.telefone && (
                                        <p className="text-sm text-gray-600 mt-1">Tel: {documento.cliente.telefone}</p>
                                    )}
                                    {documento.cliente?.email && (
                                        <p className="text-sm text-gray-600 mt-1">Email: {documento.cliente.email}</p>
                                    )}
                                </div>
                            </div>

                            {/* Informações do Documento */}
                            <div>
                                <h3 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Informações do Documento
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600">Número</p>
                                        <p className="font-medium">{documento.numero_documento}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600">Série</p>
                                        <p className="font-medium">{documento.serie}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-600">Data de Emissão</p>
                                        <p className="font-medium">{formatarDataHora(documento.data_emissao)}</p>
                                    </div>
                                    {documento.data_vencimento && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-600">Data de Vencimento</p>
                                            <p className="font-medium">{formatarData(documento.data_vencimento)}</p>
                                        </div>
                                    )}
                                    {documento.motivo && (
                                        <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                                            <p className="text-sm text-gray-600">Motivo</p>
                                            <p className="font-medium">{documento.motivo}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Informações de Pagamento (para FR) */}
                            {documento.tipo_documento === 'FR' && documento.metodo_pagamento && (
                                <div>
                                    <h3 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
                                        <CreditCard className="w-5 h-5" />
                                        Pagamento
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-600">Método</p>
                                            <p className="font-medium capitalize">{getMetodoPagamentoNome(documento.metodo_pagamento)}</p>
                                        </div>
                                        {documento.referencia_pagamento && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm text-gray-600">Referência</p>
                                                <p className="font-medium">{documento.referencia_pagamento}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Totais */}
                            <div>
                                <h3 className="text-lg font-semibold text-[#123859] mb-4">Totais</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Base Tributável:</span>
                                        <span className="font-medium">{formatarPreco(documento.base_tributavel)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">IVA:</span>
                                        <span className="font-medium">{formatarPreco(documento.total_iva)}</span>
                                    </div>
                                    {documento.total_retencao > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Retenção:</span>
                                            <span className="font-medium text-red-600">-{formatarPreco(documento.total_retencao)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-[#123859] border-t pt-2 mt-2">
                                        <span>TOTAL:</span>
                                        <span>{formatarPreco(documento.total_liquido)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Hash Fiscal */}
                            {documento.hash_fiscal && (
                                <div className="text-xs text-gray-400 break-all">
                                    <p className="font-medium">Hash Fiscal:</p>
                                    <p>{documento.hash_fiscal}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'itens' && (
                        <div>
                            <h3 className="text-lg font-semibold text-[#123859] mb-4">Itens do Documento</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Produto</th>
                                            <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Qtd</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Preço Unit.</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Desc.</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">IVA</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {documento.itens?.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium">{item.descricao}</div>
                                                    {item.codigo_produto && (
                                                        <div className="text-xs text-gray-500">Cód: {item.codigo_produto}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm">{item.quantidade}</td>
                                                <td className="px-4 py-3 text-right text-sm">{formatarPreco(item.preco_unitario)}</td>
                                                <td className="px-4 py-3 text-right text-sm text-red-600">
                                                    {item.desconto ? formatarPreco(item.desconto) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm">{formatarPreco(item.valor_iva || 0)}</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-[#123859]">
                                                    {formatarPreco(item.total_linha || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'recibos' && (documento.tipo_documento === 'FT' || documento.tipo_documento === 'FA') && (
                        <div>
                            <h3 className="text-lg font-semibold text-[#123859] mb-4">Recibos</h3>
                            {documento.recibos && documento.recibos.length > 0 ? (
                                <div className="space-y-3">
                                    {documento.recibos.map((recibo) => (
                                        <div
                                            key={recibo.id}
                                            className="bg-gray-50 rounded-lg p-4 flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/dashboard/Faturas/Faturas/${recibo.id}`)}
                                        >
                                            <div>
                                                <p className="font-medium text-[#123859]">{recibo.numero_documento}</p>
                                                <p className="text-sm text-gray-600">
                                                    {formatarData(recibo.data_emissao)} • {formatarPreco(recibo.total_liquido)}
                                                </p>
                                                {recibo.metodo_pagamento && (
                                                    <p className="text-xs text-gray-500 mt-1">Método: {getMetodoPagamentoNome(recibo.metodo_pagamento)}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${recibo.estado === 'paga' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {recibo.estado}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Nenhum recibo encontrado</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'documentos-relacionados' && (
                        <div className="space-y-6">
                            {/* Documento de Origem */}
                            {documento.documentoOrigem && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">Documento de Origem</h4>
                                    <div
                                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/dashboard/Faturas/Faturas/${documento.documentoOrigem?.id}`)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {getTipoIcone(documento.documentoOrigem.tipo_documento)}
                                            <div>
                                                <p className="font-medium text-[#123859]">{documento.documentoOrigem.numero_documento}</p>
                                                <p className="text-sm text-gray-600">
                                                    {getNomeTipoDocumento(documento.documentoOrigem.tipo_documento)} • {formatarData(documento.documentoOrigem.data_emissao)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notas de Crédito */}
                            {documento.notasCredito && documento.notasCredito.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">Notas de Crédito</h4>
                                    <div className="space-y-2">
                                        {documento.notasCredito.map((nc) => (
                                            <div
                                                key={nc.id}
                                                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                                onClick={() => router.push(`/dashboard/Faturas/Faturas/${nc.id}`)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <MinusCircle className="w-4 h-4 text-red-600" />
                                                        <div>
                                                            <p className="font-medium text-[#123859]">{nc.numero_documento}</p>
                                                            <p className="text-sm text-gray-600">{formatarData(nc.data_emissao)}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-medium text-red-600">{formatarPreco(nc.total_liquido)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas de Débito */}
                            {documento.notasDebito && documento.notasDebito.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">Notas de Débito</h4>
                                    <div className="space-y-2">
                                        {documento.notasDebito.map((nd) => (
                                            <div
                                                key={nd.id}
                                                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                                onClick={() => router.push(`/dashboard/Faturas/Faturas/${nd.id}`)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <PlusCircle className="w-4 h-4 text-orange-600" />
                                                        <div>
                                                            <p className="font-medium text-[#123859]">{nd.numero_documento}</p>
                                                            <p className="text-sm text-gray-600">{formatarData(nd.data_emissao)}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-medium text-orange-600">{formatarPreco(nd.total_liquido)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Adiantamentos Vinculados */}
                            {documento.faturasAdiantamento && documento.faturasAdiantamento.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">Adiantamentos Vinculados</h4>
                                    <div className="space-y-2">
                                        {documento.faturasAdiantamento.map((fa) => (
                                            <div
                                                key={fa.id}
                                                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                                onClick={() => router.push(`/dashboard/Faturas/Faturas/${fa.id}`)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="w-4 h-4 text-purple-600" />
                                                        <div>
                                                            <p className="font-medium text-[#123859]">{fa.numero_documento}</p>
                                                            <p className="text-sm text-gray-600">{formatarData(fa.data_emissao)}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-medium text-purple-600">{formatarPreco(fa.total_liquido)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!documento.documentoOrigem &&
                                (!documento.notasCredito || documento.notasCredito.length === 0) &&
                                (!documento.notasDebito || documento.notasDebito.length === 0) &&
                                (!documento.faturasAdiantamento || documento.faturasAdiantamento.length === 0) && (
                                    <p className="text-center text-gray-500 py-8">Nenhum documento relacionado</p>
                                )}
                        </div>
                    )}
                </div>
            </div>
        </MainEmpresa>
    );
}