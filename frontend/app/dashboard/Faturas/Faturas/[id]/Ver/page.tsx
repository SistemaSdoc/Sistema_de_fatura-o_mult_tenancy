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
    Printer
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
    primary: '#123859',      // Azul escuro (ações, botões, texto principal)
    secondary: '#F9941F',    // Laranja âmbra (destaques, títulos, indicadores)
    background: '#F2F2F2',   // Cinza muito claro (fundo geral)
    white: '#FFFFFF',
    text: '#333333',
    textLight: '#666666',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
};

type TabType = 'detalhes' | 'itens' | 'recibos' | 'documentos-relacionados';

/* ==================== COMPONENTE PRINCIPAL ==================== */
export default function VisualizarDocumentoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params?.id as string;
    const printRef = useRef<HTMLDivElement>(null);

    const [documento, setDocumento] = useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('detalhes');
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

    /* ==================== COMPONENTE DE IMPRESSÃO PROFISSIONAL ==================== */
    const PrintDocument = () => {
        if (!documento) return null;

        const nomeCliente = documento.cliente?.nome || documento.cliente_nome || 'Consumidor Final';
        const nifCliente = documento.cliente?.nif || documento.cliente_nif;
        const enderecoCliente = documento.cliente?.endereco || '';
        const telefoneCliente = documento.cliente?.telefone || '';
        const emailCliente = documento.cliente?.email || '';

        return (
            <div className="print-only" style={{
                fontFamily: 'Arial, sans-serif',
                backgroundColor: COLORS.white,
                padding: '20px',
                maxWidth: '210mm',
                margin: '0 auto',
                color: COLORS.text
            }}>
                {/* Cabeçalho com gradiente sutil */}
                <div style={{
                    background: `linear-gradient(135deg, ${COLORS.primary} 0%, #1a4a7a 100%)`,
                    color: COLORS.white,
                    padding: '20px',
                    borderRadius: '8px 8px 0 0',
                    marginBottom: '20px'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '60%', verticalAlign: 'middle' }}>
                                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>MINHA EMPRESA</h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>NIF: 123456789 • Luanda, Angola</p>
                                </td>
                                <td style={{ width: '40%', textAlign: 'right', verticalAlign: 'middle' }}>
                                    <div style={{
                                        backgroundColor: 'rgba(255,255,255,0.15)',
                                        padding: '10px 15px',
                                        borderRadius: '6px',
                                        display: 'inline-block'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Documento Fiscal</p>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>
                                            {getNomeTipoDocumento(documento.tipo_documento)}
                                        </p>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Nº {documento.numero_documento}</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Informações do Documento em Tabela Compacta */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '20px',
                    border: `1px solid ${COLORS.background}`,
                    borderRadius: '6px',
                    overflow: 'hidden'
                }}>
                    <thead>
                        <tr>
                            <th colSpan={2} style={{
                                backgroundColor: COLORS.secondary,
                                color: COLORS.white,
                                padding: '10px',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                INFORMAÇÕES DO DOCUMENTO
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ width: '50%', padding: '10px', border: `1px solid ${COLORS.background}`, verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr><td style={{ fontWeight: 'bold', color: COLORS.primary, width: '100px' }}>Cliente:</td><td>{nomeCliente}</td></tr>
                                        {nifCliente && <tr><td style={{ fontWeight: 'bold', color: COLORS.primary }}>NIF:</td><td>{nifCliente}</td></tr>}
                                        {enderecoCliente && <tr><td style={{ fontWeight: 'bold', color: COLORS.primary }}>Endereço:</td><td>{enderecoCliente}</td></tr>}
                                        {(telefoneCliente || emailCliente) && (
                                            <tr><td style={{ fontWeight: 'bold', color: COLORS.primary }}>Contato:</td><td>{telefoneCliente} {emailCliente && `• ${emailCliente}`}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </td>
                            <td style={{ width: '50%', padding: '10px', border: `1px solid ${COLORS.background}`, verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr><td style={{ fontWeight: 'bold', color: COLORS.primary, width: '100px' }}>Emissão:</td><td>{formatarDataHora(documento.data_emissao)}</td></tr>
                                        {documento.data_vencimento && <tr><td style={{ fontWeight: 'bold', color: COLORS.primary }}>Vencimento:</td><td>{formatarData(documento.data_vencimento)}</td></tr>}
                                        <tr><td style={{ fontWeight: 'bold', color: COLORS.primary }}>Série:</td><td>{documento.serie}</td></tr>
                                        <tr><td style={{ fontWeight: 'bold', color: COLORS.primary }}>Estado:</td><td style={{ color: COLORS.secondary, fontWeight: 'bold' }}>{documento.estado.toUpperCase()}</td></tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Informações de Pagamento para FR */}
                {documento.tipo_documento === 'FR' && documento.metodo_pagamento && (
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginBottom: '20px',
                        border: `1px solid ${COLORS.background}`,
                        borderRadius: '6px',
                        overflow: 'hidden'
                    }}>
                        <thead>
                            <tr>
                                <th colSpan={2} style={{
                                    backgroundColor: COLORS.secondary,
                                    color: COLORS.white,
                                    padding: '10px',
                                    textAlign: 'left',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}>
                                    INFORMAÇÕES DE PAGAMENTO
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '10px', border: `1px solid ${COLORS.background}` }}>
                                    <span style={{ fontWeight: 'bold', color: COLORS.primary }}>Método:</span> {getMetodoPagamentoNome(documento.metodo_pagamento)}
                                </td>
                                <td style={{ padding: '10px', border: `1px solid ${COLORS.background}` }}>
                                    <span style={{ fontWeight: 'bold', color: COLORS.primary }}>Valor Pago:</span>{' '}
                                    <span style={{ color: COLORS.success, fontWeight: 'bold' }}>{formatarPreco(documento.total_liquido)}</span>
                                </td>
                            </tr>
                            {documento.referencia_pagamento && (
                                <tr>
                                    <td colSpan={2} style={{ padding: '10px', border: `1px solid ${COLORS.background}` }}>
                                        <span style={{ fontWeight: 'bold', color: COLORS.primary }}>Referência:</span> {documento.referencia_pagamento}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Tabela de Itens - Layout Profissional */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '20px',
                    border: `1px solid ${COLORS.background}`,
                    borderRadius: '6px',
                    overflow: 'hidden'
                }}>
                    <thead>
                        <tr>
                            <th colSpan={6} style={{
                                backgroundColor: COLORS.primary,
                                color: COLORS.white,
                                padding: '10px',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}>
                                ITENS DO DOCUMENTO
                            </th>
                        </tr>
                        <tr style={{ backgroundColor: COLORS.secondary, color: COLORS.white }}>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Descrição</th>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px' }}>Qtd</th>
                            <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>Preço Unit.</th>
                            <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>Desconto</th>
                            <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>IVA</th>
                            <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documento.itens?.map((item, index) => (
                            <tr key={index} style={{ borderBottom: `1px solid ${COLORS.background}` }}>
                                <td style={{ padding: '8px', fontSize: '12px' }}>
                                    <div style={{ fontWeight: 'bold' }}>{item.descricao}</div>
                                    {item.referencia && <div style={{ fontSize: '10px', color: COLORS.textLight }}>Ref: {item.referencia}</div>}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>{item.quantidade}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{formatarPreco(item.preco_unitario)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', color: COLORS.danger }}>
                                    {item.desconto ? formatarPreco(item.desconto) : '-'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{formatarPreco(item.valor_iva || 0)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: COLORS.primary }}>
                                    {formatarPreco(item.total_linha || 0)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totais em Tabela Compacta */}
                <table style={{
                    width: '300px',
                    marginLeft: 'auto',
                    borderCollapse: 'collapse',
                    marginBottom: '20px'
                }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '5px', textAlign: 'right', color: COLORS.textLight }}>Base Tributável:</td>
                            <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>{formatarPreco(documento.base_tributavel)}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '5px', textAlign: 'right', color: COLORS.textLight }}>IVA:</td>
                            <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>{formatarPreco(documento.total_iva)}</td>
                        </tr>
                        {documento.total_retencao > 0 && (
                            <tr>
                                <td style={{ padding: '5px', textAlign: 'right', color: COLORS.textLight }}>Retenção:</td>
                                <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold', color: COLORS.danger }}>
                                    -{formatarPreco(documento.total_retencao)}
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td colSpan={2} style={{ padding: '5px 0', borderTop: `2px solid ${COLORS.primary}` }}></td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px 5px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: COLORS.primary }}>TOTAL:</td>
                            <td style={{ padding: '8px 5px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold', color: COLORS.primary }}>
                                {formatarPreco(documento.total_liquido)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Motivo para Nota de Crédito */}
                {documento.tipo_documento === 'NC' && documento.motivo && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '12px',
                        backgroundColor: '#FFF9E6',
                        borderLeft: `4px solid ${COLORS.secondary}`,
                        borderRadius: '4px'
                    }}>
                        <p style={{ margin: 0, fontWeight: 'bold', color: COLORS.primary }}>Motivo da Nota de Crédito:</p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>{documento.motivo}</p>
                    </div>
                )}

                {/* Hash Fiscal */}
                {documento.hash_fiscal && (
                    <div style={{
                        marginTop: '20px',
                        padding: '10px',
                        backgroundColor: COLORS.background,
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: COLORS.textLight,
                        wordBreak: 'break-all'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>Hash Fiscal:</span> {documento.hash_fiscal}
                    </div>
                )}

                {/* Rodapé Profissional */}
                <div style={{
                    marginTop: '30px',
                    paddingTop: '15px',
                    borderTop: `1px solid ${COLORS.background}`,
                    textAlign: 'center',
                    fontSize: '10px',
                    color: COLORS.textLight
                }}>
                    <p style={{ margin: '2px 0' }}>Documento processado por software validado nos termos da legislação fiscal</p>
                    <p style={{ margin: '2px 0' }}>IVA incluído à taxa legal em vigor • Documento com valor fiscal</p>
                    <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', color: COLORS.primary }}>Obrigado pela preferência!</p>
                </div>
            </div>
        );
    };

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
            {/* Estilos de impressão otimizados */}
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

            {/* Documento para impressão */}
            <div ref={printRef} className="print-only">
                <PrintDocument />
            </div>

            {/* Interface Principal */}
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

                {/* Navegação por Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex gap-4 overflow-x-auto pb-1">
                        {['detalhes', 'itens', ...(documento.tipo_documento === 'FT' || documento.tipo_documento === 'FA' ? ['recibos'] : []), 'documentos-relacionados'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as TabType)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${activeTab === tab
                                        ? 'border-[#F9941F] text-[#F9941F]'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab === 'recibos' ? `Recibos (${documento.recibos?.length || 0})` : tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Conteúdo das Tabs em Tabelas Compactas */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {activeTab === 'detalhes' && (
                        <div className="space-y-6">
                            {/* Informações do Cliente em Tabela */}
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th colSpan={2} className="text-left pb-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}` }}>
                                            <User className="inline w-5 h-5 mr-2" style={{ color: COLORS.secondary }} />
                                            Cliente
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td className="py-1 font-medium" style={{ width: '100px', color: COLORS.primary }}>Nome:</td><td>{nomeCliente}</td></tr>
                                    {nifCliente && <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>NIF:</td><td>{nifCliente}</td></tr>}
                                    {documento.cliente?.endereco && <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Endereço:</td><td>{documento.cliente.endereco}</td></tr>}
                                    {documento.cliente?.telefone && <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Telefone:</td><td>{documento.cliente.telefone}</td></tr>}
                                    {documento.cliente?.email && <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Email:</td><td>{documento.cliente.email}</td></tr>}
                                </tbody>
                            </table>

                            {/* Informações do Documento em Tabela */}
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th colSpan={2} className="text-left pb-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}` }}>
                                            <FileText className="inline w-5 h-5 mr-2" style={{ color: COLORS.secondary }} />
                                            Informações do Documento
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td className="py-1 font-medium" style={{ width: '120px', color: COLORS.primary }}>Número:</td><td>{documento.numero_documento}</td></tr>
                                    <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Série:</td><td>{documento.serie}</td></tr>
                                    <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Emissão:</td><td>{formatarDataHora(documento.data_emissao)}</td></tr>
                                    {documento.data_vencimento && <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Vencimento:</td><td>{formatarData(documento.data_vencimento)}</td></tr>}
                                    {documento.motivo && <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Motivo:</td><td>{documento.motivo}</td></tr>}
                                </tbody>
                            </table>

                            {/* Informações de Pagamento para FR */}
                            {documento.tipo_documento === 'FR' && documento.metodo_pagamento && (
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th colSpan={2} className="text-left pb-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}` }}>
                                                <CreditCard className="inline w-5 h-5 mr-2" style={{ color: COLORS.secondary }} />
                                                Pagamento
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td className="py-1 font-medium" style={{ width: '120px', color: COLORS.primary }}>Método:</td><td>{getMetodoPagamentoNome(documento.metodo_pagamento)}</td></tr>
                                        {documento.referencia_pagamento && <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Referência:</td><td>{documento.referencia_pagamento}</td></tr>}
                                    </tbody>
                                </table>
                            )}

                            {/* Totais em Tabela */}
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th colSpan={2} className="text-left pb-2" style={{ color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}` }}>
                                            Totais
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td className="py-1 font-medium" style={{ width: '120px', color: COLORS.primary }}>Base Tributável:</td><td>{formatarPreco(documento.base_tributavel)}</td></tr>
                                    <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>IVA:</td><td>{formatarPreco(documento.total_iva)}</td></tr>
                                    {documento.total_retencao > 0 && (
                                        <tr><td className="py-1 font-medium" style={{ color: COLORS.primary }}>Retenção:</td><td className="text-red-600">-{formatarPreco(documento.total_retencao)}</td></tr>
                                    )}
                                    <tr><td colSpan={2} className="py-2"><hr style={{ borderColor: COLORS.primary }} /></td></tr>
                                    <tr><td className="py-1 font-bold text-lg" style={{ color: COLORS.primary }}>TOTAL:</td><td className="font-bold text-lg" style={{ color: COLORS.primary }}>{formatarPreco(documento.total_liquido)}</td></tr>
                                </tbody>
                            </table>

                            {documento.hash_fiscal && (
                                <div className="text-xs text-gray-400 break-all">
                                    <span className="font-medium">Hash Fiscal:</span> {documento.hash_fiscal}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'itens' && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.primary }}>Itens do Documento</h3>
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
                        </div>
                    )}

                    {activeTab === 'recibos' && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4" style={{ color: COLORS.primary }}>Recibos</h3>
                            {documento.recibos && documento.recibos.length > 0 ? (
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
                            ) : (
                                <p className="text-center text-gray-500 py-8">Nenhum recibo encontrado</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'documentos-relacionados' && (
                        <div className="space-y-4">
                            {documento.documento_origem && (
                                <DocumentoRelacionado
                                    titulo="Documento de Origem"
                                    documento={documento.documento_origem}
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
                            {!documento.documento_origem &&
                                (!documento.notas_credito?.length) &&
                                (!documento.notas_debito?.length) &&
                                (!documento.adiantamentos_vinculados?.length) &&
                                (!documento.faturas_vinculadas?.length) && (
                                    <p className="text-center text-gray-500 py-8">Nenhum documento relacionado</p>
                                )}
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
    documentos?: DocumentoFiscal[];
    documento?: DocumentoFiscal;
    getTipoIcone: (tipo: string) => JSX.Element;
    router: ReturnType<typeof useRouter>;
    cor?: string;
}

const DocumentoRelacionado = ({ titulo, documentos, documento, getTipoIcone, router, cor }: DocumentoRelacionadoProps) => {
    const docs = documentos || (documento ? [documento] : []);

    return (
        <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">{titulo}</h4>
            <div className="space-y-2">
                {docs.map((doc: DocumentoFiscal) => (
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