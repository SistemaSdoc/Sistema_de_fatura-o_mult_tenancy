"use client";

import { useState } from "react";
import { DocumentoFiscal, TipoDocumento } from "@/services/DocumentoFiscal";
import { Eye, FileText, Printer, Download, ChevronLeft, ChevronRight, Receipt } from "lucide-react";

const TIPO_LABEL: Record<TipoDocumento, string> = {
  FT:  "Fatura",
  FR:  "Fatura-Recibo",
  FP:  "Fatura Proforma",
  FA:  "Fatura de Adiantamento",
  NC:  "Nota de Crédito",
  ND:  "Nota de Débito",
  RC:  "Recibo",
  FRt: "Fatura de Retificação",
};

interface ColorsTheme {
  border: string; primary: string; success: string; teal?: string;
  warning: string; danger: string; secondary: string; hover: string;
  text: string; textSecondary: string; card: string;
}

interface InvoiceTableProps {
  documentos: DocumentoFiscal[];
  loading: boolean;
  gerandoRecibo: string | null;
  baixandoPdf: string | null;
  onVerDetalhes:   (doc: DocumentoFiscal) => void;
  onGerarRecibo:   (doc: DocumentoFiscal) => Promise<DocumentoFiscal | void> | void;
  /** Impressão via Laravel — abre nova tab com ?auto=1 */
  onImprimir:      (doc: DocumentoFiscal) => void;
  onBaixarPdf:     (doc: DocumentoFiscal) => Promise<void>;
  formatKz:        (v: number | string | undefined) => string;
  formatQuantidade:(v: number | string | undefined) => string;
  documentoFiscalService: {
    getNomeCliente: (doc: DocumentoFiscal) => string;
    getNifCliente:  (doc: DocumentoFiscal) => string | null;
  };
  colors: ColorsTheme;
}

const POR_PAGINA = 10;

/* ── Skeleton ──────────────────────────────────────────────── */
function TableSkeleton({ colors }: { colors: ColorsTheme }) {
  return (
    <div className="animate-pulse p-5 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3">
          {[...Array(5)].map((__, j) => (
            <div key={j} className="h-8 flex-1" style={{ backgroundColor: colors.border }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Tipo badge ────────────────────────────────────────────── */
function TipoBadge({ tipo, colors }: { tipo: TipoDocumento; colors: ColorsTheme }) {
  const palette: Partial<Record<TipoDocumento, { bg: string; text: string }>> = {
    FT:  { bg: `${colors.primary}1a`,           text: colors.primary },
    FR:  { bg: `${colors.success}1a`,            text: colors.success },
    RC:  { bg: `${(colors.teal ?? colors.success)}1a`, text: colors.teal ?? colors.success },
    FP:  { bg: `${colors.warning}1a`,            text: colors.warning },
    NC:  { bg: `${colors.danger}1a`,             text: colors.danger },
    ND:  { bg: `${colors.secondary}1a`,          text: colors.secondary },
  };
  const s = palette[tipo] ?? { bg: colors.hover, text: colors.textSecondary };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

/* ── Botão de ícone ────────────────────────────────────────── */
function IconBtn({
  onClick, disabled = false, title, color, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 transition-all hover:opacity-70 disabled:opacity-40 touch-manipulation"
      style={{ color }}
    >
      {children}
    </button>
  );
}

/* ── Spinner ───────────────────────────────────────────────── */
function Spinner({ color }: { color: string }) {
  return (
    <div
      className="w-4 h-4 border-2 animate-spin"
      style={{ borderColor: `${color}30`, borderTopColor: color }}
    />
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function InvoiceTable({
  documentos,
  loading,
  gerandoRecibo,
  baixandoPdf,
  onVerDetalhes,
  onGerarRecibo,
  onImprimir,
  onBaixarPdf,
  formatKz,
  documentoFiscalService,
  colors,
}: InvoiceTableProps) {

  const [pagina, setPagina] = useState(1);

  const totalPag = Math.ceil(documentos.length / POR_PAGINA);
  const pag      = Math.min(Math.max(pagina, 1), Math.max(totalPag, 1));
  const slice    = documentos.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA);

  /* Apenas FT não cancelado/pago pode gerar recibo */
  const podeGerarRecibo = (d: DocumentoFiscal) =>
    d.tipo_documento === "FT" && !["cancelado", "paga"].includes(d.estado);

  const handleGerarRecibo = async (doc: DocumentoFiscal) => {
    try { await onGerarRecibo(doc); }
    catch { /* erro já tratado no pai */ }
  };

  /* ── Loading ──────────────────────────────────────────── */
  if (loading) return <TableSkeleton colors={colors} />;

  /* ── Empty ────────────────────────────────────────────── */
  if (documentos.length === 0) {
    return (
      <div className="p-10 text-center" style={{ color: colors.textSecondary }}>
        <div
          className="w-14 h-14 flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: colors.hover }}
        >
          <Receipt size={28} style={{ color: colors.border }} />
        </div>
        <p className="font-medium text-sm" style={{ color: colors.text }}>Nenhum documento encontrado</p>
        <p className="text-xs mt-1">Tente ajustar os filtros ou a pesquisa</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Tabela ──────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: colors.primary }}>
              <th className="px-3 py-2.5 text-left text-white font-semibold text-xs tracking-wide whitespace-nowrap">
                Nº Documento
              </th>
              <th className="px-3 py-2.5 text-left text-white font-semibold text-xs tracking-wide whitespace-nowrap">
                Cliente
              </th>
              <th className="px-3 py-2.5 text-left text-white font-semibold text-xs tracking-wide whitespace-nowrap">
                Tipo
              </th>
              <th className="px-3 py-2.5 text-left text-white font-semibold text-xs tracking-wide whitespace-nowrap">
                Data
              </th>
              <th className="px-3 py-2.5 text-right text-white font-semibold text-xs tracking-wide whitespace-nowrap">
                Total
              </th>
              <th className="px-3 py-2.5 text-center text-white font-semibold text-xs tracking-wide whitespace-nowrap min-w-[140px]">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {slice.map((doc) => (
              <tr
                key={doc.id}
                className="border-b transition-colors"
                style={{ borderColor: colors.border }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* Nº */}
                <td className="px-3 py-2.5 font-mono text-xs font-medium whitespace-nowrap" style={{ color: colors.text }}>
                  {doc.numero_documento ?? `${doc.serie}-${String(doc.numero).padStart(5, "0")}`}
                </td>

                {/* Cliente */}
                <td className="px-3 py-2.5 max-w-[140px]">
                  <div className="font-medium text-xs truncate" style={{ color: colors.text }}>
                    {documentoFiscalService.getNomeCliente(doc)}
                  </div>
                  {documentoFiscalService.getNifCliente(doc) && (
                    <div className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                      NIF {documentoFiscalService.getNifCliente(doc)}
                    </div>
                  )}
                </td>

                {/* Tipo */}
                <td className="px-3 py-2.5">
                  <TipoBadge tipo={doc.tipo_documento} colors={colors} />
                </td>

                {/* Data */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="text-xs" style={{ color: colors.text }}>
                    {new Date(doc.data_emissao).toLocaleDateString("pt-AO")}
                  </div>
                  {doc.hora_emissao && (
                    <div className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                      {doc.hora_emissao.substring(0, 5)}
                    </div>
                  )}
                </td>

                {/* Total */}
                <td className="px-3 py-2.5 text-right font-semibold text-xs whitespace-nowrap" style={{ color: colors.text }}>
                  {formatKz(doc.total_liquido)}
                </td>

                {/* Ações */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-0.5">

                    {/* Ver detalhes */}
                    <IconBtn
                      onClick={() => onVerDetalhes(doc)}
                      title="Ver detalhes"
                      color={colors.text}
                    >
                      <Eye size={16} />
                    </IconBtn>

                    {/* Gerar Recibo (apenas FT pendente) */}
                    {podeGerarRecibo(doc) && (
                      <IconBtn
                        onClick={() => handleGerarRecibo(doc)}
                        disabled={gerandoRecibo === doc.id}
                        title="Gerar Recibo"
                        color={colors.success}
                      >
                        {gerandoRecibo === doc.id
                          ? <Spinner color={colors.success} />
                          : <FileText size={16} />}
                      </IconBtn>
                    )}

                    {/* Imprimir — chama printView do Laravel com ?auto=1 */}
                    <IconBtn
                      onClick={() => onImprimir(doc)}
                      title="Imprimir"
                      color={colors.secondary}
                    >
                      <Printer size={16} />
                    </IconBtn>

                    {/* Download PDF (DomPDF) */}
                    <IconBtn
                      onClick={() => onBaixarPdf(doc)}
                      disabled={baixandoPdf === doc.id}
                      title="Baixar PDF"
                      color={colors.primary}
                    >
                      {baixandoPdf === doc.id
                        ? <Spinner color={colors.primary} />
                        : <Download size={16} />}
                    </IconBtn>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Paginação ───────────────────────────────────── */}
      {totalPag > 1 && (
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t text-xs"
          style={{ borderColor: colors.border }}
        >
          <span style={{ color: colors.textSecondary }}>
            {(pag - 1) * POR_PAGINA + 1}–{Math.min(pag * POR_PAGINA, documentos.length)} de {documentos.length}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPagina(pag - 1)}
              disabled={pag === 1}
              className="flex items-center gap-1 px-2.5 py-1.5  font-medium disabled:opacity-40 transition-colors"
              style={{
                backgroundColor: pag === 1 ? colors.hover : colors.primary,
                color: pag === 1 ? colors.textSecondary : "white",
              }}
            >
              <ChevronLeft size={13} /> Anterior
            </button>

            <span className="px-2" style={{ color: colors.text }}>
              {pag} / {totalPag}
            </span>

            <button
              onClick={() => setPagina(pag + 1)}
              disabled={pag === totalPag}
              className="flex items-center gap-1 px-2.5 py-1.5 font-medium disabled:opacity-40 transition-colors"
              style={{
                backgroundColor: pag === totalPag ? colors.hover : colors.primary,
                color: pag === totalPag ? colors.textSecondary : "white",
              }}
            >
              Próxima <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}