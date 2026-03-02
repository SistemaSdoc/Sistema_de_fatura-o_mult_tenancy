// src/app/(dashboard)/relatorios/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import MainEmpresa from "../../components/MainEmpresa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle,
  Filter,
  Loader2,
  FileText,
  CreditCard,
  Wrench,
  Percent,
} from "lucide-react";
import {
  relatoriosService,
  DashboardGeral,
  RelatorioVendas,
  RelatorioFaturacao,
  RelatorioPagamentosPendentes,
  RelatorioProformas,
  RelatorioDocumentosFiscais,
  getPeriodoLabel,
  getPeriodoPredefinido,
  formatarKwanza,
  formatarData,
} from "@/services/relatorios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type TipoRelatorio =
  | "dashboard"
  | "vendas"
  | "faturacao"
  | "documentos"
  | "pagamentos"
  | "proformas";

type PeriodoTipo = "hoje" | "ontem" | "este_mes" | "mes_passado" | "este_ano";

interface PeriodoConfig {
  tipo: PeriodoTipo;
  data_inicio: string;
  data_fim: string;
}

const CORES_GRAFICO = [
  "#123859",
  "#F9941F",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export default function RelatoriosPage() {
  // Estados de período
  const [periodoVendas, setPeriodoVendas] = useState<PeriodoConfig>(
    getPeriodoPredefinido("este_mes")
  );
  const [periodoFaturacao, setPeriodoFaturacao] = useState<PeriodoConfig>(
    getPeriodoPredefinido("este_mes")
  );
  const [periodoDocumentos, setPeriodoDocumentos] = useState<PeriodoConfig>(
    getPeriodoPredefinido("este_mes")
  );

  // Estados de dados
  const [dashboard, setDashboard] = useState<DashboardGeral | null>(null);
  const [relatorioVendas, setRelatorioVendas] =
    useState<RelatorioVendas | null>(null);
  const [relatorioFaturacao, setRelatorioFaturacao] =
    useState<RelatorioFaturacao | null>(null);
  const [relatorioPagamentos, setRelatorioPagamentos] =
    useState<RelatorioPagamentosPendentes | null>(null);
  const [relatorioProformas, setRelatorioProformas] =
    useState<RelatorioProformas | null>(null);
  const [relatorioDocumentos, setRelatorioDocumentos] =
    useState<RelatorioDocumentosFiscais | null>(null);

  const [loading, setLoading] = useState<Record<TipoRelatorio, boolean>>({
    dashboard: false,
    vendas: false,
    faturacao: false,
    pagamentos: false,
    proformas: false,
    documentos: false,
  });

  const [activeTab, setActiveTab] = useState<TipoRelatorio>("dashboard");

  // Carregar dashboard inicial
  useEffect(() => {
    carregarDashboard();
    carregarPagamentosPendentes();
  }, []);

  // Carregar dados quando mudar aba ou período
  useEffect(() => {
    switch (activeTab) {
      case "vendas":
        carregarVendas();
        break;
      case "faturacao":
        carregarFaturacao();
        break;
      case "documentos":
        carregarDocumentos();
        break;
      case "proformas":
        carregarProformas();
        break;
    }
  }, [activeTab, periodoVendas, periodoFaturacao, periodoDocumentos]);

  const carregarDashboard = async () => {
    setLoading((prev) => ({ ...prev, dashboard: true }));
    try {
      const data = await relatoriosService.getDashboard();
      setDashboard(data);
    } catch (error) {
      toast.error("Erro ao carregar dashboard");
    } finally {
      setLoading((prev) => ({ ...prev, dashboard: false }));
    }
  };

  const carregarVendas = async () => {
    setLoading((prev) => ({ ...prev, vendas: true }));
    try {
      const data = await relatoriosService.getRelatorioVendas({
        data_inicio: periodoVendas.data_inicio,
        data_fim: periodoVendas.data_fim,
      });
      setRelatorioVendas(data);
    } catch (error) {
      toast.error("Erro ao carregar relatório de vendas");
    } finally {
      setLoading((prev) => ({ ...prev, vendas: false }));
    }
  };

  const carregarFaturacao = async () => {
    setLoading((prev) => ({ ...prev, faturacao: true }));
    try {
      const data = await relatoriosService.getRelatorioFaturacao({
        data_inicio: periodoFaturacao.data_inicio,
        data_fim: periodoFaturacao.data_fim,
      });
      setRelatorioFaturacao(data);
    } catch (error) {
      toast.error("Erro ao carregar relatório de faturação");
    } finally {
      setLoading((prev) => ({ ...prev, faturacao: false }));
    }
  };

  const carregarPagamentosPendentes = async () => {
    setLoading((prev) => ({ ...prev, pagamentos: true }));
    try {
      const data = await relatoriosService.getRelatorioPagamentosPendentes();
      setRelatorioPagamentos(data);
    } catch (error) {
      toast.error("Erro ao carregar pagamentos pendentes");
    } finally {
      setLoading((prev) => ({ ...prev, pagamentos: false }));
    }
  };

  const carregarProformas = async () => {
    setLoading((prev) => ({ ...prev, proformas: true }));
    try {
      const data = await relatoriosService.getRelatorioProformas({
        data_inicio: periodoFaturacao.data_inicio,
        data_fim: periodoFaturacao.data_fim,
      });
      setRelatorioProformas(data);
    } catch (error) {
      toast.error("Erro ao carregar relatório de proformas");
    } finally {
      setLoading((prev) => ({ ...prev, proformas: false }));
    }
  };

  const carregarDocumentos = async () => {
    setLoading((prev) => ({ ...prev, documentos: true }));
    try {
      const data = await relatoriosService.getRelatorioDocumentosFiscais({
        data_inicio: periodoDocumentos.data_inicio,
        data_fim: periodoDocumentos.data_fim,
      });
      setRelatorioDocumentos(data);
    } catch (error) {
      toast.error("Erro ao carregar documentos fiscais");
    } finally {
      setLoading((prev) => ({ ...prev, documentos: false }));
    }
  };

  // Handlers de período
  const handlePeriodoChange = (
    tipo: PeriodoTipo,
    relatorio: "vendas" | "faturacao" | "documentos" | "proformas"
  ) => {
    const novoPeriodo = getPeriodoPredefinido(tipo);
    const periodoAtualizado = { ...novoPeriodo, tipo };

    switch (relatorio) {
      case "vendas":
        setPeriodoVendas(periodoAtualizado);
        break;
      case "faturacao":
        setPeriodoFaturacao(periodoAtualizado);
        break;
      case "documentos":
        setPeriodoDocumentos(periodoAtualizado);
        break;
      case "proformas":
        setPeriodoFaturacao(periodoAtualizado);
        break;
    }
  };

  // Dados processados para gráficos
  const dadosVendasPorStatus = useMemo(() => {
    if (!relatorioVendas?.totais) return [];
    return [
      {
        name: "Vendas",
        value: relatorioVendas.totais.total_vendas || 0,
        color: "#123859",
      },
      {
        name: "Retenções",
        value: relatorioVendas.totais.total_retencao || 0,
        color: "#F9941F",
      },
    ].filter((item) => item.value > 0);
  }, [relatorioVendas]);

  const dadosFaturacaoPorStatus = useMemo(() => {
    if (!relatorioFaturacao) return [];
    return [
      {
        name: "Paga",
        value: relatorioFaturacao.faturacao_paga || 0,
        color: "#22c55e",
      },
      {
        name: "Pendente",
        value: relatorioFaturacao.faturacao_pendente || 0,
        color: "#F9941F",
      },
    ].filter((item) => item.value > 0);
  }, [relatorioFaturacao]);

  const dadosPagamentosPorTipo = useMemo(() => {
    if (!relatorioPagamentos?.resumo) return [];
    return [
      {
        name: "Faturas",
        value: relatorioPagamentos.resumo.quantidade_faturas || 0,
        color: "#123859",
      },
      {
        name: "Adiantamentos",
        value: relatorioPagamentos.resumo.quantidade_adiantamentos || 0,
        color: "#F9941F",
      },
    ].filter((item) => item.value > 0);
  }, [relatorioPagamentos]);

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#123859]">
              Relatórios e Análises
            </h1>
            <p className="text-slate-500 mt-1">
              Visualize indicadores e relatórios detalhados do seu negócio
            </p>
          </div>
        </div>

        {/* TABS */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TipoRelatorio)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-slate-100 p-1">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-[#123859] data-[state=active]:text-white"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="vendas"
              className="data-[state=active]:bg-[#123859] data-[state=active]:text-white"
            >
              Vendas
            </TabsTrigger>
            <TabsTrigger
              value="faturacao"
              className="data-[state=active]:bg-[#123859] data-[state=active]:text-white"
            >
              Faturação
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="data-[state=active]:bg-[#123859] data-[state=active]:text-white"
            >
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="pagamentos"
              className="data-[state=active]:bg-[#123859] data-[state=active]:text-white"
            >
              Pagamentos
            </TabsTrigger>
            <TabsTrigger
              value="proformas"
              className="data-[state=active]:bg-[#123859] data-[state=active]:text-white"
            >
              Proformas
            </TabsTrigger>
          </TabsList>

          {/* TAB DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            {loading.dashboard ? (
              <LoadingGrid cols={6} />
            ) : dashboard ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <DashboardCard
                    titulo="Vendas Mês"
                    valor={formatarKwanza(dashboard.vendas?.valor_mes || 0)}
                    icone={<TrendingUp className="h-4 w-4 text-[#F9941F]" />}
                  />
                  <DashboardCard
                    titulo="Faturado Total"
                    valor={formatarKwanza(
                      dashboard.documentos_fiscais?.total_faturado || 0
                    )}
                    icone={<DollarSign className="h-4 w-4 text-[#123859]" />}
                  />
                  <DashboardCard
                    titulo="Retenções Mês"
                    valor={formatarKwanza(
                      dashboard.documentos_fiscais?.total_retencao_mes || 0
                    )}
                    icone={<Percent className="h-4 w-4 text-orange-500" />}
                  />
                  <DashboardCard
                    titulo="Total Clientes"
                    valor={String(dashboard.clientes?.total || 0)}
                    icone={<Users className="h-4 w-4 text-blue-500" />}
                  />
                  <DashboardCard
                    titulo="Serviços Ativos"
                    valor={String(dashboard.servicos?.ativos || 0)}
                    icone={<Wrench className="h-4 w-4 text-purple-500" />}
                  />
                  <DashboardCard
                    titulo="Alertas Stock"
                    valor={String(
                      (dashboard.produtos?.estoque_baixo || 0) +
                      (dashboard.produtos?.sem_estoque || 0)
                    )}
                    icone={<AlertCircle className="h-4 w-4 text-red-500" />}
                    alerta={
                      (dashboard.produtos?.estoque_baixo || 0) +
                      (dashboard.produtos?.sem_estoque || 0) >
                      0
                    }
                  />
                </div>

                {dashboard.alertas && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AlertaCard
                      titulo="Documentos Vencidos"
                      valor={dashboard.alertas.documentos_vencidos || 0}
                      tipo="warning"
                    />
                    <AlertaCard
                      titulo="Proformas Antigas"
                      valor={dashboard.alertas.proformas_antigas || 0}
                      tipo="info"
                    />
                    <AlertaCard
                      titulo="Retenções Pendentes"
                      valor={
                        dashboard.alertas.servicos_com_retencao_pendente || 0
                      }
                      tipo="error"
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState message="Nenhum dado disponível" />
            )}
          </TabsContent>

          {/* TAB VENDAS */}
          <TabsContent value="vendas" className="space-y-6">
            <PeriodoSelector
              periodo={periodoVendas}
              onChange={(tipo) => handlePeriodoChange(tipo, "vendas")}
            />

            {loading.vendas ? (
              <LoadingSpinner />
            ) : relatorioVendas ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <KpiCard
                    titulo="Total em Vendas"
                    valor={formatarKwanza(
                      relatorioVendas.totais?.total_valor || 0
                    )}
                    subtitulo={`${relatorioVendas.totais?.total_vendas || 0} transações`}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Base Tributável"
                    valor={formatarKwanza(
                      relatorioVendas.totais?.total_base_tributavel || 0
                    )}
                    cor="bg-blue-500"
                  />
                  <KpiCard
                    titulo="Total IVA"
                    valor={formatarKwanza(
                      relatorioVendas.totais?.total_iva || 0
                    )}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Retenções"
                    valor={formatarKwanza(
                      relatorioVendas.totais?.total_retencao || 0
                    )}
                    subtitulo={`${relatorioVendas.totais?.total_servicos || 0} serviços`}
                    cor="bg-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GraficoCard titulo="Distribuição de Valores">
                    {dadosVendasPorStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={dadosVendasPorStatus}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {dadosVendasPorStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatarKwanza(Number(value))}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )}
                  </GraficoCard>

                  <GraficoCard titulo="Últimas Vendas">
                    <div className="overflow-auto max-h-[300px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">Cliente</th>
                            <th className="text-right p-2">Total</th>
                            <th className="text-center p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatorioVendas.vendas
                            ?.slice(0, 10)
                            .map((venda, idx) => (
                              <tr
                                key={idx}
                                className="border-t border-slate-100"
                              >
                                <td className="p-2 truncate max-w-[150px]">
                                  {typeof venda.cliente === "string"
                                    ? venda.cliente
                                    : venda.cliente?.nome || "-"}
                                </td>
                                <td className="p-2 text-right font-medium">
                                  {formatarKwanza(Number(venda.total) || 0)}
                                </td>
                                <td className="p-2 text-center">
                                  <Badge
                                    variant={
                                      venda.estado_pagamento === "paga"
                                        ? "default"
                                        : "outline"
                                    }
                                    className={
                                      venda.estado_pagamento === "paga"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-amber-100 text-amber-700"
                                    }
                                  >
                                    {venda.estado_pagamento}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </GraficoCard>
                </div>

                {relatorioVendas.agrupado &&
                  relatorioVendas.agrupado.length > 0 && (
                    <GraficoCard titulo="Evolução por Período">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={relatorioVendas.agrupado}>
                          <defs>
                            <linearGradient
                              id="colorVendas"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#123859"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#123859"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            tickFormatter={(val) =>
                              `Kz ${(val / 1000).toFixed(0)}k`
                            }
                          />
                          <Tooltip
                            formatter={(value) => formatarKwanza(Number(value))}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#123859"
                            fillOpacity={1}
                            fill="url(#colorVendas)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </GraficoCard>
                  )}
              </>
            ) : (
              <EmptyState message="Nenhum dado disponível para o período selecionado" />
            )}
          </TabsContent>

          {/* TAB FATURAÇÃO */}
          <TabsContent value="faturacao" className="space-y-6">
            <PeriodoSelector
              periodo={periodoFaturacao}
              onChange={(tipo) => handlePeriodoChange(tipo, "faturacao")}
            />

            {loading.faturacao ? (
              <LoadingSpinner />
            ) : relatorioFaturacao ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard
                    titulo="Faturação Total"
                    valor={formatarKwanza(
                      relatorioFaturacao.faturacao_total || 0
                    )}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Faturação Paga"
                    valor={formatarKwanza(
                      relatorioFaturacao.faturacao_paga || 0
                    )}
                    cor="bg-emerald-500"
                  />
                  <KpiCard
                    titulo="Faturação Pendente"
                    valor={formatarKwanza(
                      relatorioFaturacao.faturacao_pendente || 0
                    )}
                    cor="bg-[#F9941F]"
                    alerta={(relatorioFaturacao.faturacao_pendente || 0) > 0}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GraficoCard titulo="Distribuição por Status">
                    {dadosFaturacaoPorStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={dadosFaturacaoPorStatus}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {dadosFaturacaoPorStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatarKwanza(Number(value))}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )}
                  </GraficoCard>

                  <GraficoCard titulo="Documentos por Tipo">
                    {Object.keys(relatorioFaturacao.por_tipo || {}).length >
                      0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={Object.entries(
                            relatorioFaturacao.por_tipo || {}
                          ).map(([tipo, dados]) => ({
                            tipo,
                            quantidade: dados?.quantidade || 0,
                            valor: dados?.total_liquido || 0,
                          }))}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="quantidade"
                            fill="#123859"
                            name="Quantidade"
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="valor"
                            fill="#F9941F"
                            name="Valor"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )}
                  </GraficoCard>
                </div>

                {relatorioFaturacao.faturacao_por_mes &&
                  relatorioFaturacao.faturacao_por_mes.length > 0 && (
                    <GraficoCard titulo="Evolução Mensal">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={relatorioFaturacao.faturacao_por_mes}>
                          <defs>
                            <linearGradient
                              id="colorFaturacao"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#123859"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#123859"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            tickFormatter={(val) =>
                              `Kz ${(val / 1000).toFixed(0)}k`
                            }
                          />
                          <Tooltip
                            formatter={(value) => formatarKwanza(Number(value))}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#123859"
                            fillOpacity={1}
                            fill="url(#colorFaturacao)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </GraficoCard>
                  )}
              </>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          {/* TAB DOCUMENTOS FISCAIS */}
          <TabsContent value="documentos" className="space-y-6">
            <PeriodoSelector
              periodo={periodoDocumentos}
              onChange={(tipo) => handlePeriodoChange(tipo, "documentos")}
            />

            {loading.documentos ? (
              <LoadingSpinner />
            ) : relatorioDocumentos ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <KpiCard
                    titulo="Total Documentos"
                    valor={String(
                      relatorioDocumentos.estatisticas?.total_documentos || 0
                    )}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Valor Total"
                    valor={formatarKwanza(
                      relatorioDocumentos.estatisticas?.total_valor || 0
                    )}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Total IVA"
                    valor={formatarKwanza(
                      relatorioDocumentos.estatisticas?.total_iva || 0
                    )}
                    cor="bg-blue-500"
                  />
                  <KpiCard
                    titulo="Retenções"
                    valor={formatarKwanza(
                      relatorioDocumentos.estatisticas?.total_retencao || 0
                    )}
                    cor="bg-orange-500"
                  />
                </div>

                <GraficoCard titulo="Documentos por Tipo">
                  {Object.keys(relatorioDocumentos.estatisticas?.por_tipo || {})
                    .length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={Object.entries(
                          relatorioDocumentos.estatisticas?.por_tipo || {}
                        ).map(([tipo, dados]) => ({
                          tipo,
                          quantidade: dados?.quantidade || 0,
                          valor: dados?.valor || 0,
                          retencao: dados?.retencao || 0,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                        />
                        <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(val) =>
                            `Kz ${(val / 1000).toFixed(0)}k`
                          }
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatarKwanza(Number(value)),
                            name,
                          ]}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="quantidade"
                          fill="#123859"
                          name="Quantidade"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="valor"
                          fill="#F9941F"
                          name="Valor"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart />
                  )}
                </GraficoCard>
              </>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          {/* TAB PAGAMENTOS */}
          <TabsContent value="pagamentos" className="space-y-6">
            {loading.pagamentos ? (
              <LoadingSpinner />
            ) : relatorioPagamentos ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    titulo="Total Pendente"
                    valor={formatarKwanza(
                      relatorioPagamentos.resumo?.total_pendente || 0
                    )}
                    cor="bg-[#123859]"
                    alerta={
                      (relatorioPagamentos.resumo?.total_pendente || 0) > 0
                    }
                  />
                  <KpiCard
                    titulo="Total Atrasado"
                    valor={formatarKwanza(
                      relatorioPagamentos.resumo?.total_atrasado || 0
                    )}
                    cor="bg-red-500"
                    alerta={
                      (relatorioPagamentos.resumo?.total_atrasado || 0) > 0
                    }
                  />
                  <KpiCard
                    titulo="Faturas Pendentes"
                    valor={String(
                      relatorioPagamentos.resumo?.quantidade_faturas || 0
                    )}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Retenção Pendente"
                    valor={formatarKwanza(
                      relatorioPagamentos.resumo?.retencao_pendente || 0
                    )}
                    cor="bg-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GraficoCard titulo="Distribuição de Pendentes">
                    {dadosPagamentosPorTipo.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={dadosPagamentosPorTipo}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {dadosPagamentosPorTipo.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )}
                  </GraficoCard>

                  <GraficoCard titulo="Faturas Pendentes">
                    {relatorioPagamentos.faturas_pendentes &&
                      relatorioPagamentos.faturas_pendentes.length > 0 ? (
                      <div className="overflow-auto max-h-[300px]">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Documento</th>
                              <th className="text-left p-2">Cliente</th>
                              <th className="text-right p-2">Pendente</th>
                              <th className="text-center p-2">Dias</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatorioPagamentos.faturas_pendentes
                              .slice(0, 10)
                              .map((fat, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-slate-100"
                                >
                                  <td className="p-2 font-mono text-xs">
                                    {fat.numero_documento}
                                  </td>
                                  <td className="p-2 truncate max-w-[120px]">
                                    {typeof fat.cliente === "string"
                                      ? fat.cliente
                                      : fat.cliente?.nome || "-"}
                                  </td>
                                  <td className="p-2 text-right font-medium">
                                    {formatarKwanza(
                                      Number(fat.valor_pendente) || 0
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    <Badge
                                      variant={
                                        (fat.dias_atraso || 0) > 0
                                          ? "destructive"
                                          : "outline"
                                      }
                                    >
                                      {(fat.dias_atraso || 0) > 0
                                        ? `${fat.dias_atraso} dias`
                                        : "Em dia"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-400">
                        Nenhuma fatura pendente
                      </div>
                    )}
                  </GraficoCard>
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          {/* TAB PROFORMAS */}
          <TabsContent value="proformas" className="space-y-6">
            <PeriodoSelector
              periodo={periodoFaturacao}
              onChange={(tipo) => handlePeriodoChange(tipo, "proformas")}
            />

            {loading.proformas ? (
              <LoadingSpinner />
            ) : relatorioProformas ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <KpiCard
                    titulo="Total de Proformas"
                    valor={String(relatorioProformas.total || 0)}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Valor Total"
                    valor={formatarKwanza(relatorioProformas.valor_total || 0)}
                    cor="bg-[#F9941F]"
                  />
                </div>

                <GraficoCard titulo="Lista de Proformas">
                  {relatorioProformas.proformas &&
                    relatorioProformas.proformas.length > 0 ? (
                    <div className="overflow-auto max-h-[400px]">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">Nº Documento</th>
                            <th className="text-left p-2">Cliente</th>
                            <th className="text-left p-2">Data</th>
                            <th className="text-right p-2">Valor</th>
                            <th className="text-center p-2">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatorioProformas.proformas
                            .slice(0, 20)
                            .map((pro, idx) => (
                              <tr
                                key={idx}
                                className="border-t border-slate-100"
                              >
                                <td className="p-2 font-mono text-xs">
                                  {pro.numero_documento}
                                </td>
                                <td className="p-2 truncate max-w-[150px]">
                                  {typeof pro.cliente === "string"
                                    ? pro.cliente
                                    : pro.cliente?.nome || "-"}
                                </td>
                                <td className="p-2">
                                  {formatarData(pro.data_emissao)}
                                </td>
                                <td className="p-2 text-right font-medium">
                                  {formatarKwanza(
                                    Number(pro.total_liquido) || 0
                                  )}
                                </td>
                                <td className="p-2 text-center">
                                  <Badge
                                    variant="outline"
                                    className={
                                      pro.estado === "emitido"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-green-100 text-green-700"
                                    }
                                  >
                                    {pro.estado}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyChart message="Nenhuma proforma encontrada" />
                  )}
                </GraficoCard>
              </>
            ) : (
              <EmptyState />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainEmpresa>
  );
}

/* ================= COMPONENTES AUXILIARES ================= */

interface PeriodoSelectorProps {
  periodo: PeriodoConfig;
  onChange: (tipo: PeriodoTipo) => void;
}

function PeriodoSelector({ periodo, onChange }: PeriodoSelectorProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {(
              [
                "hoje",
                "ontem",
                "este_mes",
                "mes_passado",
                "este_ano",
              ] as PeriodoTipo[]
            ).map((tipo) => (
              <Button
                key={tipo}
                variant={periodo.tipo === tipo ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(tipo)}
                className={periodo.tipo === tipo ? "bg-[#123859]" : ""}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {getPeriodoLabel(tipo)}
              </Button>
            ))}
          </div>
          <Badge
            variant="outline"
            className="text-[#123859] border-[#123859]"
          >
            <Filter className="h-3 w-3 mr-1" />
            {periodo.data_inicio} a {periodo.data_fim}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardCardProps {
  titulo: string;
  valor: string;
  icone: React.ReactNode;
  alerta?: boolean;
}

function DashboardCard({
  titulo,
  valor,
  icone,
  alerta,
}: DashboardCardProps) {
  return (
    <Card
      className={`border-l-4 ${alerta ? "border-l-red-500" : "border-l-[#123859]"
        } hover:shadow-md transition-shadow`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {titulo}
            </p>
            <p className="text-lg font-bold text-[#123859] mt-1">{valor}</p>
          </div>
          <div
            className={`p-2 rounded-lg ${alerta ? "bg-red-100" : "bg-slate-100"
              }`}
          >
            {icone}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertaCardProps {
  titulo: string;
  valor: number;
  tipo: "warning" | "info" | "error";
}

function AlertaCard({ titulo, valor, tipo }: AlertaCardProps) {
  const cores = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };

  return (
    <Card className={`${cores[tipo]} border`}>
      <CardContent className="p-4 flex justify-between items-center">
        <span className="font-medium">{titulo}</span>
        <Badge
          variant={tipo === "error" ? "destructive" : "default"}
          className="text-lg"
        >
          {valor}
        </Badge>
      </CardContent>
    </Card>
  );
}

interface KpiCardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  cor: string;
  alerta?: boolean;
}

function KpiCard({
  titulo,
  valor,
  subtitulo,
  cor,
  alerta,
}: KpiCardProps) {
  return (
    <Card
      className={`overflow-hidden ${alerta ? "border-red-300" : "border-slate-200"
        }`}
    >
      <div className={`h-1 ${cor}`} />
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{titulo}</p>
        <p className="text-2xl font-bold text-[#123859] mt-1">{valor}</p>
        {subtitulo && (
          <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface GraficoCardProps {
  titulo: string;
  children: React.ReactNode;
}

function GraficoCard({ titulo, children }: GraficoCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="text-lg text-[#123859]">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
    </div>
  );
}

function LoadingGrid({ cols = 6 }: { cols?: number }) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${cols} gap-4`}
    >
      {[...Array(cols)].map((_, i) => (
        <Card key={i} className="border-slate-200">
          <CardContent className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyChart({ message = "Sem dados disponíveis" }: { message?: string }) {
  return (
    <div className="h-[300px] flex items-center justify-center text-slate-400">
      {message}
    </div>
  );
}

function EmptyState({ message = "Nenhum dado disponível" }: { message?: string }) {
  return <div className="text-center py-12 text-slate-500">{message}</div>;
}