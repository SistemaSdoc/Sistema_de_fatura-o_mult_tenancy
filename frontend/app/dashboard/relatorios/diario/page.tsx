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
  Loader2
} from "lucide-react";
import {
  relatoriosService,
  RelatorioVendas,
  RelatorioCompras,
  RelatorioFaturacao,
  RelatorioStock,
  DashboardGeral,
  getHoje,
  getInicioMes,
  getInicioAno,
  getPeriodoLabel
} from "@/services/relatorios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type TipoRelatorio = 'vendas' | 'compras' | 'faturacao' | 'stock';
type PeriodoTipo = 'diario' | 'mensal' | 'anual' | 'personalizado';

interface PeriodoConfig {
  tipo: PeriodoTipo;
  dataInicio: string;
  dataFim: string;
}

const CORES_GRAFICO = ["#123859", "#F9941F", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4"];

// Valores padrão para evitar undefined
const DEFAULT_DASHBOARD: DashboardGeral = {
  vendas_hoje: 0,
  vendas_mes: 0,
  vendas_ano: 0,
  total_clientes: 0,
  total_produtos: 0,
  total_fornecedores: 0,
  alertas_stock: 0,
};

export default function RelatoriosPage() {
  // Estados de período
  const [periodoVendas, setPeriodoVendas] = useState<PeriodoConfig>({
    tipo: 'mensal',
    dataInicio: getInicioMes(),
    dataFim: getHoje()
  });

  const [periodoCompras, setPeriodoCompras] = useState<PeriodoConfig>({
    tipo: 'mensal',
    dataInicio: getInicioMes(),
    dataFim: getHoje()
  });

  // Estados de dados - INICIALIZADOS com valores padrão ou null
  const [dashboard, setDashboard] = useState<DashboardGeral | null>(null);
  const [relatorioVendas, setRelatorioVendas] = useState<RelatorioVendas | null>(null);
  const [relatorioCompras, setRelatorioCompras] = useState<RelatorioCompras | null>(null);
  const [relatorioFaturacao, setRelatorioFaturacao] = useState<RelatorioFaturacao | null>(null);
  const [relatorioStock, setRelatorioStock] = useState<RelatorioStock | null>(null);

  const [loading, setLoading] = useState<Record<TipoRelatorio | 'dashboard', boolean>>({
    vendas: false,
    compras: false,
    faturacao: false,
    stock: false,
    dashboard: false
  });

  const [activeTab, setActiveTab] = useState<TipoRelatorio>('vendas');

  // Carregar dashboard inicial
  useEffect(() => {
    carregarDashboard();
    carregarStock();
  }, []);

  // Carregar dados quando mudar período ou aba
  useEffect(() => {
    if (activeTab === 'vendas') carregarVendas();
    if (activeTab === 'compras') carregarCompras();
    if (activeTab === 'faturacao') carregarFaturacao();
  }, [activeTab, periodoVendas, periodoCompras]);

  const carregarDashboard = async () => {
    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const data = await relatoriosService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error("Erro ao carregar dashboard");
      // Mantém null para mostrar estado de erro/loading
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

  const carregarCompras = async () => {
    setLoading(prev => ({ ...prev, compras: true }));
    try {
      const data = await relatoriosService.getRelatorioCompras({
        data_inicio: periodoCompras.dataInicio,
        data_fim: periodoCompras.dataFim
      });
      setRelatorioCompras(data);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
      toast.error("Erro ao carregar relatório de compras");
    } finally {
      setLoading(prev => ({ ...prev, compras: false }));
    }
  };

  const carregarFaturacao = async () => {
    setLoading(prev => ({ ...prev, faturacao: true }));
    try {
      const data = await relatoriosService.getRelatorioFaturacao({
        data_inicio: periodoVendas.dataInicio,
        data_fim: periodoVendas.dataFim
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
      toast.error("Erro ao carregar relatório de stock");
    } finally {
      setLoading(prev => ({ ...prev, stock: false }));
    }
  };

  // Handlers de período
  const handlePeriodoChange = (tipo: PeriodoTipo, relatorio: 'vendas' | 'compras') => {
    let dataInicio = getHoje();
    const dataFim = getHoje();

    switch (tipo) {
      case 'diario':
        dataInicio = getHoje();
        break;
      case 'mensal':
        dataInicio = getInicioMes();
        break;
      case 'anual':
        dataInicio = getInicioAno();
        break;
    }

    const novoPeriodo = { tipo, dataInicio, dataFim };

    if (relatorio === 'vendas') {
      setPeriodoVendas(novoPeriodo);
    } else {
      setPeriodoCompras(novoPeriodo);
    }
  };

  // Dados processados para gráficos com verificações de segurança
  const dadosVendasPorStatus = useMemo(() => {
    if (!relatorioVendas?.vendas?.length) return [];
    return [
      { name: "Pagas", value: relatorioVendas.vendas.filter(v => v.status === "paga").length, color: "#22c55e" },
      { name: "Pendentes", value: relatorioVendas.vendas.filter(v => v.status === "pendente").length, color: "#ef4444" },
    ];
  }, [relatorioVendas]);

  const dadosFaturacaoPorStatus = useMemo(() => {
    if (!relatorioFaturacao) return [];
    return [
      { name: "Paga", value: relatorioFaturacao.faturacao_paga || 0, color: "#22c55e" },
      { name: "Pendente", value: relatorioFaturacao.faturacao_pendente || 0, color: "#F9941F" },
    ];
  }, [relatorioFaturacao]);

  const formatarKwanza = (valor: number | undefined | null) => {
    const num = valor || 0;
    return `Kz ${num.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}`;
  };

  // Usar valores seguros para renderização
  const safeDashboard = dashboard || DEFAULT_DASHBOARD;

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
          <Button variant="outline" className="gap-2 border-[#123859] text-[#123859] hover:bg-[#123859] hover:text-white">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* CARDS DO DASHBOARD - COM VERIFICAÇÃO DE LOADING */}
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <DashboardCard
              titulo="Vendas Hoje"
              valor={formatarKwanza(safeDashboard.vendas_hoje)}
              icone={<TrendingUp className="h-4 w-4 text-emerald-500" />}
              tendencia="up"
            />
            <DashboardCard
              titulo="Vendas Mês"
              valor={formatarKwanza(safeDashboard.vendas_mes)}
              icone={<TrendingUp className="h-4 w-4 text-[#F9941F]" />}
            />
            <DashboardCard
              titulo="Vendas Ano"
              valor={formatarKwanza(safeDashboard.vendas_ano)}
              icone={<DollarSign className="h-4 w-4 text-[#123859]" />}
            />
            <DashboardCard
              titulo="Clientes"
              valor={String(safeDashboard.total_clientes || 0)}
              icone={<Users className="h-4 w-4 text-blue-500" />}
            />
            <DashboardCard
              titulo="Produtos"
              valor={String(safeDashboard.total_produtos || 0)}
              icone={<Package className="h-4 w-4 text-violet-500" />}
            />
            <DashboardCard
              titulo="Alertas Stock"
              valor={String(safeDashboard.alertas_stock || 0)}
              icone={<AlertCircle className="h-4 w-4 text-red-500" />}
              alerta={(safeDashboard.alertas_stock || 0) > 0}
            />
          </div>
        )}

        {/* TABS DE RELATÓRIOS */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TipoRelatorio)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-slate-100 p-1">
            <TabsTrigger value="vendas" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Vendas
            </TabsTrigger>
            <TabsTrigger value="compras" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Compras
            </TabsTrigger>
            <TabsTrigger value="faturacao" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Faturação
            </TabsTrigger>
            <TabsTrigger value="stock" className="data-[state=active]:bg-[#123859] data-[state=active]:text-white">
              Stock
            </TabsTrigger>
          </TabsList>

          {/* TAB VENDAS */}
          <TabsContent value="vendas" className="space-y-6">
            {/* Filtros de Período */}
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant={periodoVendas.tipo === 'diario' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodoChange('diario', 'vendas')}
                      className={periodoVendas.tipo === 'diario' ? 'bg-[#123859]' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Diário
                    </Button>
                    <Button
                      variant={periodoVendas.tipo === 'mensal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodoChange('mensal', 'vendas')}
                      className={periodoVendas.tipo === 'mensal' ? 'bg-[#123859]' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Mensal
                    </Button>
                    <Button
                      variant={periodoVendas.tipo === 'anual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodoChange('anual', 'vendas')}
                      className={periodoVendas.tipo === 'anual' ? 'bg-[#123859]' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Anual
                    </Button>
                  </div>

                  <Badge variant="outline" className="text-[#123859] border-[#123859]">
                    <Filter className="h-3 w-3 mr-1" />
                    {getPeriodoLabel(periodoVendas.tipo)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

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
                    valor={formatarKwanza(relatorioVendas.total_periodo)}
                    subtitulo={`${relatorioVendas.quantidade_vendas || 0} transações`}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Ticket Médio"
                    valor={formatarKwanza(relatorioVendas.kpis?.ticketMedio)}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Clientes Ativos"
                    valor={String(relatorioVendas.kpis?.clientesPeriodo || 0)}
                    cor="bg-blue-500"
                  />
                  <KpiCard
                    titulo="Produtos Vendidos"
                    valor={String(relatorioVendas.kpis?.produtos || 0)}
                    cor="bg-violet-500"
                  />
                </div>

                {/* Gráficos Vendas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GraficoCard titulo="Vendas por Status">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dadosVendasPorStatus}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {dadosVendasPorStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Quantidade']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </GraficoCard>

                  <GraficoCard titulo="Top Clientes">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={relatorioVendas.vendas?.slice(0, 5) || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="cliente" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => formatarKwanza(Number(value))} />
                        <Bar dataKey="total" fill="#F9941F" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </GraficoCard>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </TabsContent>

          {/* TAB COMPRAS */}
          <TabsContent value="compras" className="space-y-6">
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant={periodoCompras.tipo === 'diario' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodoChange('diario', 'compras')}
                      className={periodoCompras.tipo === 'diario' ? 'bg-[#123859]' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Diário
                    </Button>
                    <Button
                      variant={periodoCompras.tipo === 'mensal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodoChange('mensal', 'compras')}
                      className={periodoCompras.tipo === 'mensal' ? 'bg-[#123859]' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Mensal
                    </Button>
                    <Button
                      variant={periodoCompras.tipo === 'anual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodoChange('anual', 'compras')}
                      className={periodoCompras.tipo === 'anual' ? 'bg-[#123859]' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Anual
                    </Button>
                  </div>

                  <Badge variant="outline" className="text-[#123859] border-[#123859]">
                    <Filter className="h-3 w-3 mr-1" />
                    {getPeriodoLabel(periodoCompras.tipo)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {loading.compras ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
            ) : relatorioCompras ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard
                    titulo="Total em Compras"
                    valor={formatarKwanza(relatorioCompras.total_compras)}
                    subtitulo={`${relatorioCompras.quantidade_compras || 0} pedidos`}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Fornecedores Ativos"
                    valor={String(relatorioCompras.fornecedores_ativos || 0)}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Ticket Médio"
                    valor={formatarKwanza((relatorioCompras.total_compras || 0) / (relatorioCompras.quantidade_compras || 1))}
                    cor="bg-emerald-500"
                  />
                </div>

                <GraficoCard titulo="Compras por Fornecedor">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={relatorioCompras.compras_por_fornecedor || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="fornecedor" type="category" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value, name) => [formatarKwanza(Number(value)), 'Total']} />
                      <Bar dataKey="total" fill="#123859" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </GraficoCard>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </TabsContent>

          {/* TAB FATURAÇÃO */}
          <TabsContent value="faturacao" className="space-y-6">
            {loading.faturacao ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#123859]" />
              </div>
            ) : relatorioFaturacao ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard
                    titulo="Faturação Total"
                    valor={formatarKwanza(relatorioFaturacao.faturacao_total)}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Faturação Paga"
                    valor={formatarKwanza(relatorioFaturacao.faturacao_paga)}
                    cor="bg-emerald-500"
                  />
                  <KpiCard
                    titulo="Faturação Pendente"
                    valor={formatarKwanza(relatorioFaturacao.faturacao_pendente)}
                    cor="bg-[#F9941F]"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GraficoCard titulo="Distribuição por Status">
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
                  </GraficoCard>

                  <GraficoCard titulo="Evolução Mensal">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={relatorioFaturacao.faturacao_por_mes || []}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#123859" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#123859" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `Kz ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatarKwanza(Number(value))} />
                        <Area type="monotone" dataKey="total" stroke="#123859" fillOpacity={1} fill="url(#colorTotal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GraficoCard>
                </div>
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
                    valor={String(relatorioStock.total_produtos || 0)}
                    cor="bg-[#123859]"
                  />
                  <KpiCard
                    titulo="Valor em Stock"
                    valor={formatarKwanza(relatorioStock.valor_stock_total)}
                    cor="bg-[#F9941F]"
                  />
                  <KpiCard
                    titulo="Baixo Stock"
                    valor={String(relatorioStock.produtos_baixo_stock || 0)}
                    cor="bg-amber-500"
                    alerta={(relatorioStock.produtos_baixo_stock || 0) > 0}
                  />
                  <KpiCard
                    titulo="Sem Stock"
                    valor={String(relatorioStock.produtos_sem_stock || 0)}
                    cor="bg-red-500"
                    alerta={(relatorioStock.produtos_sem_stock || 0) > 0}
                  />
                </div>

                <GraficoCard titulo="Stock por Categoria">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={relatorioStock.produtos_por_categoria || []}>
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

interface DashboardCardProps {
  titulo: string;
  valor: string;
  icone: ReactNode;
  tendencia?: 'up' | 'down';
  alerta?: boolean;
}

function DashboardCard({ titulo, valor, icone, tendencia, alerta }: DashboardCardProps) {
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
        {tendencia && (
          <div className={`flex items-center mt-2 text-xs ${tendencia === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {tendencia === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {tendencia === 'up' ? 'Aumento' : 'Diminuição'}
          </div>
        )}
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
  children: ReactNode;
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