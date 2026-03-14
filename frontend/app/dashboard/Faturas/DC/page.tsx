// src/app/dashboard/Faturas/OutrosDocumentos/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    FileText,
    Eye,
    Download,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    FileWarning,
    CreditCard,
    FileX,
    FileCheck,
    ArrowLeft,
    RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

import MainEmpresa from "@/app/components/MainEmpresa";
import { documentoFiscalService, type DocumentoFiscal, type TipoDocumento, type EstadoDocumento } from "@/services/DocumentoFiscal";
import { ModalVisualizacao } from "@/app/components/ModalVisualizacao";
import { useThemeColors, useTheme } from "@/context/ThemeContext";

/* ─── Constantes ─────────────────────────────────────────────────── */
const TIPOS_PERMITIDOS: TipoDocumento[] = ["FP", "FA", "NC", "ND", "FRt"];

const TIPOS_DOC = {
    FP: { label: "Fatura Proforma", icon: FileWarning, cor: "#f97316" },
    FA: { label: "Fatura de Adiantamento", icon: CreditCard, cor: "#8b5cf6" },
    NC: { label: "Nota de Crédito", icon: FileX, cor: "#ef4444" },
    ND: { label: "Nota de Débito", icon: FileX, cor: "#f59e0b" },
    FRt: { label: "Fatura de Retificação", icon: FileCheck, cor: "#ec4899" },
} as const;

const ESTADO_CFG: Record<EstadoDocumento, { label: string; bg: string; text: string }> = {
    emitido: { label: "Emitido", bg: "#3B82F610", text: "#3B82F6" },
    paga: { label: "Pago", bg: "#10B98110", text: "#10B981" },
    parcialmente_paga: { label: "Parcial", bg: "#F97316" + "18", text: "#F97316" },
    cancelado: { label: "Cancelado", bg: "#EF444410", text: "#EF4444" },
    expirado: { label: "Expirado", bg: "#6B728010", text: "#6B7280" },
};

const ITENS_POR_PAG = 15;

/* ─── Utilitários ────────────────────────────────────────────────── */
const fmtValor = (v?: number | null) =>
    (Number(v) || 0)
        .toLocaleString("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 2 })
        .replace("AOA", "Kz");

const fmtData = (d?: string | null) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: pt }); }
    catch { return d; }
};

const getTipo = (tipo: TipoDocumento) =>
    TIPOS_DOC[tipo as keyof typeof TIPOS_DOC] ?? { label: tipo, icon: FileText, cor: "#6b7280" };

/* ─── Skeleton ───────────────────────────────────────────────────── */
const Skeleton = ({ colors }: { colors: any }) => (
    <div className="space-y-2 p-3">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border animate-pulse"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: colors.border }} />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 rounded w-28" style={{ backgroundColor: colors.border }} />
                        <div className="h-2.5 rounded w-44" style={{ backgroundColor: colors.border }} />
                    </div>
                    <div className="w-16 h-6 rounded-full" style={{ backgroundColor: colors.border }} />
                </div>
            </div>
        ))}
    </div>
);

/* ─── Badges ─────────────────────────────────────────────────────── */
const EstadoBadge = ({ estado }: { estado: EstadoDocumento }) => {
    const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.emitido;
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: cfg.bg, color: cfg.text }}>
            {cfg.label}
        </span>
    );
};

const TipoBadge = ({ tipo }: { tipo: TipoDocumento }) => {
    const t = getTipo(tipo);
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: `${t.cor}15`, color: t.cor }}>
            <t.icon size={10} />{t.label}
        </span>
    );
};

/* ══════════════════════════════════════════════════════════════════
PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export default function OutrosDocumentosPage() {
    const router = useRouter();
    const colors = useThemeColors();
    const { theme } = useTheme();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [docSel, setDocSel] = useState<DocumentoFiscal | null>(null);

    /* ── Carregar ── */
    const carregar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await documentoFiscalService.listar({
                page,
                per_page: ITENS_POR_PAG,
                apenas_nao_vendas: true // Usa o filtro do backend
            });

            // Filtra apenas os tipos permitidos (redundante com o filtro do backend, mas mantém compatibilidade)
            const filtrados = (data.data as DocumentoFiscal[]).filter(
                d => TIPOS_PERMITIDOS.includes(d.tipo_documento),
            );

            setDocumentos(filtrados);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                total: data.total,
            });
        } catch (err: any) {
            setError(err.message || "Erro ao carregar documentos fiscais");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { carregar(); }, [carregar]);

    /* ── Handlers ── */
    const mudarPagina = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

    const abrirModal = (doc: DocumentoFiscal) => {
        setDocSel(doc);
        setModalOpen(true);
    };

    const fecharModal = () => {
        setModalOpen(false);
        setTimeout(() => setDocSel(null), 300);
    };

    const handleDownload = async (doc: DocumentoFiscal) => {
        try {
            await documentoFiscalService.downloadPdf(doc.id, `${doc.numero_documento}.pdf`);
        } catch (error) {
            console.error("Erro ao baixar PDF:", error);
        }
    };

    /* ── Shared row hover style ── */
    const hoverProps = {
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = colors.hover;
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        },
    };

    /* ────────────────────────────────────────────────────────────── */
    return (
        <MainEmpresa>
            <div className="space-y-3 p-3 sm:p-4 pb-6 max-w-7xl mx-auto"
                style={{ backgroundColor: colors.background }}>

                {/* ── Cabeçalho ── */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.back()}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                            style={{ color: colors.primary, backgroundColor: `${colors.primary}10` }}>
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold" style={{ color: colors.primary }}>
                                Outros Documentos
                            </h1>
                            <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                                Proformas · Adiantamentos · Notas de Crédito/Débito · Retificações
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={carregar}
                        className="p-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: colors.border, color: colors.textSecondary, backgroundColor: colors.card }}
                        title="Recarregar">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* ── Card Principal ── */}
                <div className="rounded-xl border shadow-sm overflow-hidden"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}>

                    {/* Loading */}
                    {loading && <Skeleton colors={colors} />}

                    {/* Erro */}
                    {!loading && error && (
                        <div className="p-8 text-center">
                            <AlertCircle className="w-9 h-9 mx-auto mb-2" style={{ color: "#EF4444" }} />
                            <p className="text-sm mb-3" style={{ color: "#EF4444" }}>{error}</p>
                            <button
                                onClick={carregar}
                                className="px-4 py-1.5 text-white rounded-lg text-xs"
                                style={{ backgroundColor: colors.primary }}>
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {/* Vazio */}
                    {!loading && !error && documentos.length === 0 && (
                        <div className="p-10 text-center">
                            <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: colors.border }} />
                            <h3 className="text-sm font-medium mb-1" style={{ color: colors.text }}>
                                Nenhum documento encontrado
                            </h3>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                                Não há proformas, adiantamentos ou notas registadas
                            </p>
                        </div>
                    )}

                    {/* Lista */}
                    {!loading && !error && documentos.length > 0 && (
                        <>
                            {/* ── Mobile ── */}
                            <div className="md:hidden divide-y" style={{ borderColor: colors.border }}>
                                {documentos.map(doc => {
                                    const t = getTipo(doc.tipo_documento);
                                    return (
                                        <motion.div
                                            key={doc.id}
                                            whileTap={{ scale: 0.985 }}
                                            onClick={() => abrirModal(doc)}
                                            className="p-3 cursor-pointer transition-colors"
                                            {...hoverProps}>
                                            {/* Linha 1 */}
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="p-1.5 rounded-lg shrink-0"
                                                    style={{ backgroundColor: `${t.cor}15` }}>
                                                    <t.icon size={14} style={{ color: t.cor }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-semibold truncate"
                                                            style={{ color: colors.text }}>
                                                            {doc.numero_documento}
                                                        </span>
                                                        <EstadoBadge estado={doc.estado} />
                                                    </div>
                                                    <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                                                        {t.label} · {fmtData(doc.data_emissao)}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Linha 2 */}
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs truncate max-w-[60%]"
                                                    style={{ color: colors.textSecondary }}>
                                                    {documentoFiscalService.getNomeCliente(doc)}
                                                </p>
                                                <p className="text-sm font-bold" style={{ color: colors.primary }}>
                                                    {fmtValor(doc.total_liquido)}
                                                </p>
                                            </div>
                                            {/* Ações */}
                                            <div className="flex justify-end gap-0.5 mt-2 pt-2 border-t"
                                                style={{ borderColor: colors.border }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); abrirModal(doc); }}
                                                    className="p-1.5 rounded-lg transition-colors hover:opacity-60"
                                                    style={{ color: colors.textSecondary }}
                                                    title="Visualizar">
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                                    className="p-1.5 rounded-lg transition-colors hover:opacity-60"
                                                    style={{ color: colors.textSecondary }}
                                                    title="Download">
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* ── Desktop ── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b"
                                        style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
                                        <tr>
                                            {[
                                                ["Documento", "left"],
                                                ["Data", "left"],
                                                ["Cliente", "left"],
                                                ["Tipo", "left"],
                                                ["Estado", "left"],
                                                ["Valor", "right"],
                                                ["Ações", "center"],
                                            ].map(([h, align]) => (
                                                <th key={h}
                                                    className={`py-2.5 px-3 text-${align} text-[10px] font-semibold uppercase tracking-wider`}
                                                    style={{ color: colors.textSecondary }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                                        {documentos.map(doc => {
                                            const t = getTipo(doc.tipo_documento);
                                            return (
                                                <tr key={doc.id}
                                                    className="transition-colors cursor-pointer"
                                                    style={{ backgroundColor: "transparent" }}
                                                    onClick={() => abrirModal(doc)}
                                                    {...hoverProps}>
                                                    {/* Documento */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg"
                                                                style={{ backgroundColor: `${t.cor}15` }}>
                                                                <t.icon size={13} style={{ color: t.cor }} />
                                                            </div>
                                                            <span className="text-xs font-medium"
                                                                style={{ color: colors.text }}>
                                                                {doc.numero_documento}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {/* Data */}
                                                    <td className="py-2.5 px-3 text-xs whitespace-nowrap"
                                                        style={{ color: colors.textSecondary }}>
                                                        {fmtData(doc.data_emissao)}
                                                    </td>
                                                    {/* Cliente */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="text-xs font-medium truncate max-w-[160px]"
                                                            style={{ color: colors.text }}>
                                                            {documentoFiscalService.getNomeCliente(doc)}
                                                        </div>
                                                        {documentoFiscalService.getNifCliente(doc) && (
                                                            <div className="text-[10px]"
                                                                style={{ color: colors.textSecondary }}>
                                                                NIF: {documentoFiscalService.getNifCliente(doc)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* Tipo */}
                                                    <td className="py-2.5 px-3">
                                                        <TipoBadge tipo={doc.tipo_documento} />
                                                    </td>
                                                    {/* Estado */}
                                                    <td className="py-2.5 px-3">
                                                        <EstadoBadge estado={doc.estado} />
                                                    </td>
                                                    {/* Valor */}
                                                    <td className="py-2.5 px-3 text-right text-xs font-bold"
                                                        style={{ color: colors.primary }}>
                                                        {fmtValor(doc.total_liquido)}
                                                    </td>
                                                    {/* Ações */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center justify-center gap-0.5">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); abrirModal(doc); }}
                                                                className="p-1.5 rounded-lg transition-colors hover:opacity-60"
                                                                style={{ color: colors.textSecondary }}
                                                                title="Visualizar">
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                                                className="p-1.5 rounded-lg transition-colors hover:opacity-60"
                                                                style={{ color: colors.textSecondary }}
                                                                title="Download">
                                                                <Download size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Paginação ── */}
                            {pagination.last_page > 1 && (
                                <div className="px-3 py-2.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2"
                                    style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
                                    <p className="text-[10px]" style={{ color: colors.textSecondary }}>
                                        {pagination.total} documentos · pág {pagination.current_page}/{pagination.last_page}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => mudarPagina(page - 1)}
                                            disabled={page === 1}
                                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg disabled:opacity-40 transition-colors"
                                            style={{ backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}` }}>
                                            <ChevronLeft size={12} />Anterior
                                        </button>

                                        {/* Números de página */}
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                                                const p = i + 1;
                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => mudarPagina(p)}
                                                        className="w-7 h-7 rounded-lg text-[11px] font-medium transition-colors"
                                                        style={{
                                                            backgroundColor: p === page ? colors.primary : colors.card,
                                                            color: p === page ? "#fff" : colors.text,
                                                            border: `1px solid ${p === page ? colors.primary : colors.border}`,
                                                        }}>
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => mudarPagina(page + 1)}
                                            disabled={page === pagination.last_page}
                                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg disabled:opacity-40 transition-colors"
                                            style={{ backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}` }}>
                                            Próximo<ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal */}
            {modalOpen && docSel && (
                <ModalVisualizacao
                    documento={docSel}
                    isOpen={modalOpen}
                    onClose={fecharModal}
                    onDownload={() => handleDownload(docSel)}
                />
            )}
        </MainEmpresa>
    );
}