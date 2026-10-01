"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import {
  pagamentoService,
  Pagamento,
  EstadoPagamento,
  formatMetodoPagamento,
  formatEstadoPagamento,
} from "@/services/pagamentosplanos";
import { useThemeColors, ThemeColors } from "@/context/ThemeContext";
import MainLandlord from "@/app/components/MainLandlord";

type PagamentoHistorico = Pagamento & {
  empresa?: { nome: string };
  plano?: { nome: string };
};

const STATUS_TABS: { label: string; value: EstadoPagamento | "" }[] = [
  { label: "Todos", value: "" },
  { label: "Em análise", value: "em_analise" },
  { label: "Pagos", value: "pago" },
  { label: "Rejeitados", value: "rejeitado" },
];

function corStatus(status: EstadoPagamento, colors: ThemeColors): React.CSSProperties {
  switch (status) {
    case "pago":
      return {
        color: colors.success,
        backgroundColor: `${colors.success}20`,
      };
    case "rejeitado":
      return {
        color: colors.danger,
        backgroundColor: `${colors.danger}20`,
      };
    case "em_analise":
      return {
        color: colors.warning,
        backgroundColor: `${colors.warning}20`,
      };
    default: // 
      return {
        color: colors.textSecondary,
        backgroundColor: `${colors.textSecondary}20`,
      };
  }
}

export default function HistoricoPagamentosPage() {
  const router = useRouter();
  const [pagamentos, setPagamentos] = useState<PagamentoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<EstadoPagamento | "">("");
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const colors = useThemeColors();

  const carregar = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const response = await pagamentoService.listar(
          statusFiltro ? { status: statusFiltro } : undefined
        );
        setPagamentos(response.pagamentos as PagamentoHistorico[]);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFiltro]
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pagamentosFiltrados = pagamentos.filter((p) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      p.empresa?.nome?.toLowerCase().includes(termo) ||
      p.empresa_id.toLowerCase().includes(termo) ||
      p.referencia?.toLowerCase().includes(termo)
    );
  });

  const totalPago = pagamentos
    .filter((p) => p.status === "pago")
    .reduce((soma, p) => soma + Number(p.valor), 0);

  const toggleExpandido = (id: string) =>
    setExpandido((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <MainLandlord>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-4 p-4">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.secondary }}>
                Histórico de Pagamentos
              </h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Total confirmado:{" "}
                {totalPago.toLocaleString("pt-AO", {
                  style: "currency",
                  currency: "AOA",
                })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => carregar(true)}
              disabled={refreshing}
              style={{ borderColor: colors.border, color: colors.text }}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map((tab) => {
              const ativo = statusFiltro === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFiltro(tab.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={
                    ativo
                      ? {
                          backgroundColor: colors.primary,
                          color: "#FFFFFF",
                          borderColor: colors.primary,
                        }
                      : {
                          backgroundColor: "transparent",
                          color: colors.textSecondary,
                          borderColor: colors.border,
                        }
                  }>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por empresa ou referência..."
              className="w-full pl-9 pr-3 py-2 text-sm border outline-none rounded"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>

          {/* Lista */}
          {pagamentosFiltrados.length === 0 ? (
            <p className="text-center py-12" style={{ color: colors.textSecondary }}>
              Nenhum pagamento encontrado
              {statusFiltro ? ` com estado "${formatEstadoPagamento(statusFiltro)}"` : ""}.
            </p>
          ) : (
            <div className="space-y-3">
              {pagamentosFiltrados.map((p) => {
                const isExpanded = expandido[p.id] ?? false;

                return (
                  <Card
                    key={p.id}
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex justify-between flex-wrap gap-2">
                        <span style={{ color: colors.text }}>
                          {p.empresa?.nome || p.empresa_id}
                        </span>
                        <span className="font-bold" style={{ color: colors.secondary }}>
                          {Number(p.valor).toLocaleString("pt-AO", {
                            style: "currency",
                            currency: "AOA",
                          })}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm space-y-0.5">
                          <p style={{ color: colors.textSecondary }}>
                            Plano: {p.plano?.nome || p.plano_id}
                          </p>
                          <p style={{ color: colors.textSecondary }}>
                            Método: {formatMetodoPagamento(p.metodo_pagamento)}
                          </p>
                          <p style={{ color: colors.textSecondary }}>
                            {p.status === "pago" && p.data_pagamento
                              ? `Pago em: ${new Date(p.data_pagamento).toLocaleString("pt-PT")}`
                              : `Enviado em: ${new Date(p.created_at).toLocaleString("pt-PT")}`}
                          </p>
                          {p.status === "rejeitado" && p.motivo_rejeicao && (
                            <p style={{ color: colors.danger }}>
                              Motivo: {p.motivo_rejeicao}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-full"
                            style={corStatus(p.status, colors)}>
                            {formatEstadoPagamento(p.status)}
                          </span>

                          {p.historico_status && p.historico_status.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandido(p.id)}
                              style={{ color: colors.textSecondary }}>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                              <span className="ml-1 text-xs">
                                {isExpanded ? "Ocultar" : "Histórico"}
                              </span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/landlord/pagamentos/${p.id}`)}
                            style={{ borderColor: colors.border, color: colors.text }}>
                            <Eye className="w-4 h-4 mr-1.5" />
                            Detalhes
                          </Button>
                        </div>
                      </div>

                      {/* Histórico expandido */}
                      {isExpanded && p.historico_status && (
                        <div
                          className="mt-4 pt-4 space-y-2 border-t"
                          style={{ borderColor: colors.border }}>
                          <p
                            className="text-xs font-semibold uppercase"
                            style={{ color: colors.textSecondary }}>
                            Histórico de estados
                          </p>
                          <div className="space-y-2">
                            {p.historico_status.map((h, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 text-xs">
                                <span
                                  className="font-mono whitespace-nowrap pt-0.5"
                                  style={{ color: colors.textSecondary }}>
                                  {new Date(h.data).toLocaleString("pt-PT")}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                                  style={corStatus(h.status, colors)}>
                                  {formatEstadoPagamento(h.status)}
                                </span>
                                <span className="flex-1" style={{ color: colors.text }}>
                                  {h.motivo || "—"}
                                </span>
                                {h.por && (
                                  <span
                                    className="whitespace-nowrap"
                                    style={{ color: colors.textSecondary }}>
                                    por {h.por}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </MainLandlord>
  );
}