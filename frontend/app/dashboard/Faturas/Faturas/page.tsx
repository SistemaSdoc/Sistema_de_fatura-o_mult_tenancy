"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useRouter } from "next/navigation";
import InvoiceTable from "@/app/components/Faturas/InvoiceTable";
import PrintReceipt from "@/app/components/Faturas/PrintReceipt";
import {
  documentoFiscalService,
  DocumentoFiscal,
  TipoDocumento,
  FiltrosDocumento,
  GerarReciboDTO,
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";

type TipoFiltro = "FR" | "FT";

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

export default function FaturasPage() {
  const router = useRouter();
  const colors = useThemeColors();
  
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

  const verDetalhes = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/dashboard/Faturas/Faturas/${documento.id}/Ver`);
    }
  };

  // Handler que gera o recibo e retorna o documento gerado para o InvoiceTable
  const gerarRecibo = async (documento: DocumentoFiscal): Promise<DocumentoFiscal | void> => {
    if (!documento.id) return;

    try {
      setGerandoRecibo(documento.id);
      const dados: GerarReciboDTO = {
        valor: documento.total_liquido,
        metodo_pagamento: "dinheiro",
        data_pagamento: new Date().toISOString().split('T')[0],
      };

      // Chama a API e retorna o recibo gerado
      const reciboGerado = await documentoFiscalService.gerarRecibo(documento.id, dados);
      
      // Recarrega a lista de documentos
      await carregarDocumentos();
      
      // Retorna o recibo gerado para que o InvoiceTable possa abrir o modal
      return reciboGerado;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar recibo";
      alert(errorMessage);
      throw err;
    } finally {
      setGerandoRecibo(null);
    }
  };

  // Handler chamado quando o recibo é gerado com sucesso - abre o modal automaticamente
  const handleReciboGerado = (recibo: DocumentoFiscal) => {
    setDocumentoSelecionado(recibo);
    setModalTalaoAberto(true);
  };

  const abrirModalTalao = (documento: DocumentoFiscal) => {
    setDocumentoSelecionado(documento);
    setModalTalaoAberto(true);
  };

  const fecharModais = () => {
    setModalTalaoAberto(false);
    setDocumentoSelecionado(null);
  };

  return (
    <MainEmpresa>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 transition-colors duration-300" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight" style={{ color: colors.primary }}>
              Faturas e Recibos
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
              Total: {loading ? "..." : estatisticas.total} documentos emitidos
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Pesquisar por nº, cliente ou NIF..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-sm"
                style={{ 
                  backgroundColor: colors.card, 
                  borderColor: colors.border,
                  color: colors.text,
                  borderWidth: 1
                }}
              />
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{ color: colors.textSecondary }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {termoPesquisa && (
                <button
                  onClick={() => setTermoPesquisa("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                  style={{ color: colors.textSecondary }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={carregarDocumentos}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
              style={{ backgroundColor: colors.primary }}
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

        {/* Error Message */}
        {error && (
          <div 
            className="p-3 sm:p-4 border rounded-lg"
            style={{ 
              backgroundColor: `${colors.danger}20`, 
              borderColor: colors.danger 
            }}
          >
            <p className="text-sm sm:text-base" style={{ color: colors.danger }}>{error}</p>
            <button
              onClick={carregarDocumentos}
              className="mt-2 text-sm font-medium underline"
              style={{ color: colors.danger }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        {!loading && !error && (
          <div 
            className="p-3 sm:p-4 rounded-xl shadow border"
            style={{ 
              backgroundColor: colors.card, 
              borderColor: colors.border 
            }}
          >
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
              {[
                { key: "FR" as TipoFiltro, label: "Faturas-Recibo", count: estatisticas.FR + estatisticas.RC },
                { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] touch-manipulation`}
                  style={{
                    backgroundColor: filtro === key ? colors.primary : colors.hover,
                    color: filtro === key ? 'white' : colors.textSecondary,
                  }}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  <span 
                    className={`ml-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-xs`}
                    style={{
                      backgroundColor: filtro === key ? 'rgba(255,255,255,0.2)' : colors.card,
                    }}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table Container */}
        <div 
          className="rounded-xl shadow-lg border overflow-hidden"
          style={{ 
            backgroundColor: colors.card, 
            borderColor: colors.border 
          }}
        >
          <InvoiceTable
            documentos={documentosFiltrados}
            loading={loading}
            gerandoRecibo={gerandoRecibo}
            onVerDetalhes={verDetalhes}
            onGerarRecibo={gerarRecibo}
            onImprimirTalao={abrirModalTalao}
            onReciboGerado={handleReciboGerado}
            formatKz={formatKz}
            formatQuantidade={formatQuantidade}
            documentoFiscalService={{
              getNomeCliente: documentoFiscalService.getNomeCliente,
              getNifCliente: documentoFiscalService.getNifCliente,
            }}
            colors={colors}
          />
        </div>

        {/* Print Receipt Modal */}
        <PrintReceipt
          documento={documentoSelecionado}
          isOpen={modalTalaoAberto}
          onClose={fecharModais}
          formatKz={formatKz}
          formatQuantidade={formatQuantidade}
          documentoFiscalService={{
            getTipoDocumentoNome: (tipo) => TIPO_LABEL[tipo] || tipo,
            getNomeCliente: documentoFiscalService.getNomeCliente,
            getNifCliente: documentoFiscalService.getNifCliente,
          }}
        />

        {/* Global Styles */}
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