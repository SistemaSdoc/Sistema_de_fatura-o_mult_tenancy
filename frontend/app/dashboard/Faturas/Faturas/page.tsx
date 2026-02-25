"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import {
  documentoFiscalService,
  DocumentoFiscal,
  TipoDocumento,
  FiltrosDocumento,
  GerarReciboDTO,
} from "@/services/DocumentoFiscal";

// Apenas FR e RC podem ser impressos
const TIPOS_IMPRESSAO: TipoDocumento[] = ['FR', 'RC'];

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

type TipoFiltro = "FR" | "FT";

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-7 gap-2 sm:gap-4 bg-gray-200 p-2 sm:p-4 rounded-t-lg min-w-[800px]">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded w-full" />
        ))}
      </div>
      {[...Array(5)].map((_, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-7 gap-2 sm:gap-4 p-2 sm:p-4 border-b border-gray-100 min-w-[800px]">
          {[...Array(7)].map((_, colIdx) => (
            <div key={colIdx} className="h-4 bg-gray-200 rounded w-full" />
          ))}
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
  const [filtro, setFiltro] = useState<TipoFiltro>("FR");
  const [termoPesquisa, setTermoPesquisa] = useState<string>("");
  const [documentoSelecionado, setDocumentoSelecionado] = useState<DocumentoFiscal | null>(null);
  const [modalTalaoAberto, setModalTalaoAberto] = useState(false);
  const [gerandoRecibo, setGerandoRecibo] = useState<string | null>(null);

  const carregarDocumentos = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const filtros: FiltrosDocumento = {
        per_page: 100,
      };
      const resultado = await documentoFiscalService.listar(filtros);
      if (!resultado || !resultado.data) {
        throw new Error("Não foi possível carregar os documentos");
      }
      setDocumentos(resultado.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar documentos";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  const podeImprimir = (tipo: TipoDocumento): boolean => {
    return TIPOS_IMPRESSAO.includes(tipo);
  };

  const podeGerarRecibo = (documento: DocumentoFiscal): boolean => {
    return documento.tipo_documento === "FT" &&
      !["cancelado", "paga"].includes(documento.estado);
  };

  const verDetalhes = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/dashboard/Faturas/Faturas/${documento.id}/Ver`);
    }
  };

  const gerarRecibo = async (documento: DocumentoFiscal) => {
    if (!documento.id) return;

    try {
      setGerandoRecibo(documento.id);
      const dados: GerarReciboDTO = {
        valor: documento.total_liquido,
        metodo_pagamento: "dinheiro",
        data_pagamento: new Date().toISOString().split('T')[0],
      };

      await documentoFiscalService.gerarRecibo(documento.id, dados);
      await carregarDocumentos();
      alert("Recibo gerado com sucesso!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar recibo";
      alert(errorMessage);
    } finally {
      setGerandoRecibo(null);
    }
  };

  const documentosFiltrados = useMemo(() => {
    let docs = documentos.filter((d) => ["FT", "FR", "RC"].includes(d.tipo_documento));

    if (filtro === "FR") {
      docs = docs.filter((d) => d.tipo_documento === "FR" || d.tipo_documento === "RC");
    } else {
      docs = docs.filter((d) => d.tipo_documento === "FT");
    }

    if (termoPesquisa.trim()) {
      const termo = termoPesquisa.toLowerCase();
      docs = docs.filter((d) => {
        const numeroDoc = (d.numero_documento || `${d.serie}-${String(d.numero).padStart(5, '0')}`).toLowerCase();
        const nomeCliente = documentoFiscalService.getNomeCliente(d).toLowerCase();
        const nifCliente = (documentoFiscalService.getNifCliente(d) || "").toLowerCase();

        return numeroDoc.includes(termo) ||
          nomeCliente.includes(termo) ||
          nifCliente.includes(termo);
      });
    }

    docs.sort((a, b) => {
      const dateA = new Date(`${a.data_emissao}T${a.hora_emissao || '00:00:00'}`).getTime();
      const dateB = new Date(`${b.data_emissao}T${b.hora_emissao || '00:00:00'}`).getTime();
      return dateB - dateA;
    });

    return docs;
  }, [documentos, filtro, termoPesquisa]);

  const estatisticas = useMemo(() => ({
    total: documentos.filter((d) => ["FT", "FR", "RC"].includes(d.tipo_documento)).length,
    FT: documentos.filter((d) => d.tipo_documento === "FT").length,
    FR: documentos.filter((d) => d.tipo_documento === "FR").length,
    RC: documentos.filter((d) => d.tipo_documento === "RC").length,
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

  const formatQuantidade = (qtd: number | string | undefined): string => {
    const num = Number(qtd) || 0;
    return Math.round(num).toString();
  };

  const abrirModalTalao = (documento: DocumentoFiscal) => {
    setDocumentoSelecionado(documento);
    setModalTalaoAberto(true);
  };

  const fecharModais = () => {
    setModalTalaoAberto(false);
    setDocumentoSelecionado(null);
  };

  const imprimirTalao = () => {
    const conteudo = document.getElementById("area-talao");
    if (!conteudo) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Talão</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 0;
            width: 80mm;
            font-size: 12px;
            line-height: 1.4;
          }
          * { box-sizing: border-box; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 14px; }
          .text-base { font-size: 12px; }
          .text-xs { font-size: 10px; }
          .border-b { border-bottom: 1px dashed #666; }
          .border-b-2 { border-bottom: 2px dashed #666; }
          .border-t { border-top: 1px dashed #666; }
          .border-t-2 { border-top: 2px solid #333; }
          .pb-2 { padding-bottom: 8px; }
          .pb-3 { padding-bottom: 12px; }
          .pt-1 { padding-top: 4px; }
          .pt-2 { padding-top: 8px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .w-1\\/2 { width: 50%; }
          .w-1\\/3 { width: 33.333%; }
          .w-1\\/6 { width: 16.666%; }
          .truncate { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .break-all { word-break: break-all; }
        </style>
      </head>
      <body>
        <div style="width:80mm; padding:4mm;">
          ${conteudo.innerHTML}
        </div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
            setTimeout(() => {
              window.close();
            }, 100);
          };
        </script>
      </body>
    </html>
  `);
    doc.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <MainEmpresa>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#123859] leading-tight">
              Faturas e Recibos
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Total: {loading ? "..." : estatisticas.total} documentos emitidos
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Pesquisar por nº, cliente ou NIF..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123859] focus:border-transparent text-sm"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

        {!loading && !error && (
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow border border-gray-100">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
              {[
                { key: "FR" as TipoFiltro, label: "Faturas-Recibo", count: estatisticas.FR + estatisticas.RC },
                { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="overflow-x-auto">
              <TableSkeleton />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-[#123859] text-white">
                    <tr>
                      <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap">Nº Documento</th>
                      <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap">Série</th>
                      <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap">Cliente</th>
                      <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap">Tipo</th>
                      <th className="p-2 lg:p-3 text-left font-semibold text-xs sm:text-sm whitespace-nowrap">Data</th>
                      <th className="p-2 lg:p-3 text-right font-semibold text-xs sm:text-sm whitespace-nowrap">Total</th>
                      <th className="p-2 lg:p-3 text-center font-semibold text-xs sm:text-sm whitespace-nowrap min-w-[200px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documentosFiltrados.map((documento) => {
                      const tipo = documento.tipo_documento;
                      const podeImprimirDoc = podeImprimir(tipo);
                      const podeGerarReciboDoc = podeGerarRecibo(documento);
                      return (
                        <tr key={documento.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-2 lg:p-3 font-bold text-[#123859] text-xs sm:text-sm whitespace-nowrap">
                            {documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}
                          </td>
                          <td className="p-2 lg:p-3 text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                            {documento.serie}
                          </td>
                          <td className="p-2 lg:p-3">
                            <div className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[150px] lg:max-w-[200px]">
                              {documentoFiscalService.getNomeCliente(documento)}
                            </div>
                            {documentoFiscalService.getNifCliente(documento) && (
                              <div className="text-xs text-gray-500">
                                NIF: {documentoFiscalService.getNifCliente(documento)}
                              </div>
                            )}
                          </td>
                          <td className="p-2 lg:p-3">
                            <TipoBadge tipo={tipo} />
                          </td>
                          <td className="p-2 lg:p-3 text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                            <div>{new Date(documento.data_emissao).toLocaleDateString("pt-AO")}</div>
                            <div className="text-xs text-gray-400">{documento.hora_emissao}</div>
                          </td>
                          <td className="p-2 lg:p-3 text-right font-bold text-[#123859] text-xs sm:text-sm whitespace-nowrap">
                            {formatKz(documento.total_liquido)}
                          </td>
                          <td className="p-2 lg:p-3 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <button
                                onClick={() => verDetalhes(documento)}
                                className="p-1.5 sm:p-2 text-[#123859] hover:bg-[#123859]/10 rounded-lg transition-colors touch-manipulation"
                                title="Ver detalhes"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Botão Gerar Recibo para FT */}
                              {podeGerarReciboDoc && (
                                <button
                                  onClick={() => gerarRecibo(documento)}
                                  disabled={gerandoRecibo === documento.id}
                                  className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
                                  title="Gerar Recibo"
                                >
                                  {gerandoRecibo === documento.id ? (
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
                                  ) : (
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </button>
                              )}

                              {/* Botão Imprimir Talão (apenas FR e RC) */}
                              {podeImprimirDoc && (
                                <button
                                  onClick={() => abrirModalTalao(documento)}
                                  className="p-1.5 sm:p-2 text-[#F9941F] hover:bg-[#F9941F]/10 rounded-lg transition-colors touch-manipulation"
                                  title="Imprimir Talão"
                                >
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

              {documentosFiltrados.length === 0 && !loading && (
                <div className="p-8 sm:p-12 text-center text-gray-500">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-medium">Nenhum documento encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {termoPesquisa ? "Tente ajustar a pesquisa" : "Tente ajustar os filtros"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {modalTalaoAberto && documentoSelecionado && podeImprimir(documentoSelecionado.tipo_documento) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
            onClick={fecharModais}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] max-h-[95vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#123859] text-white px-4 py-3 flex justify-between items-center shrink-0">
                <div className="min-w-0 flex-1 mr-2">
                  <h2 className="text-lg font-bold truncate">
                    {documentoSelecionado.tipo_documento === "RC" ? "Recibo" : "Fatura-Recibo"}
                  </h2>
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

              <div id="area-talao" className="flex-1 overflow-y-auto p-0 bg-gray-100">
                <div className="bg-white mx-auto" style={{ width: '80mm', minHeight: '100%' }}>
                  <div className="p-4 font-mono text-xs leading-tight">
                    <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
                      <Image src="/images/4.png" alt="Logo Faturajá" width={64} height={64} className="mx-auto mb-2 w-16 h-16 object-contain" />
                      <h1 className="text-lg font-bold uppercase mb-1">Faturajá</h1>
                      <p className="text-[10px]">NIF: ****************</p>
                      <p className="text-[10px]">Endereço:************** </p>
                      <p className="text-[10px]">Tel: +244 **************</p>
                    </div>

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

                    <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                      <p className="font-bold">Cliente:{documentoFiscalService.getNomeCliente(documentoSelecionado)}</p>
                      {documentoFiscalService.getNifCliente(documentoSelecionado) && (
                        <p className="text-[10px]">NIF: {documentoFiscalService.getNifCliente(documentoSelecionado)}</p>
                      )}
                    </div>

                    <div className="border-b-2 border-dashed border-gray-400 pb-2 mb-2">
                      <div className="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1">
                        <span className="w-1/2">Descrição</span>
                        <span className="w-1/6 text-center">Qtd</span>
                        <span className="w-1/3 text-right">Total</span>
                      </div>
                      {documentoSelecionado.itens && documentoSelecionado.itens.length > 0 ? (
                        documentoSelecionado.itens.map((item, idx) => (
                          <div key={idx} className="mb-1">
                            <div className="truncate text-[10px]">{item.descricao}</div>
                            <div className="flex justify-between text-[10px]">
                              <span className="w-1/2 truncate">{formatKz(item.preco_unitario)}</span>
                              <span className="w-1/6 text-center">{formatQuantidade(item.quantidade)}</span>
                              <span className="w-1/3 text-right font-semibold">{formatKz(item.total_linha)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-[10px] text-gray-500 py-2">Nenhum item</div>
                      )}
                    </div>

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

                      <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-1 mt-1">
                        <span>TOTAL:</span>
                        <span>{formatKz(documentoSelecionado.total_liquido)}</span>
                      </div>
                    </div>

                    {documentoSelecionado.hash_fiscal && (
                      <div className="text-center text-[9px] break-all mb-2">
                        <p className="font-bold">Hash:</p>
                        <p>{documentoSelecionado.hash_fiscal}</p>
                      </div>
                    )}

                    <div className="text-center text-[10px] pt-2 border-t border-dashed border-gray-400">
                      <p>Coordenadas bancárias</p>
                      <p>Bai:00000000000000000000000000000</p>
                       <p>Bic:0000000000000000000000000000</p>
                      <p className="mt-2 font-bold text-center">
                        Obrigado pela preferência!
                      </p>
                      <p className="mt-2 text-center">
                        *** Fim do Documento ***
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .touch-manipulation {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
        `}</style>
      </div>
    </MainEmpresa>
  );
}

function TipoBadge({ tipo }: { tipo: TipoDocumento }) {
  const cores: Record<string, string> = {
    "FT": "bg-blue-100 text-blue-700",
    "FR": "bg-green-100 text-green-700",
    "RC": "bg-teal-100 text-teal-700",
  };

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${cores[tipo] || "bg-gray-100 text-gray-700"}`}>
      {TIPO_LABEL[tipo] || tipo}
    </span>
  );
}