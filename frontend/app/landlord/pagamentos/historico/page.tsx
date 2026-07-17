"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { pagamentoService, Pagamento, EstadoPagamento, formatMetodoPagamento, formatEstadoPagamento } from "@/services/pagamentosplanos";
import { useThemeColors, ThemeColors } from "@/context/ThemeContext";
import MainLandlord from "@/app/components/MainLandlord"; // ajuste o caminho se necessário

type PagamentoHistorico = Pagamento & {
  empresa?: { nome: string };
  plano?: { nome: string };
};

const STATUS_TABS: { label: string; value: EstadoPagamento | "" }[] = [
  { label: "Todos", value: "" },
  { label: "Pagos", value: "pago" },
  { label: "Rejeitados", value: "rejeitado" },
  { label: "Pendentes", value: "pendente" },
];

function corStatus(status: EstadoPagamento, colors: ThemeColors): React.CSSProperties {
  switch (status) {
    case "pago":
      return {
        color: colors.secondary,
        backgroundColor: `${colors.secondary}20`, // 20 = ~12% opacidade em hex
      };
    case "rejeitado":
      return {
        color: colors.primary,
        backgroundColor: `${colors.primary}20`,
      };
    case "em_analise":
      return {
        color: colors.blue,
        backgroundColor: `${colors.blue}20`,
      };
    default:
      return {
        color: colors.warning,
        backgroundColor: `${colors.warning}20`,
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
  const colors = useThemeColors();

  const carregar = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const response = await pagamentoService.listar(statusFiltro ? { status: statusFiltro } : undefined);
        setPagamentos(response.pagamentos as PagamentoHistorico[]);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        toast.error("Erro ao carregar histórico de pagamentos");
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

  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((soma, p) => soma + Number(p.valor), 0);

  return (
    <MainLandlord>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.secondary }}>
                Histórico de Pagamentos
              </h1>
              <p className="text-sm text-muted-foreground" style={{ color: colors.textSecondary }}>
                Total confirmado: {totalPago.toLocaleString("pt-AO", { style: "currency", currency: "AOA" })}
              </p>
            </div>
            <Button variant="outline" onClick={() => carregar(true)} disabled={refreshing} style={{ color: colors.blue }}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

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

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por empresa ou referência..."
              className="w-full pl-9 pr-3 py-2 text-sm border bg-background outline-none"
            />
          </div>

          {pagamentosFiltrados.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              Nenhum pagamento encontrado{statusFiltro ? ` com status "${formatEstadoPagamento(statusFiltro)}"` : ""}.
            </p>
          ) : (
            <div className="space-y-3">
              {pagamentosFiltrados.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between flex-wrap gap-2">
                      <span>{p.empresa?.nome || p.empresa_id}</span>
                      <span className=" font-bold" style={{ color: colors.secondary }}>
                        {Number(p.valor).toLocaleString("pt-AO", { style: "currency", currency: "AOA" })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p style={{ color: colors.textSecondary }}>Plano: {p.plano?.nome || p.plano_id}</p>
                        <p style={{ color: colors.textSecondary }}>Método: {formatMetodoPagamento(p.metodo_pagamento)}</p>
                        <p style={{ color: colors.textSecondary }}>
                          {p.status === "pago" && p.data_pagamento
                            ? `Pago em: ${new Date(p.data_pagamento).toLocaleString()}`
                            : `Enviado em: ${new Date(p.created_at).toLocaleString()}`}
                        </p>
                        {p.status === "rejeitado" && p.motivo_rejeicao && <p className="text-red-500">Motivo: {p.motivo_rejeicao}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={corStatus(p.status, colors)}>
                          {formatEstadoPagamento(p.status)}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/landlord/pagamentos/${p.id}`)}>
                          <Eye className="w-4 h-4 mr-1.5" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </MainLandlord>
  );
}
