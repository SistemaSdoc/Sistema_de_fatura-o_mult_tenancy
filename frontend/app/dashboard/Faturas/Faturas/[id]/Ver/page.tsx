"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    User,
    CreditCard,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Loader2,
    Info,
    MinusCircle,
    PlusCircle,
    Building2,
    Hash,
    Calendar,
    Phone,
    Mail,
    Download
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    TipoDocumento,
    ItemDocumento
} from "@/services/DocumentoFiscal";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";

/* ==================== CONSTANTES ==================== */
const TIPO_LABEL: Record<TipoDocumento, string> = {
    'FT': 'Fatura',
    'FR': 'Fatura-Recibo',
    'FP': 'Fatura Proforma',
    'FA': 'Fatura de Adiantamento',
    'NC': 'Nota de Crédito',
    'ND': 'Nota de Débito',
    'RC': 'Recibo',
    'FRt': 'Fatura de Retificação'
};

const METODO_PAGAMENTO_LABEL: Record<string, string> = {
    'transferencia': 'Transferência Bancária',
    'multibanco': 'Multibanco',
    'dinheiro': 'Dinheiro',
    'cheque': 'Cheque',
    'cartao': 'Cartão'
};

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

const formatarDataHora = (data: string | undefined | null): string => {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-AO');
};

/* ==================== COMPONENTES ==================== */

const EstadoBadge = ({ estado }: { estado: string }) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
        emitido: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" />, label: 'Emitido' },
        paga: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Pago' },
        parcialmente_paga: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <AlertTriangle className="w-3 h-3" />, label: 'Parcial' },
        cancelado: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Cancelado' },
        expirado: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertTriangle className="w-3 h-3" />, label: 'Expirado' },
    };
    const { bg, text, icon, label } = config[estado] || config.emitido;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
            {icon}
            {label}
        </span>
    );
};

const CompactCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>{children}</div>
);

const CardHeader = ({
    title,
    icon,
    action,
}: {
    title: string;
    icon: React.ReactNode;
    action?: React.ReactNode;
}) => (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50 rounded-t-lg">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-md shadow-sm" style={{ color: '#123859' }}>
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {action && <div>{action}</div>}
    </div>
);

const InfoGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">{children}</div>
);

const InfoItem = ({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
}) => (
    <div className="flex flex-col">
        <span className="text-xs text-gray-500 mb-0.5">{label}</span>
        <span className={`font-medium ${highlight ? 'text-base' : 'text-sm'} text-gray-900`}>
            {value || '-'}
        </span>
    </div>
);

const ItensTable = ({ itens }: { itens: ItemDocumento[] }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
                <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 w-full">Descrição</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-700 whitespace-nowrap">Qtd</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">Preço</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">IVA</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {itens.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{item.descricao}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                {item.codigo_produto && <span>Ref: {item.codigo_produto}</span>}
                                {item.eh_servico && <span className="text-blue-600">• Serviço</span>}
                            </div>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">{Number(item.quantidade || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatarPreco(item.preco_unitario)}</td>
                        <td className="px-3 py-2 text-right text-gray-600 tabular-nums">{Number(item.taxa_iva || 0).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: '#F9941F' }}>
                            {formatarPreco(item.total_linha)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ValoresResumo = ({
    valores,
}: {
    valores: { base: number; iva: number; retencao: number; total: number };
}) => {
    const percentualIva = valores.base > 0 ? (valores.iva / valores.base) * 100 : 0;
    const percentualRet = valores.base > 0 ? (valores.retencao / valores.base) * 100 : 0;

    return (
        <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-1">
                <span className="text-gray-600">Base Tributável</span>
                <span className="font-medium tabular-nums">{formatarPreco(valores.base)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
                <span className="text-gray-600">IVA ({percentualIva.toFixed(1)}%)</span>
                <span className="font-medium tabular-nums">{formatarPreco(valores.iva)}</span>
            </div>
            {valores.retencao > 0 && (
                <div className="flex justify-between items-center py-1 text-red-600">
                    <span>Retenção ({percentualRet.toFixed(1)}%)</span>
                    <span className="font-medium tabular-nums">-{formatarPreco(valores.retencao)}</span>
                </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">TOTAL</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: '#F9941F' }}>
                    {formatarPreco(valores.total)}
                </span>
            </div>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

/* ==================== COMPONENTE PRINCIPAL ==================== */
export default function VisualizarDocumentoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params?.id as string;
    const colors = useThemeColors();
    const { user } = useAuth();

    const [documento, setDocumento] = useState<DocumentoFiscal | null>(null);
    const [faturaOrigem, setFaturaOrigem] = useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingOrigem, setLoadingOrigem] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorOrigem, setErrorOrigem] = useState<string | null>(null);
    const [acaoLoading, setAcaoLoading] = useState<string | null>(null);
    const [baixandoPdf, setBaixandoPdf] = useState(false);

    /* ==================== CARREGAR DADOS ==================== */
    const carregarFaturaOrigem = useCallback(async (doc: DocumentoFiscal) => {
        const origemId = doc.fatura_id || doc.documentoOrigem?.id;
        if (!origemId) return;

        try {
            setLoadingOrigem(true);
            setErrorOrigem(null);
            const origem = await documentoFiscalService.buscarPorId(origemId);
            setFaturaOrigem(origem);
        } catch (err) {
            console.error('Erro ao carregar fatura origem:', err);
            setErrorOrigem('Não foi possível carregar a fatura de origem');
        } finally {
            setLoadingOrigem(false);
        }
    }, []);

    const carregarDocumento = useCallback(async () => {
        if (!documentoId) {
            setError('ID do documento não fornecido');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const doc = await documentoFiscalService.buscarPorId(documentoId);
            setDocumento(doc);

            if (doc.tipo_documento === 'RC' && (doc.fatura_id || doc.documentoOrigem?.id)) {
                await carregarFaturaOrigem(doc);
            }
        } catch (err) {
            console.error('Erro ao carregar documento:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar documento');
        } finally {
            setLoading(false);
        }
    }, [documentoId, carregarFaturaOrigem]);

    useEffect(() => {
        carregarDocumento();
    }, [carregarDocumento]);

    /* ==================== HELPERS ==================== */
    const itensParaExibir = useMemo(() => {
        if (!documento) return [];
        if (documento.tipo_documento === 'RC' && faturaOrigem?.itens) return faturaOrigem.itens;
        return documento.itens || [];
    }, [documento, faturaOrigem]);

    const valoresTotais = useMemo(() => {
        if (!documento) return { base: 0, iva: 0, retencao: 0, total: 0 };
        const src = faturaOrigem ?? documento;
        return {
            base: src.base_tributavel || 0,
            iva: src.total_iva || 0,
            retencao: src.total_retencao || 0,
            total: src.total_liquido || 0,
        };
    }, [documento, faturaOrigem]);

    const podeGerarNota = useMemo(() => {
        if (!documento || documento.estado === 'cancelado') return false;
        if (documento.tipo_documento === 'RC') return !!faturaOrigem?.itens?.length;
        return ['FT', 'FR'].includes(documento.tipo_documento) && itensParaExibir.length > 0;
    }, [documento, faturaOrigem, itensParaExibir]);

    const podeCancelar = useMemo(
        () => documento && documentoFiscalService.podeCancelar(documento),
        [documento]
    );

    /* ==================== HANDLERS ==================== */
    const handleCancelar = async () => {
        if (!documento) return;
        const motivo = prompt('Motivo do cancelamento:');
        if (!motivo) return;

        try {
            setAcaoLoading('cancelar');
            await documentoFiscalService.cancelar(documento.id, { motivo });
            await carregarDocumento();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erro ao cancelar');
        } finally {
            setAcaoLoading(null);
        }
    };

    const handleGerarNota = (tipo: 'NC' | 'ND') => {
        router.push(`/dashboard/Faturas/Faturas/id/novo?tipo=${tipo}&origem=${documento?.id}`);
    };

    /**
     * Download do PDF via backend (DomPDF).
     * GET /api/documentos-fiscais/{id}/pdf/download
     */
    const handleDownloadPDF = async () => {
        if (!documento?.id) return;
        try {
            setBaixandoPdf(true);
            const nomeArquivo = `${documento.tipo_documento}_${documento.numero_documento || documento.id}.pdf`;
            await documentoFiscalService.downloadPdf(documento.id, nomeArquivo);
        } catch (err) {
            console.error('Erro ao baixar PDF:', err);
            alert('Erro ao baixar PDF. Tente novamente.');
        } finally {
            setBaixandoPdf(false);
        }
    };

    /* ==================== RENDER ==================== */
    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-7xl mx-auto">
                    <SkeletonLoader />
                </div>
            </MainEmpresa>
        );
    }

    if (error || !documento) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-7xl mx-auto">
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

    const nomeCliente = documentoFiscalService.getNomeCliente(documento);
    const nifCliente = documentoFiscalService.getNifCliente(documento);
    const nomeEmissor = documento.user?.name || user?.name || 'Sistema';

    return (
        <MainEmpresa>
            <div className="p-4 max-w-7xl mx-auto space-y-4">

                {/* Header Principal */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" style={{ color: colors.primary }} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-xl font-bold text-gray-900">
                                    {documento.numero_documento}
                                </h1>
                                <EstadoBadge estado={documento.estado} />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{TIPO_LABEL[documento.tipo_documento]}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatarData(documento.data_emissao)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        {/* Download PDF */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={baixandoPdf}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            title="Download PDF"
                        >
                            {baixandoPdf
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />
                            }
                            <span>PDF</span>
                        </button>

                        {podeGerarNota && (
                            <>
                                <button
                                    onClick={() => handleGerarNota('NC')}
                                    disabled={acaoLoading === 'nc'}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                                >
                                    {acaoLoading === 'nc'
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <MinusCircle className="w-3 h-3" />
                                    }
                                    NC
                                </button>
                                <button
                                    onClick={() => handleGerarNota('ND')}
                                    disabled={acaoLoading === 'nd'}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
                                >
                                    {acaoLoading === 'nd'
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <PlusCircle className="w-3 h-3" />
                                    }
                                    ND
                                </button>
                            </>
                        )}

                        {podeCancelar && (
                            <button
                                onClick={handleCancelar}
                                disabled={acaoLoading === 'cancelar'}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                                {acaoLoading === 'cancelar'
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <XCircle className="w-3 h-3" />
                                }
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>

                {/* Grid Principal — 3 Colunas em Desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Coluna Esquerda */}
                    <div className="space-y-4">
                        <CompactCard>
                            <CardHeader title="Documento" icon={<FileText className="w-4 h-4" />} />
                            <div className="p-4">
                                <InfoGrid>
                                    <InfoItem label="Tipo" value={TIPO_LABEL[documento.tipo_documento]} />
                                    <InfoItem label="Série" value={documento.serie} />
                                    <InfoItem label="Data Emissão" value={formatarDataHora(documento.data_emissao)} />
                                    <InfoItem
                                        label="Vencimento"
                                        value={documento.data_vencimento ? formatarData(documento.data_vencimento) : '-'}
                                    />
                                </InfoGrid>
                            </div>
                        </CompactCard>

                        <CompactCard>
                            <CardHeader title="Cliente" icon={<User className="w-4 h-4" />} />
                            <div className="p-4 space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Nome</p>
                                    <p className="font-semibold text-gray-900">{nomeCliente}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    {nifCliente && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                            <span>NIF: {nifCliente}</span>
                                        </div>
                                    )}
                                    {documento.cliente?.telefone && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span>{documento.cliente.telefone}</span>
                                        </div>
                                    )}
                                    {documento.cliente?.email && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{documento.cliente.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CompactCard>

                        <CompactCard>
                            <CardHeader title="Emissão" icon={<Building2 className="w-4 h-4" />} />
                            <div className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{nomeEmissor}</p>
                                        <p className="text-xs text-gray-500">Emitido por</p>
                                    </div>
                                </div>
                            </div>
                        </CompactCard>
                    </div>

                    {/* Coluna Central — Itens */}
                    <div className="lg:col-span-2 space-y-4">
                        <CompactCard className="h-full">
                            <CardHeader
                                title={`Itens ${documento.tipo_documento === 'RC' && faturaOrigem ? `• ${faturaOrigem.numero_documento}` : ''}`}
                                icon={<FileText className="w-4 h-4" />}
                            />
                            <div className="p-0">
                                {itensParaExibir.length > 0 ? (
                                    <ItensTable itens={itensParaExibir} />
                                ) : (
                                    <div className="p-8 text-center">
                                        <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Documento sem itens detalhados</p>
                                    </div>
                                )}
                            </div>
                        </CompactCard>
                    </div>
                </div>

                {/* Grid Inferior */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Resumo de Valores */}
                    <CompactCard>
                        <CardHeader title="Resumo Financeiro" icon={<CreditCard className="w-4 h-4" />} />
                        <div className="p-4">
                            <ValoresResumo valores={valoresTotais} />
                        </div>
                    </CompactCard>

                    {/* Pagamento & Hash */}
                    {(documento.metodo_pagamento || documento.hash_fiscal) && (
                        <CompactCard>
                            <CardHeader title="Pagamento & Autenticação" icon={<CreditCard className="w-4 h-4" />} />
                            <div className="p-4 space-y-3">
                                {documento.metodo_pagamento && (
                                    <div className="space-y-2">
                                        <InfoItem
                                            label="Método"
                                            value={METODO_PAGAMENTO_LABEL[documento.metodo_pagamento] || documento.metodo_pagamento}
                                        />
                                        {documento.referencia_pagamento && (
                                            <InfoItem label="Referência" value={documento.referencia_pagamento} />
                                        )}
                                    </div>
                                )}
                                {documento.hash_fiscal && (
                                    <div className="pt-3 border-t">
                                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                            <Hash className="w-3 h-3" />
                                            Hash Fiscal
                                        </p>
                                        <p className="text-xs font-mono text-gray-700 break-all bg-gray-50 p-2 rounded">
                                            {documento.hash_fiscal}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CompactCard>
                    )}

                    {/* Observações & Referências */}
                    <CompactCard className="lg:col-span-1">
                        <CardHeader title="Observações & Referências" icon={<Info className="w-4 h-4" />} />
                        <div className="p-4 space-y-3">
                            {documento.observacoes ? (
                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                    {documento.observacoes}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Sem observações</p>
                            )}

                            {documento.tipo_documento === 'RC' && (
                                <div className="pt-2 border-t">
                                    {loadingOrigem ? (
                                        <div className="flex items-center gap-2 text-sm text-blue-600">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Carregando origem...
                                        </div>
                                    ) : errorOrigem ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-red-600">{errorOrigem}</span>
                                            <button
                                                onClick={() => carregarFaturaOrigem(documento)}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Tentar novamente
                                            </button>
                                        </div>
                                    ) : faturaOrigem ? (
                                        <div className="text-sm">
                                            <span className="text-gray-500">Referente a: </span>
                                            <button
                                                onClick={() => router.push(`/dashboard/Faturas/Faturas/${faturaOrigem.id}`)}
                                                className="font-medium hover:underline"
                                                style={{ color: colors.primary }}
                                            >
                                                {faturaOrigem.numero_documento}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </CompactCard>
                </div>
            </div>
        </MainEmpresa>
    );
}