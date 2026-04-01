"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { RefreshCw, Search, X, ArrowLeft, Plus } from "lucide-react";

type TipoFiltro = "FR" | "FT";

export default function FaturasPage() {
  const router = useRouter();
  const colors = useThemeColors();

  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<TipoFiltro>("FR");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [gerandoRecibo, setGerandoRecibo] = useState<string | null>(null);
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);

  /* ── Carregar documentos ─────────────────────────────────── */
  const carregarDocumentos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filtros: FiltrosDocumento = { per_page: 100 };
      const resultado = await documentoFiscalService.listar(filtros);
      if (!resultado?.data) throw new Error("Não foi possível carregar os documentos");
      setDocumentos(resultado.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarDocumentos(); }, [carregarDocumentos]);

  /* ── Imprimir na térmica ─────────────────────────────────── */
  const imprimirDocumento = useCallback(async (documento: DocumentoFiscal) => {
    if (!documento.id) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.170';
    const url = `${baseUrl}/api/documentos-fiscais/${documento.id}/imprimir-termica`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        console.log('👌 Documento impresso na térmica com sucesso');
      } else {
        console.error('Erro:', result.message);
        alert('Erro ao imprimir: ' + result.message);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro ao conectar com a impressora');
    }
  }, []);

  /* ── Imprimir em A4 (window.print) ──────────────────────── */
  const imprimirA4 = useCallback((documento: DocumentoFiscal) => {
    if (!documento.id) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.170';
    const url = `${baseUrl}/api/documentos-fiscais/${documento.id}/print-view`;

    // Abre em nova aba
    window.open(url, '_blank');
  }, []);

  /* ── Download PDF via Laravel (DomPDF) ─────────────────── */
  const baixarPdf = useCallback(async (documento: DocumentoFiscal) => {
    if (!documento.id) return;
    try {
      setBaixandoPdf(documento.id);
      const nome = `${documento.tipo_documento}_${documento.numero_documento ?? documento.id}.pdf`;
      await documentoFiscalService.downloadPdf(documento.id, nome);
    } catch {
      alert("Erro ao baixar PDF. Tente novamente.");
    } finally {
      setBaixandoPdf(null);
    }
  }, []);

  /* ── Filtros ──────────────────────────────────────────── */
  const documentosFiltrados = useMemo(() => {
    let docs = documentos.filter((d) => ["FT", "FR", "RC"].includes(d.tipo_documento));

    docs = filtro === "FR"
      ? docs.filter((d) => d.tipo_documento === "FR" || d.tipo_documento === "RC")
      : docs.filter((d) => d.tipo_documento === "FT");

    if (termoPesquisa.trim()) {
      const t = termoPesquisa.toLowerCase();
      docs = docs.filter((d) => {
        const num = (d.numero_documento ?? `${d.serie}-${String(d.numero).padStart(5, "0")}`).toLowerCase();
        const nome = documentoFiscalService.getNomeCliente(d).toLowerCase();
        const nif = (documentoFiscalService.getNifCliente(d) ?? "").toLowerCase();
        return num.includes(t) || nome.includes(t) || nif.includes(t);
      });
    }

    return docs.sort((a, b) => {
      const dtA = new Date(`${a.data_emissao}T${a.hora_emissao ?? "00:00:00"}`).getTime();
      const dtB = new Date(`${b.data_emissao}T${b.hora_emissao ?? "00:00:00"}`).getTime();
      return dtB !== dtA ? dtB - dtA : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [documentos, filtro, termoPesquisa]);

  const stats = useMemo(() => ({
    total: documentos.filter((d) => ["FT", "FR", "RC"].includes(d.tipo_documento)).length,
    FT: documentos.filter((d) => d.tipo_documento === "FT").length,
    FR: documentos.filter((d) => d.tipo_documento === "FR").length,
    RC: documentos.filter((d) => d.tipo_documento === "RC").length,
  }), [documentos]);

  /* ── Formatação ─────────────────────────────────────────── */
  const formatKz = (valor: number | string | undefined) =>
    new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 2 })
      .format(Number(valor) || 0);

  const formatQuantidade = (qtd: number | string | undefined) =>
    Math.round(Number(qtd) || 0).toString();

  /* ── Acções ─────────────────────────────────────────────── */
  const verDetalhes = (doc: DocumentoFiscal) => {
    if (doc.id) router.push(`/dashboard/Faturas/Faturas/${doc.id}/Ver`);
  };

  const gerarRecibo = async (doc: DocumentoFiscal): Promise<DocumentoFiscal | void> => {
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
      // Imprimir recibo gerado automaticamente (mesma lógica silenciosa)
      if (recibo?.id) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.170';
        const url = `${baseUrl}/api/documentos-fiscais/${recibo.id}/imprimir-termica`;
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            credentials: 'include',
          });

          const result = await response.json();

          if (result.success) {
            console.log('👌 Documento impresso na térmica com sucesso');
          } else {
            console.error('Erro:', result.message);
            alert('Erro ao imprimir: ' + result.message);
          }
        } catch (error) {
          console.error('Erro na requisição:', error);
          alert('Erro ao conectar com a impressora');
        }
      }
      return recibo;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao gerar recibo");
      throw err;
    } finally {
      setGerandoRecibo(null);
    }
  };

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <MainEmpresa>
      <div className="pb-6 px-3 sm:px-4 max-w-7xl mx-auto space-y-3" style={{ backgroundColor: colors.background }}>

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => router.back()} className="p-1.5 hover:opacity-70 shrink-0" style={{ color: colors.primary }}>
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: colors.secondary }}>Faturas e Recibos</h1>
            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              {loading ? "..." : `${stats.total} documentos`}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Nº, cliente, NIF…"
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                className="pl-8 pr-7 py-2 text-sm focus:outline-none focus:ring-2 w-44 sm:w-52"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text, borderWidth: 1 }}
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }} />
              {termoPesquisa && (
                <button onClick={() => setTermoPesquisa("")} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={() => router.push("/dashboard/Vendas/Nova_venda")}
              className="flex items-center gap-1.5 px-2 py-2 text-white text-sm font-medium disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: colors.secondary }}
            >
              <Plus size={14} className="" />
              <span className="hidden sm:inline">Nova venda</span>
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="p-3 border text-sm flex items-center justify-between" style={{ backgroundColor: `${colors.danger}12`, borderColor: colors.danger }}>
            <span style={{ color: colors.danger }}>{error}</span>
            <button onClick={carregarDocumentos} className="underline text-xs ml-3" style={{ color: colors.danger }}>Tentar novamente</button>
          </div>
        )}

        {/* Filtros */}
        {!loading && !error && (
          <div className="border p-1.5 flex gap-1.5" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            {([
              { key: "FR" as TipoFiltro, label: "Fatura-Recibo / Recibo", count: stats.FR + stats.RC },
              { key: "FT" as TipoFiltro, label: "Faturas", count: stats.FT },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className="rounded flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-all"
                style={{ backgroundColor: filtro === key ? colors.primary : "transparent", color: filtro === key ? "white" : colors.textSecondary }}
              >
                {label}
                <span className="px-1.5 py-0.5 text-xs" style={{ backgroundColor: filtro === key ? "rgba(255,255,255,.2)" : colors.hover }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Tabela */}
        <div className="border overflow-hidden shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <InvoiceTable
            documentos={documentosFiltrados}
            loading={loading}
            gerandoRecibo={gerandoRecibo}
            baixandoPdf={baixandoPdf}
            onVerDetalhes={verDetalhes}
            onGerarRecibo={gerarRecibo}
            onImprimir={imprimirDocumento}
            onImprimirA4={imprimirA4}
            onBaixarPdf={baixarPdf}
            formatKz={formatKz}
            formatQuantidade={formatQuantidade}
            documentoFiscalService={documentoFiscalService}
            colors={colors}
          />
        </div>

      </div>
    </MainEmpresa>
  );
}