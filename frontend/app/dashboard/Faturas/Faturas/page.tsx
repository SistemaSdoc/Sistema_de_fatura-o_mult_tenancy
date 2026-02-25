"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useRouter } from "next/navigation";
import {
  documentoFiscalService,
  DocumentoFiscal,
  TipoDocumento,
  EstadoDocumento,
  FiltrosDocumento,
} from "@/services/DocumentoFiscal";

// Tipos de documentos que podem ser impressos (todos exceto FT que tem tratamento especial)
const TIPOS_IMPRESSAO: TipoDocumento[] = ['FR', 'FP', 'FA', 'NC', 'ND', 'RC', 'FRt'];

// Labels conforme documentoFiscalService.getTipoDocumentoNome()
const TIPO_LABEL: Record<TipoDocumento, string> = {
  "FT": "Fatura",
  "FR": "Fatura-Recibo",
  "FP": "Fatura Proforma",
  "FA": "Fatura de Adiantamento",
  "NC": "Nota de Crédito",
  "ND": "Nota de Débito",
  "RC": "Recibo",
  "FRt": "Fatura de Retificação",
};

// Cores para badges usando documentoFiscalService.getTipoCor()
const TIPO_CORES: Record<TipoDocumento, string> = {
  "FT": "bg-blue-100 text-blue-700",
  "FR": "bg-green-100 text-green-700",
  "FP": "bg-orange-100 text-orange-700",
  "FA": "bg-purple-100 text-purple-700",
  "NC": "bg-red-100 text-red-700",
  "ND": "bg-amber-100 text-amber-700",
  "RC": "bg-teal-100 text-teal-700",
  "FRt": "bg-pink-100 text-pink-700",
};

// Estados usando documentoFiscalService.getEstadoCor() e getEstadoLabel()
const ESTADO_CONFIGS: Record<EstadoDocumento, { bg: string; text: string; label: string }> = {
  emitido: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Emitido" },
  paga: { bg: "bg-green-100", text: "text-green-700", label: "Pago" },
  parcialmente_paga: { bg: "bg-orange-100", text: "text-orange-700", label: "Parcial" },
  cancelado: { bg: "bg-red-100", text: "text-red-700", label: "Cancelado" },
  expirado: { bg: "bg-gray-100", text: "text-gray-700", label: "Expirado" },
};

type TipoFiltro = "todas" | TipoDocumento;

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
  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<TipoFiltro>("todas");
  const [termoPesquisa, setTermoPesquisa] = useState<string>("");
  const [modalAberto, setModalAberto] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<DocumentoFiscal | null>(null);
  const [modalTalaoAberto, setModalTalaoAberto] = useState(false);

  /* ================== CARREGAR TODOS OS DOCUMENTOS ================== */
  const carregarDocumentos = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Buscando todos os documentos fiscais...");

      // Buscar todos os documentos fiscais (não apenas vendas)
      const filtros: FiltrosDocumento = {
        per_page: 100, // Ajustar conforme necessário
      };

      const resultado = await documentoFiscalService.listar(filtros);

      if (!resultado || !resultado.data) {
        throw new Error("Não foi possível carregar os documentos");
      }

      console.log("✅ Documentos recebidos:", resultado.data.length);
      console.log("📊 Tipos encontrados:", resultado.data.map(d => d.tipo_documento).join(', '));

      setDocumentos(resultado.data);
    } catch (err: unknown) {
      console.error("❌ Erro:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar documentos";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  /* ================== HELPERS ================== */
  const podeImprimir = (tipo: TipoDocumento): boolean => {
    return TIPOS_IMPRESSAO.includes(tipo);
  };

  // Verificar se pode converter proforma para fatura
  const podeConverterProforma = (documento: DocumentoFiscal): boolean => {
    return documento.tipo_documento === "FP" && documento.estado !== "cancelado";
  };

  // Verificar se pode gerar recibo (apenas FT e FA emitidas/parcialmente pagas)
  const podeGerarRecibo = (documento: DocumentoFiscal): boolean => {
    return documentoFiscalService.podeGerarRecibo(documento);
  };

  // Verificar se pode gerar NC/ND (apenas FT e FR não cancelados)
  const podeGerarNotaCorrecao = (documento: DocumentoFiscal): boolean => {
    return documentoFiscalService.podeGerarNotaCorrecao(documento);
  };

  /* ================== NAVEGAÇÃO ================== */
  const gerarNotaCredito = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/dashboard/Faturas/Faturas/${documento.id}/nota-credito`);
    }
  };

  const gerarNotaDebito = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/dashboard/Faturas/Faturas/${documento.id}/nota-debito`);
    }
  };

  const gerarRecibo = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/documentos-fiscais/${documento.id}/recibo`);
    }
  };

  // Navegar para converter proforma em fatura
  const converterProforma = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/documentos-fiscais/${documento.id}/converter`);
    }
  };

  // Navegar para detalhes do documento
  const verDetalhes = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/dashboard/Faturas/Faturas/${documento.id}/Ver`);
    } else {
      abrirModal(documento);
    }
  };

  /* ================== ORDENAÇÃO E FILTROS ================== */
  
  // Ordenar documentos por data (mais recentes primeiro)
  const documentosOrdenados = useMemo(() => {
    return [...documentos].sort((a, b) => {
      // Combinar data e hora para comparação
      const dataA = new Date(`${a.data_emissao}T${a.hora_emissao || '00:00:00'}`);
      const dataB = new Date(`${b.data_emissao}T${b.hora_emissao || '00:00:00'}`);
      
      // Ordem decrescente (mais recente primeiro)
      return dataB.getTime() - dataA.getTime();
    });
  }, [documentos]);

  // Filtrar por tipo
  const documentosPorTipo = useMemo(() => {
    if (filtro === "todas") return documentosOrdenados;
    return documentosOrdenados.filter((d) => d.tipo_documento === filtro);
  }, [documentosOrdenados, filtro]);

  // Filtrar por termo de pesquisa
  const documentosFiltrados = useMemo(() => {
    if (!termoPesquisa.trim()) return documentosPorTipo;
    
    const termo = termoPesquisa.toLowerCase().trim();
    
    return documentosPorTipo.filter((doc) => {
      // Pesquisar em vários campos
      const numeroDocumento = (doc.numero_documento || '').toLowerCase();
      const serie = (doc.serie || '').toLowerCase();
      const nomeCliente = (doc.cliente?.nome || doc.cliente_nome || '').toLowerCase();
      const nifCliente = (doc.cliente?.nif || doc.cliente_nif || '').toLowerCase();
      
      return (
        numeroDocumento.includes(termo) ||
        serie.includes(termo) ||
        nomeCliente.includes(termo) ||
        nifCliente.includes(termo)
      );
    });
  }, [documentosPorTipo, termoPesquisa]);

  /* ================== ESTATÍSTICAS ================== */
  const estatisticas = useMemo(() => ({
    total: documentos.length,
    FT: documentos.filter((d) => d.tipo_documento === "FT").length,
    FR: documentos.filter((d) => d.tipo_documento === "FR").length,
    FP: documentos.filter((d) => d.tipo_documento === "FP").length,
    RC: documentos.filter((d) => d.tipo_documento === "RC").length,
    NC: documentos.filter((d) => d.tipo_documento === "NC").length,
    ND: documentos.filter((d) => d.tipo_documento === "ND").length,
    FA: documentos.filter((d) => d.tipo_documento === "FA").length,
    FRt: documentos.filter((d) => d.tipo_documento === "FRt").length,
    totalVendas: documentos.filter((d) => documentoFiscalService.ehVenda(d)).length,
    totalNaoVendas: documentos.filter((d) => !documentoFiscalService.ehVenda(d)).length,
    totalGeral: documentos.reduce((acc, d) => acc + (Number(d.total_liquido) || 0), 0),
  }), [documentos]);

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
  const abrirModal = (documento: DocumentoFiscal) => {
    setDocumentoSelecionado(documento);
    setModalAberto(true);
  };

  const abrirModalTalao = (documento: DocumentoFiscal) => {
    setDocumentoSelecionado(documento);
    setModalTalaoAberto(true);
  };

  const fecharModais = () => {
    setModalAberto(false);
    setModalTalaoAberto(false);
    setDocumentoSelecionado(null);
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

        {/* Barra de Pesquisa e Filtros */}
        {!loading && !error && (
          <div className="space-y-3">
            {/* Campo de Pesquisa */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar por nº documento, série, cliente ou NIF..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#123859] focus:border-transparent text-sm transition-all"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {termoPesquisa && (
                <button
                  onClick={() => setTermoPesquisa("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filtros por Tipo - Scroll Horizontal em Mobile */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow border border-gray-100">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
                {[
                  { key: "todas" as TipoFiltro, label: "Todas", count: estatisticas.total },
                  { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
                  { key: "FR" as TipoFiltro, label: "Faturas-Recibo", count: estatisticas.FR },
                  { key: "FP" as TipoFiltro, label: "Proformas", count: estatisticas.FP },
                  { key: "FA" as TipoFiltro, label: "Adiantamentos", count: estatisticas.FA },
                  { key: "RC" as TipoFiltro, label: "Recibos", count: estatisticas.RC },
                  { key: "NC" as TipoFiltro, label: "Notas Crédito", count: estatisticas.NC },
                  { key: "ND" as TipoFiltro, label: "Notas Débito", count: estatisticas.ND },
                  { key: "FRt" as TipoFiltro, label: "Retificações", count: estatisticas.FRt },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFiltro(key)}
                    className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] touch-manipulation ${
                      filtro === key
                        ? "bg-[#123859] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <span className="whitespace-nowrap">{label}</span>
                    <span className={`ml-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                      filtro === key ? "bg-white/20" : "bg-white"
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado da pesquisa */}
            {termoPesquisa && (
              <div className="text-sm text-gray-500">
                Encontrados {documentosFiltrados.length} documentos para "{termoPesquisa}"
              </div>
            )}
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
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-[#123859] text-white">
                    <tr>
                      <th className="p-3 lg:p-2 text-left font-semibold text-sm whitespace-nowrap">Nº Documento</th>
                      <th className="p-3 lg:p-2 text-left font-semibold text-sm whitespace-nowrap">Série</th>
                      <th className="p-3 lg:p-2 text-left font-semibold text-sm whitespace-nowrap">Cliente</th>
                      <th className="p-3 lg:p-2 text-left font-semibold text-sm whitespace-nowrap">Tipo</th>
                      <th className="p-3 lg:p-2 text-left font-semibold text-sm whitespace-nowrap">Data</th>
                      <th className="p-3 lg:p-2 text-right font-semibold text-sm whitespace-nowrap">Total</th>
                      <th className="p-3 lg:p-2 text-center font-semibold text-sm whitespace-nowrap">Estado</th>
                      <th className="p-3 lg:p-2 text-center font-semibold text-sm whitespace-nowrap min-w-[250px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documentosFiltrados.map((documento) => {
                      const tipo = documento.tipo_documento;
                      const podeImprimirDoc = podeImprimir(tipo);
                      const estado = documento.estado;

                      return (
                        <tr key={documento.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 lg:p-4 font-bold text-[#123859] text-sm whitespace-nowrap">
                            {documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}
                          </td>
                          <td className="p-3 lg:p-4 text-gray-600 text-sm whitespace-nowrap">
                            {documento.serie}
                          </td>
                          <td className="p-3 lg:p-4">
                            <div className="font-medium text-sm truncate max-w-[150px] lg:max-w-[200px]">
                              {documentoFiscalService.getNomeCliente(documento)}
                            </div>
                            {documentoFiscalService.getNifCliente(documento) && (
                              <div className="text-xs text-gray-500">
                                NIF: {documentoFiscalService.getNifCliente(documento)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 lg:p-4">
                            <TipoBadge tipo={tipo} />
                          </td>
                          <td className="p-3 lg:p-4 text-gray-600 text-sm whitespace-nowrap">
                            <div>{new Date(documento.data_emissao).toLocaleDateString("pt-AO")}</div>
                            <div className="text-xs text-gray-400">{documento.hora_emissao}</div>
                          </td>
                          <td className="p-3 lg:p-4 text-right font-bold text-[#123859] text-sm whitespace-nowrap">
                            {formatKz(documento.total_liquido)}
                          </td>
                          <td className="p-2 lg:p-3 text-center">
                            <EstadoBadge estado={estado} />
                          </td>
                          <td className="p-3 lg:p-4 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <button
                                onClick={() => verDetalhes(documento)}
                                className="p-2 text-[#123859] hover:bg-[#123859]/10 rounded-lg transition-colors touch-manipulation"
                                title="Ver detalhes"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Botão Gerar Recibo para FT e FA */}
                              {podeGerarRecibo(documento) && (
                                <button
                                  onClick={() => gerarRecibo(documento)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-manipulation"
                                  title="Gerar Recibo"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                              )}

                              {/* Botão Converter Proforma para Fatura */}
                              {podeConverterProforma(documento) && (
                                <button
                                  onClick={() => converterProforma(documento)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors touch-manipulation"
                                  title="Converter para Fatura"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                </button>
                              )}

                              {/* Botão Imprimir Talão (apenas para tipos permitidos) */}
                              {podeImprimirDoc && (
                                <button
                                  onClick={() => abrirModalTalao(documento)}
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
                {documentosFiltrados.map((documento) => {
                  const tipo = documento.tipo_documento;
                  const podeImprimirDoc = podeImprimir(tipo);
                  const estado = documento.estado;

                  return (
                    <div
                      key={documento.id}
                      className="p-3 sm:p-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#123859] text-base sm:text-lg truncate">
                              {documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}
                            </span>
                            <TipoBadge tipo={tipo} />
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Série: {documento.serie}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#123859] text-base sm:text-lg">
                            {formatKz(documento.total_liquido)}
                          </p>
                          <EstadoBadge estado={estado} />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Cliente:</span>
                          <span className="font-medium text-right truncate max-w-[60%]">
                            {documentoFiscalService.getNomeCliente(documento)}
                          </span>
                        </div>
                        {documentoFiscalService.getNifCliente(documento) && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">NIF:</span>
                            <span className="text-gray-700">{documentoFiscalService.getNifCliente(documento)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Data:</span>
                          <span className="text-gray-700">
                            {new Date(documento.data_emissao).toLocaleDateString("pt-AO")} {documento.hora_emissao}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => verDetalhes(documento)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#123859] hover:bg-[#123859]/10 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver detalhes
                        </button>

                        {/* Botão Gerar Recibo para FT e FA - Mobile */}
                        {podeGerarRecibo(documento) && (
                          <button
                            onClick={() => gerarRecibo(documento)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Gerar Recibo
                          </button>
                        )}

                        {/* Botão Converter Proforma - Mobile */}
                        {podeConverterProforma(documento) && (
                          <button
                            onClick={() => converterProforma(documento)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Converter
                          </button>
                        )}

                        {/* Botões para Notas - Mobile */}
                        {podeGerarNotaCorrecao(documento) && (
                          <>
                            <button
                              onClick={() => gerarNotaCredito(documento)}
                              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                              Nota Crédito
                            </button>
                            <button
                              onClick={() => gerarNotaDebito(documento)}
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
                            onClick={() => abrirModalTalao(documento)}
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
              {documentosFiltrados.length === 0 && !loading && (
                <div className="p-8 sm:p-12 text-center text-gray-500">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-medium">Nenhum documento encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {termoPesquisa 
                      ? `Nenhum resultado para "${termoPesquisa}"` 
                      : "Tente ajustar os filtros"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ================== MODAL DETALHES (A4) ================== */}
        {modalAberto && documentoSelecionado && (
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
                    {documentoFiscalService.getTipoDocumentoNome(documentoSelecionado.tipo_documento)} Nº {documentoSelecionado.numero_documento}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {podeImprimir(documentoSelecionado.tipo_documento) && (
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
                          {documentoFiscalService.getTipoDocumentoNome(documentoSelecionado.tipo_documento)}
                        </p>
                        <p className="text-base sm:text-lg font-semibold mt-1 sm:mt-2">
                          Nº {documentoSelecionado.numero_documento}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">Série: {documentoSelecionado.serie}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Cliente e Data - Grid Responsivo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                    <div className="space-y-1">
                      <h3 className="font-bold text-[#123859] text-sm sm:text-base mb-1 sm:mb-2">Cliente:</h3>
                      <p className="font-semibold text-base sm:text-lg">
                        {documentoFiscalService.getNomeCliente(documentoSelecionado)}
                      </p>
                      {documentoFiscalService.getNifCliente(documentoSelecionado) && (
                        <p className="text-sm text-gray-600">NIF: {documentoFiscalService.getNifCliente(documentoSelecionado)}</p>
                      )}
                      {documentoSelecionado.cliente?.endereco && (
                        <p className="text-sm text-gray-600">{documentoSelecionado.cliente.endereco}</p>
                      )}
                      {documentoSelecionado.cliente?.telefone && (
                        <p className="text-sm text-gray-600">Tel: {documentoSelecionado.cliente.telefone}</p>
                      )}
                    </div>
                    <div className="sm:text-right space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Data emissão:</span>{' '}
                        {new Date(documentoSelecionado.data_emissao).toLocaleDateString("pt-AO")} {documentoSelecionado.hora_emissao}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center sm:justify-end gap-2">
                        <span className="font-semibold">Estado:</span>
                        <EstadoBadge estado={documentoSelecionado.estado} />
                      </p>

                      {/* VALOR PAGO - Apenas para Fatura-Recibo (FR) */}
                      {documentoSelecionado.tipo_documento === "FR" && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 font-semibold">
                            Valor Pago: {formatKz(documentoSelecionado.total_liquido)}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Método: {documentoSelecionado.metodo_pagamento || "Não especificado"}
                          </p>
                          {documentoSelecionado.referencia_pagamento && (
                            <p className="text-xs text-green-600">
                              Ref: {documentoSelecionado.referencia_pagamento}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Info para Fatura de Adiantamento */}
                      {documentoSelecionado.tipo_documento === "FA" && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm text-purple-800 font-semibold">
                            Fatura de Adiantamento
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            Deve ser vinculada a uma fatura final
                          </p>
                          {documentoSelecionado.data_vencimento && (
                            <p className="text-xs text-purple-600">
                              Vencimento: {new Date(documentoSelecionado.data_vencimento).toLocaleDateString("pt-AO")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Info para Fatura Proforma */}
                      {documentoSelecionado.tipo_documento === "FP" && (
                        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800 font-semibold">
                            Fatura Proforma
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            Documento prévio - pode ser convertido em fatura
                          </p>
                        </div>
                      )}

                      {/* Info para Nota de Crédito */}
                      {documentoSelecionado.tipo_documento === "NC" && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800 font-semibold">
                            Nota de Crédito
                          </p>
                          {documentoSelecionado.documentoOrigem && (
                            <p className="text-xs text-red-600 mt-1">
                              Ref: {documentoSelecionado.documentoOrigem.numero_documento}
                            </p>
                          )}
                          {documentoSelecionado.motivo && (
                            <p className="text-xs text-red-600">
                              Motivo: {documentoSelecionado.motivo}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Info para Nota de Débito */}
                      {documentoSelecionado.tipo_documento === "ND" && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800 font-semibold">
                            Nota de Débito
                          </p>
                          {documentoSelecionado.documentoOrigem && (
                            <p className="text-xs text-amber-600 mt-1">
                              Ref: {documentoSelecionado.documentoOrigem.numero_documento}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Info para Recibo */}
                      {documentoSelecionado.tipo_documento === "RC" && (
                        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                          <p className="text-sm text-teal-800 font-semibold">
                            Recibo de Pagamento
                          </p>
                          <p className="text-xs text-teal-600 mt-1">
                            Método: {documentoSelecionado.metodo_pagamento || "Não especificado"}
                          </p>
                          {documentoSelecionado.documentoOrigem && (
                            <p className="text-xs text-teal-600">
                              Ref: {documentoSelecionado.documentoOrigem.numero_documento}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Info para Fatura de Retificação */}
                      {documentoSelecionado.tipo_documento === "FRt" && (
                        <div className="mt-3 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                          <p className="text-sm text-pink-800 font-semibold">
                            Fatura de Retificação
                          </p>
                          {documentoSelecionado.motivo && (
                            <p className="text-xs text-pink-600 mt-1">
                              Motivo: {documentoSelecionado.motivo}
                            </p>
                          )}
                        </div>
                      )}

                      {documentoSelecionado.hash_fiscal && (
                        <p className="text-xs text-gray-400 mt-2 break-all">
                          Hash: {documentoSelecionado.hash_fiscal}
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
                        {documentoSelecionado.itens?.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {item.descricao}
                            </td>
                            <td className="p-2 sm:p-3 text-center text-xs sm:text-sm">{item.quantidade}</td>
                            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm whitespace-nowrap">
                              {formatKz(item.preco_unitario)}
                            </td>
                            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm whitespace-nowrap">
                              {formatKz(item.valor_iva)}
                            </td>
                            <td className="p-2 sm:p-3 text-right font-semibold text-xs sm:text-sm whitespace-nowrap">
                              {formatKz(item.total_linha)}
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
                          <span>Base Tributável:</span>
                          <span className="whitespace-nowrap">{formatKz(documentoSelecionado.base_tributavel)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Total IVA:</span>
                          <span className="whitespace-nowrap">{formatKz(documentoSelecionado.total_iva)}</span>
                        </div>
                        {documentoSelecionado.total_retencao > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Retenção:</span>
                            <span className="whitespace-nowrap">-{formatKz(documentoSelecionado.total_retencao)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg sm:text-xl font-bold text-[#123859] border-t pt-2">
                          <span>TOTAL:</span>
                          <span className="whitespace-nowrap">{formatKz(documentoSelecionado.total_liquido)}</span>
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
                {podeGerarRecibo(documentoSelecionado) && (
                  <button
                    onClick={() => gerarRecibo(documentoSelecionado)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="whitespace-nowrap">Gerar Recibo</span>
                  </button>
                )}

                {/* Botão Converter Proforma no Modal */}
                {podeConverterProforma(documentoSelecionado) && (
                  <button
                    onClick={() => converterProforma(documentoSelecionado)}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="whitespace-nowrap">Converter para Fatura</span>
                  </button>
                )}

                {podeGerarNotaCorrecao(documentoSelecionado) && (
                  <>
                    <button
                      onClick={() => gerarNotaCredito(documentoSelecionado)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      <span className="whitespace-nowrap">Gerar Nota de Crédito</span>
                    </button>
                    <button
                      onClick={() => gerarNotaDebito(documentoSelecionado)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
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

                {podeImprimir(documentoSelecionado.tipo_documento) && (
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
        {modalTalaoAberto && documentoSelecionado && podeImprimir(documentoSelecionado.tipo_documento) && (
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
                    {documentoSelecionado.numero_documento}
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
                        <span>{documentoFiscalService.getTipoDocumentoNome(documentoSelecionado.tipo_documento)}</span>
                        <span>Nº {documentoSelecionado.numero_documento}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Série: {documentoSelecionado.serie}</span>
                        <span>{new Date(documentoSelecionado.data_emissao).toLocaleDateString("pt-AO")} {documentoSelecionado.hora_emissao}</span>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                      <p className="font-bold">Cliente:</p>
                      <p className="truncate">{documentoFiscalService.getNomeCliente(documentoSelecionado)}</p>
                      {documentoFiscalService.getNifCliente(documentoSelecionado) && (
                        <p className="text-[10px]">NIF: {documentoFiscalService.getNifCliente(documentoSelecionado)}</p>
                      )}
                    </div>

                    {/* Itens */}
                    <div className="border-b-2 border-dashed border-gray-400 pb-2 mb-2">
                      <div className="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1">
                        <span className="w-1/2">Descrição</span>
                        <span className="w-1/6 text-center">Qtd</span>
                        <span className="w-1/3 text-right">Total</span>
                      </div>
                      {documentoSelecionado.itens?.map((item, idx) => (
                        <div key={idx} className="mb-1">
                          <div className="truncate">{item.descricao}</div>
                          <div className="flex justify-between text-[10px]">
                            <span className="w-1/2 truncate">{formatKz(item.preco_unitario)} x {item.quantidade}</span>
                            <span className="w-1/6 text-center"></span>
                            <span className="w-1/3 text-right font-semibold">{formatKz(item.total_linha)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totais */}
                    <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                      <div className="flex justify-between">
                        <span>Base Tributável:</span>
                        <span>{formatKz(documentoSelecionado.base_tributavel)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total IVA:</span>
                        <span>{formatKz(documentoSelecionado.total_iva)}</span>
                      </div>
                      {documentoSelecionado.total_retencao > 0 && (
                        <div className="flex justify-between">
                          <span>Retenção:</span>
                          <span>-{formatKz(documentoSelecionado.total_retencao)}</span>
                        </div>
                      )}

                      {/* VALOR PAGO - Apenas para Fatura-Recibo */}
                      {documentoSelecionado.tipo_documento === "FR" && (
                        <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                          <div className="flex justify-between font-bold text-green-700">
                            <span>VALOR PAGO:</span>
                            <span>{formatKz(documentoSelecionado.total_liquido)}</span>
                          </div>
                          <div className="text-[9px] text-gray-600 mt-0.5">
                            Método: {documentoSelecionado.metodo_pagamento || "Não especificado"}
                          </div>
                        </div>
                      )}

                      {/* Info para Fatura de Adiantamento no Talão */}
                      {documentoSelecionado.tipo_documento === "FA" && (
                        <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                          <div className="flex justify-between font-bold text-purple-700">
                            <span>ADIANTAMENTO:</span>
                            <span>{formatKz(documentoSelecionado.total_liquido)}</span>
                          </div>
                          <div className="text-[9px] text-gray-600 mt-0.5 text-center">
                            Aguardando vinculação
                          </div>
                        </div>
                      )}

                      {/* Info para Fatura Proforma no Talão */}
                      {documentoSelecionado.tipo_documento === "FP" && (
                        <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                          <div className="flex justify-between font-bold text-orange-700">
                            <span>PROFORMA:</span>
                            <span>{formatKz(documentoSelecionado.total_liquido)}</span>
                          </div>
                          <div className="text-[9px] text-gray-600 mt-0.5 text-center">
                            Documento prévio
                          </div>
                        </div>
                      )}

                      {/* Info para Recibo no Talão */}
                      {documentoSelecionado.tipo_documento === "RC" && (
                        <div className="border-t border-dashed border-gray-400 pt-1 mt-1">
                          <div className="flex justify-between font-bold text-teal-700">
                            <span>RECIBO:</span>
                            <span>{formatKz(documentoSelecionado.total_liquido)}</span>
                          </div>
                          <div className="text-[9px] text-gray-600 mt-0.5">
                            Método: {documentoSelecionado.metodo_pagamento || "Não especificado"}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-1 mt-1">
                        <span>TOTAL:</span>
                        <span>{formatKz(documentoSelecionado.total_liquido)}</span>
                      </div>
                    </div>

                    {/* Hash Fiscal */}
                    {documentoSelecionado.hash_fiscal && (
                      <div className="text-center text-[9px] break-all mb-2">
                        <p className="font-bold">Hash:</p>
                        <p>{documentoSelecionado.hash_fiscal}</p>
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
}): import("react/jsx-runtime").JSX.Element {
  return (
    <div className={`bg-white p-3 sm:p-4 rounded-xl shadow border border-gray-100 ${className}`}>
      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{title}</p>
      <p className={`font-bold ${color} ${isCurrency ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} break-words leading-tight`}>
        {value}
      </p>
    </div>
  );
}

// Componente TipoBadge atualizado com TIPO_LABEL e TIPO_CORES
function TipoBadge({ tipo }: { tipo: TipoDocumento }) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TIPO_CORES[tipo] || "bg-gray-100 text-gray-700"}`}>
      {TIPO_LABEL[tipo] || tipo}
    </span>
  );
}

// Componente EstadoBadge atualizado com ESTADO_CONFIGS
function EstadoBadge({ estado }: { estado?: EstadoDocumento }) {
  const config = estado ? ESTADO_CONFIGS[estado] : { bg: "bg-gray-100", text: "text-gray-700", label: "PENDENTE" };
  return (
    <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label.toUpperCase()}
    </span>
  );
}