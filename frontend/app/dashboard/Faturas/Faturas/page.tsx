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
import Cookies from "js-cookie";

// ── Helper: lê o XSRF-TOKEN do cookie (já descodificado) ───────────────────
function getXsrfToken(): string {
  return decodeURIComponent(Cookies.get("XSRF-TOKEN") ?? "");
}

// ── Helper: garante que temos o cookie CSRF antes de qualquer pedido ────────
async function garantirCsrf(baseUrl: string) {
  if (!Cookies.get("XSRF-TOKEN")) {
    await fetch(`${baseUrl}/sanctum/csrf-cookie`, {
      credentials: "include",
    });
  }
}

// ── Helper principal: abre PDF ou HTML autenticado via Blob URL ─────────────
async function abrirUrlAutenticada(url: string, tipo: "pdf" | "html" = "pdf") {
  // Extrai baseUrl a partir do url completo
  const baseUrl = url.split("/api/")[0];

  // 1. Garante o cookie de sessão + CSRF
  await garantirCsrf(baseUrl);

  const xsrf = getXsrfToken();

  // 2. Faz fetch autenticado — os cookies de sessão Laravel vão no credentials
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",           // envia session cookie + XSRF-TOKEN cookie
    headers: {
      Accept: tipo === "pdf" ? "application/pdf,*/*" : "text/html,*/*",
      "X-XSRF-TOKEN": xsrf,           // header CSRF obrigatório no Laravel
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Erro ${res.status}: ${body || res.statusText}`);
  }

  // 3. Converte para Blob e abre numa nova aba
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank");

  if (win) {
    win.addEventListener("load", () => URL.revokeObjectURL(blobUrl), { once: true });
  } else {
    // Popup bloqueado — fallback com link
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }
}
// ───────────────────────────────────────────────────────────────────────────

export default function FaturasPage() {
  const router = useRouter();
  const colors = useThemeColors();

  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gerandoRecibo, setGerandoRecibo] = useState<string | null>(null);
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);
  const [imprimindo] = useState<string | null>(null);

  // BaseURL dinâmica — igual ao teu axios.ts
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:8000`
      : "http://localhost:8000";

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
  const imprimirA4 = useCallback(
    async (documento: DocumentoFiscal) => {
      if (!documento.id) return;
      try {
        await abrirUrlAutenticada(
          `${baseUrl}/api/documentos-fiscais/${documento.id}/print-view`,
          "html"
        );
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao abrir visualização de impressão");
      }
    },
    [baseUrl]
  );

  /* ── PDF Viewer autenticado ── */
  const imprimirPdfNavegador = useCallback(
    async (documento: DocumentoFiscal) => {
      if (!documento.id) return;
      try {
        await abrirUrlAutenticada(
          `${baseUrl}/api/documentos-fiscais/${documento.id}/pdf-viewer`,
          "pdf"
        );
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao abrir PDF");
      }
    },
    [baseUrl]
  );

  /* ── Download PDF ── */
  const baixarPdf = useCallback(async (documento: DocumentoFiscal) => {
    if (!documento.id) return;
    try {
      setBaixandoPdf(documento.id);
      const nome = `${documento.tipo_documento}_${
        documento.numero_documento ?? documento.id}.pdf`;
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
    return Number(valor).toLocaleString("pt-AO", {
      style: "currency",
      currency: "AOA",
    });
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