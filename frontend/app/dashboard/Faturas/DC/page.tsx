// src/app/dashboard/Faturas/OutrosDocumentos/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    FileText,
    Eye,
    Download,
    Loader2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    User,
    FileWarning,
    CreditCard,
    FileX,
    FileCheck,
    ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

import MainEmpresa from "@/app/components/MainEmpresa";
import { documentoFiscalService, DocumentoFiscal, TipoDocumento, EstadoDocumento } from "@/services/DocumentoFiscal";
import { ModalVisualizacao } from "@/app/components/ModalVisualizacao";
import { useThemeColors, useTheme } from "@/context/ThemeContext";

// ==================== CONSTANTES ====================

const TIPOS_PERMITIDOS: TipoDocumento[] = ['FP', 'FA', 'NC', 'ND', 'FRt'];

const TIPOS_DOCUMENTO = [
    { value: 'FP' as TipoDocumento, label: 'Proforma', icon: FileWarning, cor: '#f97316' },
    { value: 'FA' as TipoDocumento, label: 'Adiantamento', icon: CreditCard, cor: '#8b5cf6' },
    { value: 'NC' as TipoDocumento, label: 'Nota de Crédito', icon: FileX, cor: '#ef4444' },
    { value: 'ND' as TipoDocumento, label: 'Nota de Débito', icon: FileX, cor: '#f59e0b' },
    { value: 'FRt' as TipoDocumento, label: 'Retificação', icon: FileCheck, cor: '#ec4899' },
] as const;

const getEstadoConfig = (estado: EstadoDocumento, theme: string) => {
    const configs = {
        emitido: {
            bg: theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100',
            text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
            border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200',
            label: 'Emitido'
        },
        paga: {
            bg: theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100',
            text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
            border: theme === 'dark' ? 'border-green-800' : 'border-green-200',
            label: 'Pago'
        },
        parcialmente_paga: {
            bg: theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-100',
            text: theme === 'dark' ? 'text-orange-300' : 'text-orange-700',
            border: theme === 'dark' ? 'border-orange-800' : 'border-orange-200',
            label: 'Parcial'
        },
        cancelado: {
            bg: theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100',
            text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
            border: theme === 'dark' ? 'border-red-800' : 'border-red-200',
            label: 'Cancelado'
        },
        expirado: {
            bg: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
            text: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
            border: theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
            label: 'Expirado'
        },
    };
    return configs[estado] || configs.emitido;
};

// ==================== UTILITÁRIOS ====================

const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        minimumFractionDigits: 2
    }).replace('AOA', 'Kz');
};

const formatarData = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy', { locale: pt });
};

const getTipoInfo = (tipo: TipoDocumento) => {
    return TIPOS_DOCUMENTO.find(t => t.value === tipo) || TIPOS_DOCUMENTO[0];
};

// ==================== COMPONENTES AUXILIARES ====================

const SkeletonTable = ({ colors }: { colors: any }) => (
    <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
            <div
                key={i}
                className="p-4 rounded-lg border animate-pulse"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}
            >
                <div className="flex items-center gap-4">
                    <div
                        className="w-10 h-10 rounded-lg"
                        style={{ backgroundColor: colors.border }}
                    ></div>
                    <div className="flex-1">
                        <div
                            className="h-4 rounded w-32 mb-2"
                            style={{ backgroundColor: colors.border }}
                        ></div>
                        <div
                            className="h-3 rounded w-48"
                            style={{ backgroundColor: colors.border }}
                        ></div>
                    </div>
                    <div
                        className="w-24 h-8 rounded-full"
                        style={{ backgroundColor: colors.border }}
                    ></div>
                </div>
            </div>
        ))}
    </div>
);

const EstadoBadge = ({ estado }: { estado: EstadoDocumento }) => {
    const { theme } = useTheme();
    const config = getEstadoConfig(estado, theme);
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
            {config.label}
        </span>
    );
};

// ==================== COMPONENTE PRINCIPAL ====================

export default function OutrosDocumentosPage() {
    const router = useRouter();
    const colors = useThemeColors();
    const { theme } = useTheme();

    // Estados
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        from: 0,
        to: 0
    });
    const [page, setPage] = useState(1);
    const itensPorPagina = 15;

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [documentoSelecionado, setDocumentoSelecionado] = useState<DocumentoFiscal | null>(null);

    // ==================== FUNÇÕES ====================

    const carregarDocumentos = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await documentoFiscalService.listar({
                page,
                per_page: itensPorPagina,
            });

            const documentosFiltrados = data.data.filter(
                (doc: DocumentoFiscal) => TIPOS_PERMITIDOS.includes(doc.tipo_documento)
            );

            setDocumentos(documentosFiltrados);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                total: documentosFiltrados.length,
                from: documentosFiltrados.length > 0 ? (page - 1) * itensPorPagina + 1 : 0,
                to: Math.min(page * itensPorPagina, documentosFiltrados.length)
            });
        } catch (err: any) {
            console.error('Erro ao carregar documentos:', err);
            setError(err.message || 'Erro ao carregar documentos fiscais');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDocumentos();
    }, [page]);

    const handlePageChange = (novaPagina: number) => {
        setPage(novaPagina);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const abrirModal = (doc: DocumentoFiscal) => {
        setDocumentoSelecionado(doc);
        setModalOpen(true);
    };

    const fecharModal = () => {
        setModalOpen(false);
        setTimeout(() => setDocumentoSelecionado(null), 300);
    };

    const handleDownload = (doc: DocumentoFiscal) => {
        // TODO: Implementar download específico do documento
        console.log('Download documento:', doc.id);
    };

    // ==================== RENDER ====================

    return (
        <MainEmpresa>
            <div className="space-y-6 p-4 max-w-7xl mx-auto transition-colors duration-300" style={{ backgroundColor: colors.background }}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>
                            Outros Documentos
                        </h1>
                        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                            Proformas, adiantamentos, notas de crédito/débito e retificações
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                            style={{
                                backgroundColor: colors.hover,
                                color: colors.text,
                                border: `1px solid ${colors.border}`
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.border;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colors.hover;
                            }}
                        >
                            <ArrowLeft size={16} />
                            Voltar
                        </button>
                    </div>
                </div>

                {/* Lista de Documentos */}
                <div
                    className="rounded-xl shadow-sm border overflow-hidden transition-colors duration-300"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}
                >
                    {loading ? (
                        <div className="p-6">
                            <SkeletonTable colors={colors} />
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#EF4444' }} />
                            <p style={{ color: '#EF4444' }}>{error}</p>
                            <button
                                onClick={carregarDocumentos}
                                className="mt-3 px-4 py-2 text-white rounded-lg transition-colors text-sm hover:opacity-90"
                                style={{ backgroundColor: colors.primary }}
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : documentos.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: colors.border }} />
                            <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>
                                Nenhum documento encontrado
                            </h3>
                            <p style={{ color: colors.textSecondary }}>
                                Não há proformas, adiantamentos ou notas registradas
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Lista Mobile */}
                            <div className="md:hidden divide-y" style={{ borderColor: colors.border }}>
                                {documentos.map((doc) => {
                                    const tipoInfo = getTipoInfo(doc.tipo_documento);
                                    const Icon = tipoInfo.icon;

                                    return (
                                        <motion.div
                                            key={doc.id}
                                            onClick={() => abrirModal(doc)}
                                            whileTap={{ scale: 0.98 }}
                                            className="p-4 transition-colors cursor-pointer active:bg-opacity-50"
                                            style={{
                                                backgroundColor: 'transparent',
                                                borderColor: colors.border
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = colors.hover;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="p-2 rounded-lg"
                                                        style={{ backgroundColor: `${tipoInfo.cor}15` }}
                                                    >
                                                        <Icon size={20} style={{ color: tipoInfo.cor }} />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium block text-sm" style={{ color: colors.text }}>
                                                            {doc.numero_documento}
                                                        </span>
                                                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                                                            {tipoInfo.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                <EstadoBadge estado={doc.estado} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                                <div>
                                                    <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>Data</p>
                                                    <p className="font-medium" style={{ color: colors.text }}>
                                                        {formatarData(doc.data_emissao)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>Valor</p>
                                                    <p className="font-bold" style={{ color: colors.primary }}>
                                                        {formatarValor(doc.total_liquido)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>Cliente</p>
                                                <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
                                                    {doc.cliente_nome || doc.cliente?.nome || 'Consumidor Final'}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Tabela Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b" style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
                                        <tr>
                                            <th className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                Documento
                                            </th>
                                            <th className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                Data
                                            </th>
                                            <th className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                Cliente
                                            </th>
                                            <th className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                Estado
                                            </th>
                                            <th className="py-4 px-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                Valor
                                            </th>
                                            <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                        {documentos.map((doc) => {
                                            const tipoInfo = getTipoInfo(doc.tipo_documento);
                                            const Icon = tipoInfo.icon;

                                            return (
                                                <tr
                                                    key={doc.id}
                                                    className="transition-colors group"
                                                    style={{ backgroundColor: 'transparent' }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = colors.hover;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="p-2 rounded-lg transition-transform group-hover:scale-110"
                                                                style={{ backgroundColor: `${tipoInfo.cor}15` }}
                                                            >
                                                                <Icon size={18} style={{ color: tipoInfo.cor }} />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-sm" style={{ color: colors.text }}>
                                                                    {doc.numero_documento}
                                                                </div>
                                                                <div className="text-xs" style={{ color: colors.textSecondary }}>
                                                                    {tipoInfo.label}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm" style={{ color: colors.text }}>
                                                        {formatarData(doc.data_emissao)}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="text-sm font-medium" style={{ color: colors.text }}>
                                                            {doc.cliente_nome || doc.cliente?.nome || 'Consumidor Final'}
                                                        </div>
                                                        {doc.cliente_nif && (
                                                            <div className="text-xs" style={{ color: colors.textSecondary }}>
                                                                NIF: {doc.cliente_nif}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <EstadoBadge estado={doc.estado} />
                                                    </td>
                                                    <td className="py-4 px-4 text-right font-bold text-sm" style={{ color: colors.primary }}>
                                                        {formatarValor(doc.total_liquido)}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    abrirModal(doc);
                                                                }}
                                                                className="p-2 rounded-lg transition-all"
                                                                style={{
                                                                    color: colors.textSecondary,
                                                                    backgroundColor: 'transparent'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = colors.hover;
                                                                    e.currentTarget.style.color = '#3B82F6';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                    e.currentTarget.style.color = colors.textSecondary;
                                                                }}
                                                                title="Visualizar"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownload(doc);
                                                                }}
                                                                className="p-2 rounded-lg transition-all"
                                                                style={{
                                                                    color: colors.textSecondary,
                                                                    backgroundColor: 'transparent'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = colors.hover;
                                                                    e.currentTarget.style.color = '#F97316';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                    e.currentTarget.style.color = colors.textSecondary;
                                                                }}
                                                                title="Download PDF"
                                                            >
                                                                <Download size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginação */}
                            {pagination.last_page > 1 && (
                                <div
                                    className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
                                    style={{ backgroundColor: colors.hover, borderColor: colors.border }}
                                >
                                    <p className="text-sm" style={{ color: colors.textSecondary }}>
                                        Mostrando <span className="font-medium" style={{ color: colors.text }}>{pagination.from}</span> - <span className="font-medium" style={{ color: colors.text }}>{pagination.to}</span> de <span className="font-medium" style={{ color: colors.text }}>{pagination.total}</span> documentos
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handlePageChange(page - 1)}
                                            disabled={page === 1}
                                            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                backgroundColor: colors.card,
                                                color: colors.text,
                                                border: `1px solid ${colors.border}`
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!(page === 1)) {
                                                    e.currentTarget.style.backgroundColor = colors.hover;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = colors.card;
                                            }}
                                        >
                                            <ChevronLeft size={16} />
                                            Anterior
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                                let pageNum;
                                                if (pagination.last_page <= 5) {
                                                    pageNum = i + 1;
                                                } else if (page <= 3) {
                                                    pageNum = i + 1;
                                                } else if (page >= pagination.last_page - 2) {
                                                    pageNum = pagination.last_page - 4 + i;
                                                } else {
                                                    pageNum = page - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${page === pageNum ? 'text-white' : ''
                                                            }`}
                                                        style={page === pageNum
                                                            ? { backgroundColor: colors.primary }
                                                            : {
                                                                backgroundColor: colors.card,
                                                                color: colors.text,
                                                                border: `1px solid ${colors.border}`
                                                            }
                                                        }
                                                        onMouseEnter={(e) => {
                                                            if (page !== pageNum) {
                                                                e.currentTarget.style.backgroundColor = colors.hover;
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (page !== pageNum) {
                                                                e.currentTarget.style.backgroundColor = colors.card;
                                                            }
                                                        }}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(page + 1)}
                                            disabled={page === pagination.last_page}
                                            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                backgroundColor: colors.card,
                                                color: colors.text,
                                                border: `1px solid ${colors.border}`
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!(page === pagination.last_page)) {
                                                    e.currentTarget.style.backgroundColor = colors.hover;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = colors.card;
                                            }}
                                        >
                                            Próximo
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Visualização */}
            {modalOpen && documentoSelecionado && (
                <ModalVisualizacao
                    documento={documentoSelecionado}
                    isOpen={modalOpen}
                    onClose={fecharModal}
                    onDownload={() => handleDownload(documentoSelecionado)}
                />
            )}
        </MainEmpresa>
    );
}