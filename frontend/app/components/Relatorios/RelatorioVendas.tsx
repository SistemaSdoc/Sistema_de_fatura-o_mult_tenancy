import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import { RelatorioVendas, RelatorioFaturacao, FaturacaoPorTipo, formatarKwanza } from "@/services/relatorios";
import { KpiCell, SecaoGrafico, TabelaDados, EstadoBadge, CarregandoLinha, Vazio, SemDados, tooltipStyle } from "./RelatorioComuns";
import { ThemeColors } from "@/context/ThemeContext";

interface RelatorioVendasProps {
  colors: ThemeColors;
  isLoading: boolean;
  relatorioVendas: RelatorioVendas | null;
  relatorioFaturacao: RelatorioFaturacao | null;
}

type PieItem = { name: string; value: number; color: string; total: number };
type PieLabelPayload = { name?: string; percent?: number };
type LinhaVenda = RelatorioVendas["vendas"][number];
type FaturacaoTipoItem = FaturacaoPorTipo[string];

const renderPieLabel = (entry: PieLabelPayload) =>
  `${entry.name ?? ""}: ${(((entry.percent ?? 0)) * 100).toFixed(0)}%`;

const formatTooltip = (value: unknown): string => formatarKwanza(Number(value ?? 0));
const formatarQuantidadePie = (value: unknown): string => `${Number(value ?? 0)} documento(s)`;

export function RelatorioVendasComponent({
  colors,
  isLoading,
  relatorioVendas,
  relatorioFaturacao,
}: RelatorioVendasProps) {
  // ✅ KPIs - Usa diretamente os dados do backend
  const kpis = relatorioVendas?.kpis;

  // ✅ Gráfico de distribuição de vendas
  const dadosVendasPie = useMemo(() => {
    if (!relatorioVendas) return [];
    
    // Usar dados do kpis
    const totalVendas = kpis?.total_vendas ?? 0;
    const result = [];
    
    if (totalVendas > 0) {
      result.push({ 
        name: "Total Vendas", 
        value: totalVendas, 
        color: colors.primary 
      });
    }
    
    return result;
  }, [relatorioVendas, kpis, colors]);

  // ✅ Gráfico de distribuição de facturação
  const dadosFaturacaoPie = useMemo(() => {
    if (!relatorioFaturacao) return [];
    
    const dados = [];
    if (relatorioFaturacao.faturacao_paga > 0) {
      dados.push({ 
        name: "Paga", 
        value: relatorioFaturacao.faturacao_paga, 
        color: "#22c55e" 
      });
    }
    if (relatorioFaturacao.faturacao_pendente > 0) {
      dados.push({ 
        name: "Pendente", 
        value: relatorioFaturacao.faturacao_pendente, 
        color: "#f97316" 
      });
    }
    return dados;
  }, [relatorioFaturacao]);

  // ✅ Gráfico de evolução - usa agrupado do backend
  const dadosEvolucao = useMemo(() => {
    // agrupado may not be declared on the typed interface, use a safe runtime check
    const agrupado = (relatorioVendas as any)?.agrupado;
    if (!agrupado) return [];
    return (agrupado as Array<Record<string, any>>).map((item) => ({
      periodo: item.periodo || item.mes || item.chave,
      total: item.total || 0,
    }));
  }, [relatorioVendas]);

  // ✅ Documentos por tipo
  const dadosPorTipo = useMemo(() => {
    const porTipo = relatorioFaturacao?.por_tipo;
    if (!porTipo) return [];

    return Object.entries(porTipo).map(([tipo, item]) => ({
      tipo,
      quantidade: item?.quantidade ?? 0,
      valor: item?.total_liquido ?? 0,
    }));
  }, [relatorioFaturacao]);

  // Formatação inteligente do eixo Y
  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toString();
  };

  // Últimas vendas
  const ultimasVendas = useMemo(() => {
    return (relatorioVendas?.vendas ?? []).slice(0, 15);
  }, [relatorioVendas?.vendas]);

  const border = `1px solid ${colors.border}`;

  if (isLoading) return <CarregandoLinha colors={colors} />;
  if (!relatorioVendas || !relatorioFaturacao) return <Vazio colors={colors} />;

  // ✅ Dados do backend
  const totalVendas = kpis?.total_vendas ?? 0;
  const quantidadeVendas = kpis?.quantidade_vendas ?? 0;
  const ticketMedio = kpis?.ticket_medio ?? 0;
  const clientesPeriodo = kpis?.clientes_periodo ?? 0;
  const produtosVendidos = kpis?.produtos_vendidos ?? 0;
  const vendasPorStatus = kpis?.vendas_por_status ?? { pagas: 0, pendentes: 0, canceladas: 0 };

  return (
    <>
      {/* ✅ KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border rounded-lg overflow-hidden" style={{ borderColor: colors.border }}>
        <KpiCell 
          label="Total Vendas" 
          value={formatarKwanza(totalVendas)}
          sub={`${quantidadeVendas} transações`} 
          color={colors.primary} 
          colors={colors} 
          border={border} 
        />
        <KpiCell 
          label="Ticket Médio" 
          value={formatarKwanza(ticketMedio)}
          sub={`${clientesPeriodo} clientes`} 
          color="#3b82f6" 
          colors={colors} 
          border={border} 
        />
        <KpiCell 
          label="Produtos Vendidos" 
          value={produtosVendidos.toString()}
          sub={`${vendasPorStatus.pagas} pagas`} 
          color={colors.secondary} 
          colors={colors} 
          border={border} 
        />
        <KpiCell 
          label="Status" 
          value={`${vendasPorStatus.pendentes} pendentes`}
          sub={`${vendasPorStatus.canceladas} canceladas`} 
          color="#f97316" 
          colors={colors} 
          border={border} 
          last 
        />
      </div>

      {/* ✅ GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Vendas */}
        <SecaoGrafico titulo="Total de Vendas" colors={colors}>
          {dadosVendasPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie 
                  data={dadosVendasPie} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={85}
                  label={(e: any) => `${e.name}: ${formatarKwanza(e.value)}`} 
                  labelLine
                >
                  {dadosVendasPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip 
                  formatter={(v: any) => formatarKwanza(Number(v))} 
                  contentStyle={tooltipStyle(colors)} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <SemDados colors={colors} />}
        </SecaoGrafico>

        {/* Gráfico de Facturação */}
        <SecaoGrafico titulo="Distribuição de Facturação" colors={colors}>
          {dadosFaturacaoPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie 
                  data={dadosFaturacaoPie} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={85}
                  label={(e: any) => `${e.name}: ${((e.percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {dadosFaturacaoPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip 
                  formatter={(v: any) => formatarKwanza(Number(v))} 
                  contentStyle={tooltipStyle(colors)} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <SemDados colors={colors} />}
        </SecaoGrafico>
      </div>

      {/* ✅ EVOLUÇÃO DE VENDAS */}
      {dadosEvolucao.length > 0 && (
        <SecaoGrafico titulo="Evolução de Vendas" colors={colors}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dadosEvolucao}>
              <defs>
                <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis 
                dataKey="periodo" 
                tick={{ fontSize: 10, fill: colors.textSecondary }} 
              />
              <YAxis 
                tick={{ fontSize: 10, fill: colors.textSecondary }} 
                tickFormatter={formatYAxis} 
              />
              <Tooltip 
                formatter={(v: any) => formatarKwanza(Number(v))} 
                contentStyle={tooltipStyle(colors)} 
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke={colors.primary} 
                fill="url(#gVendas)" 
                strokeWidth={1.5} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </SecaoGrafico>
      )}

      {/* ✅ DOCUMENTOS POR TIPO */}
      {dadosPorTipo.length > 0 && (
        <SecaoGrafico titulo="Documentos por Tipo" colors={colors}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dadosPorTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis 
                dataKey="tipo" 
                tick={{ fontSize: 10, fill: colors.textSecondary }} 
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 10, fill: colors.textSecondary }} 
                tickFormatter={formatYAxis} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 10, fill: colors.textSecondary }} 
                tickFormatter={formatYAxis} 
              />
              <Tooltip contentStyle={tooltipStyle(colors)} />
              <Legend />
              <Bar 
                yAxisId="left" 
                dataKey="quantidade" 
                fill={colors.primary} 
                name="Quantidade" 
                radius={[2, 2, 0, 0]} 
              />
              <Bar 
                yAxisId="right" 
                dataKey="valor" 
                fill={colors.secondary} 
                name="Valor" 
                radius={[2, 2, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </SecaoGrafico>
      )}

      {/* ✅ ÚLTIMAS VENDAS */}
      <SecaoGrafico titulo="Últimas Vendas" colors={colors}>
        <TabelaDados
          headers={["Nº Documento", "Cliente", "Total", "Estado"]}
          rows={ultimasVendas.map((v: any) => [
            v.numero_documento || "-",
            typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
            formatarKwanza(Number(v.total) ?? 0),
            <EstadoBadge key="s" estado={v.estado_pagamento} colors={colors} />,
          ])}
          aligns={["left", "left", "right", "center"]}
          colors={colors}
        />
        {relatorioVendas.vendas.length > 15 && (
          <p className="text-xs text-center mt-2" style={{ color: colors.textSecondary }}>
            Mostrando 15 de {relatorioVendas.vendas.length} vendas
          </p>
        )}
      </SecaoGrafico>
    </>
  );
}
