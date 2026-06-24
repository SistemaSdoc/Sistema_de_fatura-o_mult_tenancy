"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    User,
    MinusCircle,
    PlusCircle,
    XCircle,
    Loader2,
    Package,
    AlertTriangle,
    Receipt,
    Clock,
    FilePlus,
    FileMinus,
    Info,
    CheckCircle,
    AlertCircle as AlertCircleIcon,
    DollarSign,
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    ItemDocumento,
    TipoDocumento,
} from "@/services/DocumentoFiscal";
import { useThemeColors, LIGHT_COLORS } from "@/context/ThemeContext";
import { toast } from "sonner";

/* ── Constantes ─────────────────────────────────────── */
const TIPO_LABEL: Record<TipoDocumento, string> = {
    FT: "Factura",
    FR: "Factura-Recibo",
    FP: "Factura Proforma",
    FA: "Factura de Adiantamento",
    NC: "Nota de Crédito",
    ND: "Nota de Débito",
    RC: "Recibo",
    FRt: "Factura de Retificação",
};

const METODOS_PAGAMENTO: Record<string, string> = {
    transferencia: "Transferência Bancária",
    multibanco: "Multibanco",
    dinheiro: "Dinheiro",
    cheque: "Cheque",
    cartao: "Cartão",
};

const ESTADO_LABEL: Record<string, string> = {
    emitido: "Emitido",
    paga: "Pago",
    parcialmente_paga: "Parcial",
    cancelado: "Cancelado",
    expirado: "Expirado",
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
function Badge({ estado, colors }: { estado: string; colors: typeof LIGHT_COLORS }) {
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
            {ESTADO_LABEL[estado] ?? estado}
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
    colors: typeof LIGHT_COLORS;
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
    isNC,
    isND,
}: {
    itens: ItemDocumento[];
    colors: typeof LIGHT_COLORS;
    isNC?: boolean;
    isND?: boolean;
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
                                    {isNC && <span style={{ color: colors.secondary }}>− </span>}
                                    {isND && <span style={{ color: colors.primary }}>+ </span>}
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
                                {item.produto?.tipo === 'servico' && (
                                    <span
                                        className="text-xs"
                                        style={{ color: colors.secondary }}
                                    >
                                        Serviço
                                    </span>
                                )}
                                {isND && item.produto?.tipo === 'produto' && (
                                    <span
                                        className="text-xs"
                                        style={{ color: colors.danger }}
                                    >
                                        Produto (não permitido)
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
                                style={{ 
                                    color: isNC ? colors.danger : isND ? colors.success : colors.text 
                                }}
                            >
                                {isNC ? "−" : isND ? "+" : ""}
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
    colors: typeof LIGHT_COLORS;
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

    const descontoGlobal = Number(
        (typeof nota.venda === 'object' ? nota.venda?.desconto_global : 0) ??
        nota.desconto_global ??
        (typeof docParaTotais.venda === 'object' ? docParaTotais.venda?.desconto_global : 0) ??
        docParaTotais.desconto_global ??
        0
    );
    const troco = Number(
        (typeof nota.venda === 'object' ? nota.venda?.troco : 0) ?? nota.troco ??
        (typeof docParaTotais.venda === 'object' ? docParaTotais.venda?.troco : 0) ?? docParaTotais.troco ?? 0
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
        ? "TOTAL A CREDITAR"
        : isND
        ? "TOTAL A DEBITAR"
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

/* ── Modal de geração NC (Nota de Crédito) ────────────── */
function ModalNotaCredito({
    documento,
    onClose,
    onSuccess,
    colors,
}: {
    documento: DocumentoFiscal;
    onClose: () => void;
    onSuccess: (nota: DocumentoFiscal) => void;
    colors: typeof LIGHT_COLORS;
}) {
    const itensOriginais = documento.itens ?? [];

    const [motivo, setMotivo] = useState("");
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [quantidades, setQtd] = useState<Record<string, number>>(
        Object.fromEntries(
            itensOriginais.map((item, i) => [
                `${item.id ?? i}`,
                Number(item.quantidade ?? 0),
            ])
        )
    );
    const [saldoDisponivel, setSaldoDisponivel] = useState<number | null>(null);

    // Buscar saldo disponível para NC
    useEffect(() => {
        if (documento.id) {
            documentoFiscalService.buscarPorId(documento.id)
                .then(doc => {
                    const saldo = documentoFiscalService.calcularSaldoDisponivel(doc);
                    setSaldoDisponivel(saldo);
                })
                .catch(() => setSaldoDisponivel(null));
        }
    }, [documento.id]);

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
        // 1. Motivo obrigatório
        if (!motivo.trim() || motivo.trim().length < 10) {
            setErro(
                "O motivo da Nota de Crédito é obrigatório e deve ter pelo menos 10 caracteres. " +
                "Forneça uma descrição detalhada da correção."
            );
            return;
        }

        // 2. Itens selecionados
        const itens = itensComChave
            .filter((item) => (quantidades[item._key] ?? 0) > 0)
            .map((item) => ({
                produto_id: item.produto_id ?? undefined,
                descricao: item.descricao,
                quantidade: Number(quantidades[item._key]),
                preco_unitario: Number(item.preco_unitario),
                taxa_iva: Number(item.taxa_iva),
                taxa_retencao: item.taxa_retencao,
            }));

        if (itens.length === 0) {
            setErro("Seleccione pelo menos um item com quantidade > 0.");
            return;
        }

        // 3. Validar saldo disponível
        if (saldoDisponivel !== null && totalSelecionado > saldoDisponivel) {
            setErro(
                `O valor total da Nota de Crédito (${fmtKz(totalSelecionado)}) ` +
                `excede o saldo disponível da fatura (${fmtKz(saldoDisponivel)}).\n` +
                `Reduza as quantidades ou seleccione menos itens.`
            );
            return;
        }

        try {
            setLoading(true);
            setErro(null);

            const resposta = await documentoFiscalService.criarNotaCredito(documento.id, {
                itens,
                motivo: motivo.trim(),
            });
            onSuccess(resposta.nota_credito);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Erro ao gerar nota.");
        } finally {
            setLoading(false);
        }
    };

    const saldoRestante = saldoDisponivel !== null
        ? saldoDisponivel - totalSelecionado
        : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
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
                >
                    <div className="flex items-center gap-2">
                        <MinusCircle
                            className="w-4 h-4"
                            style={{ color: colors.secondary }}
                        />
                        <span
                            className="font-bold text-sm"
                            style={{ color: colors.text }}
                        >
                            Nota de Crédito
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
                    {/* Descrição da NC */}
                    <div
                        className="flex items-start gap-2 px-3 py-2 rounded text-xs border"
                        style={{
                            backgroundColor: `${colors.secondary}08`,
                            color: colors.textSecondary,
                        }}
                    >
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: colors.secondary }} />
                        <div>
                            <span className="font-medium" style={{ color: colors.secondary }}>
                                Nota de Crédito
                            </span>
                            <span>
                                {" — Diminui o valor de uma factura. "}
                            </span>
                        </div>
                    </div>

                    {/* Info do documento original */}
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded text-xs border"
                        style={{
                            color: colors.textSecondary,
                        }}
                    >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>
                            Documento original: <strong style={{ color: colors.text }}>
                                {documento.numero_documento}
                            </strong>
                            {" · "}
                            {TIPO_LABEL[documento.tipo_documento]}
                            {" · "}
                            <Badge estado={documento.estado} colors={colors} />
                        </span>
                    </div>

                    {/* Saldo disponível */}
                    {saldoDisponivel !== null && (
                        <div
                            className="flex items-center gap-2 px-3 py-2 rounded text-xs border"
                            style={{
                                backgroundColor: `${colors.secondary}08`,
                                borderColor: `${colors.secondary}30`,
                            }}
                        >
                            <DollarSign className="w-3.5 h-3.5 shrink-0" style={{ color: colors.secondary }} />
                            <span style={{ color: colors.textSecondary }}>
                                Saldo disponível para crédito:{" "}
                                <strong style={{ color: colors.secondary }}>
                                    {fmtKz(saldoDisponivel)}
                                </strong>
                            </span>
                        </div>
                    )}

                    <div>
                        <label
                            className="block text-xs font-semibold mb-1"
                            style={{ color: colors.text }}
                        >
                            Motivo <span style={{ color: colors.secondary }}>obrigatório (min 10 caracteres)</span>
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ex: Devolução de mercadoria X - cliente devolveu 5 unidades com defeito…"
                            rows={3}
                            className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none ${
                                motivo.trim().length > 0 && motivo.trim().length < 10
                                    ? `ring-1 ring-${colors.danger}`
                                    : ""
                            }`}
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.text,
                            }}
                        />
                        {motivo.trim().length > 0 && motivo.trim().length < 10 && (
                            <p
                                className="text-xs mt-1"
                                style={{ color: colors.danger }}
                            >
                                Faltam {10 - motivo.trim().length} caracteres.
                            </p>
                        )}
                    </div>

                    <div>
                        <p
                            className="text-xs font-semibold mb-2"
                            style={{ color: colors.text }}
                        >
                            Seleccionar itens para crédito
                        </p>
                        <div
                            className="border rounded divide-y max-h-48 overflow-y-auto"
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
                                itensComChave.map((item) => {
                                    const maxQtd = Number(item.quantidade ?? 0);
                                    return (
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
                                                    {item.produto?.tipo === 'servico' && (
                                                        <span className="ml-1" style={{ color: colors.secondary }}>
                                                            · Serviço
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() =>
                                                        setQtd((q) => ({
                                                            ...q,
                                                            [item._key]: Math.max(
                                                                0,
                                                                (q[item._key] ?? 0) - 1
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
                                                    max={maxQtd}
                                                    value={quantidades[item._key] ?? 0}
                                                    onChange={(e) =>
                                                        setQtd((q) => ({
                                                            ...q,
                                                            [item._key]: Math.min(
                                                                maxQtd,
                                                                Math.max(0, Number(e.target.value))
                                                            ),
                                                        }))
                                                    }
                                                    className="w-14 text-center text-sm border rounded px-1 py-0.5 focus:outline-none"
                                                    style={{
                                                        backgroundColor: colors.background,
                                                        borderColor: colors.border,
                                                        color: colors.text,
                                                    }}
                                                />
                                                <button
                                                    onClick={() =>
                                                        setQtd((q) => ({
                                                            ...q,
                                                            [item._key]: Math.min(
                                                                maxQtd,
                                                                (q[item._key] ?? 0) + 1
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
                                                    /{maxQtd.toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div
                        className="flex justify-between items-center px-3 py-2 rounded border"
                    >
                        <span
                            className="text-sm font-semibold"
                            style={{ color: colors.textSecondary }}
                        >
                            Total a Creditar
                        </span>
                        <span
                            className="text-base font-bold"
                            style={{ color: colors.secondary }}
                        >
                            − {fmtKz(totalSelecionado)}
                        </span>
                    </div>

                    {erro && (
                        <div
                            className="flex items-start gap-2 px-3 py-2 border rounded text-sm whitespace-pre-wrap"
                            style={{
                                backgroundColor: `${colors.danger}10`,
                                borderColor: `${colors.danger}30`,
                                color: colors.danger,
                            }}
                        >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{erro}</span>
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
                        disabled={loading || totalSelecionado === 0}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white rounded disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: colors.secondary }}
                    >
                        {loading && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {loading ? "A gerar…" : "Gerar NC"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Modal de geração ND (Nota de Débito) ────────────── */
function ModalNotaDebito({
    documento,
    onClose,
    onSuccess,
    colors,
}: {
    documento: DocumentoFiscal;
    onClose: () => void;
    onSuccess: (nota: DocumentoFiscal) => void;
    colors: typeof LIGHT_COLORS;
}) {
    const itensOriginais = documento.itens ?? [];

    const [motivo, setMotivo] = useState("");
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [quantidades, setQtd] = useState<Record<string, number>>(
        Object.fromEntries(
            itensOriginais.map((item, i) => [
                `${item.id ?? i}`,
                Number(item.quantidade ?? 0),
            ])
        )
    );
    const [novosItens, setNovosItens] = useState<ItemDocumento[]>([]);
    const [showNovoItem, setShowNovoItem] = useState(false);
    const [novoItemDescricao, setNovoItemDescricao] = useState("");
    const [novoItemPreco, setNovoItemPreco] = useState("");
    const [novoItemIva, setNovoItemIva] = useState("14");
    const [novoItemQuantidade, setNovoItemQuantidade] = useState("1");

    // Buscar prazo máximo para ND
    const [prazoMaximo, setPrazoMaximo] = useState<Date | null>(null);
    const [prazoExpirado, setPrazoExpirado] = useState(false);

    useEffect(() => {
        if (documento.id && documento.data_emissao) {
            const dataEmissao = new Date(documento.data_emissao);
            const prazo = new Date(dataEmissao);
            prazo.setDate(prazo.getDate() + 30);
            setPrazoMaximo(prazo);
            setPrazoExpirado(new Date() > prazo);
        }
    }, [documento.id, documento.data_emissao]);

    const itensComChave = itensOriginais.map((item, i) => ({
        ...item,
        _key: `${item.id ?? i}`,
        // ✅ INCLUI O PRODUTO COMPLETO PARA VALIDAÇÃO
        produto: item.produto,
    }));

    const totalSelecionado = itensComChave.reduce((acc, item) => {
        const qtd = quantidades[item._key] ?? 0;
        const preco = Number(item.preco_unitario ?? 0);
        const taxa = Number(item.taxa_iva ?? 0);
        return acc + qtd * preco * (1 + taxa / 100);
    }, 0);

    const totalNovosItens = novosItens.reduce((acc, item) => {
        const qtd = Number(item.quantidade ?? 0);
        const preco = Number(item.preco_unitario ?? 0);
        const taxa = Number(item.taxa_iva ?? 0);
        return acc + qtd * preco * (1 + taxa / 100);
    }, 0);

    const totalGeral = totalSelecionado + totalNovosItens;

    const handleAdicionarNovoItem = () => {
        if (!novoItemDescricao.trim() || !novoItemPreco || Number(novoItemPreco) <= 0) {
            setErro("Preencha a descrição e o preço do novo serviço.");
            return;
        }

        const isServico = ['serviço', 'servico', 'consulta', 'consultoria', 'manutenção',
            'manutencao', 'instalação', 'instalacao', 'juro', 'multa',
            'penalidade', 'taxa', 'comissão', 'comissao'].some(
                term => novoItemDescricao.toLowerCase().includes(term)
            );

        if (!isServico) {
            setErro("Nota de Débito só pode ser usada para serviços. Inclua 'serviço', 'juros' ou 'multa' na descrição.");
            return;
        }

        const novoItem: ItemDocumento = {
            descricao: novoItemDescricao.trim(),
            quantidade: Number(novoItemQuantidade) || 1,
            preco_unitario: Number(novoItemPreco),
            taxa_iva: Number(novoItemIva),
            eh_servico: true,
        };

        setNovosItens([...novosItens, novoItem]);
        setNovoItemDescricao("");
        setNovoItemPreco("");
        setNovoItemIva("14");
        setNovoItemQuantidade("1");
        setShowNovoItem(false);
        setErro(null);
    };

    const handleRemoverNovoItem = (index: number) => {
        setNovosItens(novosItens.filter((_, i) => i !== index));
    };

    const handleGerar = async () => {
        // 1. Validar itens selecionados
        const itensSelecionados = itensComChave
            .filter((item) => (quantidades[item._key] ?? 0) > 0)
            .map((item) => ({
                produto_id: item.produto_id ?? undefined,
                descricao: item.descricao,
                quantidade: Number(quantidades[item._key]),
                preco_unitario: Number(item.preco_unitario),
                taxa_iva: Number(item.taxa_iva),
                taxa_retencao: item.taxa_retencao,
                // ✅ INCLUI O PRODUTO PARA VALIDAÇÃO
                produto: item.produto,
            }));

        // ✅ CORREÇÃO FINAL: Validação usando o campo tipo do produto
        const itensInvalidos = itensSelecionados.filter(
            item => item.produto_id && item.produto?.tipo !== 'servico'
        );

        if (itensInvalidos.length > 0) {
            const nomesInvalidos = itensInvalidos.map(i => `"${i.descricao}"`).join(', ');
            setErro(
                `Nota de Débito só pode ser usada para serviços.\n` +
                `Os seguintes itens não estão cadastrados como serviços: ${nomesInvalidos}\n` +
                `Verifique o cadastro do item ou seleccione apenas serviços para esta nota.`
            );
            return;
        }

        const todosItens = [...itensSelecionados, ...novosItens.map(item => ({
            produto_id: undefined,
            descricao: item.descricao,
            quantidade: Number(item.quantidade),
            preco_unitario: Number(item.preco_unitario),
            taxa_iva: Number(item.taxa_iva),
            taxa_retencao: 0,
        }))];

        if (todosItens.length === 0) {
            setErro("Adicione pelo menos um item ou serviço.");
            return;
        }

        // 2. Validar prazo
        if (prazoExpirado) {
            setErro("O prazo de 30 dias para emitir Nota de Débito já expirou.");
            return;
        }

        try {
            setLoading(true);
            setErro(null);

            // Remove o campo produto antes de enviar para a API
            const itensParaEnviar = todosItens.map(({ produto, ...item }) => item);

            const resposta = await documentoFiscalService.criarNotaDebito(documento.id, {
                itens: itensParaEnviar,
                motivo: motivo.trim() || undefined,
            });
            onSuccess(resposta.nota_debito);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Erro ao gerar nota.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
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
                >
                    <div className="flex items-center gap-2">
                        <PlusCircle
                            className="w-4 h-4"
                            style={{ color: colors.primary }}
                        />
                        <span
                            className="font-bold text-sm"
                            style={{ color: colors.text }}
                        >
                            Nota de Débito
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
                    {/* Descrição da ND */}
                    <div
                        className="flex items-start gap-2 px-3 py-2 rounded text-xs border"
                        style={{
                            backgroundColor: `${colors.primary}08`,
                            color: colors.textSecondary,
                        }}
                    >
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: colors.text }} />
                        <div>
                            <span className="font-medium" style={{ color: colors.text }}>
                                Nota de Débito
                            </span>
                            <span>
                                {" — Aumenta o valor da fatura. "}
                                <span className="font-medium" style={{ color: colors.text }}>
                                    Apenas serviços (juros, multas, serviços adicionais).
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Prazo para ND */}
                    {prazoMaximo && (
                        <div
                            className="flex items-center gap-2 px-3 py-2 rounded text-xs border"
                            style={{
                                backgroundColor: prazoExpirado ? `${colors.danger}10` : `${colors.warning}10`,
                                borderColor: prazoExpirado ? `${colors.danger}30` : `${colors.warning}30`,
                                color: colors.textSecondary,
                            }}
                        >
                            {prazoExpirado ? (
                                <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" style={{ color: colors.danger }} />
                            ) : (
                                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: colors.warning }} />
                            )}
                            <span>
                                {prazoExpirado ? (
                                    <span style={{ color: colors.danger }}>
                                        ⚠️ Prazo de 30 dias expirou! Não é possível emitir ND.
                                    </span>
                                ) : (
                                    <>
                                        Prazo para emitir ND: até{" "}
                                        <strong style={{ color: colors.warning }}>
                                            {prazoMaximo.toLocaleDateString('pt-PT')}
                                        </strong>
                                        {documento.data_emissao && (
                                            <> · Emitida em: {fmtData(documento.data_emissao)}</>
                                        )}
                                    </>
                                )}
                            </span>
                        </div>
                    )}

                    <div>
                        <label
                            className="block text-xs font-semibold mb-1"
                            style={{ color: colors.text }}
                        >
                            Motivo <span style={{ color: colors.textSecondary }}>(opcional)</span>
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ex: Cobrança de serviços adicionais, juros de mora, multas…"
                            rows={2}
                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.text,
                            }}
                        />
                    </div>

                    {/* Itens existentes */}
                    <div>
                        <p
                            className="text-xs font-semibold mb-2"
                            style={{ color: colors.text }}
                        >
                            Seleccionar itens existentes
                        </p>
                        <div
                            className="border rounded divide-y max-h-32 overflow-y-auto"
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
                                itensComChave.map((item) => {
                                    const isServico = item.produto?.tipo === 'servico';
                                    const isProduto = item.produto_id && !isServico;
                                    const maxQtd = Number(item.quantidade ?? 0);

                                    return (
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
                                                    {isServico && (
                                                        <span className="ml-1" style={{ color: colors.secondary }}>
                                                            · Serviço
                                                        </span>
                                                    )}
                                                    {isProduto && (
                                                        <span className="ml-1" style={{ color: colors.danger }}>
                                                             Produto
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() =>
                                                        setQtd((q) => ({
                                                            ...q,
                                                            [item._key]: Math.max(
                                                                0,
                                                                (q[item._key] ?? 0) - 1
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
                                                    max={isProduto ? 0 : 9999}
                                                    value={quantidades[item._key] ?? 0}
                                                    onChange={(e) =>
                                                        setQtd((q) => ({
                                                            ...q,
                                                            [item._key]: Math.min(
                                                                isProduto ? 0 : 9999,
                                                                Math.max(0, Number(e.target.value))
                                                            ),
                                                        }))
                                                    }
                                                    className="w-14 text-center text-sm border rounded px-1 py-0.5 focus:outline-none"
                                                    style={{
                                                        backgroundColor: colors.background,
                                                        borderColor: colors.border,
                                                        color: colors.text,
                                                    }}
                                                />
                                                <button
                                                    onClick={() =>
                                                        setQtd((q) => ({
                                                            ...q,
                                                            [item._key]: Math.min(
                                                                isProduto ? 0 : 9999,
                                                                (q[item._key] ?? 0) + 1
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
                                                    {isProduto ? "🚫" : "/∞"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {itensComChave.some(item => item.produto_id && item.produto?.tipo !== 'servico') && (
                            <p className="text-xs mt-1" style={{ color: colors.danger }}>
                                ⚠️ Itens marcados como Produto não podem ser selecionados para ND.
                            </p>
                        )}
                    </div>

                    {/* Novos itens */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p
                                className="text-xs font-semibold"
                                style={{ color: colors.text }}
                            >
                                Serviços Adicionais
                            </p>
                            <button
                                onClick={() => setShowNovoItem(!showNovoItem)}
                                className="text-xs flex items-center gap-1"
                                style={{ color: colors.text }}
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Adicionar
                            </button>
                        </div>

                        {showNovoItem && (
                            <div
                                className="border rounded p-3 space-y-2 mb-2"
                                style={{ borderColor: colors.border }}
                            >
                                <input
                                    type="text"
                                    value={novoItemDescricao}
                                    onChange={(e) => setNovoItemDescricao(e.target.value)}
                                    placeholder="Descrição do serviço adicional..."
                                    className="w-full border rounded px-2 py-1 text-sm focus:outline-none"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="number"
                                        value={novoItemQuantidade}
                                        onChange={(e) => setNovoItemQuantidade(e.target.value)}
                                        placeholder="Qtd"
                                        min="1"
                                        className="border rounded px-2 py-1 text-sm focus:outline-none"
                                        style={{
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                            color: colors.text,
                                        }}
                                    />
                                    <input
                                        type="number"
                                        value={novoItemPreco}
                                        onChange={(e) => setNovoItemPreco(e.target.value)}
                                        placeholder="Preço"
                                        min="0"
                                        className="border rounded px-2 py-1 text-sm focus:outline-none"
                                        style={{
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                            color: colors.text,
                                        }}
                                    />
                                    <select
                                        value={novoItemIva}
                                        onChange={(e) => setNovoItemIva(e.target.value)}
                                        className="border rounded px-2 py-1 text-sm focus:outline-none"
                                        style={{
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                            color: colors.text,
                                        }}
                                    >
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="14">14%</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowNovoItem(false)}
                                        className="flex-1 px-3 py-1 text-sm border rounded"
                                        style={{
                                            borderColor: colors.border,
                                            color: colors.textSecondary,
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAdicionarNovoItem}
                                        className="flex-1 px-3 py-1 text-sm text-white rounded"
                                        style={{ backgroundColor: colors.primary }}
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Lista de novos itens adicionados */}
                        {novosItens.length > 0 && (
                            <div className="space-y-1">
                                {novosItens.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between px-3 py-1.5 border rounded text-sm"
                                        style={{
                                            borderColor: colors.border,
                                            backgroundColor: `${colors.success}05`,
                                        }}
                                    >
                                        <div>
                                            <span style={{ color: colors.text }}>{item.descricao}</span>
                                            <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>
                                                {item.quantidade} × {fmtKz(item.preco_unitario)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoverNovoItem(index)}
                                            className="text-xs"
                                            style={{ color: colors.danger }}
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div
                        className="flex justify-between items-center px-3 py-2 rounded border"
                    >
                        <span
                            className="text-sm font-semibold"
                            style={{ color: colors.textSecondary }}
                        >
                            Total a Debitar
                        </span>
                        <span
                            className="text-base font-bold"
                            style={{ color: colors.success }}
                        >
                            + {fmtKz(totalGeral)}
                        </span>
                    </div>

                    {erro && (
                        <div
                            className="flex items-start gap-2 px-3 py-2 border rounded text-sm whitespace-pre-wrap"
                            style={{
                                backgroundColor: `${colors.danger}10`,
                                borderColor: `${colors.danger}30`,
                                color: colors.danger,
                            }}
                        >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{erro}</span>
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
                        disabled={loading || totalGeral === 0 || prazoExpirado}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white rounded disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: colors.primary }}
                    >
                        {loading && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {loading ? "A gerar…" : "Gerar ND"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Componente principal ────────────────── */
export default function VisualizarNotaPage() {
    const router = useRouter();
    const params = useParams();
    const notaId = params?.id as string;
    const colors = useThemeColors();

    const [nota, setNota] = useState<DocumentoFiscal | null>(null);
    const [documentoOrigem, setDocumentoOrigem] =
        useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalTipo, setModalTipo] = useState<"NC" | "ND" | null>(null);
    const [podeGerarNC, setPodeGerarNC] = useState<{ pode: boolean; motivo?: string }>({ pode: false });
    const [podeGerarND, setPodeGerarND] = useState<{ pode: boolean; motivo?: string }>({ pode: false });

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

            // Verificar se pode gerar NC/ND
            setPodeGerarNC(documentoFiscalService.podeEmitirNotaCredito(doc));
            setPodeGerarND(documentoFiscalService.podeEmitirNotaDebito(doc));

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

    const handleNotaGerada = (notaGerada: DocumentoFiscal) => {
        setModalTipo(null);
        if (notaGerada?.id) {
            router.push(
                `/dashboard/Faturas/Faturas/${notaGerada.id}/Ver_NC_ND`
            );
        } else {
            toast.error("Erro ao redirecionar para a nota gerada.");
            router.push("/dashboard/Faturas/Faturas");
        }
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
    const isFT = nota.tipo_documento === "FT";
    const isFR = nota.tipo_documento === "FR";
    const isFP = nota.tipo_documento === "FP";
    const accent = isNC
        ? colors.danger
        : isND
        ? colors.success
        : colors.secondary;

    // Verificar se pode gerar notas (apenas FT/FR que não estão canceladas)
    const podeGerarNotas =
        (isFT || isFR) &&
        nota.estado !== "cancelado" &&
        nota.estado !== "expirado";

    // Verificar se é uma nota de crédito/débito (mostrar botão de voltar para origem)
    const isNotaCorrecao = isNC || isND || isRC;

    /* Para recibos, usar itens do documento de origem */
    const itensParaExibir =
        isRC && documentoOrigem?.itens
            ? documentoOrigem.itens
            : nota.itens ?? [];

    /* Para totais de RC, usar doc de origem */
    const docParaTotais =
        isRC && documentoOrigem ? documentoOrigem : nota;

    /* Operador / utilizador */
    const operador = nota.user?.name ?? "Sistema";

    // Verificar se tem documentos derivados (NC/ND/RC)
    const temDocumentosDerivados = (nota.notasCredito && nota.notasCredito.length > 0) ||
        (nota.notasDebito && nota.notasDebito.length > 0) ||
        (nota.recibos && nota.recibos.length > 0);

    const totalNotasCredito = nota.notasCredito?.reduce((sum, nc) => 
        nc.estado !== 'cancelado' ? sum + Number(nc.total_liquido) : sum, 0
    ) ?? 0;

    const totalNotasDebito = nota.notasDebito?.reduce((sum, nd) => 
        nd.estado !== 'cancelado' ? sum + Number(nd.total_liquido) : sum, 0
    ) ?? 0;

    // Informações adicionais para NC e ND
    const saldoDisponivel = nota.saldo_disponivel ?? 0;
    const totalCreditado = nota.total_creditado ?? 0;

    return (
        <MainEmpresa>
            <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">

                {/* ── Barra de topo ── */}
                <div
                    className="flex items-center justify-between px-3 py-2.5 rounded border flex-wrap gap-2"
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
                                {/* Badge indicando que tem documentos derivados */}
                                {temDocumentosDerivados && (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded"
                                        style={{
                                            backgroundColor: `${colors.secondary}20`,
                                            color: colors.secondary,
                                        }}
                                    >
                                        <CheckCircle className="w-3 h-3" />
                                        Tem ajustes
                                    </span>
                                )}
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

                    {/* ── Ações ── */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {/* ── Botão para Gerar Nota de Crédito ── */}
                        {podeGerarNotas && (
                            <button
                                onClick={() => {
                                    if (podeGerarNC.pode) {
                                        setModalTipo("NC");
                                    } else {
                                        alert(podeGerarNC.motivo || "Não é possível gerar Nota de Crédito para esta fatura.");
                                    }
                                }}
                                className="p-2 rounded transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                                style={{
                                    backgroundColor: podeGerarNC.pode
                                        ? `${colors.secondary}`
                                        : `${colors.textSecondary}20`,
                                    color: podeGerarNC.pode
                                        ? "#fff"
                                        : colors.text,
                                }}
                                title={podeGerarNC.pode
                                    ? "Gerar Nota de Crédito"
                                    : podeGerarNC.motivo || "Não disponível"}
                                disabled={!podeGerarNC.pode}
                            >
                                <FileMinus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">NC</span>
                            </button>
                        )}

                        {/* ── Botão para Gerar Nota de Débito ── */}
                        {podeGerarNotas && (
                            <button
                                onClick={() => {
                                    if (podeGerarND.pode) {
                                        setModalTipo("ND");
                                    } else {
                                        alert(podeGerarND.motivo || "Não é possível gerar Nota de Débito para esta fatura.");
                                    }
                                }}
                                className="p-2 rounded transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                                style={{
                                    backgroundColor: podeGerarND.pode
                                        ? `${colors.primary}`
                                        : `${colors.textSecondary}20`,
                                    color: podeGerarND.pode
                                        ? "#fff"
                                        : colors.text,
                                }}
                                title={podeGerarND.pode
                                    ? "Gerar Nota de Débito"
                                    : podeGerarND.motivo || "Não disponível"}
                                disabled={!podeGerarND.pode}
                            >
                                <FilePlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">ND</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Info adicional para NC ── */}
                {isNC && (
                    <div
                        className="border rounded p-3 text-sm"
                        style={{
                            backgroundColor: `${colors.danger}08`,
                            borderColor: `${colors.danger}30`,
                            color: colors.textSecondary,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <MinusCircle className="w-4 h-4" style={{ color: colors.danger }} />
                            <span>
                                <strong style={{ color: colors.danger }}>Nota de Crédito</strong>
                                {" — Esta nota REDUZ o valor da fatura original. "}
                                <span className="font-medium" style={{ color: colors.danger }}>
                                    Total creditado: {fmtKz(totalCreditado)}
                                </span>
                                {saldoDisponivel > 0 && (
                                    <span style={{ color: colors.textSecondary }}>
                                        {" · Saldo restante: "}
                                        <span style={{ color: colors.success }}>
                                            {fmtKz(saldoDisponivel)}
                                        </span>
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                )}

                {/* ── Info adicional para ND ── */}
                {isND && (
                    <div
                        className="border rounded p-3 text-sm"
                        style={{
                            backgroundColor: `${colors.success}08`,
                            borderColor: `${colors.success}30`,
                            color: colors.textSecondary,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <PlusCircle className="w-4 h-4" style={{ color: colors.success }} />
                            <span>
                                <strong style={{ color: colors.success }}>Nota de Débito</strong>
                                {" — Esta nota AUMENTA o valor da fatura original. "}
                                <span className="font-medium" style={{ color: colors.success }}>
                                    Total debitado: {fmtKz(totalNotasDebito)}
                                </span>
                                {nota.motivo && (
                                    <span style={{ color: colors.textSecondary }}>
                                        {" · Motivo: "}
                                        <span style={{ color: colors.text }}>{nota.motivo}</span>
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                )}

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
                            {(nota.cliente?.endereco) && (
                                <Row
                                    label="Morada"
                                    value={nota.cliente.endereco}
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
                            {/* Mostra o total creditado para NC */}
                            {isNC && (
                                <Row
                                    label="Total Creditado"
                                    value={fmtKz(totalCreditado)}
                                    colors={colors}
                                    accent={colors.danger}
                                />
                            )}
                            {/* Mostra o saldo disponível */}
                            {saldoDisponivel > 0 && (
                                <Row
                                    label="Saldo Disponível"
                                    value={fmtKz(saldoDisponivel)}
                                    colors={colors}
                                    accent={colors.success}
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
                                {isNC ? "Itens Creditados" : isND ? "Itens Debitados" : "Produtos / Serviços"}
                            </span>
                            {isRC && documentoOrigem && (
                                <span
                                    className="text-xs ml-1"
                                    style={{ color: colors.textSecondary }}
                                >
                                    (do documento de origem)
                                </span>
                            )}
                            {isNC && (
                                <span
                                    className="text-xs ml-1"
                                    style={{ color: colors.danger }}
                                >
                                    (CRÉDITO)
                                </span>
                            )}
                            {isND && (
                                <span
                                    className="text-xs ml-1"
                                    style={{ color: colors.success }}
                                >
                                    (DÉBITO)
                                </span>
                            )}
                        </div>
                        <ItensTable
                            itens={itensParaExibir}
                            colors={colors}
                            isNC={isNC}
                            isND={isND}
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

                {/* ── Seção de Documentos Derivados (NC/ND/RC) ── */}
                {(nota.notasCredito && nota.notasCredito.length > 0) ||
                 (nota.notasDebito && nota.notasDebito.length > 0) ||
                 (nota.recibos && nota.recibos.length > 0) ? (
                    <div
                        className="border rounded divide-y"
                        style={{
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                        }}
                    >
                        <div
                            className="flex items-center gap-1.5 px-4 py-2 border-b"
                            style={{
                                backgroundColor: colors.hover,
                                borderColor: colors.border,
                            }}
                        >
                            <FileText
                                className="w-3.5 h-3.5"
                                style={{ color: colors.secondary }}
                            />
                            <span
                                className="text-xs font-bold uppercase tracking-wider"
                                style={{ color: colors.textSecondary }}
                            >
                                Documentos Gerados a partir desta Fatura
                            </span>
                        </div>
                        <div className="p-3 space-y-2">
                            {/* Notas de Crédito */}
                            {nota.notasCredito && nota.notasCredito.length > 0 && (
                                <div>
                                    <p
                                        className="text-xs font-semibold mb-1 flex items-center gap-2"
                                        style={{ color: colors.danger }}
                                    >
                                        <MinusCircle className="w-3.5 h-3.5" />
                                        Notas de Crédito ({nota.notasCredito.length})
                                        <span className="font-normal text-xs" style={{ color: colors.textSecondary }}>
                                            Total: {fmtKz(totalNotasCredito)}
                                        </span>
                                    </p>
                                    <div className="space-y-1 pl-6">
                                        {nota.notasCredito.map((nc) => (
                                            <button
                                                key={nc.id}
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/Faturas/Faturas/${nc.id}/Ver_NC_ND`
                                                    )
                                                }
                                                className="flex items-center gap-2 text-sm transition-colors hover:opacity-70 w-full text-left px-2 py-1 rounded"
                                                style={{
                                                    backgroundColor: `${colors.danger}08`,
                                                }}
                                            >
                                                <span
                                                    className="font-medium"
                                                    style={{ color: colors.text }}
                                                >
                                                    {nc.numero_documento}
                                                </span>
                                                <span
                                                    className="text-xs"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    {fmtData(nc.data_emissao)}
                                                </span>
                                                <span
                                                    className="text-xs font-bold ml-auto"
                                                    style={{ color: colors.danger }}
                                                >
                                                    − {fmtKz(nc.total_liquido)}
                                                </span>
                                                <Badge estado={nc.estado} colors={colors} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas de Débito */}
                            {nota.notasDebito && nota.notasDebito.length > 0 && (
                                <div>
                                    <p
                                        className="text-xs font-semibold mb-1 flex items-center gap-2"
                                        style={{ color: colors.success }}
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        Notas de Débito ({nota.notasDebito.length})
                                        <span className="font-normal text-xs" style={{ color: colors.textSecondary }}>
                                            Total: {fmtKz(totalNotasDebito)}
                                        </span>
                                    </p>
                                    <div className="space-y-1 pl-6">
                                        {nota.notasDebito.map((nd) => (
                                            <button
                                                key={nd.id}
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/Faturas/Faturas/${nd.id}/Ver_NC_ND`
                                                    )
                                                }
                                                className="flex items-center gap-2 text-sm transition-colors hover:opacity-70 w-full text-left px-2 py-1 rounded"
                                                style={{
                                                    backgroundColor: `${colors.success}08`,
                                                }}
                                            >
                                                <span
                                                    className="font-medium"
                                                    style={{ color: colors.text }}
                                                >
                                                    {nd.numero_documento}
                                                </span>
                                                <span
                                                    className="text-xs"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    {fmtData(nd.data_emissao)}
                                                </span>
                                                <span
                                                    className="text-xs font-bold ml-auto"
                                                    style={{ color: colors.success }}
                                                >
                                                    + {fmtKz(nd.total_liquido)}
                                                </span>
                                                <Badge estado={nd.estado} colors={colors} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recibos */}
                            {nota.recibos && nota.recibos.length > 0 && (
                                <div>
                                    <p
                                        className="text-xs font-semibold mb-1 flex items-center gap-2"
                                        style={{ color: colors.secondary }}
                                    >
                                        <Receipt className="w-3.5 h-3.5" />
                                        Recibos ({nota.recibos.length})
                                    </p>
                                    <div className="space-y-1 pl-6">
                                        {nota.recibos.map((rc) => (
                                            <button
                                                key={rc.id}
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/Faturas/Faturas/${rc.id}/Ver_NC_ND`
                                                    )
                                                }
                                                className="flex items-center gap-2 text-sm transition-colors hover:opacity-70 w-full text-left px-2 py-1 rounded"
                                                style={{
                                                    backgroundColor: `${colors.secondary}08`,
                                                }}
                                            >
                                                <span
                                                    className="font-medium"
                                                    style={{ color: colors.text }}
                                                >
                                                    {rc.numero_documento}
                                                </span>
                                                <span
                                                    className="text-xs"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    {fmtData(rc.data_emissao)}
                                                </span>
                                                <span
                                                    className="text-xs font-bold ml-auto"
                                                    style={{ color: colors.secondary }}
                                                >
                                                    {fmtKz(rc.total_liquido)}
                                                </span>
                                                <Badge estado={rc.estado} colors={colors} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* ── Mensagem para Proformas ── */}
                {isFP && (
                    <div
                        className="border rounded p-4 text-center"
                        style={{
                            backgroundColor: `${colors.warning}08`,
                            borderColor: `${colors.warning}30`,
                        }}
                    >
                        <p style={{ color: colors.textSecondary }}>
                            <Info className="w-4 h-4 inline mr-2" style={{ color: colors.warning }} />
                            Esta é uma Proforma (orçamento). Não pode gerar Notas de Crédito/Débito.
                            Para emitir uma Nota de Correção, converta primeiro a Proforma em Fatura.
                        </p>
                    </div>
                )}

                {/* ── Mensagem para Notas de Correção ── */}
                {isNotaCorrecao && documentoOrigem && (
                    <div
                        className="border rounded p-3 text-sm"
                        style={{
                            backgroundColor: `${colors.secondary}08`,
                            borderColor: `${colors.secondary}20`,
                            color: colors.textSecondary,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            {isNC && <MinusCircle className="w-4 h-4" style={{ color: colors.danger }} />}
                            {isND && <PlusCircle className="w-4 h-4" style={{ color: colors.success }} />}
                            {isRC && <Receipt className="w-4 h-4" style={{ color: colors.secondary }} />}
                            <span>
                                {isNC ? "Nota de Crédito" : isND ? "Nota de Débito" : "Recibo"}
                                {" gerado a partir de "}
                                <button
                                    onClick={() =>
                                        router.push(
                                            `/dashboard/Faturas/Faturas/${documentoOrigem.id}/Ver`
                                        )
                                    }
                                    className="font-medium underline underline-offset-2"
                                    style={{ color: colors.secondary }}
                                >
                                    {documentoOrigem.numero_documento}
                                </button>
                                {" ("}
                                {TIPO_LABEL[documentoOrigem.tipo_documento] ?? documentoOrigem.tipo_documento}
                                {")"}
                            </span>
                        </div>
                    </div>
                )}

            </div>

            {/* ── Modal NC ── */}
            {modalTipo === "NC" && (
                <ModalNotaCredito
                    documento={nota}
                    onClose={() => setModalTipo(null)}
                    onSuccess={handleNotaGerada}
                    colors={colors}
                />
            )}

            {/* ── Modal ND ── */}
            {modalTipo === "ND" && (
                <ModalNotaDebito
                    documento={nota}
                    onClose={() => setModalTipo(null)}
                    onSuccess={handleNotaGerada}
                    colors={colors}
                />
            )}
        </MainEmpresa>
    );
}