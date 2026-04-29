"use client";

import { useState } from "react";
import { DocumentoFiscal, TipoDocumento } from "@/services/DocumentoFiscal";
import {
  Eye,
  FileText,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";

/* ─── Labels ──────────────────────────────────────────────────────────────── */
const TIPO_LABEL: Partial<Record<TipoDocumento, string>> = {
  FP: "Fatura Proforma",
  FA: "Fatura de Adiantamento",
  NC: "Nota de Crédito",
  ND: "Nota de Débito",
  FRt: "Fatura de Retificação",
};

const ESTADO_LABEL: Record<string, string> = {
  paga: "Pago",
  parcialmente_paga: "Pag. Parcial",
  emitido: "Pendente",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

/* ─── Tipos de aba ────────────────────────────────────────────────────────── */
type TabAtiva = "proforma" | "credito_debito" | "retificacao";

const TABS: { key: TabAtiva; label: string; tipos: TipoDocumento[] }[] = [
  { key: "proforma", label: "Proformas & Adiantamentos", tipos: ["FP", "FA"] },
  { key: "credito_debito", label: "Notas Crédito/Débito", tipos: ["NC", "ND"] },
  { key: "retificacao", label: "Retificações", tipos: ["FRt"] },
];

/* ─── Theme ───────────────────────────────────────────────────────────────── */
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
  card: string;
}

/* ─── Props ───────────────────────────────────────────────────────────────── */
interface OutrosDocumentosTableProps {
  documentos: DocumentoFiscal[];
  loading: boolean;
  gerandoRecibo: string | null;
  baixandoPdf: string | null;
  imprimindo: string | null;
  onVerDetalhes: (doc: DocumentoFiscal) => void;
  onGerarRecibo: (doc: DocumentoFiscal) => Promise<void> | void;
  onImprimirA4: (doc: DocumentoFiscal) => void;
  onImprimirPdf: (doc: DocumentoFiscal) => void;
  onBaixarPdf: (doc: DocumentoFiscal) => Promise<void>;
  formatKz: (v: number | string | undefined) => string;
  documentoFiscalService: {
    getNomeCliente: (doc: DocumentoFiscal) => string;
    getNifCliente?: (doc: DocumentoFiscal) => string | null;
  };
  colors: ColorsTheme;
}

const POR_PAGINA = 10;

/* ─── Badge Tipo ──────────────────────────────────────────────────────────── */
function TipoBadge({ tipo, colors }: { tipo: TipoDocumento; colors: ColorsTheme }) {
  const palette: Partial<Record<TipoDocumento, { bg: string; text: string }>> = {
    FP: { bg: `${colors.warning}1a`, text: colors.warning },
    FA: { bg: `${colors.warning}1a`, text: colors.warning },
    NC: { bg: `${colors.danger}1a`, text: colors.danger },
    ND: { bg: `${colors.secondary}1a`, text: colors.secondary },
    FRt: { bg: `${colors.primary}1a`, text: colors.primary },
  };
  const s = palette[tipo] ?? { bg: colors.hover, text: colors.textSecondary };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

/* ─── Badge Estado ────────────────────────────────────────────────────────── */
function EstadoBadge({ estado, colors }: { estado: string; colors: ColorsTheme }) {
  const map: Record<string, { bg: string; text: string }> = {
    paga: { bg: `${colors.success}1a`, text: colors.success },
    parcialmente_paga: { bg: `${colors.warning}1a`, text: colors.warning },
    emitido: { bg: `${colors.warning}1a`, text: colors.warning },
    cancelado: { bg: `${colors.danger}1a`, text: colors.danger },
    expirado: { bg: `${colors.textSecondary}1a`, text: colors.textSecondary },
  };
  const s = map[estado] ?? { bg: colors.hover, text: colors.textSecondary };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
}

/* ─── Botão ícone ─────────────────────────────────────────────────────────── */
function IconBtn({
  onClick,
  disabled = false,
  title,
  color,
  children,
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
      className="p-1.5 hover:opacity-70 disabled:opacity-40"
      style={{ color }}
    >
      {children}
    </button>
  );
}

/* ─── Spinner ─────────────────────────────────────────────────────────────── */
function Spinner({ color }: { color: string }) {
  return (
    <div
      className="w-4 h-4 border-2 animate-spin rounded-full"
      style={{ borderColor: `${color}30`, borderTopColor: color }}
    />
  );
}

/* ─── Paginação ───────────────────────────────────────────────────────────── */
function Paginacao({
  pagina,
  total,
  quantidade,
  onAnterior,
  onProxima,
  colors,
}: {
  pagina: number;
  total: number;
  quantidade: number;
  onAnterior: () => void;
  onProxima: () => void;
  colors: ColorsTheme;
}) {
  if (total <= 1) return null;
  return (
    <div
      className="flex justify-between items-center px-3 py-2 text-xs"
      style={{ borderTop: `0.5px solid ${colors.border}`, color: colors.textSecondary }}
    >
      <span>
        {pagina} / {total} — {quantidade} documentos
      </span>
      <div className="flex gap-2">
        <button
          onClick={onAnterior}
          disabled={pagina === 1}
          className="disabled:opacity-30"
          style={{ color: colors.text }}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={onProxima}
          disabled={pagina === total}
          className="disabled:opacity-30"
          style={{ color: colors.text }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Card mobile ─────────────────────────────────────────────────────────── */
function DocCard({
  doc,
  colors,
  formatKz,
  getNomeCliente,
  acoes,
}: {
  doc: DocumentoFiscal;
  colors: ColorsTheme;
  formatKz: (v: number | string | undefined) => string;
  getNomeCliente: (d: DocumentoFiscal) => string;
  acoes: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-3"
      style={{ borderBottom: `0.5px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {doc.numero_documento ?? doc.id}
        </span>
        <div className="flex gap-1 flex-wrap">
          <TipoBadge tipo={doc.tipo_documento} colors={colors} />
          {doc.estado && <EstadoBadge estado={doc.estado} colors={colors} />}
        </div>
      </div>

      <span className="text-xs truncate" style={{ color: colors.textSecondary }}>
        {getNomeCliente(doc)}
      </span>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: colors.textSecondary }}>
          {new Date(doc.data_emissao).toLocaleDateString()}
        </span>
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {formatKz(doc.total_liquido)}
        </span>
      </div>

      <div className="flex gap-1">{acoes}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function OutrosDocumentosTable({
  documentos,
  loading,
  gerandoRecibo,
  baixandoPdf,
  imprimindo,
  onVerDetalhes,
  onGerarRecibo,
  onImprimirPdf,
  onBaixarPdf,
  formatKz,
  documentoFiscalService,
  colors,
}: OutrosDocumentosTableProps) {
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>("proforma");

  // Paginação independente por aba
  const [paginas, setPaginas] = useState<Record<TabAtiva, number>>({
    proforma: 1,
    credito_debito: 1,
    retificacao: 1,
  });

  const setPagina = (tab: TabAtiva, p: number) =>
    setPaginas((prev) => ({ ...prev, [tab]: p }));

  /* ── Documentos por aba ── */
  const docsTab = (tab: TabAtiva) => {
    const tipos = TABS.find((t) => t.key === tab)!.tipos;
    return documentos.filter((d) => tipos.includes(d.tipo_documento));
  };

  const docsAtivos = docsTab(tabAtiva);
  const paginaAtual = paginas[tabAtiva];
  const totalPaginas = Math.max(Math.ceil(docsAtivos.length / POR_PAGINA), 1);
  const pg = Math.min(Math.max(paginaAtual, 1), totalPaginas);
  const slice = docsAtivos.slice((pg - 1) * POR_PAGINA, pg * POR_PAGINA);

  /* ── Regras de gerar recibo: FP e FA que não estejam canceladas/pagas ── */
  const podeGerarRecibo = (d: DocumentoFiscal) =>
    ["FP", "FA"].includes(d.tipo_documento) &&
    !["cancelado", "paga"].includes(d.estado || "");

  /* ── Vazio ── */
  if (!loading && documentos.length === 0) {
    return (
      <div className="p-10 text-center" style={{ color: colors.textSecondary }}>
        <p>Nenhum documento encontrado</p>
      </div>
    );
  }

  /* ── Acções por documento ── */
  const acoes = (doc: DocumentoFiscal) => (
    <>
      <IconBtn onClick={() => onVerDetalhes(doc)} title="Ver detalhes" color={colors.text}>
        <Eye size={16} />
      </IconBtn>

      {podeGerarRecibo(doc) && (
        <IconBtn
          onClick={() => onGerarRecibo(doc)}
          disabled={gerandoRecibo === doc.id}
          title="Gerar Recibo"
          color={colors.success}
        >
          {gerandoRecibo === doc.id ? (
            <Spinner color={colors.success} />
          ) : (
            <FileText size={16} />
          )}
        </IconBtn>
      )}

      <IconBtn
        onClick={() => onImprimirPdf(doc)}
        disabled={imprimindo === doc.id}
        title="Imprimir"
        color={colors.secondary}
      >
        {imprimindo === doc.id ? (
          <Spinner color={colors.secondary} />
        ) : (
          <Printer size={16} />
        )}
      </IconBtn>

      <IconBtn
        onClick={() => onBaixarPdf(doc)}
        disabled={baixandoPdf === doc.id}
        title="Baixar PDF"
        color={colors.text}
      >
        {baixandoPdf === doc.id ? <Spinner color={colors.text} /> : <Download size={16} />}
      </IconBtn>
    </>
  );

  /* ── Tabela desktop ── */
  const tabelaDesktop = (
    <div className="hidden sm:block overflow-x-auto w-full">
      <table
        className="w-full text-sm"
        style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: 520 }}
      >
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "28%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead style={{ backgroundColor: colors.primary }}>
          <tr className="text-white text-xs">
            <th className="px-3 py-2 text-left">Documento</th>
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {slice.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-8 text-center text-xs"
                style={{
                  color: colors.textSecondary,
                  borderBottom: `0.5px solid ${colors.border}`,
                }}
              >
                Nenhum documento nesta aba
              </td>
            </tr>
          ) : (
            slice.map((doc) => (
              <tr
                key={doc.id}
                className="border-b"
                style={{ borderColor: colors.border }}
              >
                <td
                  className="px-3 py-2 text-xs"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: colors.text,
                  }}
                >
                  {doc.numero_documento ?? doc.id}
                </td>
                <td
                  className="px-3 py-2 text-xs"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: colors.text,
                  }}
                >
                  {documentoFiscalService.getNomeCliente(doc)}
                </td>
                <td className="px-3 py-2">
                  <TipoBadge tipo={doc.tipo_documento} colors={colors} />
                </td>
                <td
                  className="px-3 py-2 text-xs"
                  style={{ whiteSpace: "nowrap", color: colors.textSecondary }}
                >
                  {new Date(doc.data_emissao).toLocaleDateString()}
                </td>
                <td
                  className="px-3 py-2 text-right text-xs font-medium"
                  style={{ whiteSpace: "nowrap", color: colors.text }}
                >
                  {formatKz(doc.total_liquido)}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center gap-0.5">{acoes(doc)}</div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  /* ── Cards mobile ── */
  const cardsMobile = (
    <div className="sm:hidden">
      {slice.length === 0 ? (
        <div
          className="px-3 py-8 text-center text-xs"
          style={{ color: colors.textSecondary }}
        >
          Nenhum documento nesta aba
        </div>
      ) : (
        slice.map((doc) => (
          <DocCard
            key={doc.id}
            doc={doc}
            colors={colors}
            formatKz={formatKz}
            getNomeCliente={documentoFiscalService.getNomeCliente}
            acoes={acoes(doc)}
          />
        ))
      )}
    </div>
  );

  /* ── Render principal ── */
  return (
    <div className="w-full flex flex-col">
      {/* Abas */}
      <div
        className="flex overflow-x-auto"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        {TABS.map((tab) => {
          const count = docsTab(tab.key).length;
          const ativa = tabAtiva === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTabAtiva(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium shrink-0"
              style={{
                color: ativa ? colors.text : colors.textSecondary,
                background: "none",
                border: "none",
                borderBottom: ativa
                  ? `2px solid ${colors.primary}`
                  : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="px-1.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: `${colors.primary}20`,
                    color: colors.secondary,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="p-10 text-center" style={{ color: colors.textSecondary }}>
          <div
            className="w-5 h-5 border-2 animate-spin rounded-full mx-auto"
            style={{
              borderColor: `${colors.primary}30`,
              borderTopColor: colors.primary,
            }}
          />
        </div>
      ) : (
        <>
          {tabelaDesktop}
          {cardsMobile}
          <Paginacao
            pagina={pg}
            total={totalPaginas}
            quantidade={docsAtivos.length}
            onAnterior={() => setPagina(tabAtiva, pg - 1)}
            onProxima={() => setPagina(tabAtiva, pg + 1)}
            colors={colors}
          />
        </>
      )}
    </div>
  );
}