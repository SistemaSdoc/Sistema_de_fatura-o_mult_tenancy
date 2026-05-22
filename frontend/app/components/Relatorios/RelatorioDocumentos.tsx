import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { RelatorioDocumentosFiscais, RelatorioProformas, formatarKwanza, formatarData } from "@/services/relatorios";
import { KpiCell, SecaoGrafico, TabelaDados, EstadoBadge, CarregandoLinha, Vazio, SemDados, tooltipStyle } from "./RelatorioComuns";

interface RelatorioDocumentosProps {
  colors: any;
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

  if (isLoading) return <CarregandoLinha colors={colors} />;
  if (!relatorioDocumentos || !relatorioProformas) return <Vazio colors={colors} />;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border" style={{ borderColor: colors.border }}>
        <KpiCell label="Total Documentos" value={String(relatorioDocumentos.estatisticas?.total_documentos ?? 0)}
          color={colors.primary} colors={colors} border={border} />
        <KpiCell label="Valor Total" value={formatarKwanza(relatorioDocumentos.estatisticas?.total_valor ?? 0)}
          color={colors.secondary} colors={colors} border={border} />
        <KpiCell label="Total Proformas" value={String(relatorioProformas.total ?? 0)}
          color={colors.primary} colors={colors} border={border} />
        <KpiCell label="Valor Proformas" value={formatarKwanza(relatorioProformas.valor_total ?? 0)}
          color={colors.secondary} colors={colors} border={border} last />
      </div>

      {Object.keys(relatorioDocumentos.estatisticas?.por_tipo ?? {}).length > 0 && (
        <SecaoGrafico titulo="Documentos por Tipo" colors={colors}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={Object.entries(relatorioDocumentos.estatisticas?.por_tipo ?? {}).map(([tipo, d]: any) => ({ tipo, quantidade: d?.quantidade ?? 0, valor: d?.valor ?? 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: colors.textSecondary }} tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any, n: any) => [formatarKwanza(Number(v)), String(n ?? "")]} contentStyle={tooltipStyle(colors)} />
              <Legend />
              <Bar yAxisId="left" dataKey="quantidade" fill={colors.primary} name="Quantidade" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="right" dataKey="valor" fill={colors.secondary} name="Valor" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SecaoGrafico>
      )}

      <SecaoGrafico titulo="Lista de Proformas" colors={colors}>
        {(relatorioProformas.proformas?.length ?? 0) > 0 ? (
          <TabelaDados
            headers={["Nº Documento", "Cliente", "Data", "Valor", "Estado"]}
            rows={(relatorioProformas.proformas ?? []).slice(0, 20).map((p: any) => [
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
      </SecaoGrafico>
    </>
  );
}