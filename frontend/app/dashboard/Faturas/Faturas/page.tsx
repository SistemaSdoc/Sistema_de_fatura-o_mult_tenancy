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
import { RefreshCw, Search, X } from "lucide-react";

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
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);

  const carregarDocumentos = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const filtros: FiltrosDocumento = { per_page: 100 };
      const resultado = await documentoFiscalService.listar(filtros);
      if (!resultado || !resultado.data) {
        throw new Error("Não foi possível carregar os documentos");
      }
      // O service já ordena por mais recente primeiro
      setDocumentos(resultado.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  /**
   * Download do PDF via backend (DomPDF).
   * Remove toda a geração jsPDF do frontend — mais simples e melhor qualidade.
   */
  const baixarPdf = async (documento: DocumentoFiscal) => {
    if (!documento.id) return;
    try {
      setBaixandoPdf(documento.id);
      const nomeArquivo = `${documento.tipo_documento}_${documento.numero_documento || documento.id}.pdf`;
      await documentoFiscalService.downloadPdf(documento.id, nomeArquivo);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      alert('Erro ao baixar PDF. Tente novamente.');
    } finally {
      setBaixandoPdf(null);
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
        return numeroDoc.includes(termo) || nomeCliente.includes(termo) || nifCliente.includes(termo);
      });
    }

    // Garante ordenação por mais recente primeiro (o service já faz isto,
    // mas re-aplica aqui para o caso de filtros/pesquisa alterarem a ordem)
    docs.sort((a, b) => {
      const dtA = new Date(`${a.data_emissao}T${a.hora_emissao || '00:00:00'}`).getTime();
      const dtB = new Date(`${b.data_emissao}T${b.hora_emissao || '00:00:00'}`).getTime();
      if (dtB !== dtA) return dtB - dtA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
    return Math.round(Number(qtd) || 0).toString();
  };

  const verDetalhes = (documento: DocumentoFiscal) => {
    if (documento.id) {
      router.push(`/dashboard/Faturas/Faturas/${documento.id}/Ver`);
    }
  };

  const gerarRecibo = async (documento: DocumentoFiscal): Promise<DocumentoFiscal | void> => {
    if (!documento.id) return;
    try {
      setGerandoRecibo(documento.id);
      const dados: GerarReciboDTO = {
        valor: documento.total_liquido,
        metodo_pagamento: "dinheiro",
        data_pagamento: new Date().toISOString().split('T')[0],
      };
      const reciboGerado = await documentoFiscalService.gerarRecibo(documento.id, dados);
      await carregarDocumentos();
      return reciboGerado;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao gerar recibo");
      throw err;
    } finally {
      setGerandoRecibo(null);
    }
  };

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
      <div
        className="space-y-4 pb-8 px-3 sm:px-4 max-w-7xl mx-auto"
        style={{ backgroundColor: colors.background }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.primary }}>
              Faturas e Recibos
            </h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Total: {loading ? "..." : estatisticas.total} documentos
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Pesquisa */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Pesquisar por nº, cliente, NIF..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                  borderWidth: 1,
                }}
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{ color: colors.textSecondary }}
              />
              {termoPesquisa && (
                <button
                  onClick={() => setTermoPesquisa("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: colors.textSecondary }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Actualizar */}
            <button
              onClick={carregarDocumentos}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-white disabled:opacity-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 touch-manipulation"
              style={{ backgroundColor: colors.primary }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin shrink-0" />
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} className="shrink-0" />
                  <span>Atualizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div
            className="p-3.5 rounded-lg border text-sm"
            style={{ backgroundColor: `${colors.danger}15`, borderColor: colors.danger }}
          >
            <p style={{ color: colors.danger }}>{error}</p>
            <button
              onClick={carregarDocumentos}
              className="mt-1.5 text-sm font-medium underline"
              style={{ color: colors.danger }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Filtros */}
        {!loading && !error && (
          <div
            className="rounded-xl border shadow-sm p-2"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {[
                { key: "FR" as TipoFiltro, label: "Faturas-Recibo / Recibo", count: estatisticas.FR + estatisticas.RC },
                { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation whitespace-nowrap flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: filtro === key ? colors.primary : colors.hover,
                    color: filtro === key ? 'white' : colors.textSecondary,
                  }}
                >
                  <span>{label}</span>
                  <span
                    className="ml-1 px-2 py-0.5 rounded-full text-xs"
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

        {/* Tabela */}
        <div
          className="rounded-xl border shadow-sm overflow-hidden"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <InvoiceTable
            documentos={documentosFiltrados}
            loading={loading}
            gerandoRecibo={gerandoRecibo}
            baixandoPdf={baixandoPdf}
            onVerDetalhes={verDetalhes}
            onGerarRecibo={gerarRecibo}
            onImprimirTalao={abrirModalTalao}
            onBaixarPdf={baixarPdf}
            onReciboGerado={handleReciboGerado}
            formatKz={formatKz}
            formatQuantidade={formatQuantidade}
            documentoFiscalService={documentoFiscalService}
            colors={colors}
          />
        </div>

        {/* Modal talão */}
        <PrintReceipt
          documento={documentoSelecionado}
          isOpen={modalTalaoAberto}
          onClose={fecharModais}
          formatKz={formatKz}
          formatQuantidade={formatQuantidade}
          documentoFiscalService={{
            getTipoDocumentoNome: (tipo) => TIPO_LABEL[tipo] || tipo,
            getNomeCliente: documentoFiscalService.getNomeCliente.bind(documentoFiscalService),
            getNifCliente: documentoFiscalService.getNifCliente.bind(documentoFiscalService),
          }}
        />

        <style jsx global>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .touch-manipulation { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        `}</style>
      </div>
    </MainEmpresa>
  );
}