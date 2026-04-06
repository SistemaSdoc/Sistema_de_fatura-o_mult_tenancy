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

const ESTADO_LABEL: Record<string, string> = {
  paga: "Pago",
  parcialmente_paga: "Pag. Parcial",
  emitido: "Pendente",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

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

interface InvoiceTableProps {
  documentos: DocumentoFiscal[];
  loading: boolean;
  gerandoRecibo: string | null;
  baixandoPdf: string | null;
  imprimindo: string | null;
  onVerDetalhes: (doc: DocumentoFiscal) => void;
  onGerarRecibo: (doc: DocumentoFiscal) => Promise<DocumentoFiscal | void> | void;
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
type TabAtiva = "fr" | "ft";

/* ── Badge Tipo ── */
function TipoBadge({ tipo, colors }: { tipo: TipoDocumento; colors: ColorsTheme }) {
  const palette: Partial<Record<TipoDocumento, { bg: string; text: string }>> = {
    FT: { bg: `${colors.textSecondary}1a`, text: colors.secondary },
    FR: { bg: `${colors.success}1a`, text: colors.success },
    RC: { bg: `${colors.teal ?? colors.success}1a`, text: colors.teal ?? colors.success },
    FP: { bg: `${colors.warning}1a`, text: colors.warning },
    NC: { bg: `${colors.danger}1a`, text: colors.danger },
    ND: { bg: `${colors.secondary}1a`, text: colors.secondary },
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

/* ── Badge Estado ── */
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

/* ── Botão ícone ── */
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

/* ── Spinner ── */
function Spinner({ color }: { color: string }) {
  return (
    <div
      className="w-4 h-4 border-2 animate-spin rounded-full"
      style={{ borderColor: `${color}30`, borderTopColor: color }}
    />
  );
}

/* ── Paginação ── */
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

/* ── Card mobile para um documento ── */
function DocCard({
  doc,
  colors,
  formatKz,
  getNomeCliente,
  mostrarTipo,
  mostrarEstado,
  acoes,
}: {
  doc: DocumentoFiscal;
  colors: ColorsTheme;
  formatKz: (v: number | string | undefined) => string;
  getNomeCliente: (d: DocumentoFiscal) => string;
  mostrarTipo: boolean;
  mostrarEstado: boolean;
  acoes: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-3"
      style={{ borderBottom: `0.5px solid ${colors.border}` }}
    >
      {/* Linha 1: número + badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {doc.numero_documento ?? doc.id}
        </span>
        <div className="flex gap-1 flex-wrap">
          {mostrarTipo && <TipoBadge tipo={doc.tipo_documento} colors={colors} />}
          {mostrarEstado && doc.estado && (
            <EstadoBadge estado={doc.estado} colors={colors} />
          )}
        </div>
      </div>

      {/* Linha 2: cliente */}
      <span className="text-xs truncate" style={{ color: colors.textSecondary }}>
        {getNomeCliente(doc)}
      </span>

      {/* Linha 3: data + total */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: colors.textSecondary }}>
          {new Date(doc.data_emissao).toLocaleDateString()}
        </span>
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          {formatKz(doc.total_liquido)}
        </span>
      </div>

      {/* Linha 4: ações */}
      <div className="flex gap-1">{acoes}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function InvoiceTable({
  documentos,
  loading,
  gerandoRecibo,
  baixandoPdf,
  imprimindo,
  onVerDetalhes,
  onGerarRecibo,
  onImprimirA4,
  onImprimirPdf,
  onBaixarPdf,
  formatKz,
  documentoFiscalService,
  colors,
}: InvoiceTableProps) {
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>("fr");
  const [paginaFR, setPaginaFR] = useState(1);
  const [paginaFT, setPaginaFT] = useState(1);

  /* ── Separação por aba ── */
  const docsFR = documentos.filter((d) => ["FR", "RC"].includes(d.tipo_documento));
  const docsFT = documentos.filter((d) => d.tipo_documento === "FT");

  const totalPagesFR = Math.max(Math.ceil(docsFR.length / POR_PAGINA), 1);
  const totalPagesFT = Math.max(Math.ceil(docsFT.length / POR_PAGINA), 1);

  const pgFR = Math.min(Math.max(paginaFR, 1), totalPagesFR);
  const pgFT = Math.min(Math.max(paginaFT, 1), totalPagesFT);

  const sliceFR = docsFR.slice((pgFR - 1) * POR_PAGINA, pgFR * POR_PAGINA);
  const sliceFT = docsFT.slice((pgFT - 1) * POR_PAGINA, pgFT * POR_PAGINA);

  const podeGerarRecibo = (d: DocumentoFiscal) =>
    d.tipo_documento === "FT" && !["cancelado", "paga"].includes(d.estado || "");

  /* ── Vazio ── */
  if (!loading && documentos.length === 0) {
    return (
      <div className="p-10 text-center" style={{ color: colors.textSecondary }}>
        <Receipt size={28} />
        <p>Nenhum documento encontrado</p>
      </div>
    );
  }

  /* ── Ações FR/RC ── */
  const acoesFR = (doc: DocumentoFiscal) => (
    <>
      <IconBtn onClick={() => onVerDetalhes(doc)} title="Ver" color={colors.text}>
        <Eye size={16} />
      </IconBtn>
      <IconBtn
        onClick={() => onImprimirPdf(doc)}
        disabled={imprimindo === doc.id}
        title="Imprimir"
        color={colors.secondary}
      >
        {imprimindo === doc.id ? <Spinner color={colors.secondary} /> : <Printer size={16} />}
      </IconBtn>
      <IconBtn
        onClick={() => onBaixarPdf(doc)}
        disabled={baixandoPdf === doc.id}
        title="PDF"
        color={colors.text}
      >
        {baixandoPdf === doc.id ? <Spinner color={colors.text} /> : <Download size={16} />}
      </IconBtn>
    </>
  );

  /* ── Ações FT ── */
  const acoesFT = (doc: DocumentoFiscal) => (
    <>
      <IconBtn onClick={() => onVerDetalhes(doc)} title="Ver" color={colors.text}>
        <Eye size={16} />
      </IconBtn>
      {podeGerarRecibo(doc) && (
        <IconBtn
          onClick={() => onGerarRecibo(doc)}
          disabled={gerandoRecibo === doc.id}
          title="Recibo"
          color={colors.success}
        >
          {gerandoRecibo === doc.id ? <Spinner color={colors.success} /> : <FileText size={16} />}
        </IconBtn>
      )}
      <IconBtn
        onClick={() => onImprimirPdf(doc)}
        disabled={imprimindo === doc.id}
        title="Imprimir"
        color={colors.secondary}
      >
        {imprimindo === doc.id ? <Spinner color={colors.secondary} /> : <Printer size={16} />}
      </IconBtn>
      <IconBtn
        onClick={() => onBaixarPdf(doc)}
        disabled={baixandoPdf === doc.id}
        title="PDF"
        color={colors.text}
      >
        {baixandoPdf === doc.id ? <Spinner color={colors.text} /> : <Download size={16} />}
      </IconBtn>
    </>
  );

  /* ── Tabela FR/RC ── */
  const tabelaFR = (
    <>
      <div className="hidden sm:block overflow-x-auto w-full">
        <table
          className="w-full text-sm"
          style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: 480 }}
        >
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "11%" }} />
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
            {sliceFR.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-xs"
                  style={{ color: colors.textSecondary, borderBottom: `0.5px solid ${colors.border}` }}
                >
                  Nenhum documento nesta aba
                </td>
              </tr>
            ) : (
              sliceFR.map((doc) => (
                <tr key={doc.id} className="border-b" style={{ borderColor: colors.border }}>
                  <td
                    className="px-3 py-2"
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {doc.numero_documento ?? doc.id}
                  </td>
                  <td
                    className="px-3 py-2"
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {documentoFiscalService.getNomeCliente(doc)}
                  </td>
                  <td className="px-3 py-2">
                    <TipoBadge tipo={doc.tipo_documento} colors={colors} />
                  </td>
                  <td className="px-3 py-2" style={{ whiteSpace: "nowrap" }}>
                    {new Date(doc.data_emissao).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ whiteSpace: "nowrap" }}>
                    {formatKz(doc.total_liquido)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center gap-1">{acoesFR(doc)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden">
        {sliceFR.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs" style={{ color: colors.textSecondary }}>
            Nenhum documento nesta aba
          </div>
        ) : (
          sliceFR.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              colors={colors}
              formatKz={formatKz}
              getNomeCliente={documentoFiscalService.getNomeCliente}
              mostrarTipo
              mostrarEstado={false}
              acoes={acoesFR(doc)}
            />
          ))
        )}
      </div>

      <Paginacao
        pagina={pgFR}
        total={totalPagesFR}
        quantidade={docsFR.length}
        onAnterior={() => setPaginaFR((p) => p - 1)}
        onProxima={() => setPaginaFR((p) => p + 1)}
        colors={colors}
      />
    </>
  );

  /* ── Tabela FT ── */
  const tabelaFT = (
    <>
      <div className="hidden sm:block overflow-x-auto w-full">
        <table
          className="w-full text-sm"
          style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: 480 }}
        >
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>
          <thead style={{ backgroundColor: colors.primary }}>
            <tr className="text-white text-xs">
              <th className="px-3 py-2 text-left">Documento</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sliceFT.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-xs"
                  style={{ color: colors.textSecondary, borderBottom: `0.5px solid ${colors.border}` }}
                >
                  Nenhuma fatura encontrada
                </td>
              </tr>
            ) : (
              sliceFT.map((doc) => (
                <tr key={doc.id} className="border-b" style={{ borderColor: colors.border }}>
                  <td
                    className="px-3 py-2"
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {doc.numero_documento ?? doc.id}
                  </td>
                  <td
                    className="px-3 py-2"
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {documentoFiscalService.getNomeCliente(doc)}
                  </td>
                  <td className="px-3 py-2" style={{ whiteSpace: "nowrap" }}>
                    {new Date(doc.data_emissao).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ whiteSpace: "nowrap" }}>
                    {formatKz(doc.total_liquido)}
                  </td>
                  <td className="px-3 py-2">
                    {doc.estado ? (
                      <EstadoBadge estado={doc.estado} colors={colors} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center gap-1">{acoesFT(doc)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden">
        {sliceFT.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs" style={{ color: colors.textSecondary }}>
            Nenhuma fatura encontrada
          </div>
        ) : (
          sliceFT.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              colors={colors}
              formatKz={formatKz}
              getNomeCliente={documentoFiscalService.getNomeCliente}
              mostrarTipo={false}
              mostrarEstado
              acoes={acoesFT(doc)}
            />
          ))
        )}
      </div>

      <Paginacao
        pagina={pgFT}
        total={totalPagesFT}
        quantidade={docsFT.length}
        onAnterior={() => setPaginaFT((p) => p - 1)}
        onProxima={() => setPaginaFT((p) => p + 1)}
        colors={colors}
      />
    </>
  );

  /* ── Render principal ── */
  return (
    <div className="w-full flex flex-col">
      {/* Abas */}
      <div
        className="flex overflow-x-auto"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <button
          onClick={() => setTabAtiva("fr")}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium shrink-0"
          style={{
            color: tabAtiva === "fr" ? colors.text : colors.textSecondary,
            background: "none",
            border: "none",
            borderBottom: tabAtiva === "fr" ? `2px solid ${colors.primary}` : "2px solid transparent",
            cursor: "pointer",
            marginBottom: -1,
          }}
        >
          Faturas-Recibo &amp; Recibos
          {docsFR.length > 0 && (
            <span
              className="px-1.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.secondary }}
            >
              {docsFR.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTabAtiva("ft")}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium shrink-0"
          style={{
            color: tabAtiva === "ft" ? colors.text : colors.textSecondary,
            background: "none",
            border: "none",
            borderBottom: tabAtiva === "ft" ? `2px solid ${colors.primary}` : "2px solid transparent",
            cursor: "pointer",
            marginBottom: -1,
          }}
        >
          Faturas
          {docsFT.length > 0 && (
            <span
              className="px-1.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.secondary }}
            >
              {docsFT.length}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="p-10 text-center" style={{ color: colors.textSecondary }}>
          <div
            className="w-5 h-5 border-2 animate-spin rounded-full mx-auto"
            style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }}
          />
        </div>
      ) : tabAtiva === "fr" ? (
        tabelaFR
      ) : (
        tabelaFT
      )}
    </div>
  );
}