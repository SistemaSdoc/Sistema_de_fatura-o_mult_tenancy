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
import { RefreshCw, Search, X } from "lucide-react";
import QRCode from 'qrcode';

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

// Informações da empresa
const EMPRESA = {
  nome: "FATURAJÁ",
  nif: "5417243423",
  endereco: "Luanda, Angola",
  telefone: "+244 999 999 999",
  email: "geral@faturaja.co.ao",
  website: "www.faturaja.co.ao",
  logo: "/images/4.png",
  banco: "BAI", 
  iban: "AO06 0004 0000 1234 5678 9012 3",
  nib: "000400001234567890123"
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

  // Função para carregar imagem como base64
  const carregarImagemComoBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      return '';
    }
  };

  // Função para gerar QR Code
  const gerarQRCode = async (texto: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(texto, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      return '';
    }
  };

  // Função para baixar PDF gerado no frontend
  const baixarPdf = async (documento: DocumentoFiscal) => {
    if (!documento.id) return;

    try {
      setBaixandoPdf(documento.id);

      // Criar novo documento PDF - formato A4
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Margens do documento
      const marginLeft = 20;
      const marginRight = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - marginLeft - marginRight;

      let yPos = 20;

      // --- CARREGAR LOGO ---
      try {
        const logoBase64 = await carregarImagemComoBase64(EMPRESA.logo);
        if (logoBase64) {
          // Adicionar logo (esquerda)
          doc.addImage(logoBase64, 'PNG', marginLeft, yPos, 25, 25);
          
          // Nome da empresa ao lado da logo
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text(EMPRESA.nome, marginLeft + 30, yPos + 10);
          
          // Informações da empresa à direita
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(`NIF: ${EMPRESA.nif}`, pageWidth - marginRight - 60, yPos + 5);
          doc.text(`Tel: ${EMPRESA.telefone}`, pageWidth - marginRight - 60, yPos + 10);
          doc.text(`Email: ${EMPRESA.email}`, pageWidth - marginRight - 60, yPos + 15);
        }
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
        // Se não conseguir carregar a logo, mostra apenas o título
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 152, 219);
        doc.text(EMPRESA.nome, marginLeft, yPos + 10);
      }

      yPos += 30;

      // --- TÍTULO DO DOCUMENTO ---
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(TIPO_LABEL[documento.tipo_documento] || documento.tipo_documento, marginLeft, yPos);

      // Número do documento ao lado do título
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Nº: ${documento.numero_documento || `${documento.serie}-${String(documento.numero).padStart(5, '0')}`}`, pageWidth - marginRight - 50, yPos);

      yPos += 10;

      // --- LINHA SEPARADORA ---
      doc.setDrawColor(52, 152, 219);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
      yPos += 8;

      // --- INFORMAÇÕES DO DOCUMENTO (EM DUAS COLUNAS) ---
      doc.setFontSize(10);
      
      // Coluna esquerda
      doc.setFont('helvetica', 'bold');
      doc.text('Data de Emissão:', marginLeft, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${new Date(documento.data_emissao).toLocaleDateString("pt-AO")} ${documento.hora_emissao || ''}`, marginLeft + 35, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Série:', marginLeft, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(documento.serie, marginLeft + 35, yPos);
      yPos += 6;

      if (documento.data_vencimento) {
        doc.setFont('helvetica', 'bold');
        doc.text('Data Vencimento:', marginLeft, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(documento.data_vencimento).toLocaleDateString("pt-AO"), marginLeft + 35, yPos);
        yPos += 6;
      }

      // Coluna direita - Cliente
      const clienteY = yPos - 18; // Ajustar para alinhar com a coluna esquerda
      
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente:', pageWidth / 2 + 10, clienteY);
      doc.setFont('helvetica', 'normal');
      const nomeCliente = documentoFiscalService.getNomeCliente(documento);
      const nomeClienteLinhas = doc.splitTextToSize(nomeCliente, contentWidth / 2 - 10);
      doc.text(nomeClienteLinhas, pageWidth / 2 + 10, clienteY + 6);
      
      const nifCliente = documentoFiscalService.getNifCliente(documento);
      if (nifCliente) {
        doc.setFont('helvetica', 'bold');
        doc.text('NIF:', pageWidth / 2 + 10, clienteY + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(nifCliente, pageWidth / 2 + 25, clienteY + 12);
      }

      yPos += 10;

      // --- TABELA DE ITENS ---
      if (documento.itens && documento.itens.length > 0) {
        const tableColumn = ["Descrição", "Qtd", "Preço Unit. (Kz)", "IVA", "Total (Kz)"];
        const tableRows = documento.itens.map(item => [
          item.descricao,
          item.quantidade.toString(),
          formatKz(item.preco_unitario).replace('Kz', '').trim(),
          item.taxa_iva ? `${item.taxa_iva}%` : '-',
          formatKz(item.total_linha).replace('Kz', '').trim()
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [tableColumn],
          body: tableRows,
          theme: 'striped',
          headStyles: { 
            fillColor: [52, 152, 219], 
            textColor: [255, 255, 255], 
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 35, halign: 'right' },
          },
          margin: { left: marginLeft, right: marginRight },
        });

        const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
        yPos = (lastTable?.finalY || yPos) + 10;
      } else {
        yPos += 10;
      }

      // --- TOTAIS (LADO DIREITO) ---
      const totalsX = pageWidth - marginRight - 80;
      
      doc.setFontSize(10);
      
      // Base Tributável
      doc.setFont('helvetica', 'normal');
      doc.text('Base Tributável:', totalsX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(formatKz(documento.base_tributavel), pageWidth - marginRight, yPos, { align: 'right' });
      yPos += 6;

      // Total IVA
      doc.setFont('helvetica', 'normal');
      doc.text('Total IVA:', totalsX, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(formatKz(documento.total_iva), pageWidth - marginRight, yPos, { align: 'right' });
      yPos += 6;

      // Total Retenção (se existir)
      if (documento.total_retencao && documento.total_retencao > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Total Retenção:', totalsX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69);
        doc.text(`-${formatKz(documento.total_retencao)}`, pageWidth - marginRight, yPos, { align: 'right' });
        doc.setTextColor(100, 100, 100);
        yPos += 6;
      }

      // Desconto (se existir)
      if (documento.total_desconto && documento.total_desconto > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Desconto:', totalsX, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 53, 69);
        doc.text(`-${formatKz(documento.total_desconto)}`, pageWidth - marginRight, yPos, { align: 'right' });
        doc.setTextColor(100, 100, 100);
        yPos += 6;
      }

      // Linha separadora
      doc.setDrawColor(52, 152, 219);
      doc.line(totalsX, yPos - 2, pageWidth - marginRight, yPos - 2);

      // Total Líquido
      yPos += 4;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(52, 152, 219);
      doc.text('TOTAL A PAGAR:', totalsX, yPos);
      doc.text(formatKz(documento.total_liquido), pageWidth - marginRight, yPos, { align: 'right' });
      
      yPos += 15;

      // --- OBSERVAÇÕES ---
      if (documento.observacoes) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('Observações:', marginLeft, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        const observacoes = doc.splitTextToSize(documento.observacoes, contentWidth);
        doc.text(observacoes, marginLeft, yPos);
        yPos += observacoes.length * 4 + 5;
      }

      // --- QR CODE E HASH FISCAL ---
      if (documento.hash_fiscal) {
        // Gerar QR Code com o hash fiscal
        const qrCodeData = await gerarQRCode(documento.hash_fiscal);
        
        if (qrCodeData) {
          // Adicionar QR Code (esquerda)
          doc.addImage(qrCodeData, 'PNG', marginLeft, yPos, 30, 30);
          
          // Hash fiscal ao lado do QR Code
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Hash Fiscal:', marginLeft + 35, yPos + 5);
          doc.setFont('helvetica', 'normal');
          const hash = doc.splitTextToSize(documento.hash_fiscal, contentWidth - 45);
          doc.text(hash, marginLeft + 35, yPos + 10);
        } else {
          // Se não conseguir gerar QR Code, mostra apenas o hash
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Hash Fiscal:', marginLeft, yPos);
          yPos += 4;
          doc.setFont('helvetica', 'normal');
          const hash = doc.splitTextToSize(documento.hash_fiscal, contentWidth);
          doc.text(hash, marginLeft, yPos);
        }
        
        yPos += 35;
      }

      // --- INFORMAÇÕES BANCÁRIAS ---
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(52, 152, 219);
      doc.text('Dados Bancários', marginLeft, yPos);
      yPos += 5;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Banco: ${EMPRESA.banco}`, marginLeft, yPos);
      doc.text(`IBAN: ${EMPRESA.iban}`, marginLeft + 60, yPos);
      yPos += 4;
      
      yPos += 10;

      // --- ASSINATURAS ---
      const assinaturaY = doc.internal.pageSize.height - 40;
      
      // Linha para assinatura do responsável
      doc.line(marginLeft, assinaturaY, marginLeft + 60, assinaturaY);
      doc.setFontSize(8);
      doc.text('Assinatura do Responsável', marginLeft, assinaturaY + 4);
      
      // Linha para carimbo da empresa
      doc.line(pageWidth - marginRight - 60, assinaturaY, pageWidth - marginRight, assinaturaY);
      doc.text('Carimbo da Empresa', pageWidth - marginRight - 50, assinaturaY + 4);

      // --- AGRADECIMENTO ---
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(52, 152, 219);
      doc.text('Obrigado pela preferência!', pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });

      // --- RODAPÉ ---
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Documento gerado em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')} | ${EMPRESA.website}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
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
      <div className="space-y-4 pb-8 px-3 sm:px-4 max-w-7xl mx-auto"
        style={{ backgroundColor: colors.background }}>

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
            {/* Search */}
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
                  borderWidth: 1
                }}
              />
              <Search size={16}
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

            {/* Refresh Button */}
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

        {/* Error Message */}
        {error && (
          <div
            className="p-3.5 rounded-lg border text-sm"
            style={{
              backgroundColor: `${colors.danger}15`,
              borderColor: colors.danger
            }}
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

        {/* Filter Tabs */}
        {!loading && !error && (
          <div
            className="rounded-xl border shadow-sm p-2"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}
          >
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {[
                { key: "FR" as TipoFiltro, label: "Faturas-Recibo/Recibo", count: estatisticas.FR + estatisticas.RC},
                { key: "FT" as TipoFiltro, label: "Faturas", count: estatisticas.FT },
              ].map(({ key, label, count}) => (
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
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs`}
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