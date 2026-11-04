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
  PieChart,
  Pie,
  Cell,
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
import {
  agruparEstadosDocumentos,
  agruparImpactoFinanceiro,
  agruparPorFuncao,
  resumirDocumentos,
} from "@/services/documentGroups";


interface Colors {
  primary: string;
  secondary: string;
  border: string;
  textSecondary: string;
  [key: string]: string;
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

  const resumoTipos = useMemo(
    () => resumirDocumentos(relatorioDocumentos?.documentos ?? []),
    [relatorioDocumentos?.documentos]
  );
  const documentosPorFuncao = useMemo(() => agruparPorFuncao(resumoTipos), [resumoTipos]);
  const impactoFinanceiro = useMemo(() => agruparImpactoFinanceiro(resumoTipos), [resumoTipos]);
  const documentosPorEstado = useMemo(
    () => agruparEstadosDocumentos(relatorioDocumentos?.documentos ?? []),
    [relatorioDocumentos?.documentos]
  );

  // Proformas
  const ultimasProformas = useMemo<ProformaItem[]>(() => {
    return (relatorioProformas?.proformas ?? []).slice(0, 20);
  }, [relatorioProformas?.proformas]);

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

      <SecaoGrafico titulo="Volume de Documentos Emitidos" colors={colors}>
        {documentosPorFuncao.some((item) => item.quantidade > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={documentosPorFuncao}
                dataKey="quantidade"
                nameKey="grupo"
                cx="50%"
                cy="46%"
                innerRadius={0}
                outerRadius="62%"
                paddingAngle={3}
                label={({ x, y, percent }) => percent ? (
                  <text x={x} y={y} fill={colors.text} fontSize={12} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                    {(percent * 100).toFixed(0)}%
                  </text>
                ) : null}
                labelLine={false}
              >
                {documentosPorFuncao.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value ?? 0)} documentos`, "Quantidade"]} contentStyle={tooltipStyle(colors)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <SemDados colors={colors} />}
      </SecaoGrafico>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SecaoGrafico titulo="Balanço Financeiro (Kz)" colors={colors}>
          {impactoFinanceiro.some((item) => item.valor > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={impactoFinanceiro} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="grupo" interval={0} angle={-15} textAnchor="end" height={55} tick={{ fontSize: 10, fill: colors.textSecondary }} />
                <YAxis tick={{ fontSize: 10, fill: colors.textSecondary }} />
                <Tooltip formatter={(value) => [formatarKwanza(Number(value ?? 0)), "Valor"]} contentStyle={tooltipStyle(colors)} />
                <Bar dataKey="valor" name="Valor" radius={0} stroke="none">
                  {impactoFinanceiro.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <SemDados colors={colors} />}
        </SecaoGrafico>

        <SecaoGrafico titulo="Estado dos Documentos" colors={colors}>
          {documentosPorEstado.some((item) => item.quantidade > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={documentosPorEstado}
                  dataKey="quantidade"
                  nameKey="grupo"
                  cx="50%"
                  cy="46%"
                  innerRadius={0}
                  outerRadius="62%"
                  paddingAngle={4}
                  label={({ x, y, percent }) => percent ? (
                    <text x={x} y={y} fill={colors.text} fontSize={12} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                      {(percent * 100).toFixed(0)}%
                    </text>
                  ) : null}
                  labelLine={false}
                >
                  {documentosPorEstado.map((item) => <Cell key={item.grupo} fill={item.cor} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${Number(value ?? 0)} documentos`, "Quantidade"]} contentStyle={tooltipStyle(colors)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <SemDados colors={colors} />}
        </SecaoGrafico>
      </div>

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