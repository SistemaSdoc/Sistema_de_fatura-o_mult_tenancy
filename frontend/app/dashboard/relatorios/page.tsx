// src/app/(dashboard)/relatorios/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import MainEmpresa from "../../components/MainEmpresa";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, AlertCircle, FileText,
  Percent, Wrench, RefreshCw, Download, FileSpreadsheet,
  AlertTriangle, Calendar, Filter,
} from "lucide-react";
import {
  relatoriosService,
  DashboardGeral, RelatorioVendas, RelatorioFaturacao,
  RelatorioPagamentosPendentes, RelatorioProformas, RelatorioDocumentosFiscais,
  getPeriodoLabel, getPeriodoPredefinido, formatarKwanza, formatarData,
} from "@/services/relatorios";
import { useThemeColors } from "@/context/ThemeContext";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════════════════════ */
type TipoRelatorio = "vendas" | "documentos" | "pagamentos";
type PeriodoTipo = "hoje" | "ontem" | "este_mes" | "mes_passado" | "este_ano";
interface PeriodoConfig { tipo: PeriodoTipo; data_inicio: string; data_fim: string; }

/* ═══════════════════════════════════════════════════════════
   EXPORT PDF
═══════════════════════════════════════════════════════════ */
async function exportarPDF(tab: TipoRelatorio, dados: any, periodo: string) {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  // @ts-ignore
  const autoTableModule = await import("jspdf-autotable");
  const autoTableFn = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  if (typeof (doc as any).autoTable !== "function" && typeof autoTableFn === "function") {
    (doc as any).autoTable = function(...args: any[]) { return autoTableFn(this, ...args); };
  }

  const pw = doc.internal.pageSize.getWidth();
  const P  = [18,  56,  89]  as [number, number, number];
  const A  = [249, 148, 31]  as [number, number, number];
  const GR = [100, 100, 100] as [number, number, number];
  const LG = [230, 230, 230] as [number, number, number];
  const WH = [255, 255, 255] as [number, number, number];
  const ST = [245, 247, 250] as [number, number, number];

  const autoT = (opts: any) => { if (typeof (doc as any).autoTable === "function") (doc as any).autoTable(opts); };
  const lastY = () => ((doc as any).lastAutoTable?.finalY ?? 0) + 8;

  const titulos: Record<TipoRelatorio, string> = {
    vendas: "RELATÓRIO DE VENDAS ",
    documentos: "DOCUMENTOS FISCAIS E PROFORMAS",
    pagamentos: "PAGAMENTOS ",
  };

  // Cabeçalho
  doc.setFillColor(...P); doc.rect(0, 0, pw, 22, "F");
  doc.setFillColor(...A); doc.rect(0, 22, pw, 2, "F");
  doc.setTextColor(...WH); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(titulos[tab], 14, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.text(`Gerado: ${new Date().toLocaleDateString("pt-PT")}  •  Período: ${periodo}`, pw - 14, 14, { align: "right" });

  let y = 32;

  // Conteúdo por tab
  if (tab === "vendas" && dados) {
    // Dados de vendas e faturação combinados
    const vendasData = dados.vendas || {};
    const faturacaoData = dados.faturacao || {};
    
    const kpis = [
      ["Total Vendas", formatarKwanza(vendasData.totais?.total_valor ?? 0)],
      ["Base Tributável", formatarKwanza(vendasData.totais?.total_base_tributavel ?? 0)],
      ["Total IVA", formatarKwanza(vendasData.totais?.total_iva ?? 0)],
      ["Retenções", formatarKwanza(vendasData.totais?.total_retencao ?? 0)],
      ["Faturação Total", formatarKwanza(faturacaoData.faturacao_total ?? 0)],
      ["Faturação Paga", formatarKwanza(faturacaoData.faturacao_paga ?? 0)],
      ["Pendente", formatarKwanza(faturacaoData.faturacao_pendente ?? 0)],
    ];
    const cw = (pw - 28) / 4;
    kpis.forEach(([lbl, val], i) => {
      const x = 14 + (i % 4) * cw;
      const rowY = y + Math.floor(i / 4) * 20;
      doc.setFillColor(...LG); doc.roundedRect(x, rowY, cw - 3, 16, 1.5, 1.5, "F");
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GR);
      doc.text(lbl, x + (cw - 3) / 2, rowY + 5, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...P);
      doc.text(val, x + (cw - 3) / 2, rowY + 12, { align: "center" });
    });
    y += 48;
    
    if (vendasData.vendas?.length > 0) {
      autoT({ startY: y, head: [["Cliente", "Total", "Status"]],
        body: vendasData.vendas.slice(0, 50).map((v: any) => [
          typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
          formatarKwanza(Number(v.total) ?? 0),
          v.estado_pagamento ?? "-",
        ]),
        theme: "grid", headStyles: { fillColor: P, fontSize: 7.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5 }, alternateRowStyles: { fillColor: ST },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "center" } }, margin: { left: 14, right: 14 } });
      y = lastY();
    }
    
    if (faturacaoData.por_tipo) {
      autoT({ startY: y, head: [["Tipo Documento", "Quantidade", "Valor"]],
        body: Object.entries(faturacaoData.por_tipo).map(([tipo, d]: any) => [
          tipo, String(d?.quantidade ?? 0), formatarKwanza(d?.total_liquido ?? 0),
        ]),
        theme: "grid", headStyles: { fillColor: P, fontSize: 7.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5 }, alternateRowStyles: { fillColor: ST },
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } }, margin: { left: 14, right: 14 } });
    }
  }

  if (tab === "documentos" && dados) {
    const docsData = dados.documentos || {};
    const proformasData = dados.proformas || {};
    
    const kpis = [
      ["Total Docs", String(docsData.estatisticas?.total_documentos ?? 0)],
      ["Valor Total Docs", formatarKwanza(docsData.estatisticas?.total_valor ?? 0)],
      ["Total IVA", formatarKwanza(docsData.estatisticas?.total_iva ?? 0)],
      ["Retenções", formatarKwanza(docsData.estatisticas?.total_retencao ?? 0)],
      ["Total Proformas", String(proformasData.total ?? 0)],
      ["Valor Proformas", formatarKwanza(proformasData.valor_total ?? 0)],
    ];
    const cw = (pw - 28) / 3;
    kpis.forEach(([lbl, val], i) => {
      const x = 14 + (i % 3) * cw;
      const rowY = y + Math.floor(i / 3) * 20;
      doc.setFillColor(...LG); doc.roundedRect(x, rowY, cw - 3, 16, 1.5, 1.5, "F");
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GR);
      doc.text(lbl, x + (cw - 3) / 2, rowY + 5, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...P);
      doc.text(val, x + (cw - 3) / 2, rowY + 12, { align: "center" });
    });
    y += 44;
    
    if (docsData.estatisticas?.por_tipo) {
      autoT({ startY: y, head: [["Tipo", "Quantidade", "Valor", "Retenção"]],
        body: Object.entries(docsData.estatisticas.por_tipo).map(([tipo, d]: any) => [
          tipo, String(d?.quantidade ?? 0), formatarKwanza(d?.valor ?? 0), formatarKwanza(d?.retencao ?? 0),
        ]),
        theme: "grid", headStyles: { fillColor: P, fontSize: 7.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5 }, alternateRowStyles: { fillColor: ST },
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
        margin: { left: 14, right: 14 } });
      y = lastY();
    }
    
    if (proformasData.proformas?.length > 0) {
      autoT({ startY: y, head: [["Nº Doc.", "Cliente", "Data", "Valor", "Estado"]],
        body: proformasData.proformas.slice(0, 30).map((p: any) => [
          p.numero_documento ?? "-",
          typeof p.cliente === "string" ? p.cliente : p.cliente?.nome ?? "-",
          formatarData(p.data_emissao),
          formatarKwanza(Number(p.total_liquido) ?? 0),
          p.estado ?? "-",
        ]),
        theme: "grid", headStyles: { fillColor: P, fontSize: 7.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5 }, alternateRowStyles: { fillColor: ST },
        columnStyles: { 3: { halign: "right" }, 4: { halign: "center" } }, margin: { left: 14, right: 14 } });
    }
  }

  if (tab === "pagamentos" && dados) {
    const resumo = dados.resumo ?? {};
    const kpis = [
      ["Total Pendente", formatarKwanza(resumo.total_pendente ?? 0)],
      ["Total Atrasado", formatarKwanza(resumo.total_atrasado ?? 0)],
      ["Faturas Pend.",  String(resumo.quantidade_faturas ?? 0)],
      ["Ret. Pendente",  formatarKwanza(resumo.retencao_pendente ?? 0)],
    ];
    const cw = (pw - 28) / 4;
    kpis.forEach(([lbl, val], i) => {
      const x = 14 + i * cw;
      doc.setFillColor(...LG); doc.roundedRect(x, y, cw - 3, 16, 1.5, 1.5, "F");
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GR);
      doc.text(lbl, x + (cw - 3) / 2, y + 5, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...P);
      doc.text(val, x + (cw - 3) / 2, y + 12, { align: "center" });
    });
    y += 24;
    if (dados.faturas_pendentes?.length > 0) {
      autoT({ startY: y, head: [["Documento", "Cliente", "Pendente", "Dias Atraso"]],
        body: dados.faturas_pendentes.slice(0, 50).map((f: any) => [
          f.numero_documento ?? "-",
          typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
          formatarKwanza(Number(f.valor_pendente) ?? 0),
          (f.dias_atraso ?? 0) > 0 ? `${f.dias_atraso} dias` : "Em dia",
        ]),
        theme: "grid", headStyles: { fillColor: P, fontSize: 7.5, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5 }, alternateRowStyles: { fillColor: ST },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "center" } }, margin: { left: 14, right: 14 } });
    }
  }

  // Rodapé em todas as páginas
  const total = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...P); doc.rect(0, doc.internal.pageSize.getHeight() - 8, pw, 8, "F");
    doc.setTextColor(...WH); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text("FacturaJá — Sistema de Faturação", 14, doc.internal.pageSize.getHeight() - 3);
    doc.text(`${i} / ${total}`, pw - 14, doc.internal.pageSize.getHeight() - 3, { align: "right" });
  }

  doc.save(`relatorio_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
   EXPORT EXCEL
═══════════════════════════════════════════════════════════ */
async function exportarExcel(tab: TipoRelatorio, dados: any, periodo: string) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  const addSheet = (nome: string, rows: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
  };

  const header = [`Período: ${periodo}`, `Gerado: ${new Date().toLocaleDateString("pt-PT")}`];

  if (tab === "vendas" && dados) {
    const vendasData = dados.vendas || {};
    const faturacaoData = dados.faturacao || {};
    const totais = vendasData.totais || {};
    
    addSheet("Resumo Vendas", [
      header, [],
      ["Métrica", "Valor"],
      ["Total Vendas", formatarKwanza(totais.total_valor ?? 0)],
      ["Base Tributável", formatarKwanza(totais.total_base_tributavel ?? 0)],
      ["Total IVA", formatarKwanza(totais.total_iva ?? 0)],
      ["Retenções", formatarKwanza(totais.total_retencao ?? 0)],
      ["Nº Vendas", totais.total_vendas ?? 0],
    ]);
    
    addSheet("Resumo Faturação", [
      header, [],
      ["Faturação Total", formatarKwanza(faturacaoData.faturacao_total ?? 0)],
      ["Faturação Paga", formatarKwanza(faturacaoData.faturacao_paga ?? 0)],
      ["Faturação Pendente", formatarKwanza(faturacaoData.faturacao_pendente ?? 0)],
    ]);
    
    if (vendasData.vendas?.length > 0) {
      addSheet("Vendas", [
        ["Cliente", "Total", "Status"],
        ...vendasData.vendas.map((v: any) => [
          typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
          Number(v.total) ?? 0,
          v.estado_pagamento ?? "-",
        ]),
      ]);
    }
    
    if (faturacaoData.por_tipo) {
      addSheet("Faturação por Tipo", [
        ["Tipo", "Quantidade", "Valor"],
        ...Object.entries(faturacaoData.por_tipo).map(([tipo, d]: any) => [
          tipo, d?.quantidade ?? 0, d?.total_liquido ?? 0,
        ]),
      ]);
    }
  }

  if (tab === "documentos" && dados) {
    const docsData = dados.documentos || {};
    const proformasData = dados.proformas || {};
    const est = docsData.estatisticas || {};
    
    addSheet("Resumo Documentos", [
      header, [],
      ["Total Documentos", est.total_documentos ?? 0],
      ["Valor Total", formatarKwanza(est.total_valor ?? 0)],
      ["Total IVA", formatarKwanza(est.total_iva ?? 0)],
      ["Retenções", formatarKwanza(est.total_retencao ?? 0)],
    ]);
    
    addSheet("Resumo Proformas", [
      header, [],
      ["Total de Proformas", proformasData.total ?? 0],
      ["Valor Total", formatarKwanza(proformasData.valor_total ?? 0)],
    ]);
    
    if (est.por_tipo) {
      addSheet("Documentos por Tipo", [
        ["Tipo", "Quantidade", "Valor", "Retenção"],
        ...Object.entries(est.por_tipo).map(([tipo, d]: any) => [
          tipo, d?.quantidade ?? 0, d?.valor ?? 0, d?.retencao ?? 0,
        ]),
      ]);
    }
    
    if (proformasData.proformas?.length > 0) {
      addSheet("Proformas", [
        ["Nº Doc.", "Cliente", "Data", "Valor", "Estado"],
        ...proformasData.proformas.map((p: any) => [
          p.numero_documento ?? "-",
          typeof p.cliente === "string" ? p.cliente : p.cliente?.nome ?? "-",
          formatarData(p.data_emissao),
          Number(p.total_liquido) ?? 0,
          p.estado ?? "-",
        ]),
      ]);
    }
  }

  if (tab === "pagamentos" && dados) {
    const resumo = dados.resumo ?? {};
    addSheet("Resumo", [
      header, [],
      ["Total Pendente", formatarKwanza(resumo.total_pendente ?? 0)],
      ["Total Atrasado", formatarKwanza(resumo.total_atrasado ?? 0)],
      ["Faturas Pendentes", resumo.quantidade_faturas ?? 0],
      ["Retenção Pendente", formatarKwanza(resumo.retencao_pendente ?? 0)],
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

  /* ── Loaders ────────────────────────────────────────────── */
  const carregarVendas = useCallback(async () => {
    setLoading(p => ({ ...p, vendas: true }));
    try {
      const [vendas, faturacao] = await Promise.all([
        relatoriosService.getRelatorioVendas({ data_inicio: periodoVendas.data_inicio, data_fim: periodoVendas.data_fim }),
        relatoriosService.getRelatorioFaturacao({ data_inicio: periodoVendas.data_inicio, data_fim: periodoVendas.data_fim })
      ]);
      setRelatorioVendas(vendas);
      setRelatorioFaturacao(faturacao);
    } catch {
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
        relatoriosService.getRelatorioProformas({ data_inicio: periodoDocumentos.data_inicio, data_fim: periodoDocumentos.data_fim })
      ]);
      setRelatorioDocumentos(documentos);
      setRelatorioProformas(proformas);
    } catch {
      toast.error("Erro ao carregar documentos e proformas");
    } finally {
      setLoading(p => ({ ...p, documentos: false }));
    }
  }, [periodoDocumentos]);

  useEffect(() => { carregarPagamentos(); }, []);

  useEffect(() => {
    switch (activeTab) {
      case "vendas": carregarVendas(); break;
      case "documentos": carregarDocumentos(); break;
    }
  }, [activeTab, periodoVendas, periodoDocumentos]);

  /* ── Período ────────────────────────────────────────────── */
  const setPeriodo = (tipo: PeriodoTipo, rel: "vendas" | "documentos") => {
    const p = { ...getPeriodoPredefinido(tipo), tipo };
    if (rel === "vendas") setPeriodoVendas(p);
    else setPeriodoDocumentos(p);
  };

  /* ── Exportar ───────────────────────────────────────────── */
  const getDadosAtivos = () => {
    switch (activeTab) {
      case "vendas": return { vendas: relatorioVendas, faturacao: relatorioFaturacao };
      case "documentos": return { documentos: relatorioDocumentos, proformas: relatorioProformas };
      case "pagamentos": return relatorioPagamentos;
    }
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
      toast.success("PDF exportado");
    } catch {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    const dados = getDadosAtivos();
    if (!dados) { toast.error("Sem dados para exportar"); return; }
    setExportLoading(true);
    try {
      await exportarExcel(activeTab, dados, getPeriodoAtivo());
      toast.success("Excel exportado");
    } catch {
      toast.error("Erro ao exportar Excel");
    } finally {
      setExportLoading(false);
    }
  };

  /* ── Atualizar tab ──────────────────────────────────────── */
  const handleAtualizar = () => {
    switch (activeTab) {
      case "vendas": carregarVendas(); break;
      case "documentos": carregarDocumentos(); break;
      case "pagamentos": carregarPagamentos(); break;
    }
  };

  /* ── Dados para gráficos ────────────────────────────────── */
  const dadosVendasPie = useMemo(() => {
    if (!relatorioVendas?.totais) return [];
    return [
      { name: "Vendas", value: relatorioVendas.totais.total_vendas || 0, color: colors.primary },
      { name: "Retenções", value: relatorioVendas.totais.total_retencao || 0, color: colors.secondary },
    ].filter(d => d.value > 0);
  }, [relatorioVendas, colors]);

  const dadosFaturacaoPie = useMemo(() => {
    if (!relatorioFaturacao) return [];
    return [
      { name: "Paga", value: relatorioFaturacao.faturacao_paga || 0, color: colors.success },
      { name: "Pendente", value: relatorioFaturacao.faturacao_pendente || 0, color: colors.warning },
    ].filter(d => d.value > 0);
  }, [relatorioFaturacao, colors]);

  const dadosDocumentosPie = useMemo(() => {
    if (!relatorioDocumentos?.estatisticas?.por_tipo) return [];
    return Object.entries(relatorioDocumentos.estatisticas.por_tipo).map(([tipo, d]: any) => ({
      name: tipo,
      value: d?.quantidade || 0,
      color: colors.primary,
    }));
  }, [relatorioDocumentos, colors]);

  /* ── Estilos comuns ─────────────────────────────────────── */
  const inp = {
    backgroundColor: colors.hover,
    border: `1px solid ${colors.border}`,
    color: colors.text,
  };

  const TABS: { id: TipoRelatorio; label: string }[] = [
    { id: "vendas", label: "Vendas " },
    { id: "documentos", label: "Documentos e Proformas" },
    { id: "pagamentos", label: "Pagamentos Pendentes" },
  ];

  const isLoading = loading[activeTab];

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <MainEmpresa>
      <div className="p-3 sm:p-5 space-y-4" style={{ color: colors.text }}>

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.primary }}>Relatórios e Análises</h1>
            <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              Indicadores e relatórios detalhados do seu negócio
            </p>
          </div>

          {/* Botões de acção */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleAtualizar} disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40"
              style={inp}>
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button onClick={handleExportExcel} disabled={exportLoading || !getDadosAtivos()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: "#16a34a" }}>
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>
            <button onClick={handleExportPDF} disabled={exportLoading || !getDadosAtivos()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: colors.primary }}>
              {exportLoading
                ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Download size={14} />}
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>

          {/* Tab list — scroll horizontal no mobile */}
          <div className="flex overflow-x-auto border-b" style={{ borderColor: colors.border }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap"
                  style={{
                    color: active ? colors.primary : colors.textSecondary,
                    backgroundColor: active ? `${colors.primary}0D` : 'transparent',
                    borderBottom: active ? `2px solid ${colors.primary}` : '2px solid transparent',
                  }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Conteúdo */}
          <div className="p-4 space-y-4">

            {/* ─── VENDAS E FATURAÇÃO ─── */}
            {activeTab === "vendas" && (
              <>
                <PeriodoSelector periodo={periodoVendas} onChange={t => setPeriodo(t, "vendas")} colors={colors} />
                {isLoading ? <SkeletonCards n={7} colors={colors} />
                : relatorioVendas && relatorioFaturacao ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard label="Total Vendas" value={formatarKwanza(relatorioVendas.totais?.total_valor ?? 0)}
                        icon={<DollarSign size={16} />} color={colors.primary} colors={colors}
                        sub={`${relatorioVendas.totais?.total_vendas ?? 0} transações`} />
                      <StatCard label="Base Tributável" value={formatarKwanza(relatorioVendas.totais?.total_base_tributavel ?? 0)}
                        icon={<FileText size={16} />} color="#3b82f6" colors={colors} />
                      <StatCard label="Total IVA" value={formatarKwanza(relatorioVendas.totais?.total_iva ?? 0)}
                        icon={<Percent size={16} />} color={colors.secondary} colors={colors} />
                      <StatCard label="Retenções" value={formatarKwanza(relatorioVendas.totais?.total_retencao ?? 0)}
                        icon={<TrendingUp size={16} />} color="#f97316" colors={colors}
                        sub={`${relatorioVendas.totais?.total_servicos ?? 0} serviços`} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <StatCard label="Faturação Total" value={formatarKwanza(relatorioFaturacao.faturacao_total ?? 0)}
                        icon={<DollarSign size={16} />} color={colors.primary} colors={colors} />
                      <StatCard label="Faturação Paga" value={formatarKwanza(relatorioFaturacao.faturacao_paga ?? 0)}
                        icon={<FileText size={16} />} color={colors.success} colors={colors} />
                      <StatCard label="Faturação Pendente" value={formatarKwanza(relatorioFaturacao.faturacao_pendente ?? 0)}
                        icon={<AlertCircle size={16} />} color={colors.secondary} colors={colors}
                        alerta={(relatorioFaturacao.faturacao_pendente ?? 0) > 0} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <GraficoCard titulo="Distribuição Vendas" colors={colors}>
                        {dadosVendasPie.length > 0 ? (
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Pie data={dadosVendasPie} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                                {dadosVendasPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                              </Pie>
                              <Tooltip formatter={v => formatarKwanza(Number(v))} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <SemDados colors={colors} />}
                      </GraficoCard>

                      <GraficoCard titulo="Distribuição Faturação" colors={colors}>
                        {dadosFaturacaoPie.length > 0 ? (
                          <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                              <Pie data={dadosFaturacaoPie} dataKey="value" nameKey="name"
                                cx="50%" cy="50%" outerRadius={90}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                                {dadosFaturacaoPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                              </Pie>
                              <Tooltip formatter={v => formatarKwanza(Number(v))} contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <SemDados colors={colors} />}
                      </GraficoCard>
                    </div>

                    <GraficoCard titulo="Últimas Vendas" colors={colors}>
                      <MiniTabela
                        headers={["Cliente", "Total", "Status"]}
                        rows={(relatorioVendas.vendas ?? []).slice(0, 10).map(v => [
                          typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
                          formatarKwanza(Number(v.total) ?? 0),
                          <EstadoBadge key="s" estado={v.estado_pagamento} colors={colors} />,
                        ])}
                        aligns={["left", "right", "center"]}
                        colors={colors}
                      />
                    </GraficoCard>

                    {Object.keys(relatorioFaturacao.por_tipo ?? {}).length > 0 && (
                      <GraficoCard titulo="Documentos Fiscais por Tipo" colors={colors}>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={Object.entries(relatorioFaturacao.por_tipo ?? {}).map(([tipo, d]: any) => ({ tipo, quantidade: d?.quantidade ?? 0, valor: d?.total_liquido ?? 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                            <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                            <Tooltip contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="quantidade" fill={colors.primary} name="Quantidade" radius={[3, 3, 0, 0]} />
                            <Bar yAxisId="right" dataKey="valor" fill={colors.secondary} name="Valor" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </GraficoCard>
                    )}

                    {(relatorioVendas.agrupado?.length ?? 0) > 0 && (
                      <GraficoCard titulo="Evolução de Vendas" colors={colors}>
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart data={relatorioVendas.agrupado}>
                            <defs>
                              <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                            <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                            <YAxis tick={{ fontSize: 11, fill: colors.textSecondary }} tickFormatter={v => `Kz ${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={v => formatarKwanza(Number(v))} contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
                            <Area type="monotone" dataKey="total" stroke={colors.primary} fill="url(#gVendas)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </GraficoCard>
                    )}
                  </>
                ) : <Vazio colors={colors} />}
              </>
            )}

            {/* ─── DOCUMENTOS E PROFORMAS ─── */}
            {activeTab === "documentos" && (
              <>
                <PeriodoSelector periodo={periodoDocumentos} onChange={t => setPeriodo(t, "documentos")} colors={colors} />
                {isLoading ? <SkeletonCards n={6} colors={colors} />
                : relatorioDocumentos && relatorioProformas ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard label="Total Docs" value={String(relatorioDocumentos.estatisticas?.total_documentos ?? 0)}
                        icon={<FileText size={16} />} color={colors.primary} colors={colors} />
                      <StatCard label="Valor Total Docs" value={formatarKwanza(relatorioDocumentos.estatisticas?.total_valor ?? 0)}
                        icon={<DollarSign size={16} />} color={colors.secondary} colors={colors} />
                      <StatCard label="Total IVA" value={formatarKwanza(relatorioDocumentos.estatisticas?.total_iva ?? 0)}
                        icon={<Percent size={16} />} color="#3b82f6" colors={colors} />
                      <StatCard label="Retenções" value={formatarKwanza(relatorioDocumentos.estatisticas?.total_retencao ?? 0)}
                        icon={<TrendingUp size={16} />} color="#f97316" colors={colors} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <StatCard label="Total Proformas" value={String(relatorioProformas.total ?? 0)}
                        icon={<FileText size={16} />} color={colors.primary} colors={colors} />
                      <StatCard label="Valor Proformas" value={formatarKwanza(relatorioProformas.valor_total ?? 0)}
                        icon={<DollarSign size={16} />} color={colors.secondary} colors={colors} />
                    </div>

                    <GraficoCard titulo="Documentos por Tipo" colors={colors}>
                      {Object.keys(relatorioDocumentos.estatisticas?.por_tipo ?? {}).length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={Object.entries(relatorioDocumentos.estatisticas?.por_tipo ?? {}).map(([tipo, d]: any) => ({ tipo, quantidade: d?.quantidade ?? 0, valor: d?.valor ?? 0, retencao: d?.retencao ?? 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                            <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: colors.textSecondary }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: colors.textSecondary }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v, n) => [formatarKwanza(Number(v)), n]} contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="quantidade" fill={colors.primary} name="Quantidade" radius={[3, 3, 0, 0]} />
                            <Bar yAxisId="right" dataKey="valor" fill={colors.secondary} name="Valor" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <SemDados colors={colors} />}
                    </GraficoCard>

                    <GraficoCard titulo="Lista de Proformas" colors={colors}>
                      {(relatorioProformas.proformas?.length ?? 0) > 0 ? (
                        <MiniTabela
                          headers={["Nº Doc.", "Cliente", "Data", "Valor", "Estado"]}
                          rows={(relatorioProformas.proformas ?? []).slice(0, 20).map(p => [
                            <span key="n" className="font-mono text-xs">{p.numero_documento}</span>,
                            typeof p.cliente === "string" ? p.cliente : p.cliente?.nome ?? "-",
                            formatarData(p.data_emissao),
                            formatarKwanza(Number(p.total_liquido) ?? 0),
                            <EstadoBadge key="s" estado={p.estado} colors={colors} />,
                          ])}
                          aligns={["left", "left", "left", "right", "center"]}
                          colors={colors}
                        />
                      ) : <SemDados colors={colors} message="Nenhuma proforma encontrada" />}
                    </GraficoCard>
                  </>
                ) : <Vazio colors={colors} />}
              </>
            )}

            {/* ─── PAGAMENTOS ─── */}
            {activeTab === "pagamentos" && (
              isLoading ? <SkeletonCards n={4} colors={colors} />
              : relatorioPagamentos ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Pendente" value={formatarKwanza(relatorioPagamentos.resumo?.total_pendente ?? 0)}
                      icon={<DollarSign size={16} />} color={colors.primary} colors={colors}
                      alerta={(relatorioPagamentos.resumo?.total_pendente ?? 0) > 0} />
                    <StatCard label="Total Atrasado" value={formatarKwanza(relatorioPagamentos.resumo?.total_atrasado ?? 0)}
                      icon={<AlertCircle size={16} />} color={colors.danger} colors={colors}
                      alerta={(relatorioPagamentos.resumo?.total_atrasado ?? 0) > 0} />
                    <StatCard label="Faturas Pend." value={String(relatorioPagamentos.resumo?.quantidade_faturas ?? 0)}
                      icon={<FileText size={16} />} color={colors.secondary} colors={colors} />
                    <StatCard label="Retenção Pend." value={formatarKwanza(relatorioPagamentos.resumo?.retencao_pendente ?? 0)}
                      icon={<Percent size={16} />} color="#f97316" colors={colors} />
                  </div>

                  <GraficoCard titulo="Faturas Pendentes" colors={colors}>
                    {(relatorioPagamentos.faturas_pendentes?.length ?? 0) > 0 ? (
                      <MiniTabela
                        headers={["Documento", "Cliente", "Pendente", "Dias"]}
                        rows={(relatorioPagamentos.faturas_pendentes ?? []).slice(0, 15).map(f => [
                          <span key="d" className="font-mono text-xs">{f.numero_documento}</span>,
                          typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
                          formatarKwanza(Number(f.valor_pendente) ?? 0),
                          <EstadoBadge key="s" estado={(f.dias_atraso ?? 0) > 0 ? "atrasado" : "em_dia"} label={(f.dias_atraso ?? 0) > 0 ? `${f.dias_atraso}d` : "Em dia"} colors={colors} />,
                        ])}
                        aligns={["left", "left", "right", "center"]}
                        colors={colors}
                      />
                    ) : (
                      <div className="py-8 text-center text-sm" style={{ color: colors.textSecondary }}>
                        Nenhuma fatura pendente
                      </div>
                    )}
                  </GraficoCard>
                </>
              ) : <Vazio colors={colors} />
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

/* ── StatCard ── */
function StatCard({ label, value, sub, icon, color, colors, alerta }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; colors: any; alerta?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
      style={{
        backgroundColor: colors.card,
        borderColor: alerta ? `${color}50` : colors.border,
        borderLeftColor: color,
        borderLeftWidth: 3,
      }}>
      <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide truncate" style={{ color: colors.textSecondary }}>{label}</p>
        <p className="text-base font-bold leading-tight" style={{ color: alerta ? color : colors.text }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── PeriodoSelector ── */
function PeriodoSelector({ periodo, onChange, colors }: {
  periodo: PeriodoConfig; onChange: (t: PeriodoTipo) => void; colors: any;
}) {
  const opcoes: { id: PeriodoTipo; label: string }[] = [
    { id: "hoje", label: "Hoje" },
    { id: "ontem", label: "Ontem" },
    { id: "este_mes", label: "Este mês" },
    { id: "mes_passado", label: "Mês passado" },
    { id: "este_ano", label: "Este ano" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {opcoes.map(({ id, label }) => {
        const active = periodo.tipo === id;
        return (
          <button key={id} onClick={() => onChange(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all"
            style={{
              backgroundColor: active ? `${colors.primary}15` : 'transparent',
              borderColor: active ? colors.primary : colors.border,
              color: active ? colors.primary : colors.textSecondary,
            }}>
            <Calendar size={13} />
            {label}
          </button>
        );
      })}
      <span className="ml-auto text-xs px-2 py-1 rounded-md flex items-center gap-1"
        style={{ backgroundColor: colors.hover, color: colors.textSecondary }}>
        <Filter size={11} />
        {periodo.data_inicio} — {periodo.data_fim}
      </span>
    </div>
  );
}

/* ── GraficoCard ── */
function GraficoCard({ titulo, children, colors }: { titulo: string; children: React.ReactNode; colors: any }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <p className="text-sm font-semibold" style={{ color: colors.text }}>{titulo}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── MiniTabela ── */
function MiniTabela({ headers, rows, aligns, colors }: {
  headers: string[]; rows: (string | React.ReactNode)[][]; aligns: ("left" | "right" | "center")[]; colors: any;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: colors.hover }}>
            {headers.map((h, i) => (
              <th key={i} className={`py-2 px-3 text-${aligns[i]} text-xs font-semibold uppercase tracking-wide`}
                style={{ color: colors.textSecondary }}>{h}</th>
            ))}
           </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: colors.border }}>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ backgroundColor: ri % 2 !== 0 ? `${colors.hover}50` : 'transparent' }}>
              {row.map((cell, ci) => (
                <td key={ci} className={`py-2.5 px-3 text-${aligns[ci]} truncate max-w-[180px]`}
                  style={{ color: colors.text }}>
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

/* ── EstadoBadge ── */
function EstadoBadge({ estado, label, colors }: { estado?: string; label?: string; colors: any }) {
  const text = label ?? estado ?? "-";
  const cfg: Record<string, { bg: string; color: string }> = {
    paga: { bg: `${colors.success}20`, color: colors.success },
    pendente: { bg: `${colors.warning}20`, color: colors.warning },
    atrasado: { bg: `${colors.danger}20`, color: colors.danger },
    emitido: { bg: `${colors.warning}20`, color: colors.warning },
    convertido: { bg: `${colors.success}20`, color: colors.success },
    em_dia: { bg: `${colors.success}20`, color: colors.success },
  };
  const s = cfg[estado ?? ""] ?? { bg: `${colors.border}`, color: colors.textSecondary };
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>{text}</span>
  );
}

/* ── Skeleton ── */
function SkeletonCards({ n, colors }: { n: number; colors: any }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(n, 4)} gap-3`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: colors.hover }} />
      ))}
    </div>
  );
}

/* ── Vazio / SemDados ── */
function Vazio({ colors }: { colors: any }) {
  return (
    <div className="py-12 text-center text-sm" style={{ color: colors.textSecondary }}>
      Nenhum dado disponível
    </div>
  );
}

function SemDados({ colors, message = "Sem dados disponíveis" }: { colors: any; message?: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm" style={{ color: colors.textSecondary }}>
      {message}
    </div>
  );
}