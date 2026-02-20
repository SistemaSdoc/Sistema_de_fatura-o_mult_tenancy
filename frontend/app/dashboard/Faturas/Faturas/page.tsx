"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useRouter } from "next/navigation";
import {
  vendaService,
  Venda,
  TipoDocumentoFiscal,
  EstadoDocumentoFiscal,
} from "@/services/vendas";

// Tipos de documentos que podem ser impressos (atualizado: removidos PF, PFA | adicionado FA)
const TIPOS_IMPRESSAO: TipoDocumentoFiscal[] = ['RC', 'FR', 'NC', 'ND', 'FA', 'FRt'];

// Removemos duplicatas baseado no ID da fatura ou da venda
const removerDuplicatas = (vendas: Venda[]): Venda[] => {
  const vistas = new Set<string>();
  return vendas.filter((v) => {
    const id = v.documento_fiscal?.id || v.id;
    if (vistas.has(id)) return false;
    vistas.add(id);
    return true;
  });
};

// Mapeamento de tipos atualizado (removidos NA, PF, PFA | adicionado FA)
const TIPO_MAP: Record<string, string> = {
  "FT": "fatura",
  "FR": "fatura_recibo",
  "RC": "recibo",
  "NC": "nota_credito",
  "ND": "nota_debito",
  "FA": "fatura_adiantamento",      // NOVO - substitui NA
  "FRt": "fatura_retificacao",
};

// Labels atualizados conforme NOMES_TIPO_DOCUMENTO
const TIPO_LABEL: Record<TipoDocumentoFiscal, string> = {
  "FT": "Fatura",
  "FR": "Fatura-Recibo",
  "RC": "Recibo",
  "NC": "Nota de Crédito",
  "ND": "Nota de Débito",
  "FA": "Fatura de Adiantamento",   // NOVO
  "FRt": "Fatura de Retificação",
};

// Cores para badges atualizadas
const TIPO_CORES: Record<TipoDocumentoFiscal, string> = {
  "FT": "bg-blue-100 text-blue-700",
  "FR": "bg-purple-100 text-purple-700",
  "RC": "bg-green-100 text-green-700",
  "NC": "bg-orange-100 text-orange-700",
  "ND": "bg-red-100 text-red-700",
  "FA": "bg-yellow-100 text-yellow-700",      // NOVO
  "FRt": "bg-gray-100 text-gray-700",
};

// Estados atualizados (emitido, paga, parcialmente_paga, cancelado, expirado)
const ESTADO_CONFIGS: Record<EstadoDocumentoFiscal, { bg: string; text: string; label: string }> = {
  emitido: { bg: "bg-blue-100", text: "text-blue-700", label: "Emitido" },
  paga: { bg: "bg-green-100", text: "text-green-700", label: "Paga" },
  parcialmente_paga: { bg: "bg-teal-100", text: "text-teal-700", label: "Parcialmente Paga" },
  cancelado: { bg: "bg-red-100", text: "text-red-700", label: "Cancelado" },        // atualizado
  expirado: { bg: "bg-gray-100", text: "text-gray-700", label: "Expirado" },          // NOVO
};

type TipoFiltro = "todas" | TipoDocumentoFiscal;

// ================= SKELETON COMPONENTS =================
function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="hidden md:grid grid-cols-8 gap-4 bg-gray-200 p-4 rounded-t-lg">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded w-full" />
        ))}
      </div>

      {/* Rows Skeleton */}
      {[...Array(5)].map((_, rowIdx) => (
        <div key={rowIdx} className="hidden md:grid grid-cols-8 gap-4 p-4 border-b border-gray-100">
          {[...Array(8)].map((_, colIdx) => (
            <div key={colIdx} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </div>
      ))}

      {/* Mobile Cards Skeleton */}
      <div className="md:hidden space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-5 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white p-3 sm:p-4 rounded-xl shadow border border-gray-100 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-8 bg-gray-300 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

export default function FaturasPage() {
  const router = useRouter();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<TipoFiltro>("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [modalTalaoAberto, setModalTalaoAberto] = useState(false);

  /* ================== CARREGAR TODOS OS DOCUMENTOS ================== */
  const carregarDocumentos = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Buscando todos os documentos fiscais...");
      // Buscar apenas vendas (FT e FR) usando o novo parâmetro
      const resultado = await vendaService.listar({ apenas_vendas: true });

      if (!resultado) {
        throw new Error("Não foi possível carregar os documentos");
      }

      console.log("✅ Documentos recebidos:", resultado.vendas.length);

      const unicas = removerDuplicatas(resultado.vendas);
      console.log("📋 Documentos únicos:", unicas.length);

      setVendas(unicas);
    } catch (err: any) {
      console.error("❌ Erro:", err);
      setError(err?.message || "Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  /* ================== HELPERS ================== */
  const getTipo = (venda: Venda): TipoDocumentoFiscal => {
    return venda.documento_fiscal?.tipo_documento || "FT";
  };

  const podeImprimir = (tipo: TipoDocumentoFiscal): boolean => {
    return TIPOS_IMPRESSAO.includes(tipo);
  };

  // NOVO: Verificar se é fatura de adiantamento
  const isFaturaAdiantamento = (tipo: TipoDocumentoFiscal): boolean => {
    return tipo === "FA";
  };

  // NOVO: Verificar se pode vincular adiantamento
  const podeVincularAdiantamento = (venda: Venda): boolean => {
    return venda.documento_fiscal?.tipo_documento === "FT" &&
      venda.documento_fiscal?.estado !== "cancelado";
  };

  /* ================== NAVEGAÇÃO ================== */
  const gerarNotaCredito = (venda: Venda) => {
    if (venda.documento_fiscal?.id) {
      router.push(`/dashboard/Faturas/Faturas/${venda.documento_fiscal.id}/nota-credito`);
    }
  };

  const gerarNotaDebito = (venda: Venda) => {
    if (venda.documento_fiscal?.id) {
      router.push(`/dashboard/Faturas/Faturas/${venda.documento_fiscal.id}/nota-debito`);
    }
  };


  const gerarRecibo = (venda: Venda) => {
    if (venda.documento_fiscal?.id) {
      router.push(`/documentos-fiscais/${venda.documento_fiscal.id}/recibo`);
    }
  };

  // NOVO: Navegar para vincular adiantamento
  const vincularAdiantamento = (venda: Venda) => {
    if (venda.documento_fiscal?.id) {
      router.push(`/documentos-fiscais/${venda.documento_fiscal.id}/vincular-adiantamento`);
    }
  };

  /* ================== FILTRO ================== */
  const vendasFiltradas = useMemo(() => {
    if (filtro === "todas") return vendas;
    return vendas.filter((v) => getTipo(v) === filtro);
  }, [vendas, filtro]);

  /* ================== ESTATÍSTICAS ================== */
  const estatisticas = useMemo(() => ({
    total: vendas.length,
    FT: vendas.filter((v) => getTipo(v) === "FT").length,
    FR: vendas.filter((v) => getTipo(v) === "FR").length,
    RC: vendas.filter((v) => getTipo(v) === "RC").length,
    NC: vendas.filter((v) => getTipo(v) === "NC").length,
    ND: vendas.filter((v) => getTipo(v) === "ND").length,
    FA: vendas.filter((v) => getTipo(v) === "FA").length,  // NOVO
    totalGeral: vendas.reduce((acc, v) => acc + (Number(v.total) || 0), 0),
  }), [vendas]);

  const formatKz = (valor: number | string | undefined): string => {
    const num = Number(valor) || 0;
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  /* ================== MODAIS ================== */
  const abrirModal = (venda: Venda) => {
    setVendaSelecionada(venda);
    setModalAberto(true);
  };

  const abrirModalTalao = (venda: Venda) => {
    setVendaSelecionada(venda);
    setModalTalaoAberto(true);
  };

  const fecharModais = () => {
    setModalAberto(false);
    setModalTalaoAberto(false);
    setVendaSelecionada(null);
  };

  const imprimirFatura = () => {
    window.print();
  };

  const imprimirTalao = () => {
    window.print();
  };

  /* ================== RENDER ================== */
  return (
    <MainEmpresa>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header - 100% Responsivo */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#123859] leading-tight">
              Documentos Fiscais
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Total: {loading ? "..." : estatisticas.total} documentos emitidos
            </p>
          </div>

          <button
            onClick={carregarDocumentos}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#123859] text-white rounded-lg hover:bg-[#0d2840] disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span className="whitespace-nowrap">Atualizando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="whitespace-nowrap">Atualizar</span>
              </>
            )}
          </button>
        </div>

        {/* Erro - Responsivo */}
        {error && (
          <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm sm:text-base">{error}</p>
            <button
              onClick={carregarDocumentos}
              className="mt-2 text-red-600 hover:underline text-sm font-medium"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Estatísticas - Skeleton ou Conteúdo (atualizado para 6 colunas) */}
        {loading ? (
          <StatsSkeleton />
        ) : !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            <StatCard title="Total" value={estatisticas.total} color="text-[#F9941F]" />
            <StatCard title="Faturas (FT)" value={estatisticas.FT} color="text-[#123859]" />
            <StatCard title="Faturas-Recibo (FR)" value={estatisticas.FR} color="text-[#F9941F]" />
            <StatCard title="Recibos (RC)" value={estatisticas.RC} color="text-green-600" />
            <StatCard title="Notas Crédito" value={estatisticas.NC} color="text-orange-600" />
            <StatCard
              title="Total Geral"
              value={formatKz(estatisticas.totalGeral)}
              color="text-[#F9941F]"
              isCurrency
              className="col-span-2 sm:col-span-1"
            />
          </div>
        )}

        {/* Filtros - Scroll Horizontal em Mobile (atualizado com FA) */}
        {!loading && !error && (
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow border border-gray-100">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
              {[
                { key: "todas" as TipoFiltro, label: "Todas", count: estatisticas.total },
                { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
                { key: "FR" as TipoFiltro, label: "Faturas-Recibo", count: estatisticas.FR },
                { key: "RC" as TipoFiltro, label: "Recibos", count: estatisticas.RC },
                { key: "NC" as TipoFiltro, label: "Notas Crédito", count: estatisticas.NC },
                { key: "ND" as TipoFiltro, label: "Notas Débito", count: estatisticas.ND },
                { key: "FA" as TipoFiltro, label: "Adiantamentos", count: estatisticas.FA }, // NOVO
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] touch-manipulation ${filtro === key
                    ? "bg-[#123859] text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  <span className={`ml-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${filtro === key ? "bg-white/20" : "bg-white"
                    }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabela/Lista Responsiva */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <>
              {/* Desktop: Tabela com Scroll Horizontal */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-[#123859] text-white">
                    <tr>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Nº Documento</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Série</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Cliente</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Tipo</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Data</th>
                      <th className="p-3 lg:p-4 text-right font-semibold text-sm whitespace-nowrap">Total</th>
                      <th className="p-3 lg:p-4 text-center font-semibold text-sm whitespace-nowrap">Estado</th>
                      <th className="p-3 lg:p-4 text-center font-semibold text-sm whitespace-nowrap min-w-[180px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vendasFiltradas.map((venda) => {
                      const tipo = getTipo(venda);
                      const numeroFatura = venda.documento_fiscal?.numero || venda.numero;
                      const podeImprimirDoc = podeImprimir(tipo);
                      const estado = venda.documento_fiscal?.estado as EstadoDocumentoFiscal;

                      return (
                        <tr key={venda.documento_fiscal?.id || venda.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 lg:p-4 font-bold text-[#123859] text-sm whitespace-nowrap">
                            {numeroFatura}
                          </td>
                          <td className="p-3 lg:p-4 text-gray-600 text-sm whitespace-nowrap">
                            {venda.documento_fiscal?.serie || venda.serie}
                          </td>
                          <td className="p-3 lg:p-4">
                            <div className="font-medium text-sm truncate max-w-[150px] lg:max-w-[200px]">
                              {venda.cliente?.nome || "Consumidor Final"}
                            </div>
                            {venda.cliente?.nif && (
                              <div className="text-xs text-gray-500">NIF: {venda.cliente.nif}</div>
                            )}
                          </td>
                          <td className="p-3 lg:p-4">
                            <TipoBadge tipo={tipo} />
                          </td>
                          <td className="p-3 lg:p-4 text-gray-600 text-sm whitespace-nowrap">
                            <div>{new Date(venda.data_venda).toLocaleDateString("pt-AO")}</div>
                            <div className="text-xs text-gray-400">{venda.hora_venda}</div>
                          </td>
                          <td className="p-3 lg:p-4 text-right font-bold text-[#123859] text-sm whitespace-nowrap">
                            {formatKz(venda.total)}
                          </td>
                          <td className="p-3 lg:p-4 text-center">
                            <EstadoBadge estado={estado} />
                          </td>
                          <td className="p-3 lg:p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => abrirModal(venda)}
                                className="p-2 text-[#123859] hover:bg-[#123859]/10 rounded-lg transition-colors touch-manipulation"
                                title="Ver detalhes"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Botão Gerar Recibo para Faturas (FT) - apenas se emitida ou parcialmente paga */}
                              {tipo === "FT" && (estado === "emitido" || estado === "parcialmente_paga") && (
                                <button
                                  onClick={() => gerarRecibo(venda)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-manipulation"
                                  title="Gerar Recibo"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                              )}

                              {/* NOVO: Botão Vincular Adiantamento para FT */}
                              {podeVincularAdiantamento(venda) && (
                                <button
                                  onClick={() => vincularAdiantamento(venda)}
                                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors touch-manipulation"
                                  title="Vincular Adiantamento"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                </button>
                              )}

                              {/* Botões para Fatura-Recibo (FR) e Faturas normais */}
                              {(tipo === "FR" || tipo === "FT") && estado !== "cancelado" && (
                                <>
                                  <button
                                    onClick={() => gerarNotaCredito(venda)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors touch-manipulation"
                                    title="Gerar Nota de Crédito"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => gerarNotaDebito(venda)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                                    title="Gerar Nota de Débito"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                </>
                              )}

                              {/* Botão Imprimir Talão (apenas para tipos permitidos) */}
                              {podeImprimirDoc && (
                                <button
                                  onClick={() => abrirModalTalao(venda)}
                                  className="p-2 text-[#F9941F] hover:bg-[#F9941F]/10 rounded-lg transition-colors touch-manipulation"
                                  title="Imprimir Talão"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet: Cards Responsivos */}
              <div className="md:hidden divide-y divide-gray-100">
                {vendasFiltradas.map((venda) => {
                  const tipo = getTipo(venda);
                  const numeroFatura = venda.documento_fiscal?.numero || venda.numero;
                  const podeImprimirDoc = podeImprimir(tipo);
                  const estado = venda.documento_fiscal?.estado as EstadoDocumentoFiscal;

                  return (
                    <div
                      key={venda.documento_fiscal?.id || venda.id}
                      className="p-3 sm:p-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#123859] text-base sm:text-lg truncate">
                              {numeroFatura}
                            </span>
                            <TipoBadge tipo={tipo} />
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Série: {venda.documento_fiscal?.serie || venda.serie}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#123859] text-base sm:text-lg">
                            {formatKz(venda.total)}
                          </p>
                          <EstadoBadge estado={estado} />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Cliente:</span>
                          <span className="font-medium text-right truncate max-w-[60%]">
                            {venda.cliente?.nome || "Consumidor Final"}
                          </span>
                        </div>
                        {venda.cliente?.nif && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">NIF:</span>
                            <span className="text-gray-700">{venda.cliente.nif}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Data:</span>
                          <span className="text-gray-700">
                            {new Date(venda.data_venda).toLocaleDateString("pt-AO")} {venda.hora_venda}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => abrirModal(venda)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#123859] hover:bg-[#123859]/10 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver detalhes
                        </button>

                        {/* Botão Gerar Recibo para Faturas (FT) - Mobile */}
                        {tipo === "FT" && (estado === "emitido" || estado === "parcialmente_paga") && (
                          <button
                            onClick={() => gerarRecibo(venda)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Gerar Recibo
                          </button>
                        )}

                        {/* NOVO: Botão Vincular Adiantamento - Mobile */}
                        {podeVincularAdiantamento(venda) && (
                          <button
                            onClick={() => vincularAdiantamento(venda)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Vincular Adiant.
                          </button>
                        )}

                        {/* Botões para Notas - Mobile */}
                        {(tipo === "FR" || tipo === "FT") && estado !== "cancelado" && (
                          <>
                            <button
                              onClick={() => gerarNotaCredito(venda)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                              Nota Crédito
                            </button>
                            <button
                              onClick={() => gerarNotaDebito(venda)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Nota Débito
                            </button>
                          </>
                        )}

                        {/* Botão Imprimir Talão - Mobile */}
                        {podeImprimirDoc && (
                          <button
                            onClick={() => abrirModalTalao(venda)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#F9941F] hover:bg-[#F9941F]/10 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Talão
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Estado Vazio - Responsivo */}
              {vendasFiltradas.length === 0 && !loading && (
                <div className="p-8 sm:p-12 text-center text-gray-500">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-medium">Nenhum documento encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ================== MODAL DETALHES (A4) ================== */}
        {modalAberto && vendaSelecionada && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
            onClick={fecharModais}
          >
            <div
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal - Responsivo */}
              <div className="bg-[#123859] text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0">
                <div className="min-w-0 flex-1 mr-2">
                  <h2 className="text-lg sm:text-xl font-bold truncate">Documento Fiscal</h2>
                  <p className="text-xs sm:text-sm text-blue-200 truncate">
                    {TIPO_LABEL[vendaSelecionada.documento_fiscal?.tipo_documento || "FT"]} Nº {vendaSelecionada.documento_fiscal?.numero || vendaSelecionada.numero}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {podeImprimir(vendaSelecionada.documento_fiscal?.tipo_documento as TipoDocumentoFiscal) && (
                    <button
                      onClick={imprimirFatura}
                      className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                      title="Imprimir"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={fecharModais}
                    className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                    title="Fechar"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Conteúdo do Modal - Scrollável */}
              <div id="area-impressao" className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50">
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 max-w-3xl mx-auto">

                  {/* Cabeçalho da Fatura - Responsivo */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-[#123859]">
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-[#123859]">MINHA EMPRESA</h1>
                      <p className="text-sm text-gray-600">NIF: 123456789</p>
                      <p className="text-sm text-gray-600">Endereço da Empresa</p>
                      <p className="text-sm text-gray-600">Tel: +244 900 000 000</p>
                    </div>
                    <div className="w-full sm:w-auto sm:text-right">
                      <div className="inline-block border-2 border-[#123859] rounded-lg p-3 sm:p-4 w-full sm:w-auto">
                        <p className="text-xs sm:text-sm text-gray-600">Documento</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#123859]">
                          {TIPO_LABEL[vendaSelecionada.documento_fiscal?.tipo_documento || "FT"]}
                        </p>
                        <p className="text-base sm:text-lg font-semibold mt-1 sm:mt-2">
                          Nº {vendaSelecionada.documento_fiscal?.numero || vendaSelecionada.numero}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">Série: {vendaSelecionada.documento_fiscal?.serie || vendaSelecionada.serie}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Cliente e Data - Grid Responsivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                    <div className="space-y-1">
                      <h3 className="font-bold text-[#123859] text-sm sm:text-base mb-1 sm:mb-2">Cliente:</h3>
                      <p className="font-semibold text-base sm:text-lg">
                        {vendaSelecionada.cliente?.nome || "Consumidor Final"}
                      </p>
                      {vendaSelecionada.cliente?.nif && (
                        <p className="text-sm text-gray-600">NIF: {vendaSelecionada.cliente.nif}</p>
                      )}
                      {vendaSelecionada.cliente?.endereco && (
                        <p className="text-sm text-gray-600">{vendaSelecionada.cliente.endereco}</p>
                      )}
                      {vendaSelecionada.cliente?.telefone && (
                        <p className="text-sm text-gray-600">Tel: {vendaSelecionada.cliente.telefone}</p>
                      )}
                    </div>
                    <div className="sm:text-right space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Data emissão:</span>{' '}
                        {new Date(vendaSelecionada.data_venda).toLocaleDateString("pt-AO")} {vendaSelecionada.hora_venda}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center sm:justify-end gap-2">
                        <span className="font-semibold">Estado:</span>
                        <EstadoBadge estado={vendaSelecionada.documento_fiscal?.estado as EstadoDocumentoFiscal} />
                      </p>

                      {/* VALOR PAGO - Apenas para Fatura-Recibo (FR) */}
                      {vendaSelecionada.documento_fiscal?.tipo_documento === "FR" && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 font-semibold">
                            Valor Pago: {formatKz(vendaSelecionada.total)}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Método: {vendaSelecionada.documento_fiscal?.metodo_pagamento || "Não especificado"}
                          </p>
                          {vendaSelecionada.documento_fiscal?.referencia_pagamento && (
                            <p className="text-xs text-green-600">
                              Ref: {vendaSelecionada.documento_fiscal.referencia_pagamento}
                            </p>
                          )}
                        </div>
                      )}

                      {/* NOVO: Info para Fatura de Adiantamento */}
                      {vendaSelecionada.documento_fiscal?.tipo_documento === "FA" && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800 font-semibold">
                            Fatura de Adiantamento
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Deve ser vinculada a uma fatura final
                          </p>
                        </div>
                      )}

                      {vendaSelecionada.documento_fiscal?.hash_fiscal && (
                        <p className="text-xs text-gray-400 mt-2 break-all">
                          Hash: {vendaSelecionada.documento_fiscal.hash_fiscal}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Itens - Tabela Responsiva com Scroll */}
                  <div className="overflow-x-auto -mx-4 sm:mx-0 mb-6 sm:mb-8">
                    <table className="w-full min-w-[500px] sm:min-w-0">
                      <thead className="bg-[#123859] text-white">
                        <tr>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Descrição</th>
                          <th className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium whitespace-nowrap">Qtd</th>
                          <th className="p-2 sm:p-3 text-right text-xs sm:text-sm font-medium whitespace-nowrap">Preço Unit.</th>
                          <th className="p-2 sm:p-3 text-right text-xs sm:text-sm font-medium whitespace-nowrap">IVA</th>
                          <th className="p-2 sm:p-3 text-right text-xs sm:text-sm font-medium whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendaSelecionada.itens?.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {item.produto?.nome || item.descricao}
                            </td>
                            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm">{item.quantidade}</td>
                            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm whitespace-nowrap">
                              {formatKz(item.preco_venda)}
                            </td>
                            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm whitespace-nowrap">
                              {formatKz(item.valor_iva)}
                            </td>
                            <td className="p-2 sm:p-3 text-right font-semibold text-xs sm:text-sm whitespace-nowrap">
                              {formatKz(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totais - Responsivo */}
                  <div className="border-t-2 border-[#123859] pt-4 sm:pt-6">
                    <div className="flex justify-end">
                      <div className="w-full sm:w-64 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Subtotal:</span>
                          <span className="whitespace-nowrap">{formatKz(vendaSelecionada.base_tributavel)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Total IVA:</span>
                          <span className="whitespace-nowrap">{formatKz(vendaSelecionada.total_iva)}</span>
                        </div>
                        {vendaSelecionada.total_retencao > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Retenção:</span>
                            <span className="whitespace-nowrap">-{formatKz(vendaSelecionada.total_retencao)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg sm:text-xl font-bold text-[#123859] border-t pt-2">
                          <span>TOTAL:</span>
                          <span className="whitespace-nowrap">{formatKz(vendaSelecionada.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t text-center text-gray-500 text-xs sm:text-sm">
                    <p>Documento processado por software validado - IVA não sujeito a retenção na fonte</p>
                    <p className="mt-1 sm:mt-2">Obrigado pela preferência!</p>
                  </div>
                </div>
              </div>

              {/* Botões de ação - Responsivo */}
              <div className="bg-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 print:hidden shrink-0">
                {/* Botões específicos por tipo de documento */}
                {vendaSelecionada.documento_fiscal?.tipo_documento === "FT" &&
                  (vendaSelecionada.documento_fiscal?.estado === "emitido" ||
                    vendaSelecionada.documento_fiscal?.estado === "parcialmente_paga") && (
                    <button
                      onClick={() => gerarRecibo(vendaSelecionada)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="whitespace-nowrap">Gerar Recibo</span>
                    </button>
                  )}

                {/* NOVO: Botão Vincular Adiantamento no Modal */}
                {podeVincularAdiantamento(vendaSelecionada) && (
                  <button
                    onClick={() => vincularAdiantamento(vendaSelecionada)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="whitespace-nowrap">Vincular Adiantamento</span>
                  </button>
                )}

                {(vendaSelecionada.documento_fiscal?.tipo_documento === "FR" ||
                  vendaSelecionada.documento_fiscal?.tipo_documento === "FT") &&
                  vendaSelecionada.documento_fiscal?.estado !== "cancelado" && (
                    <>
                      <button
                        onClick={() => gerarNotaCredito(vendaSelecionada)}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        <span className="whitespace-nowrap">Gerar Nota de Crédito</span>
                      </button>
                      <button
                        onClick={() => gerarNotaDebito(vendaSelecionada)}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="whitespace-nowrap">Gerar Nota de Débito</span>
                      </button>
                    </>
                  )}

                <button
                  onClick={fecharModais}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium min-h-[44px] touch-manipulation"
                >
                  Fechar
                </button>

                {podeImprimir(vendaSelecionada.documento_fiscal?.tipo_documento as TipoDocumentoFiscal) && (
                  <button
                    onClick={imprimirFatura}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-[#F9941F] text-white rounded-lg hover:bg-[#d9831a] transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="whitespace-nowrap">Imprimir / PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================== MODAL TALÃO (TICKET) ================== */}
        {modalTalaoAberto && vendaSelecionada && podeImprimir(vendaSelecionada.documento_fiscal?.tipo_documento as TipoDocumentoFiscal) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
            onClick={fecharModais}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-[80mm] max-h-[95vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="bg-[#123859] text-white px-4 py-3 flex justify-between items-center shrink-0">
                <div className="min-w-0 flex-1 mr-2">
                  <h2 className="text-lg font-bold truncate">Talão Fiscal</h2>
                  <p className="text-xs text-blue-200 truncate">
                    {vendaSelecionada.documento_fiscal?.numero || vendaSelecionada.numero}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={imprimirTalao}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                    title="Imprimir Talão"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  <button
                    onClick={fecharModais}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                    title="Fechar"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Conteúdo do Talão - Formato Estreito */}
              <div id="area-talao" className="flex-1 overflow-y-auto p-0 bg-gray-100">
                <div className="bg-white mx-auto" style={{ width: '80mm', minHeight: '100%' }}>
                  {/* Conteúdo do Talão */}
                  <div className="p-4 font-mono text-xs leading-tight">

                    {/* Cabeçalho do Talão */}
                    <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
                      <h1 className="text-lg font-bold uppercase mb-1">MINHA EMPRESA</h1>
                      <p className="text-[10px]">NIF: 123456789</p>
                      <p className="text-[10px]">Endereço da Empresa</p>
                      <p className="text-[10px]">Tel: +244 900 000 000</p>
                    </div>

                    {/* Info Documento */}
                    <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                      <div className="flex justify-between font-bold">
                        <span>{TIPO_LABEL[vendaSelecionada.documento_fiscal?.tipo_documento || "FT"]}</span>
                        <span>Nº {vendaSelecionada.documento_fiscal?.numero || vendaSelecionada.numero}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Série: {vendaSelecionada.documento_fiscal?.serie || vendaSelecionada.serie}</span>
                        <span>{new Date(vendaSelecionada.data_venda).toLocaleDateString("pt-AO")} {vendaSelecionada.hora_venda}</span>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                      <p className="font-bold">Cliente:</p>
                      <p className="truncate">{vendaSelecionada.cliente?.nome || "Consumidor Final"}</p>
                      {vendaSelecionada.cliente?.nif && (
                        <p className="text-[10px]">NIF: {vendaSelecionada.cliente.nif}</p>
                      )}
                    </div>

                    {/* Itens */}
                    <div className="border-b-2 border-dashed border-gray-400 pb-2 mb-2">
                      <div className="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1">
                        <span className="w-1/2">Descrição</span>
                        <span className="w-1/6 text-center">Qtd</span>
                        <span className="w-1/3 text-right">Total</span>
                      </div>
                      {vendaSelecionada.itens?.map((item, idx) => (
                        <div key={idx} className="mb-1">
                          <div className="truncate">{item.produto?.nome || item.descricao}</div>
                          <div className="flex justify-between text-[10px]">
                            <span className="w-1/2 truncate">{formatKz(item.preco_venda)} x {item.quantidade}</span>
                            <span className="w-1/6 text-center"></span>
                            <span className="w-1/3 text-right font-semibold">{formatKz(item.subtotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totais */}
                    <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                      <div className="flex justify-between">
                        <span>Base Tributável:</span>
                        <span>{formatKz(vendaSelecionada.base_tributavel)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total IVA:</span>
                        <span>{formatKz(vendaSelecionada.total_iva)}</span>
                      </div>
                      {vendaSelecionada.total_retencao > 0 && (
                        <div className="flex justify-between">
                          <span>Retenção:</span>
                          <span>-{formatKz(vendaSelecionada.total_retencao)}</span>
                        </div>
                      )}

                      {/* VALOR PAGO - Apenas para Fatura-Recibo */}
                      {vendaSelecionada.documento_fiscal?.tipo_documento === "FR" && (
                        <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                          <div className="flex justify-between font-bold text-green-700">
                            <span>VALOR PAGO:</span>
                            <span>{formatKz(vendaSelecionada.total)}</span>
                          </div>
                          <div className="text-[9px] text-gray-600 mt-0.5">
                            Método: {vendaSelecionada.documento_fiscal?.metodo_pagamento || "Não especificado"}
                          </div>
                        </div>
                      )}

                      {/* NOVO: Info para Fatura de Adiantamento no Talão */}
                      {vendaSelecionada.documento_fiscal?.tipo_documento === "FA" && (
                        <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                          <div className="flex justify-between font-bold text-yellow-700">
                            <span>ADIANTAMENTO:</span>
                            <span>{formatKz(vendaSelecionada.total)}</span>
                          </div>
                          <div className="text-[9px] text-gray-600 mt-0.5 text-center">
                            Aguardando vinculação
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-1 mt-1">
                        <span>TOTAL:</span>
                        <span>{formatKz(vendaSelecionada.total)}</span>
                      </div>
                    </div>

                    {/* Hash Fiscal */}
                    {vendaSelecionada.documento_fiscal?.hash_fiscal && (
                      <div className="text-center text-[9px] break-all mb-2">
                        <p className="font-bold">Hash:</p>
                        <p>{vendaSelecionada.documento_fiscal.hash_fiscal}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="text-center text-[10px] pt-2 border-t border-dashed border-gray-400">
                      <p>Documento processado por software validado</p>
                      <p>IVA não sujeito a retenção na fonte</p>
                      <p className="mt-2 font-bold">Obrigado pela preferência!</p>
                      <p className="mt-2">*** Fim do Documento ***</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="bg-gray-100 px-4 py-3 flex flex-col sm:flex-row justify-end gap-2 print:hidden shrink-0">
                <button
                  onClick={fecharModais}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium min-h-[44px] touch-manipulation"
                >
                  Fechar
                </button>
                <button
                  onClick={imprimirTalao}
                  className="w-full sm:w-auto px-4 py-2 bg-[#F9941F] text-white rounded-lg hover:bg-[#d9831a] transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Imprimir Talão</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Estilos de impressão otimizados */}
        <style jsx global>{`
          @media print {
            /* Esconder tudo exceto o conteúdo de impressão */
            body * {
              visibility: hidden;
            }
            
            /* Estilos para impressão A4 (modal detalhes) */
            #area-impressao, #area-impressao * {
              visibility: visible;
            }
            #area-impressao {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 10mm;
              max-width: none;
            }
            #area-impressao .bg-white {
              box-shadow: none;
              border: none;
              max-width: none;
            }

            /* Estilos para impressão de Talão (80mm) */
            #area-talao, #area-talao * {
              visibility: visible;
            }
            #area-talao {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm !important;
              padding: 0;
              margin: 0;
              background: white;
            }
            #area-talao .bg-white {
              box-shadow: none;
              border: none;
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 auto;
            }
            
            /* Configuração da página para talão */
            @page {
              size: 80mm auto;
              margin: 0;
            }
          }
          
          /* Hide scrollbar for Chrome, Safari and Opera */
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          /* Touch manipulation for better mobile response */
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        `}</style>
      </div>
    </MainEmpresa>
  );
}

/* ================= COMPONENTES AUXILIARES RESPONSIVOS ================= */

function StatCard({
  title,
  value,
  color,
  isCurrency = false,
  className = ""
}: {
  title: string;
  value: string | number;
  color: string;
  isCurrency?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-white p-3 sm:p-4 rounded-xl shadow border border-gray-100 ${className}`}>
      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{title}</p>
      <p className={`font-bold ${color} ${isCurrency ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} break-words leading-tight`}>
        {value}
      </p>
    </div>
  );
}

// Atualizado para usar TIPO_LABEL e TIPO_CORES
function TipoBadge({ tipo }: { tipo: TipoDocumentoFiscal }) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TIPO_CORES[tipo] || "bg-gray-100 text-gray-700"}`}>
      {TIPO_LABEL[tipo] || tipo}
    </span>
  );
}

// Atualizado para usar EstadoDocumentoFiscal e ESTADO_CONFIGS
function EstadoBadge({ estado }: { estado?: EstadoDocumentoFiscal }) {
  const config = estado ? ESTADO_CONFIGS[estado] : { bg: "bg-gray-100", text: "text-gray-700", label: "PENDENTE" };
  return (
    <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label.toUpperCase()}
    </span>
  );
}