import React, { useMemo } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  RelatorioDocumentosFiscais,
  RelatorioProformas,
  formatarKwanza,
  formatarData,
} from "@/services/relatorios";

import {
  KpiCell,
  SecaoGrafico,
  TabelaDados,
  EstadoBadge,
  CarregandoLinha,
  Vazio,
  SemDados,
  tooltipStyle,
} from "./RelatorioComuns";

import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

interface Colors {
  primary: string;
  secondary: string;
  border: string;
  textSecondary: string;
  [key: string]: string;
}

interface DadosPorTipoItem {
  tipo: string;
  quantidade: number;
  valor: number;
}

interface ProformaItem {
  numero_documento: string;
  cliente: string | { nome?: string } | null;
  data_emissao: string;
  total_liquido: number;
  estado: string;
}

interface RelatorioDocumentosProps {
  colors: Colors;
  isLoading: boolean;
  relatorioDocumentos: RelatorioDocumentosFiscais | null;
  relatorioProformas: RelatorioProformas | null;
}

export function RelatorioDocumentosComponent({
  colors,
  isLoading,
  relatorioDocumentos,
  relatorioProformas,
}: RelatorioDocumentosProps) {
  const border = `1px solid ${colors.primary}`;

  // Formatação eixo Y
  const formatYAxis = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toString();
  };

  // Dados por tipo
  const dadosPorTipo = useMemo<DadosPorTipoItem[]>(() => {
    const porTipo = relatorioDocumentos?.estatisticas?.por_tipo;
    if (!porTipo) return [];

    return Object.entries(porTipo).map(([tipo, dados]) => ({
      tipo,
      quantidade: dados?.quantidade ?? 0,
      valor: dados?.valor ?? 0,
    }));
  }, [relatorioDocumentos?.estatisticas?.por_tipo]);

  // Proformas
  const ultimasProformas = useMemo<ProformaItem[]>(() => {
    return (relatorioProformas?.proformas ?? []).slice(0, 20);
  }, [relatorioProformas?.proformas]);

  // ✅ TOOLTIP CORRIGIDO (SEM ERRO TYPESCRIPT)
  const tooltipFormatter = (value: ValueType, name: NameType) => {
    return [`${value ?? 0}`, `${name}`];
  };

  if (isLoading) return <CarregandoLinha colors={colors} />;
  if (!relatorioDocumentos || !relatorioProformas) return <Vazio colors={colors} />;

  return (
    <>
      {/* KPIs */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-0 border"
        style={{ borderColor: colors.border }}
      >
        <KpiCell
          label="Total Documentos"
          value={String(relatorioDocumentos.estatisticas?.total_documentos ?? 0)}
          color={colors.primary}
          colors={colors}
          border={border}
        />

        <KpiCell
          label="Valor Total"
          value={formatarKwanza(relatorioDocumentos.estatisticas?.total_valor ?? 0)}
          color={colors.secondary}
          colors={colors}
          border={border}
        />

        <KpiCell
          label="Total Proformas"
          value={String(relatorioProformas.total ?? 0)}
          color={colors.primary}
          colors={colors}
          border={border}
        />

        <KpiCell
          label="Valor Proformas"
          value={formatarKwanza(relatorioProformas.valor_total ?? 0)}
          color={colors.secondary}
          colors={colors}
          border={border}
          last
        />
      </div>

      {/* GRÁFICO */}
      {dadosPorTipo.length > 0 && (
        <SecaoGrafico titulo="Documentos por Tipo" colors={colors}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dadosPorTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />

              <XAxis
                dataKey="tipo"
                tick={{ fontSize: 10, fill: colors.textSecondary }}
              />

              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: colors.textSecondary }}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: colors.textSecondary }}
                tickFormatter={formatYAxis}
              />

 <Tooltip
  formatter={(value, name) => {
    return [`${value ?? 0}`, `${name}`];
  }}
  contentStyle={tooltipStyle(colors)}
/>

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

      {/* TABELA */}
      <SecaoGrafico titulo="Lista de Proformas" colors={colors}>
        {ultimasProformas.length > 0 ? (
          <TabelaDados
            headers={["Nº Documento", "Cliente", "Data", "Valor", "Estado"]}
            rows={ultimasProformas.map((proforma) => [
              <span key="num" className="font-mono text-xs">
                {proforma.numero_documento}
              </span>,

              typeof proforma.cliente === "string"
                ? proforma.cliente
                : proforma.cliente?.nome ?? "-",

              formatarData(proforma.data_emissao),

              formatarKwanza(proforma.total_liquido),

              <EstadoBadge key="estado" estado={proforma.estado} colors={colors} />,
            ])}
            aligns={["left", "left", "left", "right", "center"]}
            colors={colors}
          />
        ) : (
          <SemDados colors={colors} message="Nenhuma proforma encontrada" />
        )}
      </SecaoGrafico>
    </>
  );
}