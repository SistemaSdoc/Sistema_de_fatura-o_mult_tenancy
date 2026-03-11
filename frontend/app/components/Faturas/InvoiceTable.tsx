"use client";

import { useState } from "react";
import {
    DocumentoFiscal,
    TipoDocumento,
} from "@/services/DocumentoFiscal";

const TIPO_LABEL: Record<TipoDocumento, string> = {
    "FT": "Fatura",
    "FR": "Fatura-Recibo",
    "FP": "Fatura Proforma",
    "FA": "Fatura de Adiantamento",
    "NC": "Nota de Crédito",
    "ND": "Nota de Débito",
    "RC": "Recibo",
    "FRt": "Fatura de Retificação",
};

// Apenas FR e RC podem ser impressos
const TIPOS_IMPRESSAO: TipoDocumento[] = ['FR', 'RC'];
// Tipos que podem ter PDF baixado (exceto FT)
const TIPOS_COM_PDF: TipoDocumento[] = ['FR', 'FP', 'FA', 'NC', 'ND', 'RC', 'FRt'];

interface ColorsTheme {
    border: string;
    primary: string;
    success: string;
    teal?: string;
    warning: string;
    danger: string;
    secondary: string;
    hover: string;
    text: string;
    textSecondary: string;
}

interface InvoiceTableProps {
    documentos: DocumentoFiscal[];
    loading: boolean;
    gerandoRecibo: string | null;
    baixandoPdf: string | null;
    onVerDetalhes: (documento: DocumentoFiscal) => void;
    onGerarRecibo: (documento: DocumentoFiscal) => Promise<DocumentoFiscal | void> | void;
    onImprimirTalao: (documento: DocumentoFiscal) => void;
    onBaixarPdf: (documento: DocumentoFiscal) => Promise<void>;
    onReciboGerado?: (recibo: DocumentoFiscal) => void;
    formatKz: (valor: number | string | undefined) => string;
    formatQuantidade: (qtd: number | string | undefined) => string;
    documentoFiscalService: {
        getNomeCliente: (doc: DocumentoFiscal) => string;
        getNifCliente: (doc: DocumentoFiscal) => string | null;
    };
    colors: ColorsTheme;
}

function TableSkeleton({ colors }: { colors: ColorsTheme }) {
    return (
        <div className="animate-pulse p-4">
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-2">
                        <div className="h-6 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-6 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-6 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-6 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-6 w-20 rounded" style={{ backgroundColor: colors.border }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TipoBadge({ tipo, colors }: { tipo: TipoDocumento; colors: ColorsTheme }) {
    const cores: Record<string, { bg: string; text: string }> = {
        "FT": { bg: `${colors.primary}20`, text: colors.primary },
        "FR": { bg: `${colors.success}20`, text: colors.success },
        "RC": { bg: `${colors.teal || colors.success}20`, text: colors.teal || colors.success },
        "FP": { bg: `${colors.warning}20`, text: colors.warning },
        "NC": { bg: `${colors.danger}20`, text: colors.danger },
        "ND": { bg: `${colors.secondary}20`, text: colors.secondary },
    };

    const estilo = cores[tipo] || { bg: colors.hover, text: colors.textSecondary };

    return (
        <span
            className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: estilo.bg, color: estilo.text }}
        >
            {TIPO_LABEL[tipo] || tipo}
        </span>
    );
}

export default function InvoiceTable({
    documentos,
    loading,
    gerandoRecibo,
    baixandoPdf,
    onVerDetalhes,
    onGerarRecibo,
    onImprimirTalao,
    onBaixarPdf,
    onReciboGerado,
    formatKz,
    documentoFiscalService,
    colors,
}: InvoiceTableProps) {
    const [paginaAtual, setPaginaAtual] = useState(1);
    const ITENS_POR_PAGINA = 10;

    const podeImprimir = (tipo: TipoDocumento): boolean => {
        return TIPOS_IMPRESSAO.includes(tipo);
    };

    const podeBaixarPdf = (tipo: TipoDocumento): boolean => {
        return TIPOS_COM_PDF.includes(tipo);
    };

    const podeGerarRecibo = (documento: DocumentoFiscal): boolean => {
        return documento.tipo_documento === "FT" &&
            !["cancelado", "paga"].includes(documento.estado);
    };

    const handleGerarRecibo = async (documento: DocumentoFiscal) => {
        try {
            const resultado = await onGerarRecibo(documento);
            if (resultado && onReciboGerado) {
                setTimeout(() => {
                    onReciboGerado(resultado);
                }, 100);
            }
        } catch (error) {
            console.error('Erro ao gerar recibo:', error);
        }
    };

    const handleBaixarPdf = async (documento: DocumentoFiscal) => {
        await onBaixarPdf(documento);
    };

    // Paginação
    const totalPaginas = Math.ceil(documentos.length / ITENS_POR_PAGINA);
    const paginaValida = paginaAtual > totalPaginas ? 1 : paginaAtual;
    const indiceInicial = (paginaValida - 1) * ITENS_POR_PAGINA;
    const indiceFinal = indiceInicial + ITENS_POR_PAGINA;
    const documentosPaginados = documentos.slice(indiceInicial, indiceFinal);

    const irParaPagina = (pagina: number) => {
        if (pagina >= 1 && pagina <= totalPaginas) {
            setPaginaAtual(pagina);
        } else if (pagina > totalPaginas) {
            setPaginaAtual(1);
        }
    };

    if (loading) {
        return <TableSkeleton colors={colors} />;
    }

    if (documentos.length === 0) {
        return (
            <div className="p-6 text-center" style={{ color: colors.textSecondary }}>
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: colors.hover }}
                >
                    <svg className="w-6 h-6" style={{ color: colors.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>Nenhum documento encontrado</p>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>Tente ajustar os filtros</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b" style={{ backgroundColor: colors.primary }}>
                        <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap text-white">Nº Doc</th>
                        <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap text-white">Cliente</th>
                        <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap text-white">Tipo</th>
                        <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap text-white">Data</th>
                        <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap text-white">Total</th>
                        <th className="px-2 py-1.5 text-center font-semibold whitespace-nowrap min-w-[140px] text-white">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                    {documentosPaginados.map((documento) => {
                        const tipo = documento.tipo_documento;
                        const podeImprimirDoc = podeImprimir(tipo);
                        const podeGerarReciboDoc = podeGerarRecibo(documento);
                        const podeBaixarPdfDoc = podeBaixarPdf(tipo);

                        return (
                            <tr
                                key={documento.id}
                                className="border-b transition-colors hover:bg-opacity-50"
                                style={{ borderColor: colors.border }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td className="px-2 py-1.5 font-medium whitespace-nowrap" style={{ color: colors.text }}>
                                    {documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}
                                </td>
                                <td className="px-2 py-1.5 max-w-[120px]">
                                    <div className="font-medium truncate" style={{ color: colors.text }}>
                                        {documentoFiscalService.getNomeCliente(documento)}
                                    </div>
                                    {documentoFiscalService.getNifCliente(documento) && (
                                        <div className="text-[9px]" style={{ color: colors.textSecondary }}>
                                            {documentoFiscalService.getNifCliente(documento)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-2 py-1.5">
                                    <TipoBadge tipo={tipo} colors={colors} />
                                </td>
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                    <div style={{ color: colors.textSecondary }}>
                                        {new Date(documento.data_emissao).toLocaleDateString("pt-AO")}
                                    </div>
                                    <div className="text-[9px]" style={{ color: colors.textSecondary }}>
                                        {documento.hora_emissao}
                                    </div>
                                </td>
                                <td className="px-2 py-1.5 text-right font-medium whitespace-nowrap" style={{ color: colors.text }}>
                                    {formatKz(documento.total_liquido)}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                        {/* Ver Detalhes */}
                                        <button
                                            onClick={() => onVerDetalhes(documento)}
                                            className="p-1 rounded transition-colors hover:opacity-70 touch-manipulation"
                                            style={{ color: colors.text }}
                                            title="Ver detalhes"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>

                                        {/* Gerar Recibo (apenas FT) */}
                                        {podeGerarReciboDoc && (
                                            <button
                                                onClick={() => handleGerarRecibo(documento)}
                                                disabled={gerandoRecibo === documento.id}
                                                className="p-1 rounded transition-colors hover:opacity-70 touch-manipulation disabled:opacity-50"
                                                style={{ color: colors.success }}
                                                title="Gerar Recibo"
                                            >
                                                {gerandoRecibo === documento.id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-t-current rounded-full animate-spin" style={{ borderColor: `${colors.success}30`, borderTopColor: colors.success }} />
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}

                                        {/* Imprimir Talão (apenas FR e RC) */}
                                        {podeImprimirDoc && (
                                            <button
                                                onClick={() => onImprimirTalao(documento)}
                                                className="p-1 rounded transition-colors hover:opacity-70 touch-manipulation"
                                                style={{ color: colors.secondary }}
                                                title="Imprimir Talão"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                            </button>
                                        )}

                                        {/* Baixar PDF (exceto FT) */}
                                        {podeBaixarPdfDoc && (
                                            <button
                                                onClick={() => handleBaixarPdf(documento)}
                                                disabled={baixandoPdf === documento.id}
                                                className="p-1 rounded transition-colors hover:opacity-70 touch-manipulation disabled:opacity-50"
                                                style={{ color: colors.primary }}
                                                title="Baixar PDF"
                                            >
                                                {baixandoPdf === documento.id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-t-current rounded-full animate-spin" style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }} />
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Paginação Compacta */}
            {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: colors.border }}>
                    <div className="text-[10px]" style={{ color: colors.textSecondary }}>
                        {indiceInicial + 1}-{Math.min(indiceFinal, documentos.length)} de {documentos.length}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => irParaPagina(paginaValida - 1)}
                            disabled={paginaValida === 1}
                            className="px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                            style={{
                                backgroundColor: paginaAtual === 1 ? colors.hover : colors.primary,
                                color: paginaAtual === 1 ? colors.textSecondary : 'white'
                            }}
                        >
                            Anterior
                        </button>

                        <span className="px-2 py-1 text-[10px]" style={{ color: colors.text }}>
                            Pág {paginaValida}/{totalPaginas}
                        </span>

                        <button
                            onClick={() => irParaPagina(paginaValida + 1)}
                            disabled={paginaValida === totalPaginas}
                            className="px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                            style={{
                                backgroundColor: paginaAtual === totalPaginas ? colors.hover : colors.primary,
                                color: paginaAtual === totalPaginas ? colors.textSecondary : 'white'
                            }}
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}