"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { vendaService, Venda } from "@/services/vendas";

// Removemos duplicatas baseado no ID da fatura ou da venda
const removerDuplicatas = (vendas: Venda[]): Venda[] => {
  const vistas = new Set<string>();
  return vendas.filter((v) => {
    const id = v.fatura?.id || v.id;
    if (vistas.has(id)) return false;
    vistas.add(id);
    return true;
  });
};

// Mapeamento de tipos
const TIPO_MAP: Record<string, string> = {
  "FT": "fatura",
  "FR": "recibo",
  "NC": "nota_credito",
  "ND": "nota_debito",
};

const TIPO_LABEL: Record<string, string> = {
  "FT": "Fatura",
  "FR": "Fatura-Recibo",
  "NC": "Nota de Crédito",
  "ND": "Nota de Débito",
};

type TipoFiltro = "todas" | "FT" | "FR" | "NC" | "ND";

export default function FaturasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<TipoFiltro>("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);

  /* ================== CARREGAR APENAS VENDAS FATURADAS ================== */
  const carregarFaturas = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Buscando vendas...");
      const data = await vendaService.listarVendas();
      console.log("✅ Vendas recebidas:", data.length);

      const vendasFaturadas = data.filter((venda) => {
        return venda.faturado === true || venda.status === "faturada";
      });

      const unicas = removerDuplicatas(vendasFaturadas);
      console.log("📋 Vendas faturadas únicas:", unicas.length);

      setVendas(unicas);
    } catch (err: any) {
      console.error("❌ Erro:", err);
      setError(err?.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarFaturas();
  }, [carregarFaturas]);

  /* ================== HELPERS ================== */
  const getTipo = (venda: Venda): string => {
    return venda.fatura?.tipo_documento || venda.tipo_documento || "-";
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
    NC: vendas.filter((v) => getTipo(v) === "NC").length,
    ND: vendas.filter((v) => getTipo(v) === "ND").length,
    totalGeral: vendas.reduce((acc, v) => acc + (Number(v.total) || 0), 0),
  }), [vendas]);

  const formatKz = (valor: number | string | undefined): string => {
    const num = Number(valor) || 0;
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
    }).format(num);
  };

  /* ================== MODAL ================== */
  const abrirModal = (venda: Venda) => {
    setVendaSelecionada(venda);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setVendaSelecionada(null);
  };

  const imprimirFatura = () => {
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
              Faturas / Documentos Fiscais
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Total: {estatisticas.total} documentos fiscais emitidos
            </p>
          </div>

          <button
            onClick={carregarFaturas}
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
              onClick={carregarFaturas} 
              className="mt-2 text-red-600 hover:underline text-sm font-medium"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Estatísticas - Grid Responsivo Otimizado */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            <StatCard title="Total" value={estatisticas.total} color="text-[#F9941F]" />
            <StatCard title="Faturas (FT)" value={estatisticas.FT} color="text-[#123859]" />
            <StatCard title="Faturas-Recibo (FR)" value={estatisticas.FR} color="text-[#F9941F]" />
            <StatCard title="Notas Crédito" value={estatisticas.NC} color="text-[#123859]" />
            <StatCard 
              title="Total Geral" 
              value={formatKz(estatisticas.totalGeral)} 
              color="text-[#F9941F]" 
              isCurrency 
              className="col-span-2 sm:col-span-1"
            />
          </div>
        )}

        {/* Filtros - Scroll Horizontal em Mobile */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow border border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
            {[
              { key: "todas" as TipoFiltro, label: "Todas", count: estatisticas.total },
              { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
              { key: "FR" as TipoFiltro, label: "Faturas-Recibo", count: estatisticas.FR },
              { key: "NC" as TipoFiltro, label: "Notas Crédito", count: estatisticas.NC },
              { key: "ND" as TipoFiltro, label: "Notas Débito", count: estatisticas.ND },
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

        {/* Tabela/Lista Responsiva */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#123859]/20 border-t-[#123859] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Desktop: Tabela com Scroll Horizontal */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-[#123859] text-white">
                    <tr>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Nº Documento</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Série</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Cliente</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Tipo</th>
                      <th className="p-3 lg:p-4 text-left font-semibold text-sm whitespace-nowrap">Data</th>
                      <th className="p-3 lg:p-4 text-right font-semibold text-sm whitespace-nowrap">Total</th>
                      <th className="p-3 lg:p-4 text-center font-semibold text-sm whitespace-nowrap">Estado</th>
                      <th className="p-3 lg:p-4 text-center font-semibold text-sm whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vendasFiltradas.map((venda) => {
                      const tipo = getTipo(venda);
                      const numeroFatura = venda.fatura?.numero || venda.numero;

                      return (
                        <tr key={venda.fatura?.id || venda.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 lg:p-4 font-bold text-[#123859] text-sm whitespace-nowrap">
                            {numeroFatura}
                          </td>
                          <td className="p-3 lg:p-4 text-gray-600 text-sm whitespace-nowrap">
                            {venda.fatura?.serie || venda.serie}
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
                            <EstadoBadge estado={venda.fatura?.estado || venda.status} />
                          </td>
                          <td className="p-3 lg:p-4 text-center">
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
                  const numeroFatura = venda.fatura?.numero || venda.numero;

                  return (
                    <div 
                      key={venda.fatura?.id || venda.id} 
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
                            Série: {venda.fatura?.serie || venda.serie}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#123859] text-base sm:text-lg">
                            {formatKz(venda.total)}
                          </p>
                          <EstadoBadge estado={venda.fatura?.estado || venda.status} />
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

                      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
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
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Estado Vazio - Responsivo */}
              {vendasFiltradas.length === 0 && (
                <div className="p-8 sm:p-12 text-center text-gray-500">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-medium">Nenhuma fatura encontrada</p>
                  <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ================== MODAL 100% RESPONSIVO ================== */}
        {modalAberto && vendaSelecionada && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" 
            onClick={fecharModal}
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
                    {TIPO_LABEL[vendaSelecionada.fatura?.tipo_documento || ""]} Nº {vendaSelecionada.fatura?.numero || vendaSelecionada.numero}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button 
                    onClick={imprimirFatura} 
                    className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                    title="Imprimir"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  <button 
                    onClick={fecharModal} 
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
                          {TIPO_LABEL[vendaSelecionada.fatura?.tipo_documento || ""]}
                        </p>
                        <p className="text-base sm:text-lg font-semibold mt-1 sm:mt-2">
                          Nº {vendaSelecionada.fatura?.numero || vendaSelecionada.numero}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">Série: {vendaSelecionada.fatura?.serie || vendaSelecionada.serie}</p>
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
                        <EstadoBadge estado={vendaSelecionada.fatura?.estado || vendaSelecionada.status} />
                      </p>
                      {vendaSelecionada.fatura?.hash_fiscal && (
                        <p className="text-xs text-gray-400 mt-2 break-all">
                          Hash: {vendaSelecionada.fatura.hash_fiscal}
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
                          <span>Base Tributável:</span>
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
                <button 
                  onClick={fecharModal} 
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium min-h-[44px] touch-manipulation"
                >
                  Fechar
                </button>
                <button 
                  onClick={imprimirFatura} 
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-[#F9941F] text-white rounded-lg hover:bg-[#d9831a] transition-colors flex items-center justify-center gap-2 text-sm font-medium min-h-[44px] touch-manipulation"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="whitespace-nowrap">Imprimir / PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Estilos de impressão otimizados */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
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

function TipoBadge({ tipo }: { tipo: string }) {
  const cores: Record<string, string> = {
    "FT": "bg-blue-100 text-blue-700",
    "FR": "bg-purple-100 text-purple-700",
    "NC": "bg-orange-100 text-orange-700",
    "ND": "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${cores[tipo] || "bg-gray-100 text-gray-700"}`}>
      {TIPO_LABEL[tipo] || tipo}
    </span>
  );
}

function EstadoBadge({ estado }: { estado?: string }) {
  const configs: Record<string, { bg: string; text: string }> = {
    emitido: { bg: "bg-green-100", text: "text-green-700" },
    emitida: { bg: "bg-green-100", text: "text-green-700" },
    pago: { bg: "bg-blue-100", text: "text-blue-700" },
    anulado: { bg: "bg-red-100", text: "text-red-700" },
    faturada: { bg: "bg-green-100", text: "text-green-700" },
  };
  const config = configs[estado?.toLowerCase() || ""] || { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {(estado || "PENDENTE").toUpperCase()}
    </span>
  );
}