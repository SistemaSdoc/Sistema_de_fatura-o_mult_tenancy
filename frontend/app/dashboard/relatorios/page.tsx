"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import MainEmpresa from "../../components/MainEmpresa";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  TrendingUp, DollarSign, FileText, Percent, RefreshCw,
  Download, FileSpreadsheet, AlertCircle, SlidersHorizontal,
} from "lucide-react";
import {
  relatoriosService,
  RelatorioVendas, RelatorioFaturacao,
  RelatorioPagamentosPendentes, RelatorioProformas, RelatorioDocumentosFiscais,
  getPeriodoPredefinido, formatarKwanza, formatarData,
} from "@/services/relatorios";
import { useThemeColors } from "@/context/ThemeContext";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════════════════════ */
type TipoRelatorio = "vendas" | "documentos" | "pagamentos";
type PeriodoTipo = "hoje" | "ontem" | "este_mes" | "mes_passado" | "este_ano" | "personalizado";

interface PeriodoConfig {
  tipo: PeriodoTipo;
  data_inicio: string;
  data_fim: string;
}

/* ═══════════════════════════════════════════════════════════
   EXPORT PDF — sem cards, apenas cabeçalho + tabelas
═══════════════════════════════════════════════════════════ */
async function exportarPDF(tab: TipoRelatorio, dados: any, periodo: string) {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTableFn = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (typeof (doc as any).autoTable !== "function" && typeof autoTableFn === "function") {
    (doc as any).autoTable = function (options: any) {
      return autoTableFn(doc, options);
    };
  }

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const P: [number, number, number] = [18, 56, 89];
  const WH: [number, number, number] = [255, 255, 255];
  const GR: [number, number, number] = [80, 80, 80];
  const LG: [number, number, number] = [245, 247, 250];
  const ST: [number, number, number] = [250, 251, 253];

  const autoT = (opts: any) => {
    if (typeof (doc as any).autoTable === "function") {
      (doc as any).autoTable(opts);
    } else if (typeof autoTableFn === "function") {
      autoTableFn(doc, opts);
    }
  };
  const lastY = () => ((doc as any).lastAutoTable?.finalY ?? 0) + 10;

  const titulos: Record<TipoRelatorio, string> = {
    vendas: "RELATÓRIO DE VENDAS E FATURAÇÃO",
    documentos: "RELATÓRIO DE DOCUMENTOS FISCAIS E PROFORMAS",
    pagamentos: "RELATÓRIO DE PAGAMENTOS PENDENTES",
  };

  // ── Cabeçalho ──
  doc.setFillColor(...P);
  doc.rect(0, 0, pw, 26, "F");
  doc.setTextColor(...WH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titulos[tab], 14, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Período: ${periodo}`, 14, 18);
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}`, pw - 14, 18, { align: "right" });
  doc.setDrawColor(230, 230, 230);
  doc.line(0, 26, pw, 26);

  let y = 34;

  const secTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GR);
    doc.text(title.toUpperCase(), 14, y);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y + 1.5, pw - 14, y + 1.5);
    y += 6;
  };

  const tableDefaults = {
    theme: "grid" as const,
    headStyles: {
      fillColor: P,
      textColor: WH,
      fontSize: 7.5,
      fontStyle: "bold" as const,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
    },
    alternateRowStyles: { fillColor: ST },
    styles: { lineColor: [220, 220, 220] as [number, number, number] },
    margin: { left: 14, right: 14 },
  };

  /* ── VENDAS ── */
  if (tab === "vendas" && dados) {
    const v = dados.vendas || {};
    const f = dados.faturacao || {};
    const t = v.totais || {};

    secTitle("Resumo de Vendas");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Vendas", formatarKwanza(t.total_valor ?? 0)],
        ["Número de Transações", String(t.total_vendas ?? 0)],
        ["Base Tributável", formatarKwanza(t.total_base_tributavel ?? 0)],
        ["Total de IVA", formatarKwanza(t.total_iva ?? 0)],
        ["Total de Retenções", formatarKwanza(t.total_retencao ?? 0)],
        ["Serviços", String(t.total_servicos ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    secTitle("Resumo de Faturação");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Faturação Total", formatarKwanza(f.faturacao_total ?? 0)],
        ["Faturação Paga", formatarKwanza(f.faturacao_paga ?? 0)],
        ["Faturação Pendente", formatarKwanza(f.faturacao_pendente ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (v.vendas?.length > 0) {
      secTitle("Detalhe de Vendas");
      autoT({
        startY: y,
        head: [["#", "Cliente", "Total (Kz)", "Estado"]],
        body: v.vendas.slice(0, 100).map((vd: any, i: number) => [
          String(i + 1),
          typeof vd.cliente === "string" ? vd.cliente : vd.cliente?.nome ?? "-",
          formatarKwanza(Number(vd.total) ?? 0),
          vd.estado_pagamento ?? "-",
        ]),
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          2: { halign: "right" },
          3: { halign: "center" },
        },
        ...tableDefaults,
      });
      y = lastY();
    }

    if (f.por_tipo && Object.keys(f.por_tipo).length > 0) {
      secTitle("Documentos por Tipo");
      autoT({
        startY: y,
        head: [["Tipo de Documento", "Quantidade", "Valor Total (Kz)"]],
        body: Object.entries(f.por_tipo).map(([tipo, d]: any) => [
          tipo,
          String(d?.quantidade ?? 0),
          formatarKwanza(d?.total_liquido ?? 0),
        ]),
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
        ...tableDefaults,
      });
    }
  }

  /* ── DOCUMENTOS ── */
  if (tab === "documentos" && dados) {
    const d = dados.documentos || {};
    const p = dados.proformas || {};
    const e = d.estatisticas || {};

    secTitle("Resumo de Documentos Fiscais");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Documentos", String(e.total_documentos ?? 0)],
        ["Valor Total", formatarKwanza(e.total_valor ?? 0)],
        ["Total de IVA", formatarKwanza(e.total_iva ?? 0)],
        ["Total de Retenções", formatarKwanza(e.total_retencao ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    secTitle("Resumo de Proformas");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Proformas", String(p.total ?? 0)],
        ["Valor Total", formatarKwanza(p.valor_total ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (e.por_tipo && Object.keys(e.por_tipo).length > 0) {
      secTitle("Documentos por Tipo");
      autoT({
        startY: y,
        head: [["Tipo", "Quantidade", "Valor (Kz)", "Retenção (Kz)"]],
        body: Object.entries(e.por_tipo).map(([tipo, dt]: any) => [
          tipo,
          String(dt?.quantidade ?? 0),
          formatarKwanza(dt?.valor ?? 0),
          formatarKwanza(dt?.retencao ?? 0),
        ]),
        columnStyles: {
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "right" },
        },
        ...tableDefaults,
      });
      y = lastY();
    }

    if (p.proformas?.length > 0) {
      secTitle("Lista de Proformas");
      autoT({
        startY: y,
        head: [["Nº Documento", "Cliente", "Data", "Valor (Kz)", "Estado"]],
        body: p.proformas.slice(0, 100).map((pf: any) => [
          pf.numero_documento ?? "-",
          typeof pf.cliente === "string" ? pf.cliente : pf.cliente?.nome ?? "-",
          formatarData(pf.data_emissao),
          formatarKwanza(Number(pf.total_liquido) ?? 0),
          pf.estado ?? "-",
        ]),
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "center" },
        },
        ...tableDefaults,
      });
    }
  }

  /* ── PAGAMENTOS ── */
  if (tab === "pagamentos" && dados) {
    const r = dados.resumo ?? {};

    secTitle("Resumo de Pagamentos");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total Pendente", formatarKwanza(r.total_pendente ?? 0)],
        ["Total em Atraso", formatarKwanza(r.total_atrasado ?? 0)],
        ["Quantidade de Faturas Pendentes", String(r.quantidade_faturas ?? 0)],
        ["Retenção Pendente", formatarKwanza(r.retencao_pendente ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (dados.faturas_pendentes?.length > 0) {
      secTitle("Faturas Pendentes");
      autoT({
        startY: y,
        head: [["Nº Documento", "Cliente", "Valor Pendente (Kz)", "Dias em Atraso"]],
        body: dados.faturas_pendentes.slice(0, 100).map((f: any) => [
          f.numero_documento ?? "-",
          typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
          formatarKwanza(Number(f.valor_pendente) ?? 0),
          (f.dias_atraso ?? 0) > 0 ? `${f.dias_atraso} dias` : "Em dia",
        ]),
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "center" },
        },
        ...tableDefaults,
      });
    }
  }

  // ── Rodapé em todas as páginas ──
  const totalPages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...P);
    doc.rect(0, ph - 10, pw, 10, "F");
    doc.setTextColor(...WH);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("FacturaJá — Sistema de Faturação", 14, ph - 4);
    doc.text(`Pág. ${i} de ${totalPages}`, pw - 14, ph - 4, { align: "right" });
  }

  doc.save(`relatorio_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   EXPORT EXCEL
═══════════════════════════════════════════════════════════ */
async function exportarExcel(tab: TipoRelatorio, dados: any, periodo: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const header = [`Período: ${periodo}`, `Gerado: ${new Date().toLocaleDateString("pt-PT")}`];

  const addSheet = (nome: string, rows: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
  };

  if (tab === "vendas" && dados) {
    const vd = dados.vendas || {};
    const ft = dados.faturacao || {};
    const t = vd.totais || {};
    addSheet("Resumo", [
      header, [],
      ["Indicador", "Valor"],
      ["Total Vendas", formatarKwanza(t.total_valor ?? 0)],
      ["Base Tributável", formatarKwanza(t.total_base_tributavel ?? 0)],
      ["Total IVA", formatarKwanza(t.total_iva ?? 0)],
      ["Retenções", formatarKwanza(t.total_retencao ?? 0)],
      ["Nº Vendas", t.total_vendas ?? 0],
      [],
      ["Faturação Total", formatarKwanza(ft.faturacao_total ?? 0)],
      ["Faturação Paga", formatarKwanza(ft.faturacao_paga ?? 0)],
      ["Faturação Pendente", formatarKwanza(ft.faturacao_pendente ?? 0)],
    ]);
    if (vd.vendas?.length > 0) {
      addSheet("Vendas", [
        ["Cliente", "Total", "Status"],
        ...vd.vendas.map((v: any) => [
          typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
          Number(v.total) ?? 0,
          v.estado_pagamento ?? "-",
        ]),
      ]);
    }
    if (ft.por_tipo) {
      addSheet("Por Tipo", [
        ["Tipo", "Quantidade", "Valor"],
        ...Object.entries(ft.por_tipo).map(([tipo, d]: any) => [tipo, d?.quantidade ?? 0, d?.total_liquido ?? 0]),
      ]);
    }
  }

  if (tab === "documentos" && dados) {
    const d = dados.documentos || {};
    const p = dados.proformas || {};
    const e = d.estatisticas || {};
    addSheet("Resumo", [
      header, [],
      ["Indicador", "Valor"],
      ["Total Documentos", e.total_documentos ?? 0],
      ["Valor Total", formatarKwanza(e.total_valor ?? 0)],
      ["Total IVA", formatarKwanza(e.total_iva ?? 0)],
      ["Retenções", formatarKwanza(e.total_retencao ?? 0)],
      [],
      ["Total Proformas", p.total ?? 0],
      ["Valor Proformas", formatarKwanza(p.valor_total ?? 0)],
    ]);
    if (e.por_tipo) {
      addSheet("Por Tipo", [
        ["Tipo", "Quantidade", "Valor", "Retenção"],
        ...Object.entries(e.por_tipo).map(([tipo, d]: any) => [tipo, d?.quantidade ?? 0, d?.valor ?? 0, d?.retencao ?? 0]),
      ]);
    }
    if (p.proformas?.length > 0) {
      addSheet("Proformas", [
        ["Nº Doc.", "Cliente", "Data", "Valor", "Estado"],
        ...p.proformas.map((pf: any) => [
          pf.numero_documento ?? "-",
          typeof pf.cliente === "string" ? pf.cliente : pf.cliente?.nome ?? "-",
          formatarData(pf.data_emissao),
          Number(pf.total_liquido) ?? 0,
          pf.estado ?? "-",
        ]),
      ]);
    }
  }

  if (tab === "pagamentos" && dados) {
    const r = dados.resumo ?? {};
    addSheet("Resumo", [
      header, [],
      ["Indicador", "Valor"],
      ["Total Pendente", formatarKwanza(r.total_pendente ?? 0)],
      ["Total Atrasado", formatarKwanza(r.total_atrasado ?? 0)],
      ["Faturas Pendentes", r.quantidade_faturas ?? 0],
      ["Retenção Pendente", formatarKwanza(r.retencao_pendente ?? 0)],
    ]);
    if (dados.faturas_pendentes?.length > 0) {
      addSheet("Faturas Pendentes", [
        ["Documento", "Cliente", "Pendente", "Dias Atraso"],
        ...dados.faturas_pendentes.map((f: any) => [
          f.numero_documento ?? "-",
          typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
          Number(f.valor_pendente) ?? 0,
          f.dias_atraso ?? 0,
        ]),
      ]);
    }
  }

  XLSX.writeFile(wb, `relatorio_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ═══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function RelatoriosPage() {
  const colors = useThemeColors();

  const [periodoVendas, setPeriodoVendas] = useState<PeriodoConfig>(getPeriodoPredefinido("este_mes"));
  const [periodoDocumentos, setPeriodoDocumentos] = useState<PeriodoConfig>(getPeriodoPredefinido("este_mes"));

  const [relatorioVendas, setRelatorioVendas] = useState<RelatorioVendas | null>(null);
  const [relatorioFaturacao, setRelatorioFaturacao] = useState<RelatorioFaturacao | null>(null);
  const [relatorioPagamentos, setRelatorioPagamentos] = useState<RelatorioPagamentosPendentes | null>(null);
  const [relatorioDocumentos, setRelatorioDocumentos] = useState<RelatorioDocumentosFiscais | null>(null);
  const [relatorioProformas, setRelatorioProformas] = useState<RelatorioProformas | null>(null);

  const [loading, setLoading] = useState<Record<TipoRelatorio, boolean>>({
    vendas: false, documentos: false, pagamentos: false,
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TipoRelatorio>("vendas");

  // Período personalizado
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroAberto, setFiltroAberto] = useState(false);

  /* ── Loaders ── */
  const carregarVendas = useCallback(async () => {
    setLoading(p => ({ ...p, vendas: true }));
    try {
      const [vendas, faturacao] = await Promise.all([
        relatoriosService.getRelatorioVendas({ data_inicio: periodoVendas.data_inicio, data_fim: periodoVendas.data_fim }),
        relatoriosService.getRelatorioFaturacao({ data_inicio: periodoVendas.data_inicio, data_fim: periodoVendas.data_fim }),
      ]);
      setRelatorioVendas(vendas);
      setRelatorioFaturacao(faturacao);
    } catch (err) {
      toast.error("Erro ao carregar vendas e faturação");
    } finally {
      setLoading(p => ({ ...p, vendas: false }));
    }
  }, [periodoVendas]);

  const carregarPagamentos = useCallback(async () => {
    setLoading(p => ({ ...p, pagamentos: true }));
    try {
      setRelatorioPagamentos(await relatoriosService.getRelatorioPagamentosPendentes());
    } catch {
      toast.error("Erro ao carregar pagamentos");
    } finally {
      setLoading(p => ({ ...p, pagamentos: false }));
    }
  }, []);

  const carregarDocumentos = useCallback(async () => {
    setLoading(p => ({ ...p, documentos: true }));
    try {
      const [documentos, proformas] = await Promise.all([
        relatoriosService.getRelatorioDocumentosFiscais({ data_inicio: periodoDocumentos.data_inicio, data_fim: periodoDocumentos.data_fim }),
        relatoriosService.getRelatorioProformas({ data_inicio: periodoDocumentos.data_inicio, data_fim: periodoDocumentos.data_fim }),
      ]);
      setRelatorioDocumentos(documentos);
      setRelatorioProformas(proformas);
    } catch {
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(p => ({ ...p, documentos: false }));
    }
  }, [periodoDocumentos]);

  useEffect(() => { carregarPagamentos(); }, [carregarPagamentos]);

  useEffect(() => {
    if (activeTab === "vendas") carregarVendas();
    else if (activeTab === "documentos") carregarDocumentos();
  }, [activeTab, carregarVendas, carregarDocumentos]);

  /* ── Aplicar filtro de período ── */
  const aplicarFiltro = (rel: "vendas" | "documentos") => {
    if (!dataInicio || !dataFim) { toast.error("Selecione as duas datas"); return; }
    if (new Date(dataInicio) > new Date(dataFim)) { toast.error("Data inicial maior que data final"); return; }
    const p: PeriodoConfig = { tipo: "personalizado", data_inicio: dataInicio, data_fim: dataFim };
    if (rel === "vendas") setPeriodoVendas(p);
    else setPeriodoDocumentos(p);
    setFiltroAberto(false);
    toast.success("Filtro aplicado");
  };

  const limparFiltro = (rel: "vendas" | "documentos") => {
    const p = getPeriodoPredefinido("este_mes");
    if (rel === "vendas") setPeriodoVendas(p);
    else setPeriodoDocumentos(p);
    setDataInicio("");
    setDataFim("");
    setFiltroAberto(false);
  };

  /* ── Atualizar ── */
  const handleAtualizar = () => {
    if (activeTab === "vendas") carregarVendas();
    else if (activeTab === "documentos") carregarDocumentos();
    else carregarPagamentos();
  };

  /* ── Dados exportação ── */
  const getDadosAtivos = () => {
    if (activeTab === "vendas") return { vendas: relatorioVendas, faturacao: relatorioFaturacao };
    if (activeTab === "documentos") return { documentos: relatorioDocumentos, proformas: relatorioProformas };
    return relatorioPagamentos;
  };

  const getPeriodoAtivo = () => {
    if (activeTab === "vendas") return `${periodoVendas.data_inicio} a ${periodoVendas.data_fim}`;
    if (activeTab === "documentos") return `${periodoDocumentos.data_inicio} a ${periodoDocumentos.data_fim}`;
    return new Date().toLocaleDateString("pt-PT");
  };

  const handleExportPDF = async () => {
    const dados = getDadosAtivos();
    if (!dados) { toast.error("Sem dados para exportar"); return; }
    setExportLoading(true);
    try {
      await exportarPDF(activeTab, dados, getPeriodoAtivo());
      toast.success("PDF exportado com sucesso");
    } catch { toast.error("Erro ao exportar PDF"); }
    finally { setExportLoading(false); }
  };

  const handleExportExcel = async () => {
    const dados = getDadosAtivos();
    if (!dados) { toast.error("Sem dados para exportar"); return; }
    setExportLoading(true);
    try {
      await exportarExcel(activeTab, dados, getPeriodoAtivo());
      toast.success("Excel exportado com sucesso");
    } catch { toast.error("Erro ao exportar Excel"); }
    finally { setExportLoading(false); }
  };

  /* ── Gráficos ── */
  const dadosVendasPie = useMemo(() => {
    if (!relatorioVendas?.totais) return [];
    return [
      { name: "Vendas", value: relatorioVendas.totais.total_valor || 0, color: colors.primary },
      { name: "Retenções", value: relatorioVendas.totais.total_retencao || 0, color: colors.secondary },
    ].filter(d => d.value > 0);
  }, [relatorioVendas, colors]);

  const dadosFaturacaoPie = useMemo(() => {
    if (!relatorioFaturacao) return [];
    return [
      { name: "Paga", value: relatorioFaturacao.faturacao_paga || 0, color: "#22c55e" },
      { name: "Pendente", value: relatorioFaturacao.faturacao_pendente || 0, color: "#f97316" },
    ].filter(d => d.value > 0);
  }, [relatorioFaturacao]);

  const TABS: { id: TipoRelatorio; label: string }[] = [
    { id: "vendas", label: "Vendas" },
    { id: "documentos", label: "Documentos e Proformas" },
    { id: "pagamentos", label: "Pagamentos Pendentes" },
  ];

  const isLoading = loading[activeTab];
  const periodoAtivo = activeTab === "vendas" ? periodoVendas : periodoDocumentos;
  const relAtivo: "vendas" | "documentos" = activeTab === "documentos" ? "documentos" : "vendas";

  /* ── Estilos base ── */
  const border = `1px solid ${colors.border}`;
  const cardStyle = { backgroundColor: colors.card, border };

  return (
    <MainEmpresa>
      <div className="p-3 sm:p-5 space-y-0" style={{ color: colors.text }}>

        {/* ══ CABEÇALHO ══ */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ color: colors.text }}>
              Relatórios e Análises
            </h1>
            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              Indicadores e relatórios detalhados do negócio
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAtualizar}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40"
              style={{ backgroundColor: colors.hover, border, color: colors.textSecondary, borderRadius: 4 }}
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              Atualizar
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exportLoading || !getDadosAtivos()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 transition-all"
              style={{ backgroundColor: "#16a34a", borderRadius: 4 }}
            >
              <FileSpreadsheet size={12} />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportLoading || !getDadosAtivos()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 transition-all"
              style={{ backgroundColor: colors.primary, borderRadius: 4 }}
            >
              {exportLoading
                ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Download size={12} />}
              PDF
            </button>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderTop: "none" }}>

          {/* Tab list */}
          <div className="flex overflow-x-auto border-b" style={{ borderColor: colors.border }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-shrink-0 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors whitespace-nowrap"
                  style={{
                    color: active ? colors.primary : colors.textSecondary,
                    backgroundColor: "transparent",
                    borderBottom: active ? `2px solid ${colors.primary}` : "2px solid transparent",
                    letterSpacing: "0.05em",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ══ FILTRO DE PERÍODO — apenas vendas e documentos ══ */}
          {activeTab !== "pagamentos" && (
            <div className="border-b" style={{ borderColor: colors.border }}>
              {/* Barra do filtro */}
              <div
                className="flex items-center gap-3 px-4 py-2"
                style={{ backgroundColor: colors.hover }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                  Período
                </span>
                <span
                  className="text-[11px] px-2 py-0.5 font-mono"
                  style={{
                    backgroundColor: colors.card,
                    border,
                    color: colors.text,
                    borderRadius: 3,
                  }}
                >
                  {periodoAtivo.data_inicio} — {periodoAtivo.data_fim}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => setFiltroAberto(f => !f)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border transition-all"
                  style={{
                    backgroundColor: filtroAberto ? `${colors.primary}15` : colors.card,
                    borderColor: filtroAberto ? colors.primary : colors.border,
                    color: filtroAberto ? colors.primary : colors.textSecondary,
                    borderRadius: 3,
                  }}
                >
                  <SlidersHorizontal size={11} />
                  Filtrar período
                </button>
                {periodoAtivo.tipo === "personalizado" && (
                  <button
                    onClick={() => limparFiltro(relAtivo)}
                    className="text-[11px] font-medium transition-colors"
                    style={{ color: "#dc2626" }}
                  >
                    Limpar filtro
                  </button>
                )}
              </div>

              {/* Painel expandível */}
              {filtroAberto && (
                <div
                  className="px-4 py-3 flex flex-wrap items-end gap-3 border-t"
                  style={{ borderColor: colors.border, backgroundColor: colors.card }}
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                      Data inicial
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={e => setDataInicio(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border outline-none"
                      style={{
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                        borderRadius: 3,
                        minWidth: 140,
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                      Data final
                    </label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={e => setDataFim(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border outline-none"
                      style={{
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                        borderRadius: 3,
                        minWidth: 140,
                      }}
                    />
                  </div>
                  <button
                    onClick={() => aplicarFiltro(relAtivo)}
                    className="px-4 py-1.5 text-xs font-semibold text-white transition-all"
                    style={{ backgroundColor: colors.primary, borderRadius: 3 }}
                  >
                    Aplicar
                  </button>
                  <button
                    onClick={() => setFiltroAberto(false)}
                    className="px-3 py-1.5 text-xs font-medium border transition-all"
                    style={{ border, color: colors.textSecondary, borderRadius: 3, backgroundColor: "transparent" }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ CONTEÚDO ══ */}
          <div className="p-4 space-y-4">

            {/* ─── VENDAS ─── */}
            {activeTab === "vendas" && (
              isLoading
                ? <CarregandoLinha colors={colors} />
                : relatorioVendas && relatorioFaturacao
                  ? (
                    <>
                      {/* KPI row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border" style={{ borderColor: colors.border }}>
                        <KpiCell label="Total Vendas" value={formatarKwanza(relatorioVendas.totais?.total_valor ?? 0)}
                          sub={`${relatorioVendas.totais?.total_vendas ?? 0} transações`} color={colors.primary} colors={colors} border={border} />
                        <KpiCell label="Base Tributável" value={formatarKwanza(relatorioVendas.totais?.total_base_tributavel ?? 0)}
                          color="#3b82f6" colors={colors} border={border} />
                        <KpiCell label="Total IVA" value={formatarKwanza(relatorioVendas.totais?.total_iva ?? 0)}
                          color={colors.secondary} colors={colors} border={border} />
                        <KpiCell label="Retenções" value={formatarKwanza(relatorioVendas.totais?.total_retencao ?? 0)}
                          color="#f97316" colors={colors} border={border} last />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border" style={{ borderColor: colors.border }}>
                        <KpiCell label="Faturação Total" value={formatarKwanza(relatorioFaturacao.faturacao_total ?? 0)}
                          color={colors.primary} colors={colors} border={border} />
                        <KpiCell label="Faturação Paga" value={formatarKwanza(relatorioFaturacao.faturacao_paga ?? 0)}
                          color="#22c55e" colors={colors} border={border} />
                        <KpiCell label="Faturação Pendente" value={formatarKwanza(relatorioFaturacao.faturacao_pendente ?? 0)}
                          color="#f97316" colors={colors} border={border} last
                          alerta={(relatorioFaturacao.faturacao_pendente ?? 0) > 0} />
                      </div>

                      {/* Gráficos */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <SecaoGrafico titulo="Distribuição de Vendas" colors={colors}>
                          {dadosVendasPie.length > 0
                            ? (
                              <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                  <Pie data={dadosVendasPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                                    label={(e: any) => `${e.name}: ${((e.percent ?? 0) * 100).toFixed(0)}%`} labelLine>
                                    {dadosVendasPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                  </Pie>
                                  <Tooltip formatter={(v: any) => formatarKwanza(Number(v))} contentStyle={tooltipStyle(colors)} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            )
                            : <SemDados colors={colors} />}
                        </SecaoGrafico>

                        <SecaoGrafico titulo="Distribuição de Faturação" colors={colors}>
                          {dadosFaturacaoPie.length > 0
                            ? (
                              <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                  <Pie data={dadosFaturacaoPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                                    label={(e: any) => `${e.name}: ${((e.percent ?? 0) * 100).toFixed(0)}%`}>
                                    {dadosFaturacaoPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                  </Pie>
                                  <Tooltip formatter={(v: any) => formatarKwanza(Number(v))} contentStyle={tooltipStyle(colors)} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            )
                            : <SemDados colors={colors} />}
                        </SecaoGrafico>
                      </div>

                      {(relatorioVendas.agrupado?.length ?? 0) > 0 && (
                        <SecaoGrafico titulo="Evolução de Vendas" colors={colors}>
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={relatorioVendas.agrupado}>
                              <defs>
                                <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.25} />
                                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                              <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: colors.textSecondary }} />
                              <YAxis tick={{ fontSize: 10, fill: colors.textSecondary }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(v: any) => formatarKwanza(Number(v))} contentStyle={tooltipStyle(colors)} />
                              <Area type="monotone" dataKey="total" stroke={colors.primary} fill="url(#gVendas)" strokeWidth={1.5} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </SecaoGrafico>
                      )}

                      {Object.keys(relatorioFaturacao.por_tipo ?? {}).length > 0 && (
                        <SecaoGrafico titulo="Documentos por Tipo" colors={colors}>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={Object.entries(relatorioFaturacao.por_tipo ?? {}).map(([tipo, d]: any) => ({ tipo, quantidade: d?.quantidade ?? 0, valor: d?.total_liquido ?? 0 }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                              <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: colors.textSecondary }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: colors.textSecondary }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: colors.textSecondary }} />
                              <Tooltip contentStyle={tooltipStyle(colors)} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="quantidade" fill={colors.primary} name="Quantidade" radius={[2, 2, 0, 0]} />
                              <Bar yAxisId="right" dataKey="valor" fill={colors.secondary} name="Valor" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </SecaoGrafico>
                      )}

                      <SecaoGrafico titulo="Últimas Vendas" colors={colors}>
                        <TabelaDados
                          headers={["Cliente", "Total", "Estado"]}
                          rows={(relatorioVendas.vendas ?? []).slice(0, 15).map((v: any) => [
                            typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
                            formatarKwanza(Number(v.total) ?? 0),
                            <EstadoBadge key="s" estado={v.estado_pagamento} colors={colors} />,
                          ])}
                          aligns={["left", "right", "center"]}
                          colors={colors}
                        />
                      </SecaoGrafico>
                    </>
                  )
                  : <Vazio colors={colors} />
            )}

            {/* ─── DOCUMENTOS ─── */}
            {activeTab === "documentos" && (
              isLoading
                ? <CarregandoLinha colors={colors} />
                : relatorioDocumentos && relatorioProformas
                  ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border" style={{ borderColor: colors.border }}>
                        <KpiCell label="Total Documentos" value={String(relatorioDocumentos.estatisticas?.total_documentos ?? 0)}
                          color={colors.primary} colors={colors} border={border} />
                        <KpiCell label="Valor Total" value={formatarKwanza(relatorioDocumentos.estatisticas?.total_valor ?? 0)}
                          color={colors.secondary} colors={colors} border={border} />
                        <KpiCell label="Total IVA" value={formatarKwanza(relatorioDocumentos.estatisticas?.total_iva ?? 0)}
                          color="#3b82f6" colors={colors} border={border} />
                        <KpiCell label="Retenções" value={formatarKwanza(relatorioDocumentos.estatisticas?.total_retencao ?? 0)}
                          color="#f97316" colors={colors} border={border} last />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border" style={{ borderColor: colors.border }}>
                        <KpiCell label="Total Proformas" value={String(relatorioProformas.total ?? 0)}
                          color={colors.primary} colors={colors} border={border} />
                        <KpiCell label="Valor Proformas" value={formatarKwanza(relatorioProformas.valor_total ?? 0)}
                          color={colors.secondary} colors={colors} border={border} last />
                      </div>

                      {Object.keys(relatorioDocumentos.estatisticas?.por_tipo ?? {}).length > 0 && (
                        <SecaoGrafico titulo="Documentos por Tipo" colors={colors}>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={Object.entries(relatorioDocumentos.estatisticas?.por_tipo ?? {}).map(([tipo, d]: any) => ({ tipo, quantidade: d?.quantidade ?? 0, valor: d?.valor ?? 0 }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                              <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: colors.textSecondary }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: colors.textSecondary }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: colors.textSecondary }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(v: any, n: any) => [formatarKwanza(Number(v)), String(n ?? "")]} contentStyle={tooltipStyle(colors)} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="quantidade" fill={colors.primary} name="Quantidade" radius={[2, 2, 0, 0]} />
                              <Bar yAxisId="right" dataKey="valor" fill={colors.secondary} name="Valor" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </SecaoGrafico>
                      )}

                      <SecaoGrafico titulo="Lista de Proformas" colors={colors}>
                        {(relatorioProformas.proformas?.length ?? 0) > 0
                          ? (
                            <TabelaDados
                              headers={["Nº Documento", "Cliente", "Data", "Valor", "Estado"]}
                              rows={(relatorioProformas.proformas ?? []).slice(0, 20).map((p: any) => [
                                <span key="n" className="font-mono text-xs">{p.numero_documento}</span>,
                                typeof p.cliente === "string" ? p.cliente : p.cliente?.nome ?? "-",
                                formatarData(p.data_emissao),
                                formatarKwanza(Number(p.total_liquido) ?? 0),
                                <EstadoBadge key="s" estado={p.estado} colors={colors} />,
                              ])}
                              aligns={["left", "left", "left", "right", "center"]}
                              colors={colors}
                            />
                          )
                          : <SemDados colors={colors} message="Nenhuma proforma encontrada" />}
                      </SecaoGrafico>
                    </>
                  )
                  : <Vazio colors={colors} />
            )}

            {/* ─── PAGAMENTOS ─── */}
            {activeTab === "pagamentos" && (
              isLoading
                ? <CarregandoLinha colors={colors} />
                : relatorioPagamentos
                  ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border" style={{ borderColor: colors.border }}>
                        <KpiCell label="Total Pendente" value={formatarKwanza(relatorioPagamentos.resumo?.total_pendente ?? 0)}
                          color={colors.primary} colors={colors} border={border}
                          alerta={(relatorioPagamentos.resumo?.total_pendente ?? 0) > 0} />
                        <KpiCell label="Total em Atraso" value={formatarKwanza(relatorioPagamentos.resumo?.total_atrasado ?? 0)}
                          color="#dc2626" colors={colors} border={border}
                          alerta={(relatorioPagamentos.resumo?.total_atrasado ?? 0) > 0} />
                        <KpiCell label="Faturas Pendentes" value={String(relatorioPagamentos.resumo?.quantidade_faturas ?? 0)}
                          color={colors.secondary} colors={colors} border={border} />
                        <KpiCell label="Retenção Pendente" value={formatarKwanza(relatorioPagamentos.resumo?.retencao_pendente ?? 0)}
                          color="#f97316" colors={colors} border={border} last />
                      </div>

                      <SecaoGrafico titulo="Faturas Pendentes" colors={colors}>
                        {(relatorioPagamentos.faturas_pendentes?.length ?? 0) > 0
                          ? (
                            <TabelaDados
                              headers={["Documento", "Cliente", "Valor Pendente", "Situação"]}
                              rows={(relatorioPagamentos.faturas_pendentes ?? []).slice(0, 20).map((f: any) => [
                                <span key="d" className="font-mono text-xs">{f.numero_documento}</span>,
                                typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
                                formatarKwanza(Number(f.valor_pendente) ?? 0),
                                <EstadoBadge key="s"
                                  estado={(f.dias_atraso ?? 0) > 0 ? "atrasado" : "em_dia"}
                                  label={(f.dias_atraso ?? 0) > 0 ? `${f.dias_atraso} dias` : "Em dia"}
                                  colors={colors} />,
                              ])}
                              aligns={["left", "left", "right", "center"]}
                              colors={colors}
                            />
                          )
                          : (
                            <div className="py-10 text-center text-sm" style={{ color: colors.textSecondary }}>
                              Nenhuma fatura pendente
                            </div>
                          )}
                      </SecaoGrafico>
                    </>
                  )
                  : <Vazio colors={colors} />
            )}

          </div>
        </div>
      </div>
    </MainEmpresa>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
═══════════════════════════════════════════════════════════ */

/** KPI sem bordas arredondadas — estilo "célula de tabela" */
function KpiCell({ label, value, sub, color, colors, border, last, alerta }: {
  label: string; value: string; sub?: string;
  color: string; colors: any; border: string; last?: boolean; alerta?: boolean;
}) {
  return (
    <div
      className="px-4 py-3"
      style={{
        borderRight: last ? "none" : border,
        borderLeft: `3px solid ${alerta ? "#dc2626" : color}`,
        backgroundColor: colors.card,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: colors.textSecondary }}>
        {label}
      </p>
      <p className="text-sm font-bold leading-tight" style={{ color: alerta ? "#dc2626" : colors.text }}>
        {value}
      </p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>{sub}</p>}
    </div>
  );
}

/** Wrapper de secção com título horizontal */
function SecaoGrafico({ titulo, children, colors }: { titulo: string; children: React.ReactNode; colors: any }) {
  return (
    <div className="border" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
      <div
        className="px-4 py-2 border-b flex items-center gap-2"
        style={{ borderColor: colors.border, backgroundColor: colors.hover }}
      >
        <span
          className="w-1.5 h-4 inline-block"
          style={{ backgroundColor: colors.primary }}
        />
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>
          {titulo}
        </p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Tabela limpa sem bordas arredondadas */
function TabelaDados({ headers, rows, aligns, colors }: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  aligns: ("left" | "right" | "center")[];
  colors: any;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ backgroundColor: colors.hover }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`py-2 px-3 text-${aligns[i]} font-semibold uppercase tracking-widest border-b`}
                style={{ color: colors.textSecondary, fontSize: 10, borderColor: colors.border }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b"
              style={{
                borderColor: colors.border,
                backgroundColor: ri % 2 !== 0 ? colors.hover : "transparent",
              }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2 px-3 text-${aligns[ci]} truncate max-w-[200px]`}
                  style={{ color: colors.text }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstadoBadge({ estado, label, colors }: { estado?: string; label?: string; colors: any }) {
  const text = label ?? estado ?? "-";
  const map: Record<string, { bg: string; color: string }> = {
    paga:      { bg: "#dcfce7", color: "#15803d" },
    pendente:  { bg: "#fff7ed", color: "#c2410c" },
    atrasado:  { bg: "#fee2e2", color: "#b91c1c" },
    emitido:   { bg: "#fff7ed", color: "#c2410c" },
    convertido:{ bg: "#dcfce7", color: "#15803d" },
    em_dia:    { bg: "#dcfce7", color: "#15803d" },
  };
  const s = map[estado ?? ""] ?? { bg: colors.hover, color: colors.textSecondary };
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.color, borderRadius: 2 }}
    >
      {text}
    </span>
  );
}

function CarregandoLinha({ colors }: { colors: any }) {
  return (
    <div className="flex items-center gap-2 py-6" style={{ color: colors.textSecondary }}>
      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: colors.primary, borderTopColor: "transparent" }} />
      <span className="text-xs">A carregar dados…</span>
    </div>
  );
}

function Vazio({ colors }: { colors: any }) {
  return (
    <div className="py-12 text-center text-xs" style={{ color: colors.textSecondary }}>
      Nenhum dado disponível
    </div>
  );
}

function SemDados({ colors, message = "Sem dados disponíveis" }: { colors: any; message?: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-xs" style={{ color: colors.textSecondary }}>
      {message}
    </div>
  );
}

const tooltipStyle = (colors: any) => ({
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  fontSize: 11,
});