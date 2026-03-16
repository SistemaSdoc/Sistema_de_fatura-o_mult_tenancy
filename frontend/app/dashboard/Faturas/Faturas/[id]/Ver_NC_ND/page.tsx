"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, FileText, User, MinusCircle, PlusCircle,
    XCircle, Package, Hash, Printer, Download, Loader2
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    ItemDocumento,
    TipoDocumento
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/authprovider";

/* ── Constantes ──────────────────────────────────────── */
const TIPO_LABEL: Record<TipoDocumento, string> = {
    FT: "Fatura", FR: "Fatura-Recibo", FP: "Fatura Proforma",
    FA: "Fatura de Adiantamento", NC: "Nota de Crédito",
    ND: "Nota de Débito", RC: "Recibo", FRt: "Fatura de Retificação",
};

/* ── Utilitários ─────────────────────────────────────── */
const fmtKz = (v?: number | null) =>
    v == null ? "0,00 Kz"
    : Number(v).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Kz";

const fmtData = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-AO") : "—";

const fmtDataHora = (d?: string | null) =>
    d ? new Date(d).toLocaleString("pt-AO") : "—";

/* ── Badge de estado ─────────────────────────────────── */
function Badge({ estado }: { estado: string }) {
    const map: Record<string, string> = {
        emitido:           "bg-blue-50 text-blue-700 border-blue-200",
        cancelado:         "bg-red-50 text-red-700 border-red-200",
        paga:              "bg-green-50 text-green-700 border-green-200",
        parcialmente_paga: "bg-yellow-50 text-yellow-700 border-yellow-200",
        expirado:          "bg-gray-50 text-gray-500 border-gray-200",
    };
    const labels: Record<string, string> = {
        emitido: "Emitido", cancelado: "Cancelado", paga: "Pago",
        parcialmente_paga: "Parcial", expirado: "Expirado",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded ${map[estado] ?? map.emitido}`}>
            {labels[estado] ?? estado}
        </span>
    );
}

/* ── Linha de informação ─────────────────────────────── */
function Row({ label, value, danger }: {
    label: string; value: React.ReactNode; danger?: boolean;
}) {
    return (
        <div className="flex justify-between items-start gap-4 py-1.5 text-sm border-b border-gray-100 last:border-0">
            <span className="text-gray-500 shrink-0">{label}</span>
            <span className={`font-medium text-right ${danger ? "text-red-600" : "text-gray-900"}`}>
                {value || "—"}
            </span>
        </div>
    );
}

/* ── Cabeçalho de secção ─────────────────────────────── */
function SectionHeader({ icon, title, accent }: {
    icon: React.ReactNode; title: string; accent: string;
}) {
    return (
        <div
            className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50/60"
            style={{ borderLeftWidth: 3, borderLeftColor: accent, borderLeftStyle: "solid" }}
        >
            <span style={{ color: accent }}>{icon}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</span>
        </div>
    );
}

/* ── Tabela de itens ─────────────────────────────────── */
function ItensTable({ itens, isNC }: { itens: ItemDocumento[]; isNC: boolean }) {
    if (itens.length === 0) {
        return (
            <div className="px-4 py-6 text-center text-sm text-gray-400 italic">
                Sem itens
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Descrição</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-600 w-16">Qtd</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600 w-28">Preço</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600 w-16">IVA</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-600 w-28">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {itens.map((item, i) => {
                        const qtd   = Number(item.quantidade   ?? 0);
                        const preco = Number(item.preco_unitario ?? 0);
                        const taxa  = Number(item.taxa_iva      ?? 0);
                        const total = Number(item.total_linha   ?? 0);

                        return (
                            <tr key={item.id ?? i} className="hover:bg-gray-50/50">
                                <td className="px-3 py-2">
                                    <div className="font-medium text-gray-900">{item.descricao}</div>
                                    {item.codigo_produto && (
                                        <div className="text-xs text-gray-400">Ref: {item.codigo_produto}</div>
                                    )}
                                    {item.eh_servico && (
                                        <span className="text-xs text-blue-600">Serviço</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-center tabular-nums">{qtd.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{fmtKz(preco)}</td>
                                <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{taxa.toFixed(1)}%</td>
                                <td className={`px-3 py-2 text-right font-bold tabular-nums ${isNC ? "text-red-600" : "text-green-600"}`}>
                                    {isNC ? "−" : "+"}{fmtKz(total)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ── Skeleton ────────────────────────────────────────── */
function Skeleton() {
    return (
        <div className="animate-pulse space-y-3 p-4 max-w-4xl mx-auto">
            <div className="h-9 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-56 bg-gray-200 rounded" />
        </div>
    );
}

/* ── Componente principal ────────────────────────────── */
export default function VisualizarNotaPage() {
    const router   = useRouter();
    const params   = useParams();
    const notaId   = params?.id as string;
    const colors   = useThemeColors();
    const { user } = useAuth();

    const [nota, setNota]                       = useState<DocumentoFiscal | null>(null);
    const [documentoOrigem, setDocumentoOrigem] = useState<DocumentoFiscal | null>(null);
    const [loading, setLoading]                 = useState(true);
    const [error, setError]                     = useState<string | null>(null);
    const [baixandoPdf, setBaixandoPdf]         = useState(false);

    useEffect(() => {
        if (!notaId) { setError("ID não fornecido"); setLoading(false); return; }

        (async () => {
            try {
                const doc = await documentoFiscalService.buscarPorId(notaId);
                setNota(doc);
                if ((doc.tipo_documento === "NC" || doc.tipo_documento === "ND") && doc.documentoOrigem?.id) {
                    const origem = await documentoFiscalService.buscarPorId(doc.documentoOrigem.id);
                    setDocumentoOrigem(origem);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : "Erro ao carregar");
            } finally {
                setLoading(false);
            }
        })();
    }, [notaId]);

    /* ── Handlers ──────────────────────────────────── */
    const handleImprimir = () => {
        if (!nota?.id) return;
        const backend = `${window.location.protocol}//${window.location.hostname}:8000`;
        window.open(`${backend}/api/documentos-fiscais/${nota.id}/print?auto=1`, "_blank");
    };

    const handleDownloadPDF = async () => {
        if (!nota?.id) return;
        try {
            setBaixandoPdf(true);
            await documentoFiscalService.downloadPdf(
                nota.id,
                `${nota.tipo_documento}_${nota.numero_documento ?? nota.id}.pdf`
            );
        } catch { alert("Erro ao baixar PDF. Tente novamente."); }
        finally { setBaixandoPdf(false); }
    };

    /* ── Loading / Erro ──────────────────────────── */
    if (loading) return <MainEmpresa><Skeleton /></MainEmpresa>;

    if (error || !nota) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-4xl mx-auto">
                    <div className="border border-red-200 bg-red-50 p-6 text-center rounded">
                        <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-700 font-medium mb-1">{error ?? "Nota não encontrada"}</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-3 px-4 py-1.5 text-sm text-white rounded"
                            style={{ backgroundColor: colors.primary }}
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    const isNC   = nota.tipo_documento === "NC";
    const accent = isNC ? "#dc2626" : "#16a34a";

    const nomeCliente = documentoFiscalService.getNomeCliente(nota);
    const nifCliente  = documentoFiscalService.getNifCliente(nota);
    const nomeEmissor = nota.user?.name ?? user?.name ?? "Sistema";

    const base   = Number(nota.base_tributavel  ?? 0);
    const iva    = Number(nota.total_iva        ?? 0);
    const ret    = Number(nota.total_retencao   ?? 0);
    const total  = Number(nota.total_liquido    ?? 0);
    const pctIva = base > 0 ? (iva / base) * 100 : 0;
    const pctRet = base > 0 ? (ret / base) * 100 : 0;

    return (
        <MainEmpresa>
            <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">

                {/* ── Barra de topo ──────────────────────── */}
                <div className="flex items-center justify-between bg-white border px-3 py-2.5 rounded">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => router.back()}
                            className="p-1 hover:bg-gray-100 rounded shrink-0 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" style={{ color: colors.primary }} />
                        </button>

                        <span style={{ color: accent }} className="shrink-0">
                            {isNC
                                ? <MinusCircle className="w-4 h-4" />
                                : <PlusCircle  className="w-4 h-4" />
                            }
                        </span>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-gray-900 truncate">
                                    {nota.numero_documento}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
                                    {TIPO_LABEL[nota.tipo_documento]}
                                </span>
                                <Badge estado={nota.estado} />
                            </div>
                            <p className="text-xs text-gray-400">
                                {TIPO_LABEL[nota.tipo_documento]} · {fmtData(nota.data_emissao)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                            onClick={handleImprimir}
                            title="Imprimir"
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={baixandoPdf}
                            title="Baixar PDF"
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors disabled:opacity-40"
                        >
                            {baixandoPdf
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />
                            }
                        </button>
                    </div>
                </div>

                {/* ── Card principal ──────────────────────── */}
                <div className="bg-white border rounded divide-y divide-gray-100">

                    {/* Bloco 1: Cliente + Documento em 2 colunas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">

                        {/* Cliente */}
                        <div>
                            <SectionHeader
                                icon={<User className="w-3.5 h-3.5" />}
                                title="Cliente"
                                accent={accent}
                            />
                            <div className="px-4 py-3">
                                <Row label="Nome"   value={nomeCliente} />
                                {nifCliente              && <Row label="NIF"    value={nifCliente} />}
                                {nota.cliente?.telefone  && <Row label="Tel."   value={nota.cliente.telefone} />}
                                {nota.cliente?.email     && <Row label="Email"  value={nota.cliente.email} />}
                                {nota.cliente?.endereco  && <Row label="Morada" value={nota.cliente.endereco} />}
                                <Row label="Emissor" value={nomeEmissor} />
                            </div>
                        </div>

                        {/* Documento */}
                        <div>
                            <SectionHeader
                                icon={<FileText className="w-3.5 h-3.5" />}
                                title="Documento"
                                accent={accent}
                            />
                            <div className="px-4 py-3">
                                <Row label="Tipo"    value={TIPO_LABEL[nota.tipo_documento]} />
                                <Row label="Série"   value={nota.serie} />
                                <Row label="Emissão" value={fmtDataHora(nota.data_emissao)} />
                                {nota.motivo && <Row label="Motivo" value={nota.motivo} />}
                                {nota.observacoes && <Row label="Obs." value={nota.observacoes} />}

                                {/* Documento de origem */}
                                {documentoOrigem && (
                                    <div className="flex justify-between items-center gap-4 py-1.5 text-sm border-b border-gray-100 last:border-0">
                                        <span className="text-gray-500 shrink-0">Referente a</span>
                                        <button
                                            onClick={() => router.push(`/dashboard/Faturas/Faturas/${documentoOrigem.id}/Ver`)}
                                            className="font-medium text-right underline underline-offset-2 hover:opacity-80 transition-opacity"
                                            style={{ color: colors.primary }}
                                        >
                                            {documentoOrigem.numero_documento}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bloco 2: Itens */}
                    <div>
                        <SectionHeader
                            icon={<Package className="w-3.5 h-3.5" />}
                            title="Itens"
                            accent={accent}
                        />
                        <ItensTable itens={nota.itens ?? []} isNC={isNC} />
                    </div>

                    {/* Bloco 3: Totais */}
                    <div className="px-4 py-3">
                        <div className="flex justify-end">
                            <div className="w-full sm:w-64 space-y-0">
                                <Row label="Base Tributável"                    value={fmtKz(base)} />
                                <Row label={`IVA (${pctIva.toFixed(1)}%)`}      value={fmtKz(iva)} />
                                {ret > 0 && (
                                    <Row
                                        label={`Retenção (${pctRet.toFixed(1)}%)`}
                                        value={`−${fmtKz(ret)}`}
                                        danger
                                    />
                                )}
                                <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
                                    <span className="text-sm font-bold text-gray-900">
                                        TOTAL {isNC ? "(CRÉDITO)" : "(DÉBITO)"}
                                    </span>
                                    <span className="text-base font-bold" style={{ color: accent }}>
                                        {isNC ? "−" : "+"}{fmtKz(total)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloco 4: Hash fiscal */}
                    {nota.hash_fiscal && (
                        <div>
                            <SectionHeader
                                icon={<Hash className="w-3.5 h-3.5" />}
                                title="Hash Fiscal"
                                accent={accent}
                            />
                            <div className="px-4 py-3">
                                <p className="text-xs font-mono text-gray-600 break-all bg-gray-50 p-2 rounded border">
                                    {nota.hash_fiscal}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainEmpresa>
    );
}