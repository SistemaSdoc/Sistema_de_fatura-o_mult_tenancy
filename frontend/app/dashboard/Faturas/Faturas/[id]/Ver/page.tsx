"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, FileText, User, MinusCircle, PlusCircle,
    XCircle, Download, Loader2, Printer, Package, AlertTriangle,
    Receipt, Hash, Clock, UserCheck, Tag
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    ItemDocumento,
    TipoDocumento,
} from "@/services/DocumentoFiscal";
import { useThemeColors, useTheme } from "@/context/ThemeContext";

/* ── Constantes ─────────────────────────────────────── */
const TIPO_LABEL: Record<TipoDocumento, string> = {
    FT: "Fatura",
    FR: "Fatura-Recibo",
    FP: "Fatura Proforma",
    FA: "Fatura de Adiantamento",
    NC: "Nota de Crédito",
    ND: "Nota de Débito",
    RC: "Recibo",
    FRt: "Fatura de Retificação",
};

const METODOS_PAGAMENTO: Record<string, string> = {
    transferencia: "Transferência Bancária",
    multibanco: "Multibanco",
    dinheiro: "Dinheiro",
    cheque: "Cheque",
    cartao: "Cartão",
};

/* ── Utilitários ─────────────────────────────────────── */
const fmtKz = (v?: number | null) =>
    v == null
        ? "0,00 Kz"
        : Number(v).toLocaleString("pt-AO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          }) + " Kz";

const fmtData = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-AO") : "—";

const fmtHora = (h?: string | null) =>
    h ? String(h).substring(0, 5) : "—";

/* ── Badge ───────────────────────────────────────────── */
function Badge({ estado, colors }: { estado: string; colors: any }) {
    const map: Record<string, { bg: string; text: string; border: string }> = {
        emitido: {
            bg: `${colors.secondary}20`,
            text: colors.secondary,
            border: `${colors.secondary}30`,
        },
        cancelado: {
            bg: `${colors.danger}20`,
            text: colors.danger,
            border: `${colors.danger}30`,
        },
        paga: {
            bg: `${colors.success}20`,
            text: colors.success,
            border: `${colors.success}30`,
        },
        parcialmente_paga: {
            bg: `${colors.warning}20`,
            text: colors.warning,
            border: `${colors.warning}30`,
        },
        expirado: {
            bg: `${colors.textSecondary}20`,
            text: colors.textSecondary,
            border: `${colors.textSecondary}30`,
        },
    };
    const labels: Record<string, string> = {
        emitido: "Emitido",
        cancelado: "Cancelado",
        paga: "Pago",
        parcialmente_paga: "Parcial",
        expirado: "Expirado",
    };
    const style = map[estado] ?? map.emitido;
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded"
            style={{
                backgroundColor: style.bg,
                color: style.text,
                borderColor: style.border,
            }}
        >
            {labels[estado] ?? estado}
        </span>
    );
}

/* ── Linha info ──────────────────────────────────────── */
function Row({
    label,
    value,
    link,
    onLink,
    colors,
    accent,
    mono,
}: {
    label: string;
    value: React.ReactNode;
    link?: boolean;
    onLink?: () => void;
    colors: any;
    accent?: string;
    mono?: boolean;
}) {
    return (
        <div
            className="flex justify-between items-start py-1.5 text-sm border-b last:border-0 gap-4"
            style={{ borderColor: colors.border }}
        >
            <span className="shrink-0" style={{ color: colors.textSecondary }}>
                {label}
            </span>
            {link && onLink ? (
                <button
                    onClick={onLink}
                    className="font-medium text-right underline underline-offset-2 transition-colors"
                    style={{ color: accent ?? colors.secondary }}
                >
                    {value}
                </button>
            ) : (
                <span
                    className={`font-medium text-right ${mono ? "font-mono text-xs break-all" : ""}`}
                    style={{ color: colors.text }}
                >
                    {value || "—"}
                </span>
            )}
        </div>
    );
}

/* ── Tabela de itens ─────────────────────────────────── */
function ItensTable({
    itens,
    colors,
}: {
    itens: ItemDocumento[];
    colors: any;
}) {
    if (itens.length === 0) {
        return (
            <p
                className="px-4 py-4 text-sm italic text-center"
                style={{ color: colors.textSecondary }}
            >
                Sem itens
            </p>
        );
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr
                        className="border-b"
                        style={{
                            backgroundColor: colors.hover,
                            borderColor: colors.border,
                        }}
                    >
                        <th
                            className="px-3 py-2 text-left font-semibold"
                            style={{ color: colors.textSecondary }}
                        >
                            Descrição
                        </th>
                        <th
                            className="px-3 py-2 text-center font-semibold w-16"
                            style={{ color: colors.textSecondary }}
                        >
                            Qtd
                        </th>
                        <th
                            className="px-3 py-2 text-right font-semibold w-28"
                            style={{ color: colors.textSecondary }}
                        >
                            Preço
                        </th>
                        <th
                            className="px-3 py-2 text-right font-semibold w-16"
                            style={{ color: colors.textSecondary }}
                        >
                            IVA
                        </th>
                        {/* Coluna de retenção se existir */}
                        <th
                            className="px-3 py-2 text-right font-semibold w-20"
                            style={{ color: colors.textSecondary }}
                        >
                            Retenção
                        </th>
                        <th
                            className="px-3 py-2 text-right font-semibold w-28"
                            style={{ color: colors.textSecondary }}
                        >
                            Total
                        </th>
                    </tr>
                </thead>
                <tbody
                    className="divide-y"
                    style={{ borderColor: colors.border }}
                >
                    {itens.map((item, i) => (
                        <tr
                            key={item.id ?? i}
                            className="transition-colors"
                            style={{ backgroundColor: "transparent" }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    colors.hover)
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "transparent")
                            }
                        >
                            <td className="px-3 py-2">
                                <div
                                    className="font-medium"
                                    style={{ color: colors.text }}
                                >
                                    {item.descricao}
                                </div>
                                {item.codigo_produto && (
                                    <div
                                        className="text-xs"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        Ref: {item.codigo_produto}
                                    </div>
                                )}
                                {item.eh_servico && (
                                    <span
                                        className="text-xs"
                                        style={{ color: colors.secondary }}
                                    >
                                        Serviço
                                    </span>
                                )}
                            </td>
                            <td
                                className="px-3 py-2 text-center tabular-nums"
                                style={{ color: colors.text }}
                            >
                                {Number(item.quantidade ?? 0).toFixed(2)}
                            </td>
                            <td
                                className="px-3 py-2 text-right tabular-nums"
                                style={{ color: colors.text }}
                            >
                                {fmtKz(item.preco_unitario)}
                            </td>
                            <td
                                className="px-3 py-2 text-right tabular-nums"
                                style={{ color: colors.textSecondary }}
                            >
                                {Number(item.taxa_iva ?? 0).toFixed(1)}%
                            </td>
                            <td
                                className="px-3 py-2 text-right tabular-nums"
                                style={{ color: colors.textSecondary }}
                            >
                                {Number(item.taxa_retencao ?? 0) > 0
                                    ? `${Number(item.taxa_retencao).toFixed(1)}%`
                                    : "—"}
                            </td>
                            <td
                                className="px-3 py-2 text-right font-bold tabular-nums"
                                style={{ color: colors.text }}
                            >
                                {fmtKz(item.total_linha)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ── Secção de Totais Completa ────────────────────────── */
function TotaisSection({
    nota,
    docParaTotais,
    colors,
    accent,
}: {
    nota: DocumentoFiscal;
    docParaTotais: DocumentoFiscal;
    colors: any;
    accent: string;
}) {
    const isNC = nota.tipo_documento === "NC";
    const isND = nota.tipo_documento === "ND";
    const isFR = nota.tipo_documento === "FR";
    const isRC = nota.tipo_documento === "RC";
    const isFT = nota.tipo_documento === "FT";

    const base = Number(docParaTotais.base_tributavel ?? 0);
    const iva = Number(docParaTotais.total_iva ?? 0);
    const ret = Number(docParaTotais.total_retencao ?? 0);
    const total = Number(nota.total_liquido ?? 0);
    const pctIva = base > 0 ? (iva / base) * 100 : 0;
    const pctRet = base > 0 ? (ret / base) * 100 : 0;

    // Desconto global
    const descontoGlobal = Number(
        nota.venda?.desconto_global ??
        nota.desconto_global ??
        docParaTotais.venda?.desconto_global ??
        docParaTotais.desconto_global ??
        0
    );
    const troco = Number(
        nota.venda?.troco ?? nota.troco ??
        docParaTotais.venda?.troco ?? docParaTotais.troco ?? 0
    );
    const subtotalBruto = base + descontoGlobal;
    const pctDesconto =
        descontoGlobal > 0 && subtotalBruto > 0
            ? (descontoGlobal / subtotalBruto) * 100
            : 0;
    const temDesconto = descontoGlobal > 0;
    const temTroco = troco > 0;

    const metodoPagamento =
        (isFR || isRC) && nota.metodo_pagamento
            ? METODOS_PAGAMENTO[nota.metodo_pagamento] ??
              nota.metodo_pagamento
            : null;

    const labelTotal = isFT
        ? "TOTAL A PAGAR"
        : isFR || isRC
        ? "TOTAL PAGO"
        : isNC
        ? "TOTAL (CRÉDITO)"
        : isND
        ? "TOTAL (DÉBITO)"
        : "TOTAL";

    return (
        <div className="px-4 py-3 flex justify-end">
            <div className="w-full sm:w-72 space-y-0">
                {temDesconto && (
                    <>
                        <Row
                            label="Subtotal bruto"
                            value={fmtKz(subtotalBruto)}
                            colors={colors}
                        />
                        <Row
                            label={`Desconto (${pctDesconto.toFixed(2)}%)`}
                            value={`− ${fmtKz(descontoGlobal)}`}
                            colors={colors}
                        />
                    </>
                )}
                <Row
                    label="Base Tributável"
                    value={fmtKz(base)}
                    colors={colors}
                />
                <Row
                    label={`IVA (${pctIva.toFixed(1)}%)`}
                    value={fmtKz(iva)}
                    colors={colors}
                />
                {ret > 0 && (
                    <Row
                        label={`Retenção (${pctRet.toFixed(1)}%)`}
                        value={`− ${fmtKz(ret)}`}
                        colors={colors}
                    />
                )}
                {metodoPagamento && (
                    <Row
                        label="Forma de Pagamento"
                        value={metodoPagamento}
                        colors={colors}
                    />
                )}
                {temTroco && (
                    <Row
                        label="Troco"
                        value={fmtKz(troco)}
                        colors={colors}
                    />
                )}
                <div
                    className="flex justify-between items-center pt-2 border-t mt-1"
                    style={{ borderColor: colors.border }}
                >
                    <span
                        className="text-sm font-bold"
                        style={{ color: colors.text }}
                    >
                        {labelTotal}
                    </span>
                    <span
                        className="text-base font-bold"
                        style={{ color: accent }}
                    >
                        {isNC ? "−" : isND ? "+" : ""}
                        {fmtKz(total)}
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ── Secção Fiscal (QR Code + Hash) ──────────────────── */


/* ── Modal de geração NC / ND ────────────────────────── */
function ModalNota({
    tipo,
    documento,
    onClose,
    onSuccess,
    colors,
    theme,
}: {
    tipo: "NC" | "ND";
    documento: DocumentoFiscal;
    onClose: () => void;
    onSuccess: (nota: DocumentoFiscal) => void;
    colors: any;
    theme: string;
}) {
    const isNC = tipo === "NC";
    const accent = isNC ? colors.danger : colors.success;
    const itensOriginais = documento.itens ?? [];

    const [motivo, setMotivo] = useState("");
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [quantidades, setQtd] = useState<Record<string, number>>(
        Object.fromEntries(
            itensOriginais.map((item, i) => [
                `${item.id ?? i}`,
                Number(item.quantidade),
            ])
        )
    );

    const itensComChave = itensOriginais.map((item, i) => ({
        ...item,
        _key: `${item.id ?? i}`,
    }));

    const totalSelecionado = itensComChave.reduce((acc, item) => {
        const qtd = quantidades[item._key] ?? 0;
        const preco = Number(item.preco_unitario ?? 0);
        const taxa = Number(item.taxa_iva ?? 0);
        return acc + qtd * preco * (1 + taxa / 100);
    }, 0);

    const handleGerar = async () => {
        if (isNC && !motivo.trim()) {
            setErro("O motivo é obrigatório para Nota de Crédito.");
            return;
        }
        const itens = itensComChave
            .filter((item) => (quantidades[item._key] ?? 0) > 0)
            .map((item) => ({
                produto_id: item.produto_id ?? undefined,
                descricao: item.descricao,
                quantidade: quantidades[item._key],
                preco_unitario: Number(item.preco_unitario),
                taxa_iva: Number(item.taxa_iva),
            }));

        if (itens.length === 0) {
            setErro("Seleccione pelo menos um item.");
            return;
        }
        try {
            setLoading(true);
            setErro(null);
            const nota = isNC
                ? await documentoFiscalService.criarNotaCredito(documento.id, {
                      itens,
                      motivo,
                  })
                : await documentoFiscalService.criarNotaDebito(documento.id, {
                      itens,
                      motivo,
                  });
            onSuccess(nota);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Erro ao gerar nota.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={onClose}
        >
            <div
                className="border rounded w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{
                        borderLeftWidth: 4,
                        borderLeftColor: accent,
                        borderLeftStyle: "solid",
                        borderBottomColor: colors.border,
                    }}
                >
                    <div className="flex items-center gap-2">
                        {isNC ? (
                            <MinusCircle
                                className="w-4 h-4"
                                style={{ color: accent }}
                            />
                        ) : (
                            <PlusCircle
                                className="w-4 h-4"
                                style={{ color: accent }}
                            />
                        )}
                        <span
                            className="font-bold text-sm"
                            style={{ color: colors.text }}
                        >
                            Gerar{" "}
                            {isNC ? "Nota de Crédito" : "Nota de Débito"}
                        </span>
                        <span
                            className="text-xs"
                            style={{ color: colors.textSecondary }}
                        >
                            — {documento.numero_documento}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded"
                        style={{ color: colors.textSecondary }}
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div>
                        <label
                            className="block text-xs font-semibold mb-1"
                            style={{ color: colors.text }}
                        >
                            Motivo{" "}
                            {isNC && (
                                <span style={{ color: colors.danger }}>*</span>
                            )}
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder={
                                isNC
                                    ? "Ex: Devolução de mercadoria…"
                                    : "Ex: Custos adicionais…"
                            }
                            rows={2}
                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.text,
                            }}
                        />
                    </div>

                    <div>
                        <p
                            className="text-xs font-semibold mb-2"
                            style={{ color: colors.text }}
                        >
                            Seleccionar itens
                        </p>
                        <div
                            className="border rounded divide-y"
                            style={{ borderColor: colors.border }}
                        >
                            {itensComChave.length === 0 ? (
                                <p
                                    className="px-3 py-3 text-sm italic text-center"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Sem itens disponíveis
                                </p>
                            ) : (
                                itensComChave.map((item) => (
                                    <div
                                        key={item._key}
                                        className="flex items-center justify-between px-3 py-2 gap-3"
                                        style={{ borderColor: colors.border }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className="text-sm font-medium truncate"
                                                style={{ color: colors.text }}
                                            >
                                                {item.descricao}
                                            </p>
                                            <p
                                                className="text-xs"
                                                style={{
                                                    color: colors.textSecondary,
                                                }}
                                            >
                                                {fmtKz(item.preco_unitario)} ·
                                                IVA {item.taxa_iva}%
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() =>
                                                    setQtd((q) => ({
                                                        ...q,
                                                        [item._key]: Math.max(
                                                            0,
                                                            (q[item._key] ??
                                                                0) - 1
                                                        ),
                                                    }))
                                                }
                                                className="w-6 h-6 flex items-center justify-center border rounded text-sm"
                                                style={{
                                                    borderColor: colors.border,
                                                    color: colors.textSecondary,
                                                }}
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                min={0}
                                                max={Number(item.quantidade)}
                                                value={
                                                    quantidades[item._key] ?? 0
                                                }
                                                onChange={(e) =>
                                                    setQtd((q) => ({
                                                        ...q,
                                                        [item._key]: Math.min(
                                                            Number(
                                                                item.quantidade
                                                            ),
                                                            Math.max(
                                                                0,
                                                                Number(
                                                                    e.target
                                                                        .value
                                                                )
                                                            )
                                                        ),
                                                    }))
                                                }
                                                className="w-14 text-center text-sm border rounded px-1 py-0.5 focus:outline-none"
                                                style={{
                                                    backgroundColor:
                                                        colors.background,
                                                    borderColor: colors.border,
                                                    color: colors.text,
                                                }}
                                            />
                                            <button
                                                onClick={() =>
                                                    setQtd((q) => ({
                                                        ...q,
                                                        [item._key]: Math.min(
                                                            Number(
                                                                item.quantidade
                                                            ),
                                                            (q[item._key] ??
                                                                0) + 1
                                                        ),
                                                    }))
                                                }
                                                className="w-6 h-6 flex items-center justify-center border rounded text-sm"
                                                style={{
                                                    borderColor: colors.border,
                                                    color: colors.textSecondary,
                                                }}
                                            >
                                                +
                                            </button>
                                            <span
                                                className="text-xs w-8 text-center"
                                                style={{
                                                    color: colors.textSecondary,
                                                }}
                                            >
                                                /
                                                {Number(
                                                    item.quantidade
                                                ).toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div
                        className="flex justify-between items-center px-3 py-2 rounded border"
                        style={{
                            borderColor: accent + "40",
                            backgroundColor: accent + "08",
                        }}
                    >
                        <span
                            className="text-sm font-semibold"
                            style={{ color: colors.text }}
                        >
                            Total da Nota
                        </span>
                        <span
                            className="text-base font-bold"
                            style={{ color: accent }}
                        >
                            {isNC ? "−" : "+"}
                            {fmtKz(totalSelecionado)}
                        </span>
                    </div>

                    {erro && (
                        <div
                            className="flex items-center gap-2 px-3 py-2 border rounded text-sm"
                            style={{
                                backgroundColor: `${colors.danger}10`,
                                borderColor: `${colors.danger}30`,
                                color: colors.danger,
                            }}
                        >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {erro}
                        </div>
                    )}
                </div>

                <div
                    className="flex gap-2 px-4 py-3 border-t"
                    style={{
                        backgroundColor: colors.hover,
                        borderColor: colors.border,
                    }}
                >
                    <button
                        onClick={onClose}
                        className="flex-1 px-3 py-2 text-sm font-medium border rounded"
                        style={{
                            backgroundColor: "transparent",
                            borderColor: colors.border,
                            color: colors.textSecondary,
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGerar}
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white rounded disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: accent }}
                    >
                        {loading && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {loading ? "A gerar…" : `Gerar ${tipo}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Componente principal ────────────────────────────── */
export default function VisualizarNotaPage() {
    const router = useRouter();
    const params = useParams();
    const notaId = params?.id as string;
    const colors = useThemeColors();
    const { theme } = useTheme();

    const [nota, setNota] = useState<DocumentoFiscal | null>(null);
    const [documentoOrigem, setDocumentoOrigem] =
        useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [baixandoPdf, setBaixandoPdf] = useState(false);
    const [modalTipo, setModalTipo] = useState<"NC" | "ND" | null>(null);

    const carregarNota = useCallback(async () => {
        if (!notaId) {
            setError("ID não fornecido");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const doc = await documentoFiscalService.buscarPorId(notaId);
            setNota(doc);
            if (
                (doc.tipo_documento === "NC" ||
                    doc.tipo_documento === "ND" ||
                    doc.tipo_documento === "RC") &&
                doc.documentoOrigem?.id
            ) {
                const origem = await documentoFiscalService.buscarPorId(
                    doc.documentoOrigem.id
                );
                setDocumentoOrigem(origem);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao carregar");
        } finally {
            setLoading(false);
        }
    }, [notaId]);

    useEffect(() => {
        carregarNota();
    }, [carregarNota]);

    const handleImprimir = () => {
        if (!nota?.id) return;
        const backend = `${window.location.protocol}//${window.location.hostname}:8000`;
        window.open(
            `${backend}/api/documentos-fiscais/${nota.id}/print?auto=1`,
            "_blank"
        );
    };

    const handleDownloadPDF = async () => {
        if (!nota?.id) return;
        try {
            setBaixandoPdf(true);
            await documentoFiscalService.downloadPdf(
                nota.id,
                `${nota.tipo_documento}_${nota.numero_documento ?? nota.id}.pdf`
            );
        } catch {
            alert("Erro ao baixar PDF.");
        } finally {
            setBaixandoPdf(false);
        }
    };

    const handleNotaGerada = (notaGerada: DocumentoFiscal) => {
        setModalTipo(null);
        router.push(
            `/dashboard/Faturas/Faturas/${notaGerada.id}/Ver_NC_ND`
        );
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-4xl mx-auto animate-pulse space-y-3">
                    <div
                        className="h-10 rounded w-1/3"
                        style={{ backgroundColor: colors.border }}
                    />
                    <div
                        className="h-48 rounded"
                        style={{ backgroundColor: colors.border }}
                    />
                </div>
            </MainEmpresa>
        );
    }

    /* ── Erro ── */
    if (error || !nota) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-4xl mx-auto">
                    <div
                        className="border p-6 text-center rounded"
                        style={{
                            backgroundColor: `${colors.danger}10`,
                            borderColor: `${colors.danger}30`,
                        }}
                    >
                        <XCircle
                            className="w-8 h-8 mx-auto mb-2"
                            style={{ color: colors.danger }}
                        />
                        <p
                            className="font-medium"
                            style={{ color: colors.danger }}
                        >
                            {error ?? "Documento não encontrado"}
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="mt-3 px-4 py-1.5 text-sm text-white rounded hover:opacity-90"
                            style={{ backgroundColor: colors.secondary }}
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    const isNC = nota.tipo_documento === "NC";
    const isND = nota.tipo_documento === "ND";
    const isRC = nota.tipo_documento === "RC";
    const accent = isNC
        ? colors.danger
        : isND
        ? colors.success
        : colors.secondary;

    const podeGerarNotas =
        ["FT", "FR"].includes(nota.tipo_documento) &&
        nota.estado !== "cancelado";

    /* Para recibos, usar itens do documento de origem */
    const itensParaExibir =
        isRC && documentoOrigem?.itens
            ? documentoOrigem.itens
            : nota.itens ?? [];

    /* Para totais de RC, usar doc de origem */
    const docParaTotais =
        isRC && documentoOrigem ? documentoOrigem : nota;

    /* Operador / utilizador */
    const operador = nota.user?.name  ?? "Sistema";

    return (
        <MainEmpresa>
            <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">

                {/* ── Barra de topo ── */}
                <div
                    className="flex items-center justify-between px-3 py-2.5 rounded border"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                    }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => router.back()}
                            className="p-1 rounded shrink-0"
                            style={{ color: colors.secondary }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    colors.hover)
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "transparent")
                            }
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span
                                    className="font-bold text-sm truncate"
                                    style={{ color: colors.text }}
                                >
                                    {nota.numero_documento}
                                </span>
                                <span
                                    className="text-xs shrink-0"
                                    style={{ color: colors.textSecondary }}
                                >
                                    {TIPO_LABEL[nota.tipo_documento]}
                                </span>
                                <Badge estado={nota.estado} colors={colors} />
                            </div>
                            <p
                                className="text-xs"
                                style={{ color: colors.textSecondary }}
                            >
                                {fmtData(nota.data_emissao)}
                                {nota.hora_emissao &&
                                    ` · ${fmtHora(nota.hora_emissao)}`}
                            </p>
                        </div>
                    </div>

                </div>

                {/* ── Card principal ── */}
                <div
                    className="border rounded divide-y"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                    }}
                >

                    {/* Linha 1: Cliente + Documento */}
                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x"
                        style={{ borderColor: colors.border }}
                    >
                        {/* Cliente */}
                        <div className="px-4 py-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <User
                                    className="w-3.5 h-3.5"
                                    style={{ color: colors.secondary }}
                                />
                                <span
                                    className="text-xs font-bold uppercase tracking-wider"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Cliente
                                </span>
                            </div>
                            <Row
                                label="Nome"
                                value={documentoFiscalService.getNomeCliente(nota)}
                                colors={colors}
                            />
                            {documentoFiscalService.getNifCliente(nota) && (
                                <Row
                                    label="NIF"
                                    value={documentoFiscalService.getNifCliente(nota)}
                                    colors={colors}
                                />
                            )}
                            {nota.cliente?.telefone && (
                                <Row
                                    label="Tel."
                                    value={nota.cliente.telefone}
                                    colors={colors}
                                />
                            )}
                            {nota.cliente?.email && (
                                <Row
                                    label="Email"
                                    value={nota.cliente.email}
                                    colors={colors}
                                />
                            )}
                            {(nota.cliente?.endereco ) && (
                                <Row
                                    label="Morada"
                                    value={nota.cliente.endereco }
                                    colors={colors}
                                />
                            )}
                        </div>

                        {/* Documento */}
                        <div className="px-4 py-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <FileText
                                    className="w-3.5 h-3.5"
                                    style={{ color: colors.secondary }}
                                />
                                <span
                                    className="text-xs font-bold uppercase tracking-wider"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Documento
                                </span>
                            </div>
                            <Row
                                label="Série"
                                value={nota.serie ?? "A"}
                                colors={colors}
                            />
                            <Row
                                label="Emissão"
                                value={fmtData(nota.data_emissao)}
                                colors={colors}
                            />
                            {nota.hora_emissao && (
                                <Row
                                    label="Hora"
                                    value={fmtHora(nota.hora_emissao)}
                                    colors={colors}
                                />
                            )}
                            <Row
                                label="Operador"
                                value={operador}
                                colors={colors}
                            />
                            {nota.motivo && (
                                <Row
                                    label="Motivo"
                                    value={nota.motivo}
                                    colors={colors}
                                />
                            )}
                            {/* Referência ao documento de origem (para RC, NC, ND) */}
                            {documentoOrigem && (
                                <Row
                                    label="Referente a"
                                    value={`${TIPO_LABEL[documentoOrigem.tipo_documento] ?? documentoOrigem.tipo_documento} Nº ${documentoOrigem.numero_documento}`}
                                    link
                                    onLink={() =>
                                        router.push(
                                            `/dashboard/Faturas/Faturas/${documentoOrigem.id}/Ver`
                                        )
                                    }
                                    colors={colors}
                                    accent={accent}
                                />
                            )}
                        </div>
                    </div>

                    {/* Linha 2: Produtos / Serviços */}
                    <div>
                        <div
                            className="flex items-center gap-1.5 px-4 py-2 border-b"
                            style={{
                                backgroundColor: colors.hover,
                                borderColor: colors.border,
                            }}
                        >
                            <Package
                                className="w-3.5 h-3.5"
                                style={{ color: colors.secondary }}
                            />
                            <span
                                className="text-xs font-bold uppercase tracking-wider"
                                style={{ color: colors.textSecondary }}
                            >
                                Produtos / Serviços
                            </span>
                            {isRC && documentoOrigem && (
                                <span
                                    className="text-xs ml-1"
                                    style={{ color: colors.textSecondary }}
                                >
                                    (do documento de origem)
                                </span>
                            )}
                        </div>
                        <ItensTable
                            itens={itensParaExibir}
                            colors={colors}
                        />
                    </div>

                    {/* Linha 3: Totais completos */}
                    <TotaisSection
                        nota={nota}
                        docParaTotais={docParaTotais}
                        colors={colors}
                        accent={accent}
                    />

                </div>
            </div>

            {/* ── Modal NC / ND ── */}
            {modalTipo && (
                <ModalNota
                    tipo={modalTipo}
                    documento={nota}
                    onClose={() => setModalTipo(null)}
                    onSuccess={handleNotaGerada}
                    colors={colors}
                    theme={theme}
                />
            )}
        </MainEmpresa>
    );
}