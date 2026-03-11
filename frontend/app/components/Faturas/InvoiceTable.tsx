"use client";

import { useState } from "react";
import {
    DocumentoFiscal,
    TipoDocumento,
} from "@/services/DocumentoFiscal";
import { Eye, FileText, Printer, Download, ChevronLeft, ChevronRight, Receipt } from "lucide-react";

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
        <div className="animate-pulse p-5">
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <div className="h-8 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-8 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-8 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-8 flex-1 rounded" style={{ backgroundColor: colors.border }}></div>
                        <div className="h-8 w-24 rounded" style={{ backgroundColor: colors.border }}></div>
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
            className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
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
            <div className="p-8 text-center" style={{ color: colors.textSecondary }}>
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: colors.hover }}
                >
                    <Receipt size={32} style={{ color: colors.border }} />
                </div>
                <p className="text-base font-medium" style={{ color: colors.text }}>Nenhum documento encontrado</p>
                <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>Tente ajustar os filtros</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b" style={{ backgroundColor: colors.primary }}>
                        <th className="px-3 py-3 text-left font-semibold whitespace-nowrap text-white">Nº Documento</th>
                        <th className="px-3 py-3 text-left font-semibold whitespace-nowrap text-white">Cliente</th>
                        <th className="px-3 py-3 text-left font-semibold whitespace-nowrap text-white">Tipo</th>
                        <th className="px-3 py-3 text-left font-semibold whitespace-nowrap text-white">Data</th>
                        <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-white">Total</th>
                        <th className="px-3 py-3 text-center font-semibold whitespace-nowrap min-w-[180px] text-white">Ações</th>
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
                                <td className="px-3 py-3 font-medium whitespace-nowrap" style={{ color: colors.text }}>
                                    {documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}
                                </td>
                                <td className="px-3 py-3 max-w-[150px]">
                                    <div className="font-medium truncate" style={{ color: colors.text }}>
                                        {documentoFiscalService.getNomeCliente(documento)}
                                    </div>
                                    {documentoFiscalService.getNifCliente(documento) && (
                                        <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                            NIF: {documentoFiscalService.getNifCliente(documento)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-3">
                                    <TipoBadge tipo={tipo} colors={colors} />
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    <div style={{ color: colors.textSecondary }}>
                                        {new Date(documento.data_emissao).toLocaleDateString("pt-AO")}
                                    </div>
                                    <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                        {documento.hora_emissao}
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-right font-medium whitespace-nowrap" style={{ color: colors.text }}>
                                    {formatKz(documento.total_liquido)}
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        {/* Ver Detalhes */}
                                        <button
                                            onClick={() => onVerDetalhes(documento)}
                                            className="p-2 rounded transition-colors hover:opacity-70 touch-manipulation"
                                            style={{ color: colors.text }}
                                            title="Ver detalhes"
                                        >
                                            <Eye size={18} />
                                        </button>

                                        {/* Gerar Recibo (apenas FT) */}
                                        {podeGerarReciboDoc && (
                                            <button
                                                onClick={() => handleGerarRecibo(documento)}
                                                disabled={gerandoRecibo === documento.id}
                                                className="p-2 rounded transition-colors hover:opacity-70 touch-manipulation disabled:opacity-50"
                                                style={{ color: colors.success }}
                                                title="Gerar Recibo"
                                            >
                                                {gerandoRecibo === documento.id ? (
                                                    <div className="w-4 h-4 border-2 border-t-current rounded-full animate-spin" style={{ borderColor: `${colors.success}30`, borderTopColor: colors.success }} />
                                                ) : (
                                                    <FileText size={18} />
                                                )}
                                            </button>
                                        )}

                                        {/* Imprimir Talão (apenas FR e RC) */}
                                        {podeImprimirDoc && (
                                            <button
                                                onClick={() => onImprimirTalao(documento)}
                                                className="p-2 rounded transition-colors hover:opacity-70 touch-manipulation"
                                                style={{ color: colors.secondary }}
                                                title="Imprimir"
                                            >
                                                <Printer size={18} />
                                            </button>
                                        )}

                                        {/* Baixar PDF (exceto FT) */}
                                        {podeBaixarPdfDoc && (
                                            <button
                                                onClick={() => handleBaixarPdf(documento)}
                                                disabled={baixandoPdf === documento.id}
                                                className="p-2 rounded transition-colors hover:opacity-70 touch-manipulation disabled:opacity-50"
                                                style={{ color: colors.primary }}
                                                title="Baixar PDF"
                                            >
                                                {baixandoPdf === documento.id ? (
                                                    <div className="w-4 h-4 border-2 border-t-current rounded-full animate-spin" style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }} />
                                                ) : (
                                                    <Download size={18} />
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

            {/* Paginação */}
            {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: colors.border }}>
                    <div className="text-sm" style={{ color: colors.textSecondary }}>
                        {indiceInicial + 1}-{Math.min(indiceFinal, documentos.length)} de {documentos.length}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => irParaPagina(paginaValida - 1)}
                            disabled={paginaValida === 1}
                            className="px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                            style={{
                                backgroundColor: paginaAtual === 1 ? colors.hover : colors.primary,
                                color: paginaAtual === 1 ? colors.textSecondary : 'white'
                            }}
                        >
                            <ChevronLeft size={16} />
                            <span>Anterior</span>
                        </button>

                        <span className="px-3 py-1.5 text-sm" style={{ color: colors.text }}>
                            Pág {paginaValida}/{totalPaginas}
                        </span>

                        <button
                            onClick={() => irParaPagina(paginaValida + 1)}
                            disabled={paginaValida === totalPaginas}
                            className="px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                            style={{
                                backgroundColor: paginaAtual === totalPaginas ? colors.hover : colors.primary,
                                color: paginaAtual === totalPaginas ? colors.textSecondary : 'white'
                            }}
                        >
                            <span>Próxima</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}