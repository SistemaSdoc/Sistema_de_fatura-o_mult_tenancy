// src/app/(dashboard)/relatorios/page.tsx
"use client";

import React, { useEffect, useMemo, useState, ReactNode } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
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
  CartesianGrid
} from "recharts";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  AlertCircle,
  Download,
  Filter,
  Loader2,
  FileText,
  CreditCard,
  Clock,
  Wrench,
  Percent
} from "lucide-react";
import {
  relatoriosService,
  DashboardGeral,
  RelatorioVendas,
  RelatorioFaturacao,
  RelatorioStock,
  RelatorioPagamentosPendentes,
  RelatorioProformas,
  RelatorioDocumentosFiscais,
  getPeriodoLabel,
  getPeriodoPredefinido,
  formatarKwanza,
  formatarData
} from "@/services/relatorios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type TipoRelatorio = 'vendas' | 'faturacao' | 'stock' | 'pagamentos' | 'proformas' | 'documentos';
type PeriodoTipo = 'hoje' | 'ontem' | 'este_mes' | 'mes_passado' | 'este_ano' | 'personalizado';

interface PeriodoConfig {
  tipo: PeriodoTipo;
  dataInicio: string;
  dataFim: string;
}

const CORES_GRAFICO = ["#123859", "#F9941F", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function RelatoriosPage() {
  // Estados de período
  const [periodoVendas, setPeriodoVendas] = useState<PeriodoConfig>(
    getPeriodoPredefinido('este_mes')
  );
  const [periodoFaturacao, setPeriodoFaturacao] = useState<PeriodoConfig>(
    getPeriodoPredefinido('este_mes')
  );
  const [periodoDocumentos, setPeriodoDocumentos] = useState<PeriodoConfig>(
    getPeriodoPredefinido('este_mes')
  );

  // Estados de dados
  const [dashboard, setDashboard] = useState<DashboardGeral | null>(null);
  const [relatorioVendas, setRelatorioVendas] = useState<RelatorioVendas | null>(null);
  const [relatorioFaturacao, setRelatorioFaturacao] = useState<RelatorioFaturacao | null>(null);
  const [relatorioStock, setRelatorioStock] = useState<RelatorioStock | null>(null);
  const [relatorioPagamentos, setRelatorioPagamentos] = useState<RelatorioPagamentosPendentes | null>(null);
  const [relatorioProformas, setRelatorioProformas] = useState<RelatorioProformas | null>(null);
  const [relatorioDocumentos, setRelatorioDocumentos] = useState<RelatorioDocumentosFiscais | null>(null);

  const [loading, setLoading] = useState<Record<TipoRelatorio | 'dashboard', boolean>>({
    vendas: false,
    faturacao: false,
    stock: false,
    pagamentos: false,
    proformas: false,
    documentos: false,
    dashboard: false
  });

  const [activeTab, setActiveTab] = useState<TipoRelatorio>('vendas');

  // Carregar dados iniciais
  useEffect(() => {
    carregarDashboard();
    // Não carregar stock automaticamente devido ao erro no backend
    // carregarStock();
    carregarPagamentosPendentes();
  }, []);

  // Carregar dados quando mudar período ou aba
  useEffect(() => {
    if (activeTab === 'vendas') carregarVendas();
    if (activeTab === 'faturacao') carregarFaturacao();
    if (activeTab === 'proformas') carregarProformas();
    if (activeTab === 'documentos') carregarDocumentos();
    // Stock só carrega quando clicar na tab específica devido ao erro
    if (activeTab === 'stock') carregarStock();
  }, [activeTab, periodoVendas, periodoFaturacao, periodoDocumentos]);

  const carregarDashboard = async () => {
    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const data = await relatoriosService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error("Erro ao carregar dashboard");
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  };

  const carregarVendas = async () => {
    setLoading(prev => ({ ...prev, vendas: true }));
    try {
      const data = await relatoriosService.getRelatorioVendas({
        data_inicio: periodoVendas.dataInicio,
        data_fim: periodoVendas.dataFim
      });
      setRelatorioVendas(data);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      toast.error("Erro ao carregar relatório de vendas");
    } finally {
      setLoading(prev => ({ ...prev, vendas: false }));
    }
  };

  const carregarFaturacao = async () => {
    setLoading(prev => ({ ...prev, faturacao: true }));
    try {
      const data = await relatoriosService.getRelatorioFaturacao({
        data_inicio: periodoFaturacao.dataInicio,
        data_fim: periodoFaturacao.dataFim
      });
      setRelatorioFaturacao(data);
    } catch (error) {
      console.error('Erro ao carregar faturação:', error);
      toast.error("Erro ao carregar relatório de faturação");
    } finally {
      setLoading(prev => ({ ...prev, faturacao: false }));
    }
  };

  const carregarStock = async () => {
    setLoading(prev => ({ ...prev, stock: true }));
    try {
      const data = await relatoriosService.getRelatorioStock();
      setRelatorioStock(data);
    } catch (error) {
      console.error('Erro ao carregar stock:', error);
      toast.error("Erro ao carregar relatório de stock. Verifique se o modelo Produto tem a relação 'categoria' definida.");
    } finally {
      setLoading(prev => ({ ...prev, stock: false }));
    }
  };

  const carregarPagamentosPendentes = async () => {
    setLoading(prev => ({ ...prev, pagamentos: true }));
    try {
      const data = await relatoriosService.getRelatorioPagamentosPendentes();
      setRelatorioPagamentos(data);
    } catch (error) {
      console.error('Erro ao carregar pagamentos pendentes:', error);
      toast.error("Erro ao carregar pagamentos pendentes");
    } finally {
      setLoading(prev => ({ ...prev, pagamentos: false }));
    }
  };

  const carregarProformas = async () => {
    setLoading(prev => ({ ...prev, proformas: true }));
    try {
      const data = await relatoriosService.getRelatorioProformas({
        data_inicio: periodoFaturacao.dataInicio,
        data_fim: periodoFaturacao.dataFim
      });
      setRelatorioProformas(data);
    } catch (error) {
      console.error('Erro ao carregar proformas:', error);
      toast.error("Erro ao carregar relatório de proformas");
    } finally {
      setLoading(prev => ({ ...prev, proformas: false }));
    }
  };

  const carregarDocumentos = async () => {
    setLoading(prev => ({ ...prev, documentos: true }));
    try {
      const data = await relatoriosService.getRelatorioDocumentosFiscais({
        data_inicio: periodoDocumentos.dataInicio,
        data_fim: periodoDocumentos.dataFim
      });
      setRelatorioDocumentos(data);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast.error("Erro ao carregar relatório de documentos fiscais");
    } finally {
      setLoading(prev => ({ ...prev, documentos: false }));
    }
  };

  // Handlers de período
  const handlePeriodoChange = (tipo: PeriodoTipo, relatorio: 'vendas' | 'faturacao' | 'documentos') => {
    const novoPeriodo = getPeriodoPredefinido(tipo);
    switch (relatorio) {
      case 'vendas':
        setPeriodoVendas({ ...novoPeriodo, tipo });
        break;
      case 'faturacao':
        setPeriodoFaturacao({ ...novoPeriodo, tipo });
        break;
      case 'documentos':
        setPeriodoDocumentos({ ...novoPeriodo, tipo });
        break;
    }
  };

  // Dados processados para gráficos
  const dadosVendasPorStatus = useMemo(() => {
    if (!relatorioVendas?.totais) return [];
    const { total_vendas = 0, total_retencao = 0 } = relatorioVendas.totais;
    return [
      { name: "Vendas", value: total_vendas, color: "#123859" },
      { name: "Retenções", value: total_retencao, color: "#F9941F" },
    ].filter(item => item.value > 0);
  }, [relatorioVendas]);

  const dadosFaturacaoPorStatus = useMemo(() => {
    if (!relatorioFaturacao) return [];
    return [
      { name: "Paga", value: relatorioFaturacao.faturacao_paga || 0, color: "#22c55e" },
      { name: "Pendente", value: relatorioFaturacao.faturacao_pendente || 0, color: "#F9941F" },
    ].filter(item => item.value > 0);
  }, [relatorioFaturacao]);

  const dadosPagamentosPorTipo = useMemo(() => {
    if (!relatorioPagamentos) return [];
    return [
      { name: "Faturas", value: relatorioPagamentos.resumo.quantidade_faturas, color: "#123859" },
      { name: "Adiantamentos", value: relatorioPagamentos.resumo.quantidade_adiantamentos, color: "#F9941F" },
    ].filter(item => item.value > 0);
  }, [relatorioPagamentos]);

  // Função segura para formatar valores que podem ser objetos
  const safeFormatValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === 'object') {
      // Se for um objeto, tenta extrair propriedades comuns ou retorna string JSON
      if (value.nome) return value.nome;
      if (value.valor) return String(value.valor);
      if (value.total) return String(value.total);
      return JSON.stringify(value);
    }
    return String(value);
  };

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

        {/* CARDS DO DASHBOARD */}
        {loading.dashboard ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
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
        ) : dashboard ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <DashboardCard
              titulo="Vendas Mês"
              valor={formatarKwanza(dashboard.vendas?.valor_mes || 0)}
              icone={<TrendingUp className="h-4 w-4 text-[#F9941F]" />}
            />
            <DashboardCard
              titulo="Faturado Total"
              valor={formatarKwanza(dashboard.documentos_fiscais?.total_faturado || 0)}
              icone={<DollarSign className="h-4 w-4 text-[#123859]" />}
            />
            <DashboardCard
              titulo="Retenções Mês"
              valor={formatarKwanza(dashboard.documentos_fiscais?.total_retencao_mes || 0)}
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
              valor={String((dashboard.produtos?.estoque_baixo || 0) + (dashboard.produtos?.sem_estoque || 0))}
              icone={<AlertCircle className="h-4 w-4 text-red-500" />}
              alerta={((dashboard.produtos?.estoque_baixo || 0) + (dashboard.produtos?.sem_estoque || 0)) > 0}
            />
          </div>
        ) : null}

        {/* TABS DE RELATÓRIOS */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TipoRelatorio)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:w-auto bg-slate-100 p-1">
            <TabsTrigger value="vendas" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Vendas
            </TabsTrigger>
            <TabsTrigger value="faturacao" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Faturação
            </TabsTrigger>
            <TabsTrigger value="documentos" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Documentos
            </TabsTrigger>
            <TabsTrigger value="stock" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Stock
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="proformas" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Proformas
            </TabsTrigger>
          </TabsList>

          {/* TAB VENDAS */}
          <TabsContent value="vendas" className="space-y-6">
            <PeriodoSelector
              periodo={periodoVendas}
              onChange={(tipo) => handlePeriodoChange(tipo, 'vendas')}
            />

            {loading.vendas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
            ) : relatorioVendas ? (
              <>
                {/* KPIs Vendas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <KpiCard
                    titulo="Total em Vendas"
                    valor={formatarKwanza(relatorioVendas.totais?.total_valor || 0)}
                    subtitulo={`${relatorioVendas.totais?.total_vendas || 0} transações`}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Base Tributável"
                    valor={formatarKwanza(relatorioVendas.totais?.total_base_tributavel || 0)}
                    cor="bg-blue-500"
                  />
                  <KpiCard
                    titulo="Total IVA"
                    valor={formatarKwanza(relatorioVendas.totais?.total_iva || 0)}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Retenções"
                    valor={formatarKwanza(relatorioVendas.totais?.total_retencao || 0)}
                    subtitulo={`${relatorioVendas.totais?.total_servicos || 0} serviços`}
                    cor="bg-orange-500"
                  />
                </div>

                {/* Gráficos Vendas */}
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
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {dadosVendasPorStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatarKwanza(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-400">
                        Sem dados disponíveis
                      </div>
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
                          {relatorioVendas.vendas?.slice(0, 10).map((venda, idx) => (
                            <tr key={idx} className="border-t border-slate-100">
                              <td className="p-2 truncate max-w-[150px]">
                                {safeFormatValue(venda.cliente)}
                              </td>
                              <td className="p-2 text-right font-medium">
                                {formatarKwanza(Number(venda.total) || 0)}
                              </td>
                              <td className="p-2 text-center">
                                <Badge
                                  variant={venda.estado_pagamento === 'paga' ? 'default' : 'outline'}
                                  className={venda.estado_pagamento === 'paga' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                                >
                                  {safeFormatValue(venda.estado_pagamento)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GraficoCard>
                </div>

                {/* Agrupamento */}
                {relatorioVendas.agrupado && relatorioVendas.agrupado.length > 0 && (
                  <GraficoCard titulo="Evolução por Período">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={relatorioVendas.agrupado}>
                        <defs>
                          <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#123859" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#123859" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `Kz ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatarKwanza(Number(value))} />
                        <Area type="monotone" dataKey="total" stroke="#123859" fillOpacity={1} fill="url(#colorVendas)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GraficoCard>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </TabsContent>

          {/* TAB FATURAÇÃO */}
          <TabsContent value="faturacao" className="space-y-6">
            <PeriodoSelector
              periodo={periodoFaturacao}
              onChange={(tipo) => handlePeriodoChange(tipo, 'faturacao')}
            />

            {loading.faturacao ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
            ) : relatorioFaturacao ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard
                    titulo="Faturação Total"
                    valor={formatarKwanza(relatorioFaturacao.faturacao_total || 0)}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Faturação Paga"
                    valor={formatarKwanza(relatorioFaturacao.faturacao_paga || 0)}
                    cor="bg-emerald-500"
                  />
                  <KpiCard
                    titulo="Faturação Pendente"
                    valor={formatarKwanza(relatorioFaturacao.faturacao_pendente || 0)}
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
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {dadosFaturacaoPorStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatarKwanza(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-400">
                        Sem dados disponíveis
                      </div>
                    )}
                  </GraficoCard>

                  <GraficoCard titulo="Documentos por Tipo">
                    {Object.keys(relatorioFaturacao.por_tipo || {}).length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={Object.entries(relatorioFaturacao.por_tipo || {}).map(([tipo, dados]) => ({
                          tipo,
                          quantidade: dados?.quantidade || 0,
                          valor: dados?.total_liquido || 0
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="quantidade" fill="#123859" name="Quantidade" />
                          <Bar yAxisId="right" dataKey="valor" fill="#F9941F" name="Valor" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-400">
                        Sem dados de tipos
                      </div>
                    )}
                  </GraficoCard>
                </div>

                {relatorioFaturacao.faturacao_por_mes && relatorioFaturacao.faturacao_por_mes.length > 0 && (
                  <GraficoCard titulo="Evolução Mensal">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={relatorioFaturacao.faturacao_por_mes}>
                        <defs>
                          <linearGradient id="colorFaturacao" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#123859" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#123859" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `Kz ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatarKwanza(Number(value))} />
                        <Area type="monotone" dataKey="total" stroke="#123859" fillOpacity={1} fill="url(#colorFaturacao)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GraficoCard>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nenhum dado disponível
              </div>
            )}
          </TabsContent>

          {/* TAB DOCUMENTOS FISCAIS */}
          <TabsContent value="documentos" className="space-y-6">
            <PeriodoSelector
              periodo={periodoDocumentos}
              onChange={(tipo) => handlePeriodoChange(tipo, 'documentos')}
            />

            {loading.documentos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
            ) : relatorioDocumentos ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <KpiCard
                    titulo="Total Documentos"
                    valor={String(relatorioDocumentos.estatisticas?.total_documentos || 0)}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Valor Total"
                    valor={formatarKwanza(relatorioDocumentos.estatisticas?.total_valor || 0)}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Total IVA"
                    valor={formatarKwanza(relatorioDocumentos.estatisticas?.total_iva || 0)}
                    cor="bg-blue-500"
                  />
                  <KpiCard
                    titulo="Retenções"
                    valor={formatarKwanza(relatorioDocumentos.estatisticas?.total_retencao || 0)}
                    cor="bg-orange-500"
                  />
                </div>

                <GraficoCard titulo="Documentos por Tipo">
                  {Object.keys(relatorioDocumentos.estatisticas?.por_tipo || {}).length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={Object.entries(relatorioDocumentos.estatisticas?.por_tipo || {}).map(([tipo, dados]) => ({
                        tipo,
                        quantidade: dados?.quantidade || 0,
                        valor: dados?.valor || 0,
                        retencao: dados?.retencao || 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(val) => `Kz ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value, name) => [formatarKwanza(Number(value)), name]} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="quantidade" fill="#123859" name="Quantidade" />
                        <Bar yAxisId="right" dataKey="valor" fill="#F9941F" name="Valor" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-slate-400">
                      Sem dados disponíveis
                    </div>
                  )}
                </GraficoCard>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nenhum dado disponível
              </div>
            )}
          </TabsContent>

          {/* TAB STOCK */}
          <TabsContent value="stock" className="space-y-6">
            {loading.stock ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
            ) : relatorioStock ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    titulo="Total Produtos"
                    valor={String(relatorioStock.resumo?.total_produtos || 0)}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Valor em Stock"
                    valor={formatarKwanza(relatorioStock.resumo?.total_valor_estoque || 0)}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Baixo Stock"
                    valor={String(relatorioStock.resumo?.produtos_estoque_baixo || 0)}
                    cor="bg-amber-500"
                    alerta={(relatorioStock.resumo?.produtos_estoque_baixo || 0) > 0}
                  />
                  <KpiCard
                    titulo="Sem Stock"
                    valor={String(relatorioStock.resumo?.produtos_sem_estoque || 0)}
                    cor="bg-red-500"
                    alerta={(relatorioStock.resumo?.produtos_sem_estoque || 0) > 0}
                  />
                </div>

                <GraficoCard titulo="Stock por Categoria">
                  {Object.keys(relatorioStock.por_categoria || {}).length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={Object.entries(relatorioStock.por_categoria || {}).map(([categoria, dados]) => ({
                        categoria,
                        quantidade: dados?.quantidade || 0,
                        valor: dados?.valor || 0,
                        produtos: dados?.produtos || 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(val) => `Kz ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="quantidade" fill="#123859" name="Quantidade" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="valor" fill="#F9941F" name="Valor (Kz)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-slate-400">
                      Sem dados de categorias
                    </div>
                  )}
                </GraficoCard>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Clique no botão acima para carregar os dados de stock
                <br />
                <span className="text-sm text-red-500">
                  (Nota: Pode haver erro no backend na relação 'categoria')
                </span>
              </div>
            )}
          </TabsContent>

          {/* TAB PAGAMENTOS */}
          <TabsContent value="pagamentos" className="space-y-6">
            {loading.pagamentos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
            ) : relatorioPagamentos ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    titulo="Total Pendente"
                    valor={formatarKwanza(relatorioPagamentos.resumo?.total_pendente || 0)}
                    cor="bg-[#123859]"
                    alerta={(relatorioPagamentos.resumo?.total_pendente || 0) > 0}
                  />
                  <KpiCard
                    titulo="Total Atrasado"
                    valor={formatarKwanza(relatorioPagamentos.resumo?.total_atrasado || 0)}
                    cor="bg-red-500"
                    alerta={(relatorioPagamentos.resumo?.total_atrasado || 0) > 0}
                  />
                  <KpiCard
                    titulo="Faturas Pendentes"
                    valor={String(relatorioPagamentos.resumo?.quantidade_faturas || 0)}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Retenção Pendente"
                    valor={formatarKwanza(relatorioPagamentos.resumo?.retencao_pendente || 0)}
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
                      <div className="h-[300px] flex items-center justify-center text-slate-400">
                        Sem dados disponíveis
                      </div>
                    )}
                  </GraficoCard>

                  <GraficoCard titulo="Faturas Pendentes">
                    {relatorioPagamentos.faturas_pendentes && relatorioPagamentos.faturas_pendentes.length > 0 ? (
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
                            {relatorioPagamentos.faturas_pendentes.slice(0, 10).map((fat, idx) => (
                              <tr key={idx} className="border-t border-slate-100">
                                <td className="p-2 font-mono text-xs">
                                  {safeFormatValue(fat.numero_documento)}
                                </td>
                                <td className="p-2 truncate max-w-[120px]">
                                  {safeFormatValue(fat.cliente)}
                                </td>
                                <td className="p-2 text-right font-medium">
                                  {formatarKwanza(Number(fat.valor_pendente) || 0)}
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant={(fat.dias_atraso || 0) > 0 ? 'destructive' : 'outline'}>
                                    {(fat.dias_atraso || 0) > 0 ? `${fat.dias_atraso} dias` : 'Em dia'}
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
              <div className="text-center py-12 text-slate-500">
                Nenhum dado disponível
              </div>
            )}
          </TabsContent>

          {/* TAB PROFORMAS */}
          <TabsContent value="proformas" className="space-y-6">
            <PeriodoSelector
              periodo={periodoFaturacao}
              onChange={(tipo) => handlePeriodoChange(tipo, 'faturacao')}
            />

            {loading.proformas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
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
                  {relatorioProformas.proformas && relatorioProformas.proformas.length > 0 ? (
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
                          {relatorioProformas.proformas.slice(0, 20).map((pro, idx) => (
                            <tr key={idx} className="border-t border-slate-100">
                              <td className="p-2 font-mono text-xs">
                                {safeFormatValue(pro.numero_documento)}
                              </td>
                              <td className="p-2 truncate max-w-[150px]">
                                {safeFormatValue(pro.cliente)}
                              </td>
                              <td className="p-2">
                                {formatarData(pro.data_emissao)}
                              </td>
                              <td className="p-2 text-right font-medium">
                                {formatarKwanza(Number(pro.total_liquido) || 0)}
                              </td>
                              <td className="p-2 text-center">
                                <Badge variant="outline" className={
                                  pro.estado === 'emitido' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                }>
                                  {safeFormatValue(pro.estado)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-400">
                      Nenhuma proforma encontrada
                    </div>
                  )}
                </GraficoCard>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nenhum dado disponível
              </div>
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
            {(['hoje', 'ontem', 'este_mes', 'mes_passado', 'este_ano'] as PeriodoTipo[]).map((tipo) => (
              <Button
                key={tipo}
                variant={periodo.tipo === tipo ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange(tipo)}
                className={periodo.tipo === tipo ? 'bg-[#123859]' : ''}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {getPeriodoLabel(tipo)}
              </Button>
            ))}
          </div>
          <Badge variant="outline" className="text-[#123859] border-[#123859]">
            <Filter className="h-3 w-3 mr-1" />
            {periodo.dataInicio} a {periodo.dataFim}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardCardProps {
  titulo: string;
  valor: string;
  icone: ReactNode;
  alerta?: boolean;
}

function DashboardCard({ titulo, valor, icone, alerta }: DashboardCardProps) {
  return (
    <Card className={`border-l-4 ${alerta ? 'border-l-red-500' : 'border-l-[#123859]'} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{titulo}</p>
            <p className="text-lg font-bold text-[#123859] mt-1">{valor}</p>
          </div>
          <div className={`p-2 rounded-lg ${alerta ? 'bg-red-100' : 'bg-slate-100'}`}>
            {icone}
          </div>
        </div>
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

function KpiCard({ titulo, valor, subtitulo, cor, alerta }: KpiCardProps) {
  return (
    <Card className={`overflow-hidden ${alerta ? 'border-red-300' : 'border-slate-200'}`}>
      <div className={`h-1 ${cor}`} />
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{titulo}</p>
        <p className="text-2xl font-bold text-[#123859] mt-1">{valor}</p>
        {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
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
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}