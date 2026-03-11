"use client";

import React, { useEffect, useState, useCallback } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  FileText,
  ShoppingCart,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wallet,
  Download,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";

import { dashboardService, vendaService, NOMES_TIPO_DOCUMENTO } from "@/services/vendas";
import type { DashboardResponse, Venda, TipoDocumentoFiscal } from "@/services/vendas";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";

/* ─── Tipos de documento ─────────────────────────────────────────── */
const MAPA_TIPO_EXTRA: Record<string, string> = {
  VENDA: "Venda", venda: "Venda",
  fatura: "Fatura", recibo: "Recibo",
  proforma: "Fatura Proforma",
  nota_credito: "Nota de Crédito", nota_debito: "Nota de Débito",
};

function getNomeTipo(tipo?: string | null): string {
  if (!tipo) return "Documento";
  if (NOMES_TIPO_DOCUMENTO[tipo as TipoDocumentoFiscal]) return NOMES_TIPO_DOCUMENTO[tipo as TipoDocumentoFiscal];
  if (MAPA_TIPO_EXTRA[tipo]) return MAPA_TIPO_EXTRA[tipo];
  const s = tipo.replace(/[_-]/g, " ");
  return s === s.toUpperCase() ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

/* ─── Formatadores ───────────────────────────────────────────────── */
const fmtKz = (v?: number | string | null) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "AOA", minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(Number(v) || 0).replace("AOA", "Kz");

const fmtN = (v?: number | string | null) =>
  new Intl.NumberFormat("pt-PT").format(Number(v) || 0);

const fmtDate = (d?: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtTime = (t?: string) => {
  if (!t) return "";
  const s = t.includes("T") ? t.split("T")[1] : t;
  return new Date(`2000-01-01T${s}`).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
};

/* ─── PDF export ─────────────────────────────────────────────────── */
// Importação correcta: jspdf-autotable adiciona autoTable ao prototype de jsPDF.
// Tem de ser importado DEPOIS de jsPDF e a instância criada DEPOIS do import.
async function exportarPDF(dashboard: DashboardResponse, vendas: Venda[], periodo: string) {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  // Alguns bundlers expõem autoTable como default function — aplicar manualmente se necessário
  const autoTableFn = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Se o prototype ainda não tiver autoTable (alguns bundlers não augmentam), adicionar manualmente
  if (typeof (doc as any).autoTable !== "function" && typeof autoTableFn === "function") {
    (doc as any).autoTable = function (...args: unknown[]) {
      return autoTableFn(this, ...args);
    };
  }

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const P = [18, 56, 89] as [number, number, number]; // primary
  const A = [249, 148, 31] as [number, number, number]; // accent
  const GR = [100, 100, 100] as [number, number, number];
  const LG = [230, 230, 230] as [number, number, number];
  const WH = [255, 255, 255] as [number, number, number];
  const ST = [245, 247, 250] as [number, number, number]; // stripe

  const autoT = (opts: any) => {
    if (typeof (doc as any).autoTable === "function") {
      (doc as any).autoTable(opts);
    }
  };

  const lastY = () => ((doc as any).lastAutoTable?.finalY ?? 0) + 8;

  let y = 0;

  /* Cabeçalho */
  doc.setFillColor(...P); doc.rect(0, 0, pw, 22, "F");
  doc.setFillColor(...A); doc.rect(0, 22, pw, 2, "F");
  doc.setTextColor(...WH); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("RELATÓRIO DE VENDAS", 14, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.text(`Gerado: ${new Date().toLocaleDateString("pt-PT")}  •  Período: ${periodo}`, pw - 14, 14, { align: "right" });
  y = 30;

  /* KPIs */
  doc.setTextColor(...P); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("INDICADORES PRINCIPAIS", 14, y); y += 3;
  const kpis = [
    ["Total Faturado", fmtKz(dashboard.kpis?.totalFaturado)],
    ["Total de Vendas", fmtN(dashboard.vendas?.total)],
    ["Clientes Ativos", fmtN(dashboard.clientes?.ativos)],
    ["Ticket Médio", fmtKz(dashboard.kpis?.ticketMedio)],
  ];
  const cw = (pw - 28) / 4;
  kpis.forEach(([lbl, val], i) => {
    const x = 14 + i * cw;
    doc.setFillColor(...LG); doc.roundedRect(x, y, cw - 3, 16, 1.5, 1.5, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GR);
    doc.text(lbl, x + (cw - 3) / 2, y + 5, { align: "center" });
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...P);
    doc.text(val, x + (cw - 3) / 2, y + 11.5, { align: "center" });
  });
  y += 22;

  /* Alertas */
  const al = dashboard.alertas;
  const aRows = [
    al?.documentos_vencidos > 0 && `Documentos vencidos: ${al.documentos_vencidos}`,
    al?.documentos_proximo_vencimento > 0 && `Próximos do vencimento: ${al.documentos_proximo_vencimento}`,
    al?.adiantamentos_pendentes > 0 && `Adiantamentos pendentes: ${al.adiantamentos_pendentes}`,
    al?.proformas_pendentes > 0 && `Proformas pendentes: ${al.proformas_pendentes}`,
  ].filter(Boolean) as string[];
  if (aRows.length > 0) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...P);
    doc.text("ALERTAS", 14, y); y += 3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(180, 70, 0);
    aRows.forEach(a => { doc.text(`• ${a}`, 16, y); y += 4.5; });
    y += 2;
  }

  /* Docs por tipo */
  const porTipo = dashboard.documentos_fiscais?.por_tipo;
  if (porTipo) {
    const rows = Object.entries(porTipo)
      .filter(([, d]) => (d.quantidade ?? 0) > 0)
      .map(([tipo, d]) => [getNomeTipo(d.nome || tipo), fmtN(d.quantidade), fmtKz(d.valor)]);
    if (rows.length > 0) {
      if (y > 220) { doc.addPage(); y = 16; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...P);
      doc.text("DOCUMENTOS POR TIPO", 14, y); y += 2;
      autoT({
        startY: y, head: [["Tipo de Documento", "Quantidade", "Valor Total"]], body: rows,
        theme: "grid", headStyles: { fillColor: P, fontSize: 7.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5 }, alternateRowStyles: { fillColor: ST },
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } }, margin: { left: 14, right: 14 }
      });
      y = lastY();
    }
  }

  /* Top produtos */
  const top = (dashboard.indicadores?.produtosMaisVendidos || []).filter(p => p.valor_total > 0).slice(0, 5);
  if (top.length > 0) {
    if (y > 200) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...P);
    doc.text("TOP PRODUTOS MAIS VENDIDOS", 14, y); y += 2;
    autoT({
      startY: y, head: [["#", "Produto", "Código", "Qtd.", "Valor Total"]],
      body: top.map((p, i) => [i + 1, p.produto, p.codigo || "—", fmtN(p.quantidade), fmtKz(p.valor_total)]),
      theme: "grid", headStyles: { fillColor: P, fontSize: 7.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5 }, alternateRowStyles: { fillColor: ST },
      columnStyles: { 0: { halign: "center", cellWidth: 9 }, 3: { halign: "center" }, 4: { halign: "right" } },
      margin: { left: 14, right: 14 }
    });
    y = lastY();
  }

  /* Todas as vendas */
  if (vendas.length > 0) {
    if (y > 180) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...P);
    doc.text(`TODAS AS VENDAS (${vendas.length} registos)`, 14, y); y += 2;
    autoT({
      startY: y, head: [["Data", "Cliente", "Tipo Documento", "Total", "Status"]],
      body: vendas.map(v => [
        fmtDate(v.data_venda),
        v.cliente?.nome || v.cliente_nome || "Consumidor Final",
        getNomeTipo(v.tipo_documento_fiscal || v.tipo_documento),
        fmtKz(v.total),
        v.status === "faturada" ? "Faturada" : v.status === "cancelada" ? "Cancelada" : "Aberta",
      ]),
      theme: "striped", headStyles: { fillColor: P, fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 7 }, alternateRowStyles: { fillColor: ST },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "center" } }, margin: { left: 14, right: 14 }
    });
  }

  /* Rodapé */
  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LG); doc.line(14, ph - 10, pw - 14, ph - 10);
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GR);
    doc.text(`FacturaJá  •  Relatório de Vendas  •  Página ${p} de ${total}`, pw / 2, ph - 5, { align: "center" });
  }

  doc.save(`relatorio-vendas-${new Date().toISOString().split("T")[0]}.pdf`);
}

/* ─── Excel export ───────────────────────────────────────────────── */
async function exportarExcel(dashboard: DashboardResponse, vendas: Venda[], periodo: string) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  /* Folha 1 — Resumo */
  const resumo = [
    ["RELATÓRIO DE VENDAS", "", "", ""],
    [`Período: ${periodo}`, "", `Gerado em: ${new Date().toLocaleDateString("pt-PT")}`, ""],
    ["", "", "", ""],
    ["INDICADORES PRINCIPAIS", "", "", ""],
    ["Total Faturado", fmtKz(dashboard.kpis?.totalFaturado), "Total de Vendas", fmtN(dashboard.vendas?.total)],
    ["Clientes Ativos", fmtN(dashboard.clientes?.ativos), "Ticket Médio", fmtKz(dashboard.kpis?.ticketMedio)],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  /* Folha 2 — Vendas */
  const vendasRows = [
    ["Data", "Hora", "Cliente", "NIF", "Tipo Documento", "Total (Kz)", "Status"],
    ...vendas.map(v => [
      fmtDate(v.data_venda),
      v.hora_venda ? fmtTime(v.hora_venda) : "",
      v.cliente?.nome || v.cliente_nome || "Consumidor Final",
      v.cliente?.nif || v.cliente_nif || "",
      getNomeTipo(v.tipo_documento_fiscal || v.tipo_documento),
      Number(v.total) || 0,
      v.status === "faturada" ? "Faturada" : v.status === "cancelada" ? "Cancelada" : "Aberta",
    ]),
  ];
  const wsVendas = XLSX.utils.aoa_to_sheet(vendasRows);
  wsVendas["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas");

  /* Folha 3 — Docs por Tipo */
  const porTipo = dashboard.documentos_fiscais?.por_tipo;
  if (porTipo) {
    const tipoRows = [
      ["Tipo de Documento", "Quantidade", "Valor Total (Kz)"],
      ...Object.entries(porTipo)
        .filter(([, d]) => (d.quantidade ?? 0) > 0)
        .map(([tipo, d]) => [getNomeTipo(d.nome || tipo), Number(d.quantidade) || 0, Number(d.valor) || 0]),
    ];
    const wsTipo = XLSX.utils.aoa_to_sheet(tipoRows);
    wsTipo["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsTipo, "Docs por Tipo");
  }

  /* Folha 4 — Top Produtos */
  const top = (dashboard.indicadores?.produtosMaisVendidos || []).filter(p => p.valor_total > 0).slice(0, 10);
  if (top.length > 0) {
    const prodRows = [
      ["Posição", "Produto", "Código", "Quantidade", "Valor Total (Kz)"],
      ...top.map((p, i) => [i + 1, p.produto, p.codigo || "—", Number(p.quantidade), Number(p.valor_total)]),
    ];
    const wsProd = XLSX.utils.aoa_to_sheet(prodRows);
    wsProd["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsProd, "Top Produtos");
  }

  XLSX.writeFile(wb, `relatorio-vendas-${new Date().toISOString().split("T")[0]}.xlsx`);
}

/* ─── Skeletons ──────────────────────────────────────────────────── */
const SkeletonCard = ({ colors }: { colors: any }) => (
  <div className="p-3 rounded-xl border animate-pulse" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg flex-shrink-0" style={{ backgroundColor: colors.border }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 rounded w-16" style={{ backgroundColor: colors.border }} />
        <div className="h-5 rounded w-24" style={{ backgroundColor: colors.border }} />
      </div>
    </div>
  </div>
);

const SkeletonChart = ({ colors, tall }: { colors: any; tall?: boolean }) => (
  <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    <div className="h-4 rounded w-32 mb-3 animate-pulse" style={{ backgroundColor: colors.border }} />
    <div className={`rounded-lg animate-pulse ${tall ? "h-56" : "h-44"}`} style={{ backgroundColor: colors.hover }} />
  </div>
);

const SkeletonTable = ({ colors }: { colors: any }) => (
  <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    <div className="h-4 rounded w-32 mb-3 animate-pulse" style={{ backgroundColor: colors.border }} />
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded animate-pulse" style={{ backgroundColor: colors.hover }} />)}
    </div>
  </div>
);

/* ─── StatCard compacto ──────────────────────────────────────────── */
const StatCard = ({
  icon, label, value, trend, colors,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  trend?: { value: number; label: string }; colors: any;
}) => {
  const pos = (trend?.value ?? 0) > 0;
  return (
    <div className="p-3 rounded-xl border hover:shadow-sm transition-shadow"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: `${colors.primary}15` }}>
          <div style={{ color: colors.primary }}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium leading-none mb-0.5" style={{ color: colors.textSecondary }}>{label}</p>
          <p className="text-base font-bold truncate leading-tight" style={{ color: colors.text }}>{value}</p>
          {trend && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {pos ? <ArrowUpRight className="w-2.5 h-2.5" style={{ color: colors.success }} />
                : <ArrowDownRight className="w-2.5 h-2.5" style={{ color: colors.danger }} />}
              <span className="text-[9px] font-medium" style={{ color: pos ? colors.success : colors.danger }}>
                {Math.abs(trend.value)}% {trend.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── ChartCard compacto ─────────────────────────────────────────── */
const ChartCard = ({
  title, icon, children, subtitle, colors,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; subtitle?: string; colors: any;
}) => (
  <div className="p-3 rounded-xl border shadow-sm h-full" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1 rounded-lg" style={{ backgroundColor: colors.hover }}>{icon}</div>
      <div>
        <h3 className="text-xs font-semibold" style={{ color: colors.text }}>{title}</h3>
        {subtitle && <p className="text-[10px]" style={{ color: colors.textSecondary }}>{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

/* ─── StatusBadge ────────────────────────────────────────────────── */
const StatusBadge = ({ status, colors }: { status: string; colors: any }) => {
  const cfg: Record<string, { bg: string; text: string; Icon: any; label: string }> = {
    faturada: { bg: `${colors.success}20`, text: colors.success, Icon: CheckCircle, label: "Faturada" },
    aberta: { bg: `${colors.warning}20`, text: colors.warning, Icon: Clock, label: "Aberta" },
    cancelada: { bg: `${colors.danger}20`, text: colors.danger, Icon: XCircle, label: "Cancelada" },
    paga: { bg: `${colors.success}20`, text: colors.success, Icon: CheckCircle, label: "Paga" },
    pendente: { bg: `${colors.warning}20`, text: colors.warning, Icon: Clock, label: "Pendente" },
    parcial: { bg: "#8B5CF620", text: "#8B5CF6", Icon: AlertCircle, label: "Parcial" },
  };
  const { bg, text, Icon, label } = cfg[status?.toLowerCase()] ?? cfg.aberta;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: bg, color: text }}>
      <Icon className="w-2.5 h-2.5" />{label}
    </span>
  );
};

/* ─── EmptyState ─────────────────────────────────────────────────── */
const EmptyState = ({ icon: Icon, title, description, colors }: { icon: any; title: string; description: string; colors: any }) => (
  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg"
    style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
    <Icon className="w-8 h-8 mb-1.5" style={{ color: colors.textSecondary }} />
    <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>{title}</p>
    <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>{description}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export default function RelatorioVendas() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exPDF, setExPDF] = useState(false);
  const [exXLS, setExXLS] = useState(false);

  const colors = useThemeColors();
  const { theme } = useTheme();

  const gridStroke = theme === "dark" ? "#404040" : "#E5E7EB";
  const tickStyle = { fill: colors.textSecondary, fontSize: 10 };
  const tooltipStyle = {
    contentStyle: { backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, fontSize: 11 },
  };
  const router = useRouter();
  const novavendaURL = "/dashboard/Vendas/Nova_venda";

  const carregarDados = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dash, ven] = await Promise.all([dashboardService.fetch(), vendaService.listar()]);
      if (!dash) throw new Error("Dados do dashboard não recebidos");
      setDashboard(dash);
      setVendas(ven?.vendas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const getPeriodo = () => new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const handleExPDF = async () => {
    if (!dashboard) return;
    setExPDF(true);
    try { await exportarPDF(dashboard, vendas, getPeriodo()); } finally { setExPDF(false); }
  };

  const handleExXLS = async () => {
    if (!dashboard) return;
    setExXLS(true);
    try { await exportarExcel(dashboard, vendas, getPeriodo()); } finally { setExXLS(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <MainEmpresa>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" style={{ backgroundColor: colors.background }}>
        <div className="border-b pb-3" style={{ borderColor: colors.border }}>
          <div className="h-6 rounded w-44 mb-1.5 animate-pulse" style={{ backgroundColor: colors.border }} />
          <div className="h-3.5 rounded w-32 animate-pulse" style={{ backgroundColor: colors.border }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} colors={colors} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonChart colors={colors} tall />
          <SkeletonChart colors={colors} tall />
        </div>
        <SkeletonTable colors={colors} />
      </div>
    </MainEmpresa>
  );

  /* ── Erro ── */
  if (error || !dashboard) return (
    <MainEmpresa>
      <div className="flex items-center justify-center min-h-[360px] p-6" style={{ backgroundColor: colors.background }}>
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: `${colors.danger}20` }}>
            <AlertCircle className="w-7 h-7" style={{ color: colors.danger }} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: colors.text }}>Erro ao carregar dados</h3>
          <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
            {error || "Não foi possível carregar os dados do relatório"}
          </p>
          <button onClick={carregarDados} className="px-4 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: colors.primary }}>
            Tentar novamente
          </button>
        </div>
      </div>
    </MainEmpresa>
  );

  const safe = (v: any, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };

  /* ── KPIs ── */
  const statsData = [
    {
      icon: <DollarSign className="w-3.5 h-3.5" />, label: "Total Faturado", value: fmtKz(dashboard.kpis?.totalFaturado),
      trend: dashboard.kpis?.crescimentoPercentual ? { value: dashboard.kpis.crescimentoPercentual, label: "vs mês ant." } : undefined
    },
    { icon: <ShoppingCart className="w-3.5 h-3.5" />, label: "Total de Vendas", value: fmtN(dashboard.vendas?.total) },
    { icon: <Users className="w-3.5 h-3.5" />, label: "Clientes Ativos", value: fmtN(dashboard.clientes?.ativos) },
    { icon: <Receipt className="w-3.5 h-3.5" />, label: "Ticket Médio", value: fmtKz(dashboard.kpis?.ticketMedio) },
  ];

  /* ── Evolução Mensal ── */
  let evolucao: Array<{ mes: string; valor: number }> = [];
  if (dashboard.documentos_fiscais?.por_mes?.length) {
    evolucao = dashboard.documentos_fiscais.por_mes.slice(-6).map(m => ({ mes: m.mes, valor: safe(m.total) }));
  } else if (vendas.length > 0) {
    const pm: Record<string, number> = {};
    vendas.forEach(v => {
      const d = new Date(v.data_venda);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      pm[k] = (pm[k] || 0) + safe(v.total);
    });
    evolucao = Object.entries(pm).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([mes, valor]) => ({ mes, valor }));
  }

  /* ── Docs por tipo ── */
  let docsTipo: Array<{ tipo: string; quantidade: number }> = [];
  if (dashboard.documentos_fiscais?.por_tipo) {
    docsTipo = Object.entries(dashboard.documentos_fiscais.por_tipo)
      .map(([tipo, d]) => ({ tipo: getNomeTipo(d.nome || tipo), quantidade: safe(d.quantidade) }))
      .filter(d => d.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 6);
  }

  /* ── Top Produtos ── */
  const topProd = (dashboard.indicadores?.produtosMaisVendidos || []).slice(0, 5);
  while (topProd.length < 5) topProd.push({ produto: "—", codigo: "—", quantidade: 0, valor_total: 0 });

  const rankBg = ["bg-yellow-500", "bg-gray-400", "bg-orange-400", "bg-blue-400", "bg-purple-400"];

  /* ── Alertas ── */
  const alertas = [
    dashboard.alertas?.documentos_vencidos > 0 && { n: dashboard.alertas.documentos_vencidos, label: "Vencidos", Icon: AlertCircle, color: colors.danger },
    dashboard.alertas?.documentos_proximo_vencimento > 0 && { n: dashboard.alertas.documentos_proximo_vencimento, label: "Próx. venc.", Icon: Clock, color: colors.warning },
    dashboard.alertas?.adiantamentos_pendentes > 0 && { n: dashboard.alertas.adiantamentos_pendentes, label: "Adiant. pend.", Icon: Wallet, color: "#3B82F6" },
    dashboard.alertas?.proformas_pendentes > 0 && { n: dashboard.alertas.proformas_pendentes, label: "Proformas pend.", Icon: FileText, color: "#8B5CF6" },
  ].filter(Boolean) as Array<{ n: number; label: string; Icon: any; color: string }>;

  const periodo = getPeriodo();

  return (
    <MainEmpresa>
      <div className="space-y-3 pb-6 max-w-7xl mx-auto transition-colors duration-300"
        style={{ backgroundColor: colors.background }}>

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3"
          style={{ borderColor: colors.border }}>
          <div>
            <h1 className="text-lg sm:text-xl font-bold" style={{ color: colors.primary }}>Relatório de Vendas</h1>
            <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: colors.textSecondary }}>
              <Calendar className="w-3 h-3" />{periodo}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* link para nova venda */}
            <button onClick={() => router.push(novavendaURL)}
              className="p-1.5 rounded-lg border flex items-center gap-1 text-[11px] transition-colors"
              style={{ borderColor: colors.border, color: colors.textSecondary, backgroundColor: colors.card }}>
              <ShoppingCart className="w-3 h-3" />
              <span className="hidden sm:inline">Nova venda</span>
            </button>
            {/* Atualizar */}
            <button onClick={carregarDados}
              className="p-1.5 rounded-lg border flex items-center gap-1 text-[11px] transition-colors"
              style={{ borderColor: colors.border, color: colors.textSecondary, backgroundColor: colors.card }}>
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            {/* Exportar Excel */}
            <button onClick={handleExXLS} disabled={exXLS}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white flex items-center gap-1 disabled:opacity-50"
              style={{ backgroundColor: "#16a34a" }}>
              {exXLS
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Excel…</>
                : <><FileSpreadsheet className="w-3 h-3" />Excel</>}
            </button>
            {/* Exportar PDF */}
            <button onClick={handleExPDF} disabled={exPDF}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white flex items-center gap-1 disabled:opacity-50"
              style={{ backgroundColor: colors.secondary }}>
              {exPDF
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />PDF…</>
                : <><Download className="w-3 h-3" />PDF</>}
            </button>
          </div>
        </div>

        {/* ── KPI Cards (linha compacta) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statsData.map((s, i) => <StatCard key={i} {...s} colors={colors} />)}
        </div>

        {/* ── Alertas (só se existirem) ── */}
        {alertas.length > 0 && (
          <div className={`grid gap-2 grid-cols-2 ${alertas.length > 2 ? "md:grid-cols-4" : ""}`}>
            {alertas.map(({ n, label, Icon, color }, i) => (
              <div key={i} className="px-3 py-2 rounded-lg border flex items-center gap-2"
                style={{ backgroundColor: `${color}10`, borderColor: `${color}35` }}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                <div>
                  <p className="text-sm font-bold leading-none" style={{ color }}>{n}</p>
                  <p className="text-[10px] mt-0.5" style={{ color }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Evolução Mensal ── */}
        <ChartCard
          title="Evolução das Vendas"
          icon={<TrendingUp className="w-3.5 h-3.5" style={{ color: colors.secondary }} />}
          subtitle="Últimos 6 meses"
          colors={colors}
        >
          {evolucao.length > 0 && evolucao.some(d => d.valor > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucao} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.secondary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="mes" tick={tickStyle} axisLine={{ stroke: gridStroke }} />
                <YAxis tick={tickStyle} axisLine={{ stroke: gridStroke }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtKz(v), "Valor"]} labelFormatter={l => `Mês: ${l}`} />
                <Area type="monotone" dataKey="valor" stroke={colors.secondary} strokeWidth={2} fillOpacity={1} fill="url(#gValor)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={TrendingUp} title="Sem dados de evolução" description="Nenhuma venda nos últimos meses" colors={colors} />
          )}
        </ChartCard>

        {/* ── Docs por Tipo + Top Produtos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          <ChartCard title="Documentos por Tipo" subtitle="Quantidade emitida"
            icon={<FileText className="w-3.5 h-3.5" style={{ color: colors.secondary }} />} colors={colors}>
            {docsTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={docsTipo} layout="vertical" margin={{ top: 2, right: 16, left: 100, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} vertical />
                  <XAxis type="number" hide />
                  <YAxis dataKey="tipo" type="category" tick={{ ...tickStyle, fontSize: 9.5 }} width={96} interval={0} stroke={gridStroke} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtN(v), "Quantidade"]} />
                  <Bar dataKey="quantidade" fill={colors.primary} radius={[0, 3, 3, 0]} barSize={13} name="quantidade" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={FileText} title="Sem dados" description="Nenhum documento emitido" colors={colors} />
            )}
          </ChartCard>

          <ChartCard title="Top Produtos" subtitle="Mais vendidos"
            icon={<Package className="w-3.5 h-3.5" style={{ color: colors.secondary }} />} colors={colors}>
            <div className="space-y-1.5">
              {topProd.map((p, i) => {
                const ok = p.valor_total > 0;
                return (
                  <div key={i} className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                    style={{ backgroundColor: ok ? colors.hover : `${colors.hover}60` }}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${ok ? rankBg[i] : "bg-gray-300"}`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate max-w-[130px]" style={{ color: ok ? colors.text : colors.textSecondary }}>
                          {p.produto}
                        </p>
                        <p className="text-[9px]" style={{ color: colors.textSecondary }}>{p.codigo || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-[11px] font-semibold" style={{ color: ok ? colors.primary : colors.textSecondary }}>
                        {ok ? fmtKz(p.valor_total) : "—"}
                      </p>
                      <p className="text-[9px]" style={{ color: colors.textSecondary }}>{ok ? `${p.quantidade} unid.` : "—"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>

        {/* ── Tabela Vendas Recentes ── */}
        <ChartCard title="Vendas Recentes" subtitle={`${Math.min(vendas.length, 10)} últimas vendas`}
          icon={<ShoppingCart className="w-3.5 h-3.5" style={{ color: colors.secondary }} />} colors={colors}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 11 }}>
              <thead>
                <tr className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                  {["Data/Hora", "Cliente", "Doc.", "Total", "Status"].map((h, i) => (
                    <th key={h}
                      className={`py-2 px-2.5 font-semibold text-left ${i === 3 ? "text-right" : i === 4 ? "text-center" : ""}`}
                      style={{ color: colors.textSecondary, fontSize: 10 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendas.slice(0, 10).map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:opacity-75 transition-opacity"
                    style={{ borderColor: colors.border }}>
                    <td className="py-1.5 px-2.5 whitespace-nowrap" style={{ color: colors.textSecondary }}>
                      <div>{fmtDate(v.data_venda)}</div>
                      {v.hora_venda && <div style={{ fontSize: 9 }}>{fmtTime(v.hora_venda)}</div>}
                    </td>
                    <td className="py-1.5 px-2.5">
                      <div className="font-medium truncate max-w-[120px]" style={{ color: colors.text }}>
                        {v.cliente?.nome || v.cliente_nome || "Consumidor Final"}
                      </div>
                      {v.cliente?.nif && <div style={{ fontSize: 9, color: colors.textSecondary }}>NIF: {v.cliente.nif}</div>}
                    </td>
                    <td className="py-1.5 px-2.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${colors.primary}18`, color: colors.primary, fontSize: 9.5 }}>
                        {getNomeTipo(v.tipo_documento_fiscal || v.tipo_documento)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold" style={{ color: colors.text }}>
                      {fmtKz(v.total)}
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      <StatusBadge status={v.status || "aberta"} colors={colors} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vendas.length === 0 && (
              <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                <ShoppingCart className="w-8 h-8 mx-auto mb-1.5" style={{ color: colors.border }} />
                <p className="text-xs">Nenhuma venda registada</p>
              </div>
            )}
          </div>
        </ChartCard>

      </div>
    </MainEmpresa>
  );
}