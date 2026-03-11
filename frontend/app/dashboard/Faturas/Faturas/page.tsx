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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Função para baixar PDF gerado no frontend
  const baixarPdf = async (documento: DocumentoFiscal) => {
    if (!documento.id) return;

    try {
      setBaixandoPdf(documento.id);

      // Criar novo documento PDF
      const doc = new jsPDF();

      // Configurar fonte
      doc.setFont('helvetica');

      // Título
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80); // Cor escura
      doc.text(TIPO_LABEL[documento.tipo_documento] || documento.tipo_documento, 14, 20);

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 23, 196, 23);

      // Informações do documento
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);

      const docInfo = [
        [`Nº Documento:`, `${documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}`],
        [`Série:`, documento.serie],
        [`Data de Emissão:`, `${new Date(documento.data_emissao).toLocaleDateString("pt-AO")} ${documento.hora_emissao || ''}`],
      ];

      let yPos = 30;
      docInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 50, yPos);
        yPos += 6;
      });

      // Cliente
      yPos += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(documentoFiscalService.getNomeCliente(documento), 50, yPos);
      yPos += 6;

      const nifCliente = documentoFiscalService.getNifCliente(documento);
      if (nifCliente) {
        doc.setFont('helvetica', 'bold');
        doc.text('NIF:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(nifCliente, 50, yPos);
        yPos += 6;
      }

      yPos += 2;

      // Tabela de itens
      if (documento.itens && documento.itens.length > 0) {
        const tableColumn = ["Descrição", "Qtd", "Preço Unit.", "IVA", "Total"];
        const tableRows = documento.itens.map(item => [
          item.descricao,
          item.quantidade.toString(),
          formatKz(item.preco_unitario),
          item.taxa_iva ? `${item.taxa_iva}%` : '-',
          formatKz(item.total_linha)
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [tableColumn],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 30, halign: 'right' },
          },
        });

        // Posição após a tabela
        const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
        yPos = (lastTable?.finalY || yPos) + 10;
      } else {
        yPos += 10;
      }

      // Totais
      doc.setFontSize(10);

      // Base Tributável
      doc.setFont('helvetica', 'bold');
      doc.text('Base Tributável:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatKz(documento.base_tributavel), 196, yPos, { align: 'right' });
      yPos += 6;

      // Total IVA
      doc.setFont('helvetica', 'bold');
      doc.text('Total IVA:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatKz(documento.total_iva), 196, yPos, { align: 'right' });
      yPos += 6;

      // Total Retenção (se existir)
      if (documento.total_retencao && documento.total_retencao > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Total Retenção:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 53, 69); // Vermelho
        doc.text(`-${formatKz(documento.total_retencao)}`, 196, yPos, { align: 'right' });
        doc.setTextColor(100, 100, 100);
        yPos += 6;
      }

      // Linha separadora
      doc.setDrawColor(52, 152, 219);
      doc.line(14, yPos - 2, 196, yPos - 2);

      // Total Líquido
      yPos += 4;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(52, 152, 219);
      doc.text('TOTAL:', 14, yPos);
      doc.text(formatKz(documento.total_liquido), 196, yPos, { align: 'right' });

      // Observações (se existirem)
      if (documento.observacoes) {
        yPos += 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('Observações:', 14, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        const observacoes = doc.splitTextToSize(documento.observacoes, 180);
        doc.text(observacoes, 14, yPos);
      }

      // Hash Fiscal (se existir)
      if (documento.hash_fiscal) {
        yPos += 15;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Hash Fiscal:', 14, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const hash = doc.splitTextToSize(documento.hash_fiscal, 180);
        doc.text(hash, 14, yPos);
      }

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Documento gerado em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      // Salvar PDF
      const nomeArquivo = `${documento.tipo_documento}_${documento.numero_documento || 'documento'}.pdf`;
      doc.save(nomeArquivo);

    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
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
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar recibo";
      alert(errorMessage);
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
      <div className="space-y-3 pb-8 px-2 sm:px-0 max-w-7xl mx-auto" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>
              Faturas e Recibos
            </h1>
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              Total: {loading ? "..." : estatisticas.total} documentos
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="w-full sm:w-56 pl-8 pr-8 py-2 rounded-lg text-xs focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                  borderWidth: 1
                }}
              />
              <svg
                className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2"
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
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  style={{ color: colors.textSecondary }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={carregarDocumentos}
              disabled={loading}
              className="w-full sm:w-auto px-3 py-2 rounded-lg text-white disabled:opacity-50 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 touch-manipulation"
              style={{ backgroundColor: colors.primary }}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Atualizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="p-2.5 rounded-lg border text-xs"
            style={{
              backgroundColor: `${colors.danger}15`,
              borderColor: colors.danger
            }}
          >
            <p style={{ color: colors.danger }}>{error}</p>
            <button
              onClick={carregarDocumentos}
              className="mt-1 text-xs font-medium underline"
              style={{ color: colors.danger }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Filter Tabs - Compactos */}
        {!loading && !error && (
          <div
            className="rounded-xl border shadow-sm p-1.5"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}
          >
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {[
                { key: "FR" as TipoFiltro, label: "Faturas-Recibo", count: estatisticas.FR + estatisticas.RC },
                { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation whitespace-nowrap"
                  style={{
                    backgroundColor: filtro === key ? colors.primary : colors.hover,
                    color: filtro === key ? 'white' : colors.textSecondary,
                  }}
                >
                  <span>{label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px]`}
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
          className="rounded-xl border shadow-sm overflow-hidden"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}
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