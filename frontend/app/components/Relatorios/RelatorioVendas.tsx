import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import { RelatorioVendas, RelatorioFaturacao, formatarKwanza } from "@/services/relatorios";
import { KpiCell, SecaoGrafico, TabelaDados, EstadoBadge, CarregandoLinha, Vazio, SemDados, tooltipStyle } from "./RelatorioComuns";

interface RelatorioVendasProps {
  colors: any;
  isLoading: boolean;
  relatorioVendas: RelatorioVendas | null;
  relatorioFaturacao: RelatorioFaturacao | null;
}

export function RelatorioVendasComponent({
  colors,
  isLoading,
  relatorioVendas,
  relatorioFaturacao,
}: RelatorioVendasProps) {
  // Gráfico de distribuição de vendas corrigido: mostra Valor Bruto (Base + IVA) vs Retenções
  const dadosVendasPie = useMemo(() => {
    if (!relatorioVendas?.totais) return [];
    const totalBruto = (relatorioVendas.totais.total_base_tributavel || 0) + (relatorioVendas.totais.total_iva || 0);
    const retencoes = relatorioVendas.totais.total_retencao || 0;
    const result = [];
    if (totalBruto > 0) result.push({ name: "Valor Bruto", value: totalBruto, color: colors.primary });
    if (retencoes > 0) result.push({ name: "Retenções", value: retencoes, color: colors.secondary });
    return result;
  }, [relatorioVendas, colors]);

  const dadosFaturacaoPie = useMemo(() => {
    if (!relatorioFaturacao) return [];
    return [
      { name: "Paga", value: relatorioFaturacao.faturacao_paga || 0, color: "#22c55e" },
      { name: "Pendente", value: relatorioFaturacao.faturacao_pendente || 0, color: "#f97316" },
    ].filter(d => d.value > 0);
  }, [relatorioFaturacao]);

  // Formatação inteligente do eixo Y (evita "0k")
  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toString();
  };

  // Últimas vendas (slice fixo, memoizado para evitar recorte desnecessário)
  const ultimasVendas = useMemo(() => {
    return (relatorioVendas?.vendas ?? []).slice(0, 15);
  }, [relatorioVendas?.vendas]);

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
                  label={(e: any) => `${e.name}: ${((e.percent ?? 0) * 100).toFixed(0)}%`} labelLine>
                  {dadosVendasPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatarKwanza(Number(v))} contentStyle={tooltipStyle(colors)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <SemDados colors={colors} />}
        </SecaoGrafico>

        <SecaoGrafico titulo="Distribuição de Faturação" colors={colors}>
          {dadosFaturacaoPie.length > 0 ? (
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
          rows={ultimasVendas.map((v: any) => [
            typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
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