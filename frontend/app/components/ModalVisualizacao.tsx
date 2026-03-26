// src/app/dashboard/Faturas/OutrosDocumentos/components/ModalVisualizacao.tsx

"use client";

import React from "react";

import {
    FileText,
    X,
    Calendar,
    User,
    FileWarning,
    CreditCard,
    FileX,
    FileCheck,
    Printer,
    Download
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

import { DocumentoFiscal, TipoDocumento, EstadoDocumento } from "@/services/DocumentoFiscal";
import { useThemeColors, useTheme } from "@/context/ThemeContext";

// ==================== CONSTANTES ====================

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

// ==================== SUB-COMPONENTES ====================

interface EstadoBadgeProps {
    estado: EstadoDocumento;
}

const EstadoBadge: React.FC<EstadoBadgeProps> = ({ estado }) => {
    const { theme } = useTheme();
    const config = getEstadoConfig(estado, theme);
    return (
        <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
            {config.label}
        </span>
    );
};

interface ModalHeaderProps {
    documento: DocumentoFiscal;
    onClose: () => void;
    onPrint: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ documento, onClose, onPrint }) => {
    const colors = useThemeColors();
    const tipoInfo = getTipoInfo(documento.tipo_documento);
    const Icon = tipoInfo.icon;

    return (
        <div
            className="flex items-center justify-between p-3 border-b sm:p-4 shrink-0"
            style={{ backgroundColor: colors.primary, borderColor: colors.border }}
        >
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg">
                    <Icon size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white break-all sm:text-lg sm:break-normal">
                        {documento.numero_documento}
                    </h2>
                    <p className="text-white/80 text-[10px] sm:text-xs">{tipoInfo.label}</p>
                </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                    onClick={onPrint}
                    className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Imprimir"
                >
                    <Printer size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button
                    onClick={onClose}
                    className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Fechar"
                    aria-label="Fechar modal"
                >
                    <X size={18} className="sm:w-5 sm:h-5" />
                </button>
            </div>
        </div>
    );
};

interface InfoGridProps {
    documento: DocumentoFiscal;
}

const InfoGrid: React.FC<InfoGridProps> = ({ documento }) => {
    const colors = useThemeColors();

    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            {/* Cliente */}
            <div
                className="p-2 border rounded-lg sm:p-3"
                style={{ backgroundColor: colors.hover, borderColor: colors.border }}
            >
                <h3 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-1.5" style={{ color: colors.text }}>
                    <User size={12} className="sm:w-[14px] sm:h-[14px]" />
                    Cliente
                </h3>
                <p className="text-xs font-medium break-words sm:text-sm" style={{ color: colors.text }}>
                    {documento.cliente_nome || documento.cliente?.nome || 'Consumidor Final'}
                </p>
                {(documento.cliente_nif || documento.cliente?.telefone) && (
                    <div className="mt-1 space-y-0.5">
                        {documento.cliente_nif && (
                            <p className="text-[10px] sm:text-xs" style={{ color: colors.textSecondary }}>
                                NIF: {documento.cliente_nif}
                            </p>
                        )}
                        {documento.cliente?.telefone && (
                            <p className="text-[10px] sm:text-xs" style={{ color: colors.textSecondary }}>
                                Tel: {documento.cliente.telefone}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Documento Origem */}
            {documento.documentoOrigem && (
                <div
                    className="p-2 border rounded-lg sm:p-3"
                    style={{ backgroundColor: colors.hover, borderColor: colors.border }}
                >
                    <h3 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-1.5" style={{ color: colors.text }}>
                        <FileText size={12} className="sm:w-[14px] sm:h-[14px]" />
                        Doc. Origem
                    </h3>
                    <p className="text-xs font-medium break-words sm:text-sm" style={{ color: colors.text }}>
                        {documento.documentoOrigem.numero_documento}
                    </p>
                    <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                        {getTipoInfo(documento.documentoOrigem.tipo_documento).label}
                    </p>
                </div>
            )}
        </div>
    );
};

interface ItensTableProps {
    itens: DocumentoFiscal['itens'];
}

const ItensTable: React.FC<ItensTableProps> = ({ itens }) => {
    const colors = useThemeColors();

    if (!itens || itens.length === 0) {
        return (
            <div
                className="py-3 text-xs text-center border rounded-lg sm:py-4 sm:text-sm"
                style={{ backgroundColor: colors.hover, borderColor: colors.border, color: colors.textSecondary }}
            >
                Nenhum item encontrado
            </div>
        );
    }

    return (
        <div className="overflow-hidden border rounded-lg" style={{ borderColor: colors.border }}>
            <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                    <thead
                        className="border-b"
                        style={{ backgroundColor: colors.hover, borderColor: colors.border }}
                    >
                        <tr>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-[10px] sm:text-xs font-medium uppercase" style={{ color: colors.textSecondary }}>
                                Descrição
                            </th>
                            <th className="text-center py-2 sm:py-3 px-1 sm:px-2 text-[10px] sm:text-xs font-medium uppercase w-12 sm:w-16" style={{ color: colors.textSecondary }}>
                                Qtd
                            </th>
                            <th className="text-right py-2 sm:py-3 px-1 sm:px-2 text-[10px] sm:text-xs font-medium uppercase w-16 sm:w-24" style={{ color: colors.textSecondary }}>
                                Unit.
                            </th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-3 text-[10px] sm:text-xs font-medium uppercase w-20 sm:w-28" style={{ color: colors.textSecondary }}>
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                        {itens.map((item, index) => (
                            <tr key={item.id || `item-${index}`} className="transition-colors hover:bg-opacity-50">
                                <td className="px-2 py-2 sm:py-3 sm:px-3">
                                    <div className="break-words max-w-[150px] sm:max-w-[250px]" style={{ color: colors.text }}>
                                        {item.descricao}
                                    </div>
                                    {item.codigo_produto && (
                                        <span className="text-[9px] sm:text-xs block mt-0.5" style={{ color: colors.textSecondary }}>
                                            Cód: {item.codigo_produto}
                                        </span>
                                    )}
                                </td>
                                <td className="px-1 py-2 text-center sm:py-3 sm:px-2" style={{ color: colors.textSecondary }}>
                                    <span className="text-[11px] sm:text-sm">{item.quantidade}</span>
                                    {item.unidade && (
                                        <span className="text-[9px] sm:text-xs ml-0.5" style={{ color: colors.textSecondary }}>
                                            {item.unidade}
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 sm:py-3 px-1 sm:px-2 text-right text-[11px] sm:text-sm" style={{ color: colors.text }}>
                                    {formatarValor(item.preco_unitario)}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-3 text-right font-medium text-[11px] sm:text-sm" style={{ color: colors.primary }}>
                                    {formatarValor(item.total_linha || (item.quantidade * item.preco_unitario))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface TotaisSectionProps {
    documento: DocumentoFiscal;
}

const TotaisSection: React.FC<TotaisSectionProps> = ({ documento }) => {
    const colors = useThemeColors();

    return (
        <div
            className="p-2 space-y-1 text-xs border rounded-lg sm:p-3 sm:text-sm"
            style={{ backgroundColor: colors.hover, borderColor: colors.border }}
        >
            <div className="flex justify-between text-[11px] sm:text-sm">
                <span style={{ color: colors.textSecondary }}>Base Tributável</span>
                <span className="font-medium" style={{ color: colors.text }}>{formatarValor(documento.base_tributavel)}</span>
            </div>
            <div className="flex justify-between text-[11px] sm:text-sm">
                <span style={{ color: colors.textSecondary }}>Total IVA</span>
                <span className="font-medium" style={{ color: colors.text }}>{formatarValor(documento.total_iva)}</span>
            </div>
            {documento.total_retencao > 0 && (
                <div className="flex justify-between text-[11px] sm:text-sm">
                    <span style={{ color: colors.textSecondary }}>Retenção</span>
                    <span className="font-medium text-red-500">-{formatarValor(documento.total_retencao)}</span>
                </div>
            )}
            <div className="border-t pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 flex justify-between items-center" style={{ borderColor: colors.border }}>
                <span className="text-sm font-semibold sm:text-base" style={{ color: colors.text }}>Total</span>
                <span className="text-sm font-bold sm:text-lg" style={{ color: colors.primary }}>
                    {formatarValor(documento.total_liquido)}
                </span>
            </div>
        </div>
    );
};

interface ObservacoesSectionProps {
    observacoes?: string | null;
}

const ObservacoesSection: React.FC<ObservacoesSectionProps> = ({ observacoes }) => {
    const colors = useThemeColors();
    const { theme } = useTheme(); // ✅ hook adicionado — theme estava indefinido antes

    if (!observacoes) return null;

    return (
        <div
            className="p-2 border rounded-lg sm:p-3"
            style={{
                backgroundColor: theme === 'dark' ? 'rgba(234, 179, 8, 0.1)' : '#fefce8',
                borderColor: theme === 'dark' ? '#854d0e' : '#fde047'
            }}
        >
            <h3 className="text-[10px] sm:text-xs font-semibold mb-1" style={{ color: colors.text }}>Observações</h3>
            <p className="text-[11px] sm:text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{observacoes}</p>
        </div>
    );
};

interface HashFiscalSectionProps {
    hashFiscal?: string | null;
}

const HashFiscalSection: React.FC<HashFiscalSectionProps> = ({ hashFiscal }) => {
    const colors = useThemeColors();

    if (!hashFiscal) return null;

    return (
        <div className="pt-2 text-center">
            <p className="text-[8px] sm:text-[10px] font-mono break-all leading-tight" style={{ color: colors.textSecondary }}>
                Hash: {hashFiscal}
            </p>
        </div>
    );
};

interface ModalFooterProps {
    onClose: () => void;
    onDownload: () => void;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ onClose, onDownload }) => {
    const colors = useThemeColors();

    return (
        <div
            className="flex flex-col justify-end gap-2 p-3 border-t sm:p-4 sm:flex-row shrink-0"
            style={{ backgroundColor: colors.hover, borderColor: colors.border }}
        >
            <button
                onClick={onClose}
                className="order-2 w-full px-3 py-2 text-xs transition-colors rounded-lg sm:w-auto sm:px-4 sm:text-sm sm:order-1"
                style={{ backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}` }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.hover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.card; }}
            >
                Fechar
            </button>
            <button
                onClick={onDownload}
                className="flex items-center justify-center order-1 w-full gap-1 px-3 py-2 text-xs text-white transition-colors rounded-lg sm:w-auto sm:px-4 sm:text-sm hover:opacity-90 sm:gap-2 sm:order-2"
                style={{ backgroundColor: colors.secondary }}
            >
                <Download size={14} className="sm:w-4 sm:h-4" />
                PDF
            </button>
        </div>
    );
};

interface StatusHeaderProps {
    documento: DocumentoFiscal;
}

const StatusHeader: React.FC<StatusHeaderProps> = ({ documento }) => {
    const colors = useThemeColors();

    return (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <EstadoBadge estado={documento.estado} />
            <span className="text-[10px] sm:text-xs flex items-center gap-1" style={{ color: colors.textSecondary }}>
                <Calendar size={12} className="sm:w-3 sm:h-3" />
                {formatarData(documento.data_emissao)}
            </span>
            {documento.data_vencimento && (
                <span className="text-[10px] sm:text-xs flex items-center gap-1" style={{ color: colors.textSecondary }}>
                    <Calendar size={12} className="sm:w-3 sm:h-3" />
                    Vence {formatarData(documento.data_vencimento)}
                </span>
            )}
        </div>
    );
};

// ==================== COMPONENTE PRINCIPAL ====================

interface ModalVisualizacaoProps {
    documento: DocumentoFiscal;
    isOpen: boolean;
    onClose: () => void;
    onDownload?: () => void;
}

export const ModalVisualizacao: React.FC<ModalVisualizacaoProps> = ({
    documento,
    isOpen,
    onClose,
    onDownload
}) => {
    const colors = useThemeColors();

    const handlePrint = () => window.print();

    const handleDownload = () => {
        if (onDownload) {
            onDownload();
        } else {
            console.log('Download não implementado');
        }
    };

    // Previne scroll do body quando modal está aberto
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={onClose} />

            {/* Modal Container */}
            <div
                className="fixed inset-0 z-[101] overflow-y-auto"
                onClick={onClose}
            >
                <div className="flex items-center justify-center min-h-full p-2 text-center sm:p-4">
                    <div
                        className="relative w-full max-w-3xl overflow-hidden text-left align-middle transition-all transform shadow-xl rounded-xl sm:rounded-2xl"
                        style={{ backgroundColor: colors.card }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ModalHeader
                            documento={documento}
                            onClose={onClose}
                            onPrint={handlePrint}
                        />

                        <div className="max-h-[calc(100vh-180px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                            <StatusHeader documento={documento} />
                            <InfoGrid documento={documento} />
                            <ItensTable itens={documento.itens} />
                            <TotaisSection documento={documento} />
                            <ObservacoesSection observacoes={documento.observacoes} />
                            <HashFiscalSection hashFiscal={documento.hash_fiscal} />
                        </div>

                        <ModalFooter
                            onClose={onClose}
                            onDownload={handleDownload}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ModalVisualizacao;
