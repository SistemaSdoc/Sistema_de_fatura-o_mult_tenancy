import React from "react";
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
  // Gráfico de distribuição de vendas corrigido: mostra Valor Bruto (Base + IVA) vs Retenções
  const dadosVendasPie: PieItem[] = !relatorioVendas?.totais
    ? []
    : [
        {
          name: "Valor Bruto",
          value: (relatorioVendas.totais.total_base_tributavel || 0) + (relatorioVendas.totais.total_iva || 0),
          total: (relatorioVendas.totais.total_base_tributavel || 0) + (relatorioVendas.totais.total_iva || 0),
          color: colors.primary,
        },
        {
          name: "Retenções",
          value: relatorioVendas.totais.total_retencao || 0,
          total: relatorioVendas.totais.total_retencao || 0,
          color: colors.secondary,
        },
      ].filter((d) => d.value > 0);

  const dadosFaturacaoECorrecaoPie: PieItem[] = !relatorioFaturacao
    ? []
    : [
        {
          name: "Factura",
          value: relatorioFaturacao.por_tipo?.FT?.quantidade || 0,
          total: relatorioFaturacao.por_tipo?.FT?.total_liquido || 0,
          color: colors.primary,
        },
        {
          name: "Factura-Recibo",
          value: relatorioFaturacao.por_tipo?.FR?.quantidade || 0,
          total: relatorioFaturacao.por_tipo?.FR?.total_liquido || 0,
          color: colors.secondary,
        },
        {
          name: "Nota de Crédito",
          value: relatorioFaturacao.por_tipo_correcao?.NC?.quantidade || 0,
          total: relatorioFaturacao.por_tipo_correcao?.NC?.total_liquido || 0,
          color: colors.danger,
        },
        {
          name: "Nota de Débito",
          value: relatorioFaturacao.por_tipo_correcao?.ND?.quantidade || 0,
          total: relatorioFaturacao.por_tipo_correcao?.ND?.total_liquido || 0,
          color: colors.warning,
        },
        {
          name: "Retificação",
          value: relatorioFaturacao.por_tipo_correcao?.FRt?.quantidade || 0,
          total: relatorioFaturacao.por_tipo_correcao?.FRt?.total_liquido || 0,
          color: colors.success,
        },
      ].filter((d) => d.value > 0);

  // Formatação inteligente do eixo Y (evita "0k")
  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toString();
  };

  // Últimas vendas (slice fixo, memoizado para evitar recorte desnecessário)
  const ultimasVendas: LinhaVenda[] = (relatorioVendas?.vendas ?? []).slice(0, 15);

  const border = `1px solid ${colors.primary}`;

  if (isLoading) return <CarregandoLinha colors={colors} />;
  if (!relatorioVendas || !relatorioFaturacao) return <Vazio colors={colors} />;

  return (
    <>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SecaoGrafico titulo="Distribuição de Vendas (Bruto vs Retenções)" colors={colors}>
          {dadosVendasPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={dadosVendasPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                  label={renderPieLabel} labelLine>
                  {dadosVendasPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    formatarQuantidadePie(value),
                    `${String(name)} • ${formatarKwanza((props?.payload as PieItem | undefined)?.total ?? 0)}`,
                  ]}
                  contentStyle={tooltipStyle(colors)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <SemDados colors={colors} />}
        </SecaoGrafico>

        <SecaoGrafico titulo="Distribuição de Facturação e Correções" colors={colors}>
          {dadosFaturacaoECorrecaoPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dadosFaturacaoECorrecaoPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  label={renderPieLabel}>
                  {dadosFaturacaoECorrecaoPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    formatarQuantidadePie(value),
                    `${String(name)} • ${formatarKwanza((props?.payload as PieItem | undefined)?.total ?? 0)}`,
                  ]}
                  contentStyle={tooltipStyle(colors)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <SemDados colors={colors} />}
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
              <YAxis tick={{ fontSize: 10, fill: colors.textSecondary }} tickFormatter={formatYAxis} />
              <Tooltip formatter={formatTooltip} contentStyle={tooltipStyle(colors)} />
              <Area type="monotone" dataKey="total" stroke={colors.primary} fill="url(#gVendas)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </SecaoGrafico>
      )}

      {Object.keys(relatorioFaturacao.por_tipo ?? {}).length > 0 && (
        <SecaoGrafico titulo="Documentos por Tipo" colors={colors}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={Object.entries(relatorioFaturacao.por_tipo ?? {}).map(([tipo, d]) => {
              const item = d as FaturacaoTipoItem;
              return { tipo, quantidade: item?.quantidade ?? 0, valor: item?.total_liquido ?? 0 };
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: colors.textSecondary }} tickFormatter={formatYAxis} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: colors.textSecondary }} tickFormatter={formatYAxis} />
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
          rows={ultimasVendas.map((v) => [
            v.cliente,
            formatarKwanza(Number(v.total) ?? 0),
            <EstadoBadge key="s" estado={v.estado_pagamento} colors={colors} />,
          ])}
          aligns={["left", "right", "center"]}
          colors={colors}
        />
      </SecaoGrafico>
    </>
  );
}
