import React, { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { RelatorioMovimentosStock, LABELS_TIPO_MOVIMENTO, COR_TIPO_MOVIMENTO, TipoMovimento } from "@/services/relatorios";
import { KpiCell, SecaoGrafico, TabelaDados, TipoBadge, MovimentoBadge, CarregandoLinha, Vazio, SemDados, tooltipStyle } from "./RelatorioComuns";
import { ThemeColors } from "@/context/ThemeContext";

interface RelatorioMovimentosStockProps {
  colors: ThemeColors;
  isLoading: boolean;
  relatorioMovimentos: RelatorioMovimentosStock | null;
  onCarregar: (params?: {
    data_inicio?: string;
    data_fim?: string;
    tipo?: "entrada" | "saida";
    tipo_movimento?: TipoMovimento;
    agrupar_por?: "dia" | "mes" | "produto" | "tipo_movimento" | null;
  }) => void;
}

export function RelatorioMovimentosStockComponent({
  colors,
  isLoading,
  relatorioMovimentos,
  onCarregar,
}: RelatorioMovimentosStockProps) {
  const border = `1px solid ${colors.primary}`;
  const [filtroTipoMov, setFiltroTipoMov] = useState<"" | "entrada" | "saida">("");
  const [filtroTipoMovimento, setFiltroTipoMovimento] = useState<"" | TipoMovimento>("");
  const [filtroAgrupamento, setFiltroAgrupamento] = useState<"" | "dia" | "mes" | "produto" | "tipo_movimento">("");

  const dadosMovPorTipo = useMemo(() => {
    if (!relatorioMovimentos?.resumo?.por_tipo_movimento) return [];
    return Object.entries(relatorioMovimentos.resumo.por_tipo_movimento).map(([tipo, d]) => {
      const dado = d as { total?: number; quantidade_total?: number };
      return {
        tipo: LABELS_TIPO_MOVIMENTO[tipo] ?? tipo,
        registos: dado?.total ?? 0,
        quantidade: dado?.quantidade_total ?? 0,
      };
    });
  }, [relatorioMovimentos]);

  const dadosMovAgrupado = useMemo(() => {
    return relatorioMovimentos?.agrupado ?? [];
  }, [relatorioMovimentos]);

  const handleAplicarFiltros = () => {
    onCarregar({
      tipo: filtroTipoMov || undefined,
      tipo_movimento: filtroTipoMovimento || undefined,
      agrupar_por: filtroAgrupamento || null,
    });
  };

  if (isLoading) return <CarregandoLinha colors={colors} />;
  if (!relatorioMovimentos) return <Vazio colors={colors} />;

  return (
    <>
      <div
        className="flex flex-wrap items-end gap-3 p-3 border"
        style={{ borderColor: colors.border, backgroundColor: colors.hover }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
            Tipo
          </label>
          <select
            value={filtroTipoMov}
            onChange={(e) => setFiltroTipoMov(e.target.value as "" | "entrada" | "saida")}
            className="px-2.5 py-1.5 text-xs border outline-none"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text, borderRadius: 3, minWidth: 120 }}
          >
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
            Tipo de Movimento
          </label>
          <select
            value={filtroTipoMovimento}
            onChange={(e) => setFiltroTipoMovimento(e.target.value as "" | TipoMovimento)}
            className="px-2.5 py-1.5 text-xs border outline-none"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text, borderRadius: 3, minWidth: 160 }}
          >
            <option value="">Todos</option>
            {Object.entries(LABELS_TIPO_MOVIMENTO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
            Agrupar por
          </label>
          <select
            value={filtroAgrupamento}
            onChange={(e) => setFiltroAgrupamento(e.target.value as "" | "dia" | "mes" | "produto" | "tipo_movimento")}
            className="px-2.5 py-1.5 text-xs border outline-none"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text, borderRadius: 3, minWidth: 140 }}
          >
            <option value="">Sem agrupamento</option>
            <option value="dia">Por dia</option>
            <option value="mes">Por mês</option>
            <option value="produto">Por produto</option>
            <option value="tipo_movimento">Por tipo de movimento</option>
          </select>
        </div>

        <button
          onClick={handleAplicarFiltros}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-all"
          style={{ backgroundColor: colors.primary, borderRadius: 3 }}
        >
          {isLoading
            ? <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : <RefreshCw size={11} />}
          Aplicar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border" style={{ borderColor: colors.border }}>
        <KpiCell
          label="Total Movimentos"
          value={String(relatorioMovimentos.resumo?.total_movimentos ?? 0)}
          color={colors.primary} colors={colors} border={border}
        />
        <KpiCell
          label="Total Entradas"
          value={String(relatorioMovimentos.resumo?.total_entradas ?? 0)}
          sub="unidades"
          color="#22c55e" colors={colors} border={border}
        />
        <KpiCell
          label="Total Saídas"
          value={String(relatorioMovimentos.resumo?.total_saidas ?? 0)}
          sub="unidades"
          color="#ef4444" colors={colors} border={border}
        />
        <KpiCell
          label="Balanço"
          value={String(relatorioMovimentos.resumo?.balanco ?? 0)}
          sub="unidades"
          color={colors.secondary} colors={colors} border={border} last
        />
      </div>

      {dadosMovPorTipo.length > 0 && (
        <SecaoGrafico titulo="Movimentos por Tipo" colors={colors}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dadosMovPorTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <Tooltip contentStyle={tooltipStyle(colors)} />
              <Legend />
              <Bar yAxisId="left" dataKey="registos" fill={colors.primary} name="Nº Registos" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="right" dataKey="quantidade" fill={colors.secondary} name="Quantidade" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SecaoGrafico>
      )}

      {dadosMovAgrupado.length > 0 && (
        <SecaoGrafico titulo="Evolução — Entradas vs Saídas" colors={colors}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dadosMovAgrupado}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <YAxis tick={{ fontSize: 10, fill: colors.textSecondary }} />
              <Tooltip contentStyle={tooltipStyle(colors)} />
              <Legend />
              <Bar dataKey="entradas" fill="#22c55e" name="Entradas" radius={[2, 2, 0, 0]} />
              <Bar dataKey="saidas" fill="#ef4444" name="Saídas" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SecaoGrafico>
      )}

      <SecaoGrafico titulo="Detalhe de Movimentos" colors={colors}>
        {(relatorioMovimentos.movimentos?.length ?? 0) > 0 ? (
          <TabelaDados
            headers={["Produto", "Tipo", "Movimento", "Qtd", "Ant.", "Novo", "Utilizador", "Data"]}
            rows={(relatorioMovimentos.movimentos ?? []).slice(0, 50).map((m) => [
              <span key="p" className="font-medium">{m.produto_nome}</span>,
              <TipoBadge key="t" tipo={m.tipo} />,
              <MovimentoBadge 
                key="mv" 
                tipoMovimento={m.tipo_movimento}
                label={LABELS_TIPO_MOVIMENTO[m.tipo_movimento]}
                cor={COR_TIPO_MOVIMENTO[m.tipo_movimento]}
              />,
              <span key="q" className="font-mono font-semibold">{m.quantidade}</span>,
              <span key="a" className="font-mono text-xs" style={{ color: colors.textSecondary }}>{m.estoque_anterior}</span>,
              <span key="n" className="font-mono text-xs font-semibold">{m.estoque_novo}</span>,
              <span key="u" className="text-xs" style={{ color: colors.textSecondary }}>{m.user}</span>,
              <span key="d" className="text-xs font-mono" style={{ color: colors.textSecondary }}>
                {m.data ? m.data.substring(0, 16) : "-"}
              </span>,
            ])}
            aligns={["left", "center", "center", "center", "center", "center", "left", "left"]}
            colors={colors}
          />
        ) : <SemDados colors={colors} message="Nenhum movimento encontrado no período" />}
      </SecaoGrafico>
    </>
  );
}
