"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import MainEmpresa from "../../components/MainEmpresa";
import {
   Download, FileSpreadsheet, SlidersHorizontal,
} from "lucide-react";
import {
  relatoriosService,
  RelatorioVendas, RelatorioFaturacao,
  RelatorioPagamentosPendentes, RelatorioDocumentosFiscais,
  RelatorioProformas, RelatorioMovimentosStock, TipoMovimento,
  getPeriodoPredefinido,
} from "@/services/relatorios";
import { useThemeColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/authprovider";
import { toast } from "sonner";
import { api } from "@/services/axios";

// Funções de exportação
import { exportarPDF, exportarExcel } from "./utils/relatorioExport";

const RelatorioVendasComponent = dynamic(
  () => import("@/app/components/Relatorios/RelatorioVendas").then((m) => m.RelatorioVendasComponent),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded border" />,
  },
);

const RelatorioDocumentosComponent = dynamic(
  () => import("@/app/components/Relatorios/RelatorioDocumentos").then((m) => m.RelatorioDocumentosComponent),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded border" />,
  },
);

const RelatorioPagamentosComponent = dynamic(
  () => import("@/app/components/Relatorios/RelatorioPagamentos").then((m) => m.RelatorioPagamentosComponent),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded border" />,
  },
);

const RelatorioMovimentosStockComponent = dynamic(
  () => import("@/app/components/Relatorios/RelatorioMovimentosStock").then((m) => m.RelatorioMovimentosStockComponent),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded border" />,
  },
);

/* ═══════════════════════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════════════════════ */
type TipoRelatorio = "vendas" | "documentos" | "pagamentos" | "movimentos_stock";
type PeriodoTipo = "hoje" | "ontem" | "este_mes" | "mes_passado" | "este_ano" | "personalizado";

interface PeriodoConfig {
  tipo: PeriodoTipo;
  data_inicio: string;
  data_fim: string;
}

const getErroStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status;
};

/* ═══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function RelatoriosPage() {
  const colors = useThemeColors();
  const { user, loading: userLoading } = useAuth();
  const userRole = user?.role || "";

  // ==================== PERMISSÕES ====================
  const podeVerVendas = ["admin", "contablista"].includes(userRole);
  const podeVerDocumentos = ["admin", "contablista"].includes(userRole);
  const podeVerPagamentos = userRole === "admin";
  const podeVerMovimentosStock = ["admin", "contablista",].includes(userRole);

  const TABS: { id: TipoRelatorio; label: string }[] = [
    ...(podeVerVendas ? [{ id: "vendas" as const, label: "Vendas" }] : []),
    ...(podeVerDocumentos ? [{ id: "documentos" as const, label: "Documentos e Proformas" }] : []),
    ...(podeVerPagamentos ? [{ id: "pagamentos" as const, label: "Pagamentos Pendentes" }] : []),
    ...(podeVerMovimentosStock ? [{ id: "movimentos_stock" as const, label: "Movimentos de Stock" }] : []),
  ];

  const [activeTab, setActiveTab] = useState<TipoRelatorio>("vendas");

  const [periodoVendas, setPeriodoVendas] = useState<PeriodoConfig>(getPeriodoPredefinido("este_mes"));
  const [periodoDocumentos, setPeriodoDocumentos] = useState<PeriodoConfig>(getPeriodoPredefinido("este_mes"));
  const [periodoMovimentos, setPeriodoMovimentos] = useState<PeriodoConfig>(getPeriodoPredefinido("este_mes"));

  const [relatorioVendas, setRelatorioVendas] = useState<RelatorioVendas | null>(null);
  const [relatorioFaturacao, setRelatorioFaturacao] = useState<RelatorioFaturacao | null>(null);
  const [relatorioPagamentos, setRelatorioPagamentos] = useState<RelatorioPagamentosPendentes | null>(null);
  const [relatorioDocumentos, setRelatorioDocumentos] = useState<RelatorioDocumentosFiscais | null>(null);
  const [relatorioProformas, setRelatorioProformas] = useState<RelatorioProformas | null>(null);
  const [relatorioMovimentos, setRelatorioMovimentos] = useState<RelatorioMovimentosStock | null>(null);

  const [loading, setLoading] = useState<Record<TipoRelatorio, boolean>>({
    vendas: false, documentos: false, pagamentos: false, movimentos_stock: false,
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [exportandoSaft, setExportandoSaft] = useState(false);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroAberto, setFiltroAberto] = useState(false);

  // Estados para SAF-T
  const [anoSaft] = useState(new Date().getFullYear());
  const [mesSaft] = useState(new Date().getMonth() + 1);

  // ==================== CARREGAMENTO SEGURO ====================
  const carregarVendas = useCallback(async () => {
    if (!podeVerVendas) return;
    setLoading(p => ({ ...p, vendas: true }));
    try {
      const [vendas, faturacao] = await Promise.all([
        relatoriosService.getRelatorioVendas({ 
          data_inicio: periodoVendas.data_inicio, 
          data_fim: periodoVendas.data_fim 
        }),
        relatoriosService.getRelatorioFaturacao({ 
          data_inicio: periodoVendas.data_inicio, 
          data_fim: periodoVendas.data_fim 
        }),
      ]);
      setRelatorioVendas(vendas);
      setRelatorioFaturacao(faturacao);
    } catch (error: unknown) {
      if (getErroStatus(error) !== 403) {
        toast.error("Erro ao carregar vendas e facturação");
      }
    } finally {
      setLoading(p => ({ ...p, vendas: false }));
    }
  }, [periodoVendas, podeVerVendas]);

  const carregarPagamentos = useCallback(async () => {
    if (!podeVerPagamentos) return;
    setLoading(p => ({ ...p, pagamentos: true }));
    try {
      const data = await relatoriosService.getRelatorioPagamentosPendentes();
      setRelatorioPagamentos(data);
    } catch (error: unknown) {
      if (getErroStatus(error) !== 403) {
        toast.error("Erro ao carregar pagamentos pendentes");
      }
    } finally {
      setLoading(p => ({ ...p, pagamentos: false }));
    }
  }, [podeVerPagamentos]);

  const carregarDocumentos = useCallback(async () => {
    if (!podeVerDocumentos) return;
    setLoading(p => ({ ...p, documentos: true }));
    try {
      const [documentos, proformas] = await Promise.all([
        relatoriosService.getRelatorioDocumentosFiscais({ 
          data_inicio: periodoDocumentos.data_inicio, 
          data_fim: periodoDocumentos.data_fim 
        }),
        relatoriosService.getRelatorioProformas({ 
          data_inicio: periodoDocumentos.data_inicio, 
          data_fim: periodoDocumentos.data_fim 
        }),
      ]);
      setRelatorioDocumentos(documentos);
      setRelatorioProformas(proformas);
    } catch (error: unknown) {
      if (getErroStatus(error) !== 403) {
        toast.error("Erro ao carregar documentos");
      }
    } finally {
      setLoading(p => ({ ...p, documentos: false }));
    }
  }, [periodoDocumentos, podeVerDocumentos]);

  const carregarMovimentos = useCallback(async (params?: {
    tipo?: "entrada" | "saida";
    tipo_movimento?: TipoMovimento;
    agrupar_por?: "dia" | "mes" | "produto" | "tipo_movimento" | null;
  }) => {
    if (!podeVerMovimentosStock) return;
    setLoading(p => ({ ...p, movimentos_stock: true }));
    try {
      const temFiltrosExplícitos = params !== undefined;
      const queryParams = temFiltrosExplícitos
        ? {
            data_inicio: periodoMovimentos.data_inicio,
            data_fim: periodoMovimentos.data_fim,
            ...(params?.tipo ? { tipo: params.tipo } : {}),
            ...(params?.tipo_movimento ? { tipo_movimento: params.tipo_movimento } : {}),
            ...(params?.agrupar_por ? { agrupar_por: params.agrupar_por } : {}),
          }
        : {
            data_inicio: periodoMovimentos.data_inicio,
            data_fim: periodoMovimentos.data_fim,
            agrupar_por: "dia" as const,
          };
      const data = await relatoriosService.getRelatorioMovimentosStock({
        ...queryParams,
      });
      setRelatorioMovimentos(data);
    } catch (error: unknown) {
      if (getErroStatus(error) !== 403) {
        toast.error("Erro ao carregar movimentos de stock");
      }
    } finally {
      setLoading(p => ({ ...p, movimentos_stock: false }));
    }
  }, [periodoMovimentos, podeVerMovimentosStock]);

  // Carregamento automático
  useEffect(() => {
    if (userLoading) return;
    if (activeTab === "vendas") carregarVendas();
    else if (activeTab === "documentos") carregarDocumentos();
    else if (activeTab === "pagamentos") carregarPagamentos();
    else if (activeTab === "movimentos_stock") carregarMovimentos();
  }, [activeTab, userLoading, carregarVendas, carregarDocumentos, carregarPagamentos, carregarMovimentos]);

  // ==================== FUNÇÕES DE FILTRO E EXPORTAÇÃO ====================
  type RelAtivo = "vendas" | "documentos" | "movimentos";

  const aplicarFiltro = (rel: RelAtivo) => {
    if (!dataInicio || !dataFim) { 
      toast.error("Selecione as duas datas"); 
      return; 
    }
    if (new Date(dataInicio) > new Date(dataFim)) { 
      toast.error("Data inicial maior que data final"); 
      return; 
    }
    const p: PeriodoConfig = { tipo: "personalizado", data_inicio: dataInicio, data_fim: dataFim };
    if (rel === "vendas") setPeriodoVendas(p);
    else if (rel === "documentos") setPeriodoDocumentos(p);
    else setPeriodoMovimentos(p);
    setFiltroAberto(false);
    toast.success("Filtro aplicado");
  };

  const limparFiltro = (rel: RelAtivo) => {
    const p = getPeriodoPredefinido("este_mes");
    if (rel === "vendas") setPeriodoVendas(p);
    else if (rel === "documentos") setPeriodoDocumentos(p);
    else setPeriodoMovimentos(p);
    setDataInicio(""); 
    setDataFim("");
    setFiltroAberto(false);
  };

  const getDadosAtivos = () => {
    if (activeTab === "vendas") return { vendas: relatorioVendas, faturacao: relatorioFaturacao };
    if (activeTab === "documentos") return { documentos: relatorioDocumentos, proformas: relatorioProformas };
    if (activeTab === "movimentos_stock") return relatorioMovimentos;
    return relatorioPagamentos;
  };

  const getPeriodoAtivo = () => {
    if (activeTab === "vendas") return `${periodoVendas.data_inicio} a ${periodoVendas.data_fim}`;
    if (activeTab === "documentos") return `${periodoDocumentos.data_inicio} a ${periodoDocumentos.data_fim}`;
    if (activeTab === "movimentos_stock") return `${periodoMovimentos.data_inicio} a ${periodoMovimentos.data_fim}`;
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

  const handleExportarSaft = async () => {
    setExportandoSaft(true);
    try {
      const response = await api.get("/api/relatorios/exportar-saft", {
        params: { year: anoSaft, month: mesSaft },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `saft_${anoSaft}_${mesSaft.toString().padStart(2, "0")}.xml`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Ficheiro SAF-T exportado com sucesso");
    } catch (error) {
      console.error("Erro ao exportar SAF-T:", error);
      toast.error("Erro ao gerar o ficheiro SAF-T");
    } finally {
      setExportandoSaft(false);
    }
  };

  const isLoading = loading[activeTab];
  const hasPeriodoFiltro = activeTab !== "pagamentos";
  const periodoAtivo = activeTab === "vendas" ? periodoVendas : 
                       activeTab === "documentos" ? periodoDocumentos : 
                       activeTab === "movimentos_stock" ? periodoMovimentos : null;

  const relAtivo: RelAtivo = activeTab === "documentos" ? "documentos" :
                             activeTab === "movimentos_stock" ? "movimentos" : "vendas";

  const border = `1px solid ${colors.primary}`;

  // ==================== RENDER ====================
  if (userLoading) {
    return <MainEmpresa><div className="flex justify-center items-center h-screen">Carregando...</div></MainEmpresa>;
  }

  if (TABS.length === 0) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-lg" style={{ color: colors.textSecondary }}>
            Você não tem permissão para visualizar relatórios.
          </p>
        </div>
      </MainEmpresa>
    );
  }

  return (
    <MainEmpresa>
      <div className="p-3 sm:p-5 space-y-0" style={{ color: colors.text }}>

        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: colors.border }}>
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ color: colors.text }}>
              Relatórios e Análises
            </h1>
            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              Indicadores e relatórios detalhados do negócio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportarSaft}
              disabled={exportandoSaft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 transition-all"
              style={{ backgroundColor: colors.primary, borderRadius: 4 }}
            >
              {exportandoSaft ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Download size={12} />}
              SAF-T
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
              {exportLoading ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Download size={12} />}
              PDF
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderTop: "none" }}>
          <div className="flex overflow-x-auto border-b" style={{ borderColor: colors.border }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="shrink-0 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors whitespace-nowrap"
                  style={{
                    color: active ? colors.secondary : colors.textSecondary,
                    borderBottom: active ? `2px solid ${colors.primary}` : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* FILTRO */}
          {hasPeriodoFiltro && periodoAtivo && (
            <div className="border-b" style={{ borderColor: colors.border }}>
              {/* ... seu código de filtro permanece igual ... */}
              <div className="flex items-center gap-3 px-4 py-2" style={{ backgroundColor: colors.hover }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Período</span>
                <span className="text-[11px] px-2 py-0.5 font-mono" style={{ backgroundColor: colors.card, border, color: colors.text, borderRadius: 3 }}>
                  {periodoAtivo.data_inicio} — {periodoAtivo.data_fim}
                </span>
                <div className="flex-1" />
                <button onClick={() => setFiltroAberto(f => !f)} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border transition-all"
                  style={{ backgroundColor: filtroAberto ? `${colors.primary}15` : colors.card, borderColor: filtroAberto ? colors.primary : colors.border, color: filtroAberto ? colors.primary : colors.textSecondary, borderRadius: 3 }}>
                  <SlidersHorizontal size={11} /> Filtrar período
                </button>
                {periodoAtivo.tipo === "personalizado" && (
                  <button onClick={() => limparFiltro(relAtivo)} className="text-[11px] font-medium transition-colors" style={{ color: "#dc2626" }}>
                    Limpar filtro
                  </button>
                )}
              </div>

              {filtroAberto && (
                <div className="px-4 py-3 flex flex-wrap items-end gap-3 border-t" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                  {/* Seus inputs de data permanecem iguais */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Data inicial</label>
                    <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="px-2.5 py-1.5 text-xs border outline-none" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text, borderRadius: 3, minWidth: 140 }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>Data final</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="px-2.5 py-1.5 text-xs border outline-none" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text, borderRadius: 3, minWidth: 140 }} />
                  </div>
                  <button onClick={() => aplicarFiltro(relAtivo)} className="px-4 py-1.5 text-xs font-semibold text-white transition-all" style={{ backgroundColor: colors.primary, borderRadius: 3 }}>Aplicar</button>
                  <button onClick={() => setFiltroAberto(false)} className="px-3 py-1.5 text-xs font-medium border transition-all" style={{ border, color: colors.textSecondary, borderRadius: 3 }}>Cancelar</button>
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO */}
          <div className="p-4 space-y-4">
            {activeTab === "vendas" && <RelatorioVendasComponent colors={colors} isLoading={isLoading} relatorioVendas={relatorioVendas} relatorioFaturacao={relatorioFaturacao} />}
            {activeTab === "documentos" && <RelatorioDocumentosComponent colors={colors} isLoading={isLoading} relatorioDocumentos={relatorioDocumentos} relatorioProformas={relatorioProformas} />}
            {activeTab === "pagamentos" && <RelatorioPagamentosComponent colors={colors} isLoading={isLoading} relatorioPagamentos={relatorioPagamentos} />}
            {activeTab === "movimentos_stock" && <RelatorioMovimentosStockComponent colors={colors} isLoading={isLoading} relatorioMovimentos={relatorioMovimentos} onCarregar={carregarMovimentos} />}
          </div>
        </div>
      </div>
    </MainEmpresa>
  );
}
