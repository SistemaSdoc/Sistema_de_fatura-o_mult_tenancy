import React from "react";
import { RelatorioPagamentosPendentes, formatarKwanza } from "@/services/relatorios";
import { KpiCell, SecaoGrafico, TabelaDados, EstadoBadge, CarregandoLinha, Vazio } from "./RelatorioComuns";

interface RelatorioPagamentosProps {
  colors: any;
  isLoading: boolean;
  relatorioPagamentos: RelatorioPagamentosPendentes | null;
}

export function RelatorioPagamentosComponent({
  colors,
  isLoading,
  relatorioPagamentos,
}: RelatorioPagamentosProps) {
  const border = `1px solid ${colors.primary}`;

  if (isLoading) return <CarregandoLinha colors={colors} />;
  if (!relatorioPagamentos) return <Vazio colors={colors} />;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border" style={{ borderColor: colors.border }}>
        <KpiCell label="Total Pendente" value={formatarKwanza(relatorioPagamentos.resumo?.total_pendente ?? 0)}
          color={colors.primary} colors={colors} border={border} alerta={(relatorioPagamentos.resumo?.total_pendente ?? 0) > 0} />
        <KpiCell label="Total em Atraso" value={formatarKwanza(relatorioPagamentos.resumo?.total_atrasado ?? 0)}
          color={colors.secondary} colors={colors} border={border} alerta={(relatorioPagamentos.resumo?.total_atrasado ?? 0) > 0} />
        <KpiCell label="Facturas Pendentes" value={String(relatorioPagamentos.resumo?.quantidade_faturas ?? 0)}
          color={colors.primary} colors={colors} border={border} />
        <KpiCell label="Retenção Pendente" value={formatarKwanza(relatorioPagamentos.resumo?.retencao_pendente ?? 0)}
          color={colors.secondary} colors={colors} border={border} last />
      </div>

      <SecaoGrafico titulo="Facturas Pendentes" colors={colors}>
        {(relatorioPagamentos.faturas_pendentes?.length ?? 0) > 0 ? (
          <TabelaDados
            headers={["Documento", "Cliente", "Valor Pendente", "Situação"]}
            rows={(relatorioPagamentos.faturas_pendentes ?? []).slice(0, 20).map((f: any) => [
              <span key="d" className="font-mono text-xs">{f.numero_documento}</span>,
              typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
              formatarKwanza(Number(f.valor_pendente) ?? 0),
              <EstadoBadge key="s"
                estado={(f.dias_atraso ?? 0) > 0 ? "atrasado" : "em_dia"}
                label={(f.dias_atraso ?? 0) > 0 ? `${f.dias_atraso} dias` : "Em dia"}
                colors={colors} />,
            ])}
            aligns={["left", "left", "right", "center"]}
            colors={colors}
          />
        ) : (
          <div className="py-10 text-center text-sm" style={{ color: colors.textSecondary }}>
            Nenhuma factura pendente
          </div>
        )}
      </SecaoGrafico>
    </>
  );
}