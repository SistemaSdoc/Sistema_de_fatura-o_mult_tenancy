"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
  documentoFiscalService,
  type DocumentoFiscal,
  type MetodoPagamento,
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";
import OutrosDocumentosTable from "@/app/components/Faturas/OutrosDocumentosTable";
import { FileText, ChevronDown } from "lucide-react";

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

  // 1. Garantir CSRF
  await garantirCsrf(baseUrl);
  const xsrf = getXsrfToken();

  // 2. Obter o tenant ID (igual ao usado no axios.ts)
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
      "X-Empresa-ID": tenantId,
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
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);
  const [imprimindo] = useState<string | null>(null);
  const [convertendoProforma, setConvertendoProforma] = useState<string | null>(null);
  const [avisoCobrancaSelecionado, setAvisoCobrancaSelecionado] = useState<DocumentoFiscal | null>(null);
  const [emitindoAcr, setEmitindoAcr] = useState(false);
  const [erroAcr, setErroAcr] = useState<string | null>(null);
  const [metodoPagamentoAcr, setMetodoPagamentoAcr] = useState<MetodoPagamento>("dinheiro");
  const [referenciaAcr, setReferenciaAcr] = useState("");
  const [dataPagamentoAcr, setDataPagamentoAcr] = useState(new Date().toISOString().slice(0, 10));
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "http://localhost:8000";

  /* ── Fechar dropdown ao clicar fora ── */
  useEffect(() => {
    function handleClickFora(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    }

    if (dropdownAberto) {
      document.addEventListener("mousedown", handleClickFora);
      return () => document.removeEventListener("mousedown", handleClickFora);
    }
  }, [dropdownAberto]);

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
        ["FP", "FA", "NC", "ND", "RE", "FG", "FGR", "FGEN", "AC", "ACR"].includes(d.tipo_documento)
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

  /* ── Imprimir A4 (nova rota print-a4) ── */
  const imprimirA4 = useCallback(
    async (documento: DocumentoFiscal) => {
      if (!documento.id) return;
      try {
        await abrirUrlAutenticada(`${baseUrl}/api/documentos-fiscais/${documento.id}/print-a4`, "html");
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao abrir impressão A4");
      }
    },
    [baseUrl]
  );

  /* ── Talão POS autenticado (80mm) ── */
  const imprimir80mm = useCallback(
    async (documento: DocumentoFiscal) => {
      if (!documento.id) return;
      try {
        await abrirUrlAutenticada(`${baseUrl}/api/documentos-fiscais/${documento.id}/print-view`, "html");
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao abrir talão POS");
      }
    },
    [baseUrl]
  );

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

  const converterProforma = useCallback(async (doc: DocumentoFiscal) => {
    if (!doc.id || !window.confirm(`Converter a Proforma ${doc.numero_documento} numa nova fatura? A Proforma original será mantida.`)) {
      return;
    }

    try {
      setConvertendoProforma(doc.id);
      const fatura = await documentoFiscalService.converterProforma(doc.id);
      await carregarDocumentos();
      router.push(`/dashboard/Faturas/Faturas/${fatura.id}/Ver`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao converter a Proforma");
    } finally {
      setConvertendoProforma(null);
    }
  }, [carregarDocumentos, router]);

  const emitirAcr = useCallback(async () => {
    if (!avisoCobrancaSelecionado) return;

    try {
      setEmitindoAcr(true);
      setErroAcr(null);
      const acr = await documentoFiscalService.emitirAvisoCobrancaRecibo(avisoCobrancaSelecionado.id, {
        metodo_pagamento: metodoPagamentoAcr,
        valor: Number(avisoCobrancaSelecionado.total_liquido),
        data_pagamento: dataPagamentoAcr,
        referencia: referenciaAcr.trim() || undefined,
      });
      setAvisoCobrancaSelecionado(null);
      await carregarDocumentos();
      router.push(`/dashboard/Faturas/Faturas/${acr.id}/Ver`);
    } catch (err: unknown) {
      setErroAcr(err instanceof Error ? err.message : "Não foi possível emitir o Aviso de Cobrança-Recibo.");
    } finally {
      setEmitindoAcr(false);
    }
  }, [avisoCobrancaSelecionado, carregarDocumentos, dataPagamentoAcr, metodoPagamentoAcr, referenciaAcr, router]);

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
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-3"
        style={{ borderBottom: `0.5px solid ${colors.border}` }}>
        <span className="text-sm font-semibold" style={{ color: colors.secondary }}>
          Outros Documentos Fiscais
        </span>

        {/* ── Dropdown "Comece a Faturar" ── */}
        <div ref={dropdownRef} className="relative w-full sm:w-auto">
          <button
            onClick={() => setDropdownAberto(!dropdownAberto)}
            className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-4 py-2 text-sm text-white transition-opacity hover:opacity-80 rounded"
            style={{ backgroundColor: colors.primary }}>
            <span className="font-medium">Comece a Facturar</span>
            <ChevronDown size={18} className={`shrink-0 transition-transform duration-200 ${dropdownAberto ? "rotate-180" : ""}`} />
          </button>

          {/* ── Menu dropdown ── */}
          {dropdownAberto && (
            <div
              className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-56 rounded shadow-lg z-50"
              style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
              {/* Nova Venda */}
              <button
                onClick={() => {
                  router.push("/dashboard/Vendas");
                  setDropdownAberto(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 first:rounded-t last:rounded-b"
                style={{
                  color: colors.text,
                  borderBottom: `0.5px solid ${colors.border}`,
                }}>
                <FileText size={16} style={{ color: colors.secondary }} className="shrink-0" />
                <div className="text-left min-w-0">
                  <div className="font-medium">Gerar factura-recibo</div>
                  <div style={{ color: colors.text, opacity: 0.7 }} className="text-xs">
                    Registar uma nova venda
                  </div>
                </div>
              </button>

              {/* Nova Fatura */}
              <button
                onClick={() => {
                  router.push("/dashboard/Faturas/Fatura_Normal");
                  setDropdownAberto(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{
                  color: colors.text,
                  borderBottom: `0.5px solid ${colors.border}`,
                }}>
                <FileText size={16} style={{ color: colors.primary }} className="shrink-0" />
                <div className="text-left min-w-0">
                  <div className="font-medium">Gerar factura</div>
                  <div style={{ color: colors.text, opacity: 0.7 }} className="text-xs">
                    Emitir uma factura normal
                  </div>
                </div>
              </button>

              {/* Nova Proforma */}
              <button
                onClick={() => {
                  router.push("/dashboard/Faturas/Faturas_Proforma");
                  setDropdownAberto(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 last:rounded-b"
                style={{
                  color: colors.text,
                }}>
                <FileText size={16} style={{ color: colors.secondary }} className="shrink-0" />
                <div className="text-left min-w-0">
                  <div className="font-medium">Gerar proforma</div>
                  <div style={{ color: colors.text, opacity: 0.7 }} className="text-xs">
                    Criar uma factura proforma
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
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
        baixandoPdf={baixandoPdf}
        imprimindo={imprimindo}
        onVerDetalhes={verDetalhes}
        onImprimirA4={imprimirA4}
        onImprimirPdf={imprimir80mm}
        onBaixarPdf={baixarPdf}
        onConverterProforma={converterProforma}
        convertendoProforma={convertendoProforma}
        onEmitirAcr={(doc) => {
          setErroAcr(null);
          setMetodoPagamentoAcr("dinheiro");
          setReferenciaAcr("");
          setDataPagamentoAcr(new Date().toISOString().slice(0, 10));
          setAvisoCobrancaSelecionado(doc);
        }}
        formatKz={formatKz}
        documentoFiscalService={documentoFiscalService}
        colors={colors}
      />
      {avisoCobrancaSelecionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void emitirAcr();
            }}
            className="w-full max-w-md space-y-4 rounded-lg p-5 shadow-xl"
            style={{ backgroundColor: colors.background, color: colors.text }}
          >
            <div>
              <h2 className="text-lg font-semibold">Registar pagamento e emitir ACR</h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                Confirme que recebeu o pagamento integral do Aviso de Cobrança {avisoCobrancaSelecionado.numero_documento}.
                O ACR servirá como comprovativo, sem emissão de recibo separado.
              </p>
            </div>
            <div className="text-sm font-semibold">
              Valor recebido: {formatKz(avisoCobrancaSelecionado.total_liquido)}
            </div>
            <label className="block space-y-1 text-sm">
              <span>Método de pagamento</span>
              <select
                required
                value={metodoPagamentoAcr}
                onChange={(event) => setMetodoPagamentoAcr(event.target.value as MetodoPagamento)}
                className="w-full rounded border px-3 py-2"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência</option>
                <option value="multibanco">Multibanco</option>
                <option value="cheque">Cheque</option>
                <option value="cartao">Cartão</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Data do pagamento</span>
              <input
                required
                type="date"
                value={dataPagamentoAcr}
                onChange={(event) => setDataPagamentoAcr(event.target.value)}
                className="w-full rounded border px-3 py-2"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Referência do pagamento (opcional)</span>
              <input
                value={referenciaAcr}
                onChange={(event) => setReferenciaAcr(event.target.value)}
                maxLength={100}
                className="w-full rounded border px-3 py-2"
                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
              />
            </label>
            {erroAcr && <p className="text-sm" style={{ color: colors.danger }}>{erroAcr}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAvisoCobrancaSelecionado(null)}
                disabled={emitindoAcr}
                className="rounded border px-4 py-2 text-sm"
                style={{ borderColor: colors.border }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={emitindoAcr}
                className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: colors.primary }}
              >
                {emitindoAcr ? "A emitir…" : "Confirmar pagamento e emitir"}
              </button>
            </div>
          </form>
        </div>
      )}
    </MainEmpresa>
  );
}