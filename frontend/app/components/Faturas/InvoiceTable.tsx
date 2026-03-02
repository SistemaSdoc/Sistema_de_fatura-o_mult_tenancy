"use client";

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

interface InvoiceTableProps {
    documentos: DocumentoFiscal[];
    loading: boolean;
    gerandoRecibo: string | null;
    onVerDetalhes: (documento: DocumentoFiscal) => void;
    onGerarRecibo: (documento: DocumentoFiscal) => Promise<DocumentoFiscal | void> | void;
    onImprimirTalao: (documento: DocumentoFiscal) => void;
    // Nova prop para quando um recibo for gerado com sucesso (para abrir modal de impressão)
    onReciboGerado?: (recibo: DocumentoFiscal) => void;
    formatKz: (valor: number | string | undefined) => string;
    formatQuantidade: (qtd: number | string | undefined) => string;
    documentoFiscalService: {
        getNomeCliente: (doc: DocumentoFiscal) => string;
        getNifCliente: (doc: DocumentoFiscal) => string | null;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    colors: any; // Cores do tema
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TableSkeleton({ colors }: { colors: any }) {
    return (
        <div className="animate-pulse">
            <div
                className="grid grid-cols-7 gap-2 sm:gap-4 p-2 sm:p-4 rounded-t-lg min-w-[800px]"
                style={{ backgroundColor: colors.hover }}
            >
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-4 rounded w-full" style={{ backgroundColor: colors.border }} />
                ))}
            </div>
            {[...Array(5)].map((_, rowIdx) => (
                <div
                    key={rowIdx}
                    className="grid grid-cols-7 gap-2 sm:gap-4 p-2 sm:p-4 border-b min-w-[800px]"
                    style={{ borderColor: colors.border }}
                >
                    {[...Array(7)].map((_, colIdx) => (
                        <div key={colIdx} className="h-4 rounded w-full" style={{ backgroundColor: colors.border }} />
                    ))}
                </div>
            ))}
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TipoBadge({ tipo, colors }: { tipo: TipoDocumento; colors: any }) {
    const cores: Record<string, { bg: string; text: string }> = {
        "FT": { bg: `${colors.primary}20`, text: colors.primary },
        "FR": { bg: `${colors.success}20`, text: colors.success },
        "RC": { bg: `${colors.teal}20`, text: colors.teal || colors.success },
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
    onVerDetalhes,
    onGerarRecibo,
    onImprimirTalao,
    onReciboGerado,
    formatKz,
    documentoFiscalService,
    colors,
}: InvoiceTableProps) {
    const podeImprimir = (tipo: TipoDocumento): boolean => {
        return TIPOS_IMPRESSAO.includes(tipo);
    };

    const podeGerarRecibo = (documento: DocumentoFiscal): boolean => {
        return documento.tipo_documento === "FT" &&
            !["cancelado", "paga"].includes(documento.estado);
    };

    // Handler para gerar recibo e depois imprimir automaticamente
    const handleGerarRecibo = async (documento: DocumentoFiscal) => {
        try {
            // Chama o handler original que retorna o recibo gerado
            const resultado = await onGerarRecibo(documento);
            
            // Se o resultado for o recibo gerado e tivermos a callback onReciboGerado
            if (resultado && onReciboGerado) {
                // Pequeno delay para garantir que o estado foi atualizado
                setTimeout(() => {
                    onReciboGerado(resultado);
                }, 100);
            }
        } catch (error) {
            console.error('Erro ao gerar recibo:', error);
        }
    };

    if (loading) {
        return (
            <div className="overflow-x-auto">
                <TableSkeleton colors={colors} />
            </div>
        );
    }

    if (documentos.length === 0) {
        return (
            <div className="p-8 sm:p-12 text-center" style={{ color: colors.textSecondary }}>
                <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: colors.hover }}
                >
                    <svg className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: colors.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                </div>
                <p className="text-base sm:text-lg font-medium" style={{ color: colors.text }}>Nenhum documento encontrado</p>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Tente ajustar os filtros</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
                <thead>
                    <tr style={{ backgroundColor: colors.primary }}>
                        <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap text-white">Nº Documento</th>
                        <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap text-white">Série</th>
                        <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap text-white">Cliente</th>
                        <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap text-white">Tipo</th>
                        <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap text-white">Data</th>
                        <th className="p-2 lg:p-3 text-right font-semibold text-xs sm:text-sm whitespace-nowrap text-white">Total</th>
                        <th className="p-2 lg:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap min-w-[200px] text-white">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                    {documentos.map((documento) => {
                        const tipo = documento.tipo_documento;
                        const podeImprimirDoc = podeImprimir(tipo);
                        const podeGerarReciboDoc = podeGerarRecibo(documento);

                        return (
                            <tr
                                key={documento.id}
                                className="transition-colors hover:bg-opacity-50"
                                style={{ backgroundColor: 'transparent' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.hover;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <td className="p-2 lg:p-3 font-bold text-xs sm:text-sm whitespace-nowrap" style={{ color: colors.text }}>
                                    {documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}
                                </td>
                                <td className="p-2 lg:p-3 text-xs sm:text-sm whitespace-nowrap" style={{ color: colors.textSecondary }}>
                                    {documento.serie}
                                </td>
                                <td className="p-2 lg:p-3">
                                    <div className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[150px] lg:max-w-[200px]" style={{ color: colors.text }}>
                                        {documentoFiscalService.getNomeCliente(documento)}
                                    </div>
                                    {documentoFiscalService.getNifCliente(documento) && (
                                        <div className="text-xs" style={{ color: colors.textSecondary }}>
                                            NIF: {documentoFiscalService.getNifCliente(documento)}
                                        </div>
                                    )}
                                </td>
                                <td className="p-2 lg:p-3">
                                    <TipoBadge tipo={tipo} colors={colors} />
                                </td>
                                <td className="p-2 lg:p-3 text-xs sm:text-sm whitespace-nowrap" style={{ color: colors.textSecondary }}>
                                    <div>{new Date(documento.data_emissao).toLocaleDateString("pt-AO")}</div>
                                    <div className="text-xs" style={{ color: colors.textSecondary }}>{documento.hora_emissao}</div>
                                </td>
                                <td className="p-2 lg:p-3 text-right font-bold text-xs sm:text-sm whitespace-nowrap" style={{ color: colors.text }}>
                                    {formatKz(documento.total_liquido)}
                                </td>
                                <td className="p-2 lg:p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                        {/* Ver Detalhes */}
                                        <button
                                            onClick={() => onVerDetalhes(documento)}
                                            className="p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation"
                                            style={{ color: colors.text }}
                                            title="Ver detalhes"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>

                                        {/* Gerar Recibo e Imprimir */}
                                        {podeGerarReciboDoc && (
                                            <button
                                                onClick={() => handleGerarRecibo(documento)}
                                                disabled={gerandoRecibo === documento.id}
                                                className="p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
                                                style={{ color: colors.success }}
                                                title="Gerar Recibo e Imprimir"
                                            >
                                                {gerandoRecibo === documento.id ? (
                                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-t-current rounded-full animate-spin" style={{ borderColor: `${colors.success}30`, borderTopColor: colors.success }} />
                                                ) : (
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}

                                        {/* Imprimir Talão (apenas FR e RC) */}
                                        {podeImprimirDoc && (
                                            <button
                                                onClick={() => onImprimirTalao(documento)}
                                                className="p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation"
                                                style={{ color: colors.secondary }}
                                                title="Imprimir Talão"
                                            >
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}