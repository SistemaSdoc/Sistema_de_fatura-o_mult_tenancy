"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ReactNode, JSX } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    User,
    CreditCard,
    Banknote,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Edit3,
    Trash2,
    PlusCircle,
    MinusCircle,
    Link2,
    Copy,
    Loader2,
    Printer,
    Package,
    Receipt,
    ScrollText
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    formatarPreco,
    formatarData,
    formatarDataHora,
    getNomeTipoDocumento,
    getMetodoPagamentoNome
} from "@/services/vendas";

/* ==================== CONSTANTES ==================== */
const COLORS = {
    primary: '#123859',      // Azul escuro
    secondary: '#F9941F',    // Laranja âmbra
    background: '#F2F2F2',
    white: '#FFFFFF',
    text: '#333333',
    textLight: '#666666',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
};

/* ==================== COMPONENTE PRINCIPAL ==================== */
export default function VisualizarDocumentoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params?.id as string;
    const printRef = useRef<HTMLDivElement>(null);

    const [documento, setDocumento] = useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [acaoLoading, setAcaoLoading] = useState<string | null>(null);

    /* ==================== CARREGAR DOCUMENTO ==================== */
    const carregarDocumento = useCallback(async () => {
        if (!documentoId) {
            setError('ID do documento não fornecido');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await documentoFiscalService.obter(documentoId);

            if (!response || !response.data?.documento) {
                throw new Error('Documento não encontrado');
            }

            setDocumento(response.data.documento);
        } catch (err: Error | unknown) {
            const error = err instanceof Error ? err : new Error('Erro desconhecido');
            console.error('Erro ao carregar documento:', error);
            setError(error.message || 'Erro ao carregar documento');
        } finally {
            setLoading(false);
        }
    }, [documentoId]);

    useEffect(() => {
        carregarDocumento();
    }, [carregarDocumento]);

    /* ==================== HANDLERS DE AÇÕES ==================== */
    const handleGerarRecibo = () => documento && router.push(`/dashboard/Faturas/Faturas/${documento.id}/recibo`);
    const handleGerarNotaCredito = () => documento && router.push(`/dashboard/Faturas/Faturas/${documento.id}/nota-credito`);
    const handleGerarNotaDebito = () => documento && router.push(`/dashboard/Faturas/Faturas/${documento.id}/nota-debito`);
    const handleVincularAdiantamento = () => documento && router.push(`/dashboard/Faturas/Faturas/${documento.id}/vincular-adiantamento`);
    const handleConverterProforma = () => documento && router.push(`/dashboard/Faturas/Faturas/${documento.id}/converter`);

    const handleCancelar = async () => {
        if (!documento) return;
        if (!confirm('Tem certeza que deseja cancelar este documento?')) return;

        try {
            setAcaoLoading('cancelar');
            const motivo = prompt('Motivo do cancelamento:');
            if (!motivo) return;

            await documentoFiscalService.cancelar(documento.id, { motivo });
            await carregarDocumento();
        } catch (err: Error | unknown) {
            const error = err instanceof Error ? err : new Error('Erro desconhecido');
            alert(error.message || 'Erro ao cancelar documento');
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleImprimir = () => {
        setTimeout(() => window.print(), 100);
    };

    /* ==================== FUNÇÕES AUXILIARES ==================== */
    const getEstadoBadge = (estado: string) => {
        const config: Record<string, { bg: string; text: string; icon: ReactNode; label: string }> = {
            emitido: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-4 h-4" />, label: 'Emitido' },
            paga: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Pago' },
            parcialmente_paga: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Parcial' },
            cancelado: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-4 h-4" />, label: 'Cancelado' },
            expirado: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertTriangle className="w-4 h-4" />, label: 'Expirado' },
        };
        return config[estado] || config.emitido;
    };

    const getTipoIcone = (tipo: string) => {
        const icons: Record<string, JSX.Element> = {
            FT: <FileText className="w-5 h-5" />, FR: <FileText className="w-5 h-5" />, FP: <FileText className="w-5 h-5" />,
            FA: <CreditCard className="w-5 h-5" />, NC: <MinusCircle className="w-5 h-5" />, ND: <PlusCircle className="w-5 h-5" />,
            RC: <Banknote className="w-5 h-5" />, FRt: <Edit3 className="w-5 h-5" />,
        };
        return icons[tipo] || <FileText className="w-5 h-5" />;
    };

    const podeImprimir = useMemo(() => documento && ['FR', 'NC', 'ND', 'FT', 'RC'].includes(documento.tipo_documento), [documento]);
    const podeGerarRecibo = useMemo(() => documento && ['FT', 'FA'].includes(documento.tipo_documento) && ['emitido', 'parcialmente_paga'].includes(documento.estado), [documento]);
    const podeGerarNotaCredito = useMemo(() => documento && ['FT', 'FR'].includes(documento.tipo_documento) && documento.estado !== 'cancelado', [documento]);
    const podeGerarNotaDebito = useMemo(() => documento && ['FT', 'FR'].includes(documento.tipo_documento) && documento.estado !== 'cancelado', [documento]);
    const podeVincularAdiantamento = useMemo(() => documento && documento.tipo_documento === 'FT' && !['cancelado', 'paga'].includes(documento.estado), [documento]);
    const podeConverterProforma = useMemo(() => documento && documento.tipo_documento === 'FP' && documento.estado !== 'cancelado', [documento]);
    const podeCancelar = useMemo(() => documento && !['cancelado', 'expirado'].includes(documento.estado), [documento]);

    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-6 max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.secondary }} />
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
                            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                            style={{ backgroundColor: COLORS.primary }}
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
            {/* Estilos de impressão */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-only, .print-only * {
                        visibility: visible;
                    }
                    .print-only {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                    }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                }
                .print-only {
                    display: none;
                }
                @media print {
                    .print-only {
                        display: block;
                    }
                }
            `}</style>

            {/* Interface Principal - TUDO EM UMA ÚNICA PÁGINA */}
            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                {/* Header com ações */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            aria-label="Voltar"
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.primary }} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: COLORS.primary }}>
                                {getTipoIcone(documento.tipo_documento)}
                                {documento.numero_documento}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {getNomeTipoDocumento(documento.tipo_documento)} • {formatarData(documento.data_emissao)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {podeImprimir && (
                            <button
                                onClick={handleImprimir}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                                style={{ backgroundColor: COLORS.secondary, color: COLORS.white }}
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">Imprimir</span>
                            </button>
                        )}
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${estadoConfig.bg} ${estadoConfig.text}`}>
                            {estadoConfig.icon}
                            {estadoConfig.label}
                        </span>
                    </div>
                </div>

                {/* Ações Rápidas em Cards */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h2 className="text-sm font-medium text-gray-700 mb-3">Ações</h2>
                    <div className="flex flex-wrap gap-2">
                        {podeGerarRecibo && (
                            <button onClick={handleGerarRecibo} disabled={acaoLoading === 'recibo'}
                                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                                style={{ backgroundColor: COLORS.success }}>
                                {acaoLoading === 'recibo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                                Gerar Recibo
                            </button>
                        )}
                        {podeGerarNotaCredito && (
                            <button onClick={handleGerarNotaCredito} disabled={acaoLoading === 'nc'}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                                style={{ backgroundColor: COLORS.warning, color: '#212529' }}>
                                {acaoLoading === 'nc' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MinusCircle className="w-4 h-4" />}
                                Nota Crédito
                            </button>
                        )}
                        {podeGerarNotaDebito && (
                            <button onClick={handleGerarNotaDebito} disabled={acaoLoading === 'nd'}
                                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                                style={{ backgroundColor: COLORS.danger }}>
                                {acaoLoading === 'nd' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                Nota Débito
                            </button>
                        )}
                        {podeVincularAdiantamento && (
                            <button onClick={handleVincularAdiantamento} disabled={acaoLoading === 'vincular'}
                                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                                style={{ backgroundColor: '#6f42c1' }}>
                                {acaoLoading === 'vincular' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                Vincular Adiantamento
                            </button>
                        )}
                        {podeConverterProforma && (
                            <button onClick={handleConverterProforma} disabled={acaoLoading === 'converter'}
                                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                                style={{ backgroundColor: '#fd7e14' }}>
                                {acaoLoading === 'converter' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                Converter para Fatura
                            </button>
                        )}
                        {podeCancelar && (
                            <button onClick={handleCancelar} disabled={acaoLoading === 'cancelar'}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                                style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>
                                {acaoLoading === 'cancelar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTEÚDO ÚNICO - TUDO NUMA SÓ PÁGINA */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">

                    {/* SEÇÃO 1: Informações do Cliente */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: '8px' }}>
                            <User className="w-5 h-5" style={{ color: COLORS.secondary }} />
                            Cliente
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Nome</p>
                                <p className="font-medium">{nomeCliente}</p>
                            </div>
                            {nifCliente && (
                                <div>
                                    <p className="text-sm text-gray-600">NIF</p>
                                    <p className="font-medium">{nifCliente}</p>
                                </div>
                            )}
                            {documento.cliente?.endereco && (
                                <div>
                                    <p className="text-sm text-gray-600">Endereço</p>
                                    <p className="font-medium">{documento.cliente.endereco}</p>
                                </div>
                            )}
                            {documento.cliente?.telefone && (
                                <div>
                                    <p className="text-sm text-gray-600">Telefone</p>
                                    <p className="font-medium">{documento.cliente.telefone}</p>
                                </div>
                            )}
                            {documento.cliente?.email && (
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-medium">{documento.cliente.email}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SEÇÃO 2: Informações do Documento */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: '8px' }}>
                            <FileText className="w-5 h-5" style={{ color: COLORS.secondary }} />
                            Informações do Documento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Número</p>
                                <p className="font-medium">{documento.numero_documento}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Série</p>
                                <p className="font-medium">{documento.serie}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Emissão</p>
                                <p className="font-medium">{formatarDataHora(documento.data_emissao)}</p>
                            </div>
                            {documento.data_vencimento && (
                                <div>
                                    <p className="text-sm text-gray-600">Vencimento</p>
                                    <p className="font-medium">{formatarData(documento.data_vencimento)}</p>
                                </div>
                            )}
                            {documento.motivo && (
                                <div className="md:col-span-2">
                                    <p className="text-sm text-gray-600">Motivo</p>
                                    <p className="font-medium">{documento.motivo}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SEÇÃO 3: Pagamento (apenas para FR) */}
                    {documento.tipo_documento === 'FR' && documento.metodo_pagamento && (
                        <section>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: '8px' }}>
                                <CreditCard className="w-5 h-5" style={{ color: COLORS.secondary }} />
                                Pagamento
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Método</p>
                                    <p className="font-medium">{getMetodoPagamentoNome(documento.metodo_pagamento)}</p>
                                </div>
                                {documento.referencia_pagamento && (
                                    <div>
                                        <p className="text-sm text-gray-600">Referência</p>
                                        <p className="font-medium">{documento.referencia_pagamento}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* SEÇÃO 4: Itens do Documento */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: '8px' }}>
                            <Package className="w-5 h-5" style={{ color: COLORS.secondary }} />
                            Itens do Documento
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr style={{ backgroundColor: COLORS.primary, color: 'white' }}>
                                        <th className="px-4 py-2 text-left text-sm">Descrição</th>
                                        <th className="px-4 py-2 text-center text-sm">Qtd</th>
                                        <th className="px-4 py-2 text-right text-sm">Preço Unit.</th>
                                        <th className="px-4 py-2 text-right text-sm">Desconto</th>
                                        <th className="px-4 py-2 text-right text-sm">IVA</th>
                                        <th className="px-4 py-2 text-right text-sm">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {documento.itens?.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm">
                                                <div className="font-medium">{item.descricao}</div>
                                                {item.referencia && <div className="text-xs text-gray-500">Ref: {item.referencia}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-center text-sm">{item.quantidade}</td>
                                            <td className="px-4 py-2 text-right text-sm">{formatarPreco(item.preco_unitario)}</td>
                                            <td className="px-4 py-2 text-right text-sm text-red-600">
                                                {item.desconto ? formatarPreco(item.desconto) : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-right text-sm">{formatarPreco(item.valor_iva || 0)}</td>
                                            <td className="px-4 py-2 text-right text-sm font-bold" style={{ color: COLORS.primary }}>
                                                {formatarPreco(item.total_linha || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totais - abaixo da tabela de itens */}
                        <div className="mt-4 flex justify-end">
                            <div className="w-full md:w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Base Tributável:</span>
                                    <span className="font-medium">{formatarPreco(documento.base_tributavel)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">IVA:</span>
                                    <span className="font-medium">{formatarPreco(documento.total_iva)}</span>
                                </div>
                                {documento.total_retencao > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Retenção:</span>
                                        <span className="font-medium text-red-600">-{formatarPreco(documento.total_retencao)}</span>
                                    </div>
                                )}
                                <div className="border-t pt-2 mt-2">
                                    <div className="flex justify-between font-bold text-lg" style={{ color: COLORS.primary }}>
                                        <span>TOTAL:</span>
                                        <span>{formatarPreco(documento.total_liquido)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 5: Recibos (se houver) */}
                    {documento.recibos && documento.recibos.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: '8px' }}>
                                <Receipt className="w-5 h-5" style={{ color: COLORS.secondary }} />
                                Recibos ({documento.recibos.length})
                            </h3>
                            <div className="space-y-2">
                                {documento.recibos.map((recibo) => (
                                    <div
                                        key={recibo.id}
                                        className="bg-gray-50 rounded-lg p-3 flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/dashboard/Faturas/Faturas/${recibo.id}`)}
                                    >
                                        <div>
                                            <p className="font-medium" style={{ color: COLORS.primary }}>{recibo.numero_documento}</p>
                                            <p className="text-xs text-gray-600">
                                                {formatarData(recibo.data_emissao)} • {formatarPreco(recibo.total_liquido)}
                                            </p>
                                            {recibo.metodo_pagamento && (
                                                <p className="text-xs text-gray-500">Método: {getMetodoPagamentoNome(recibo.metodo_pagamento)}</p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${recibo.estado === 'paga' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {recibo.estado}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* SEÇÃO 6: Documentos Relacionados */}
                    {(documento.documento_origem ||
                        (documento.notas_credito && documento.notas_credito.length > 0) ||
                        (documento.notas_debito && documento.notas_debito.length > 0) ||
                        (documento.adiantamentos_vinculados && documento.adiantamentos_vinculados.length > 0) ||
                        (documento.faturas_vinculadas && documento.faturas_vinculadas.length > 0)) && (
                            <section>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: '8px' }}>
                                    <ScrollText className="w-5 h-5" style={{ color: COLORS.secondary }} />
                                    Documentos Relacionados
                                </h3>
                                <div className="space-y-4">
                                    {documento.documento_origem && (
                                        <DocumentoRelacionado
                                            titulo="Documento de Origem"
                                            documentos={[documento.documento_origem]}
                                            getTipoIcone={getTipoIcone}
                                            router={router}
                                        />
                                    )}
                                    {documento.notas_credito && documento.notas_credito.length > 0 && (
                                        <DocumentoRelacionado
                                            titulo="Notas de Crédito"
                                            documentos={documento.notas_credito}
                                            getTipoIcone={getTipoIcone}
                                            router={router}
                                            cor={COLORS.danger}
                                        />
                                    )}
                                    {documento.notas_debito && documento.notas_debito.length > 0 && (
                                        <DocumentoRelacionado
                                            titulo="Notas de Débito"
                                            documentos={documento.notas_debito}
                                            getTipoIcone={getTipoIcone}
                                            router={router}
                                            cor="#fd7e14"
                                        />
                                    )}
                                    {documento.adiantamentos_vinculados && documento.adiantamentos_vinculados.length > 0 && (
                                        <DocumentoRelacionado
                                            titulo="Adiantamentos Vinculados"
                                            documentos={documento.adiantamentos_vinculados}
                                            getTipoIcone={getTipoIcone}
                                            router={router}
                                            cor="#6f42c1"
                                        />
                                    )}
                                    {documento.faturas_vinculadas && documento.faturas_vinculadas.length > 0 && (
                                        <DocumentoRelacionado
                                            titulo="Faturas Vinculadas"
                                            documentos={documento.faturas_vinculadas}
                                            getTipoIcone={getTipoIcone}
                                            router={router}
                                            cor={COLORS.primary}
                                        />
                                    )}
                                </div>
                            </section>
                        )}

                    {/* Hash Fiscal */}
                    {documento.hash_fiscal && (
                        <div className="text-xs text-gray-400 break-all pt-4 border-t">
                            <span className="font-medium">Hash Fiscal:</span> {documento.hash_fiscal}
                        </div>
                    )}
                </div>
            </div>
        </MainEmpresa>
    );
}

/* ==================== COMPONENTE AUXILIAR ==================== */
interface DocumentoRelacionadoProps {
    titulo: string;
    documentos: DocumentoFiscal[];
    getTipoIcone: (tipo: string) => JSX.Element;
    router: ReturnType<typeof useRouter>;
    cor?: string;
}

const DocumentoRelacionado = ({ titulo, documentos, getTipoIcone, router, cor }: DocumentoRelacionadoProps) => {
    if (!documentos || documentos.length === 0) return null;

    return (
        <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">{titulo}</h4>
            <div className="space-y-2">
                {documentos.map((doc: DocumentoFiscal) => (
                    <div
                        key={doc.id}
                        className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/Faturas/Faturas/${doc.id}`)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {getTipoIcone(doc.tipo_documento)}
                                <div>
                                    <p className="font-medium" style={{ color: cor || COLORS.primary }}>{doc.numero_documento}</p>
                                    <p className="text-xs text-gray-600">{getNomeTipoDocumento(doc.tipo_documento)} • {formatarData(doc.data_emissao)}</p>
                                </div>
                            </div>
                            <span className="font-medium" style={{ color: cor || COLORS.primary }}>{formatarPreco(doc.total_liquido)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};