"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
  documentoFiscalService,
  type DocumentoFiscal,
  type GerarReciboDTO,
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";
import OutrosDocumentosTable from "@/app/components/Faturas/OutrosDocumentosTable";

/* ─── Helpers de autenticação (Sanctum) ──────────────────────────────────── */
function getXsrfToken(): string {
  return decodeURIComponent(Cookies.get("XSRF-TOKEN") ?? "");
}

async function garantirCsrf(baseUrl: string) {
  if (!Cookies.get("XSRF-TOKEN")) {
    await fetch(`${baseUrl}/sanctum/csrf-cookie`, { credentials: "include" });
  }
}


async function abrirUrlAutenticada(url: string, tipo: "pdf" | "html" = "pdf") {
  const baseUrl = url.split("/api/")[0];

  // 1. Garantir CSRF (opcional, mas mantém)
  await garantirCsrf(baseUrl);
  const xsrf = getXsrfToken();

  // 2. ⭐ Obter o tenant ID (igual ao usado no axios.ts)
  const tenantId = localStorage.getItem("tenant_id");
  if (!tenantId) {
    throw new Error("Empresa não identificada. Faça login novamente.");
  }

  // 3. Requisição com os headers completos
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: tipo === "pdf" ? "application/pdf,*/*" : "text/html,*/*",
      "X-XSRF-TOKEN": xsrf,
      "X-Requested-With": "XMLHttpRequest",
      "X-Empresa-ID": tenantId,      // ← ADICIONADO
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Erro ${res.status}: ${body || res.statusText}`);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank");

  if (win) {
    win.addEventListener("load", () => URL.revokeObjectURL(blobUrl), { once: true });
  } else {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }
}
/* ─────────────────────────────────────────────────────────────────────────── */

export default function OutrosDocumentosPage() {
  const router = useRouter();
  const colors = useThemeColors();

  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gerandoRecibo, setGerandoRecibo] = useState<string | null>(null);
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);
  const [imprimindo] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:8000`
      : "http://localhost:8000";

  /* ── Carregar documentos ── */
  const carregarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resultado = await documentoFiscalService.listar({
        per_page: 100,
        apenas_nao_vendas: true,
      });
      if (!resultado?.data) throw new Error("Erro ao carregar");
      // Filtra apenas os tipos desta página
      const filtrados = resultado.data.filter((d) =>
        ["FP", "FA", "NC", "ND", "FRt"].includes(d.tipo_documento)
      );
      setDocumentos(filtrados);
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
        alert(err instanceof Error ? err.message : "Erro ao abrir impressão");
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
        documento.numero_documento ?? documento.id
      }.pdf`;
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

  /* ── Gerar recibo (FP / FA) ── */
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
      {/* ── Barra de topo ── */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-3"
        style={{ borderBottom: `0.5px solid ${colors.border}` }}
      >
        <span className="text-sm font-semibold" style={{ color: colors.text }}>
          Outros Documentos Fiscais
        </span>
      </div>

      {/* ── Mensagem de erro ── */}
      {error && (
        <div className="px-3 py-2 text-sm" style={{ color: colors.danger }}>
          {error}
        </div>
      )}

      {/* ── Tabela ── */}
      <OutrosDocumentosTable
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