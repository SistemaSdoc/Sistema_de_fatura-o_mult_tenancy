"use client";

import { useEffect, useState, useCallback } from "react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useRouter } from "next/navigation";
import InvoiceTable from "@/app/components/Faturas/InvoiceTable";
import {
  documentoFiscalService,
  DocumentoFiscal,
  FiltrosDocumento,
  GerarReciboDTO,
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";
import { ShoppingCart, FileText } from "lucide-react";

export default function FaturasPage() {
  const router = useRouter();
  const colors = useThemeColors();

  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gerandoRecibo, setGerandoRecibo] = useState<string | null>(null);
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);
  const [imprimindo] = useState<string | null>(null);

  /* ── Carregar documentos ── */
  const carregarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filtros: FiltrosDocumento = { per_page: 100 };
      const resultado = await documentoFiscalService.listar(filtros);
      if (!resultado?.data) throw new Error("Erro ao carregar");
      setDocumentos(resultado.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  /* ── Imprimir A4 ── */
  const imprimirA4 = useCallback((documento: DocumentoFiscal) => {
    if (!documento.id) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.193:8000";
    window.open(`${baseUrl}/api/documentos-fiscais/${documento.id}/print-view`, "_blank");
  }, []);

  /* ── PDF Viewer (cross-platform) ── */
  const imprimirPdfNavegador = useCallback((documento: DocumentoFiscal) => {
    if (!documento.id) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.193:8000";
    window.open(`${baseUrl}/api/documentos-fiscais/${documento.id}/pdf-viewer`, "_blank");
  }, []);

  /* ── Download PDF ── */
  const baixarPdf = useCallback(async (documento: DocumentoFiscal) => {
    if (!documento.id) return;
    try {
      setBaixandoPdf(documento.id);
      const nome = `${documento.tipo_documento}_${documento.numero_documento ?? documento.id}.pdf`;
      await documentoFiscalService.downloadPdf(documento.id, nome);
    } catch {
      alert("Erro ao baixar PDF");
    } finally {
      setBaixandoPdf(null);
    }
  }, []);

  /* ── Ver detalhes ── */
  const verDetalhes = (doc: DocumentoFiscal) => {
    if (doc.id) router.push(`/dashboard/Faturas/Faturas/${doc.id}/Ver`);
  };

  /* ── Gerar recibo ── */
  const gerarRecibo = async (doc: DocumentoFiscal) => {
    if (!doc.id) return;
    try {
      setGerandoRecibo(doc.id);
      const dados: GerarReciboDTO = {
        valor: doc.total_liquido,
        metodo_pagamento: "dinheiro",
        data_pagamento: new Date().toISOString().split("T")[0],
      };
      const recibo = await documentoFiscalService.gerarRecibo(doc.id, dados);
      await carregarDocumentos();
      if (recibo?.id) await imprimirPdfNavegador(recibo);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setGerandoRecibo(null);
    }
  };

  /* ── Formatar moeda ── */
  const formatKz = (valor: number | string | undefined) => {
    if (!valor) return "0,00 Kz";
    return Number(valor).toLocaleString("pt-AO", { style: "currency", currency: "AOA" });
  };

  return (
    <MainEmpresa>
      {/* ── Barra de ações no topo ── */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-3"
        style={{ borderBottom: `0.5px solid ${colors.border}` }}
      >
        <button
          onClick={() => router.push("/dashboard/Vendas/Nova_venda")}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.secondary }}
        >
          <ShoppingCart size={14} />
          Nova Venda
        </button>

        <button
          onClick={() => router.push("/dashboard/Faturas/Fatura_Normal")}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.primary }}
        >
          <FileText size={14} />
          Nova Fatura
        </button>

        <button
          onClick={() => router.push("/dashboard/Faturas/Faturas_Proforma")}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: colors.secondary }}
        >
          <FileText size={14} />
          Nova Proforma
        </button>
      </div>

      {/* ── Mensagem de erro ── */}
      {error && (
        <div className="px-3 py-2 text-sm" style={{ color: colors.danger }}>
          {error}
        </div>
      )}

      {/* ── Tabela de documentos ── */}
      <InvoiceTable
        documentos={documentos}
        loading={loading}
        gerandoRecibo={gerandoRecibo}
        baixandoPdf={baixandoPdf}
        imprimindo={imprimindo}
        onVerDetalhes={verDetalhes}
        onGerarRecibo={gerarRecibo}
        onImprimirA4={imprimirA4}
        onImprimirPdf={imprimirPdfNavegador}
        onBaixarPdf={baixarPdf}
        formatKz={formatKz}
        documentoFiscalService={documentoFiscalService}
        colors={colors}
      />
    </MainEmpresa>
  );
}