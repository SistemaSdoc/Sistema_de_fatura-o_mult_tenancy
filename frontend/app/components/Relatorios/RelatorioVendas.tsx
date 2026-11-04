import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { RelatorioVendas, RelatorioFaturacao, formatarKwanza } from "@/services/relatorios";
import { KpiCell, SecaoGrafico, TabelaDados, EstadoBadge, CarregandoLinha, Vazio, SemDados, tooltipStyle } from "./RelatorioComuns";
import { ThemeColors } from "@/context/ThemeContext";
import { agruparEstadosPorTipo, agruparImpactoFinanceiro, agruparPorFuncao, type TipoDocumentoResumo } from "@/services/documentGroups";

interface RelatorioVendasProps {
  colors: ThemeColors;
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
  // KPIs - Usa diretamente os dados do backend
  const kpis = relatorioVendas?.kpis;

  const resumosPorTipo = useMemo<Record<string, TipoDocumentoResumo>>(() => {
    const porTipo = relatorioFaturacao?.por_tipo ?? {};
    return Object.fromEntries(Object.entries(porTipo).map(([tipo, dados]) => [tipo, {
      quantidade_emitida: dados.quantidade_emitida ?? dados.quantidade,
      valor_emitido: dados.valor_emitido ?? dados.total_liquido,
      valor_pendente: dados.valor_pendente ?? 0,
    }]));
  }, [relatorioFaturacao?.por_tipo]);
  const documentosPorFuncao = useMemo(() => agruparPorFuncao(resumosPorTipo), [resumosPorTipo]);
  const impactoFinanceiro = useMemo(() => agruparImpactoFinanceiro(resumosPorTipo), [resumosPorTipo]);
  const documentosPorEstado = useMemo(() => {
    const porTipoEstado = relatorioFaturacao?.por_tipo_estado ?? {};
    return agruparEstadosPorTipo(Object.entries(porTipoEstado).flatMap(([tipo, estados]) =>
      Object.entries(estados).map(([estado, quantidade]) => ({ tipo, estado, quantidade }))
    ));
  }, [relatorioFaturacao?.por_tipo_estado]);

  // Últimas vendas
  const ultimasVendas = useMemo(() => {
    return (relatorioVendas?.vendas ?? []).slice(0, 15);
  }, [relatorioVendas?.vendas]);

  const border = `1px solid ${colors.border}`;

  if (isLoading) return <CarregandoLinha colors={colors} />;
  if (!relatorioVendas || !relatorioFaturacao) return <Vazio colors={colors} />;

  // Dados do backend
  const totalVendas = kpis?.total_vendas ?? 0;
  const quantidadeVendas = kpis?.quantidade_vendas ?? 0;
  const ticketMedio = kpis?.ticket_medio ?? 0;
  const clientesPeriodo = kpis?.clientes_periodo ?? 0;
  const produtosVendidos = kpis?.produtos_vendidos ?? 0;
  const vendasPorStatus = kpis?.vendas_por_status ?? { pagas: 0, pendentes: 0, canceladas: 0 };

  return (
    <>
      {/* KPIS */}
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
          color={colors.secondary} 
          colors={colors} 
          border={border} 
        />
        <KpiCell 
          label="Produtos Vendidos" 
          value={produtosVendidos.toString()}
          sub={`${vendasPorStatus.pagas} pagas`} 
          color={colors.primary} 
          colors={colors} 
          border={border} 
        />
        <KpiCell 
          label="Status" 
          value={`${vendasPorStatus.pendentes} pendentes`}
          sub={`${vendasPorStatus.canceladas} canceladas`} 
          color={colors.secondary} 
          colors={colors} 
          border={border} 
          last 
        />
      </div>

      <SecaoGrafico titulo="Volume de Documentos Emitidos" colors={colors}>
        {documentosPorFuncao.some((item) => item.quantidade > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={documentosPorFuncao} dataKey="quantidade" nameKey="grupo" cx="50%" cy="50%" innerRadius="38%" outerRadius="70%" paddingAngle={3}>
                {documentosPorFuncao.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value ?? 0)} documentos`, "Quantidade"]} contentStyle={tooltipStyle(colors)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <SemDados colors={colors} />}
      </SecaoGrafico>

      <SecaoGrafico titulo="Balanço Financeiro (Kz)" colors={colors}>
        {impactoFinanceiro.some((item) => item.valor > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={impactoFinanceiro} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="grupo" interval={0} angle={-15} textAnchor="end" height={55} tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <YAxis tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <Tooltip formatter={(value) => [formatarKwanza(Number(value ?? 0)), "Valor"]} contentStyle={tooltipStyle(colors)} />
              <Bar dataKey="valor" name="Valor" radius={[3, 3, 0, 0]}>
                {impactoFinanceiro.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <SemDados colors={colors} />}
      </SecaoGrafico>

      <SecaoGrafico titulo="Estado dos Documentos" colors={colors}>
        {documentosPorEstado.some((item) => item.quantidade > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={documentosPorEstado} dataKey="quantidade" nameKey="grupo" cx="50%" cy="50%" innerRadius="38%" outerRadius="70%" paddingAngle={4}>
                {documentosPorEstado.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value ?? 0)} documentos`, "Quantidade"]} contentStyle={tooltipStyle(colors)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <SemDados colors={colors} />}
      </SecaoGrafico>

      {/* ÚLTIMAS VENDAS */}
      <SecaoGrafico titulo="Últimas Vendas" colors={colors}>
        <TabelaDados
          headers={["Nº Documento", "Cliente", "Total", "Estado"]}
          rows={ultimasVendas.map((v) => [
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
