// src/app/dashboard/Faturas/OutrosDocumentos/components/ModalVisualizacao.tsx

"use client";

import React from "react";
import {
    FileText,
    Calendar,
    User,
    FileWarning,
    CreditCard,
    FileX,
    FileCheck,
    Printer,
    Download,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { DocumentoFiscal, TipoDocumento, EstadoDocumento } from "@/services/DocumentoFiscal";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const TIPOS_DOCUMENTO = [
    { value: "FP" as TipoDocumento, label: "Proforma", icon: FileWarning, cor: "#f97316" },
    { value: "FA" as TipoDocumento, label: "Adiantamento", icon: CreditCard, cor: "#8b5cf6" },
    { value: "NC" as TipoDocumento, label: "Nota de Crédito", icon: FileX, cor: "#ef4444" },
    { value: "ND" as TipoDocumento, label: "Nota de Débito", icon: FileX, cor: "#f59e0b" },
    { value: "FRt" as TipoDocumento, label: "Retificação", icon: FileCheck, cor: "#ec4899" },
] as const;

const getEstadoConfig = (estado: EstadoDocumento, theme: string) => {
    const configs = {
        emitido: { bg: theme === "dark" ? "bg-blue-900/30" : "bg-blue-100", text: theme === "dark" ? "text-blue-300" : "text-blue-700", border: theme === "dark" ? "border-blue-800" : "border-blue-200", label: "Emitido" },
        paga: { bg: theme === "dark" ? "bg-green-900/30" : "bg-green-100", text: theme === "dark" ? "text-green-300" : "text-green-700", border: theme === "dark" ? "border-green-800" : "border-green-200", label: "Pago" },
        parcialmente_paga: { bg: theme === "dark" ? "bg-orange-900/30" : "bg-orange-100", text: theme === "dark" ? "text-orange-300" : "text-orange-700", border: theme === "dark" ? "border-orange-800" : "border-orange-200", label: "Parcial" },
        cancelado: { bg: theme === "dark" ? "bg-red-900/30" : "bg-red-100", text: theme === "dark" ? "text-red-300" : "text-red-700", border: theme === "dark" ? "border-red-800" : "border-red-200", label: "Cancelado" },
        expirado: { bg: theme === "dark" ? "bg-gray-800" : "bg-gray-100", text: theme === "dark" ? "text-gray-300" : "text-gray-700", border: theme === "dark" ? "border-gray-700" : "border-gray-200", label: "Expirado" },
    };
    return configs[estado] || configs.emitido;
};

const formatarValor = (valor: number) =>
    valor.toLocaleString("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 2 }).replace("AOA", "Kz");

const formatarData = (data: string) => format(new Date(data), "dd/MM/yyyy", { locale: pt });

const getTipoInfo = (tipo: TipoDocumento) => TIPOS_DOCUMENTO.find((t) => t.value === tipo) || TIPOS_DOCUMENTO[0];

const EstadoBadge: React.FC<{ estado: EstadoDocumento }> = ({ estado }) => {
    const { theme } = useTheme();
    const config = getEstadoConfig(estado, theme);
    return (
        <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
            {config.label}
        </span>
    );
};

const InfoGrid: React.FC<{ documento: DocumentoFiscal }> = ({ documento }) => {
    const colors = useThemeColors();
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="p-2 border sm:p-3" style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
                <h3 className="text-[10px] sm:text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: colors.text }}>
                    <User size={12} /> Cliente
                </h3>
                <p className="text-xs font-medium break-words sm:text-sm" style={{ color: colors.text }}>
                    {documento.cliente_nome || documento.cliente?.nome || "Consumidor Final"}
                </p>
                {(documento.cliente_nif || documento.cliente?.telefone) && (
                    <div className="mt-1 space-y-0.5">
                        {documento.cliente_nif && <p className="text-[10px] sm:text-xs" style={{ color: colors.textSecondary }}>NIF: {documento.cliente_nif}</p>}
                        {documento.cliente?.telefone && <p className="text-[10px] sm:text-xs" style={{ color: colors.textSecondary }}>Tel: {documento.cliente.telefone}</p>}
                    </div>
                )}
            </div>
            {documento.documentoOrigem && (
                <div className="p-2 border sm:p-3" style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
                    <h3 className="text-[10px] sm:text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: colors.text }}>
                        <FileText size={12} /> Doc. Origem
                    </h3>
                    <p className="text-xs font-medium break-words sm:text-sm" style={{ color: colors.text }}>{documento.documentoOrigem.numero_documento}</p>
                    <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: colors.textSecondary }}>{getTipoInfo(documento.documentoOrigem.tipo_documento).label}</p>
                </div>
            )}
        </div>
    );
};

const ItensTable: React.FC<{ itens: DocumentoFiscal["itens"] }> = ({ itens }) => {
    const colors = useThemeColors();
    if (!itens || itens.length === 0) {
        return (
            <div className="py-3 text-xs text-center border" style={{ backgroundColor: colors.hover, borderColor: colors.border, color: colors.textSecondary }}>
                Nenhum item encontrado
            </div>
        );
    }
    return (
        <div className="overflow-hidden border" style={{ borderColor: colors.border }}>
            <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                    <thead className="border-b" style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
                        <tr>
                            {["Descrição", "Qtd", "Unit.", "Total"].map((h, i) => (
                                <th key={h} className={`py-2 px-2 sm:px-3 text-[10px] font-medium uppercase ${i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"}`} style={{ color: colors.textSecondary }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                        {itens.map((item, index) => (
                            <tr key={item.id || `item-${index}`}>
                                <td className="px-2 py-2 sm:px-3">
                                    <div className="break-words max-w-[150px] sm:max-w-[250px]" style={{ color: colors.text }}>{item.descricao}</div>
                                    {item.codigo_produto && <span className="text-[9px] block mt-0.5" style={{ color: colors.textSecondary }}>Cód: {item.codigo_produto}</span>}
                                </td>
                                <td className="px-1 py-2 text-center sm:px-2" style={{ color: colors.textSecondary }}>
                                    {item.quantidade}{item.unidade && <span className="text-[9px] ml-0.5">{item.unidade}</span>}
                                </td>
                                <td className="py-2 px-1 sm:px-2 text-right text-[11px] sm:text-sm" style={{ color: colors.text }}>{formatarValor(item.preco_unitario)}</td>
                                <td className="py-2 px-2 sm:px-3 text-right font-medium text-[11px] sm:text-sm" style={{ color: colors.primary }}>
                                    {formatarValor(item.total_linha || item.quantidade * item.preco_unitario)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TotaisSection: React.FC<{ documento: DocumentoFiscal }> = ({ documento }) => {
    const colors = useThemeColors();
    return (
        <div className="p-2 space-y-1 text-xs border sm:p-3" style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
            <div className="flex justify-between"><span style={{ color: colors.textSecondary }}>Base Tributável</span><span className="font-medium" style={{ color: colors.text }}>{formatarValor(documento.base_tributavel)}</span></div>
            <div className="flex justify-between"><span style={{ color: colors.textSecondary }}>Total IVA</span><span className="font-medium" style={{ color: colors.text }}>{formatarValor(documento.total_iva)}</span></div>
            {documento.total_retencao > 0 && (
                <div className="flex justify-between"><span style={{ color: colors.textSecondary }}>Retenção</span><span className="font-medium text-red-500">-{formatarValor(documento.total_retencao)}</span></div>
            )}
            <div className="border-t pt-1.5 mt-1.5 flex justify-between items-center" style={{ borderColor: colors.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.text }}>Total</span>
                <span className="text-sm font-bold" style={{ color: colors.primary }}>{formatarValor(documento.total_liquido)}</span>
            </div>
        </div>
    );
};

const ObservacoesSection: React.FC<{ observacoes?: string | null }> = ({ observacoes }) => {
    const colors = useThemeColors();
    const { theme } = useTheme();
    if (!observacoes) return null;
    return (
        <div className="p-2 border sm:p-3" style={{ backgroundColor: theme === "dark" ? "rgba(234,179,8,0.1)" : "#fefce8", borderColor: theme === "dark" ? "#854d0e" : "#fde047" }}>
            <h3 className="text-[10px] sm:text-xs font-semibold mb-1" style={{ color: colors.text }}>Observações</h3>
            <p className="text-[11px] sm:text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{observacoes}</p>
        </div>
    );
};

interface ModalVisualizacaoProps {
    documento: DocumentoFiscal;
    isOpen: boolean;
    onClose: () => void;
    onDownload?: () => void;
}

export const ModalVisualizacao: React.FC<ModalVisualizacaoProps> = ({ documento, isOpen, onClose, onDownload }) => {
    const colors = useThemeColors();
    const tipoInfo = getTipoInfo(documento.tipo_documento);
    const Icon = tipoInfo.icon;

    const handleDownload = () => { if (onDownload) onDownload(); };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent
                className="sm:max-w-3xl p-0"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <DialogHeader
                    className="p-4 border-b"
                    style={{ backgroundColor: colors.primary, borderColor: colors.border }}
                >
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <div className="p-1.5 bg-white/10">
                                <Icon size={16} className="text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-bold">{documento.numero_documento}</span>
                                <p className="text-white/80 text-[10px] font-normal">{tipoInfo.label}</p>
                            </div>
                        </DialogTitle>
                        <button
                            onClick={() => window.print()}
                            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                            title="Imprimir"
                        >
                            <Printer size={16} />
                        </button>
                    </div>
                </DialogHeader>

                <div className="p-4 overflow-y-auto max-h-[calc(90vh-130px)] space-y-3">
                    {/* Status */}
                    <div className="flex flex-wrap items-center gap-2">
                        <EstadoBadge estado={documento.estado} />
                        <span className="text-[10px] flex items-center gap-1" style={{ color: colors.textSecondary }}>
                            <Calendar size={12} />{formatarData(documento.data_emissao)}
                        </span>
                        {documento.data_vencimento && (
                            <span className="text-[10px] flex items-center gap-1" style={{ color: colors.textSecondary }}>
                                <Calendar size={12} />Vence {formatarData(documento.data_vencimento)}
                            </span>
                        )}
                    </div>

                    <InfoGrid documento={documento} />
                    <ItensTable itens={documento.itens} />
                    <TotaisSection documento={documento} />
                    <ObservacoesSection observacoes={documento.observacoes} />

                    {documento.hash_fiscal && (
                        <p className="text-[8px] font-mono break-all text-center" style={{ color: colors.textSecondary }}>
                            Hash: {documento.hash_fiscal}
                        </p>
                    )}
                </div>

                <div className="p-4 border-t flex gap-2" style={{ borderColor: colors.border }}>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium"
                        style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium hover:opacity-90"
                        style={{ backgroundColor: colors.secondary }}
                    >
                        <Download size={14} /> PDF
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ModalVisualizacao;
