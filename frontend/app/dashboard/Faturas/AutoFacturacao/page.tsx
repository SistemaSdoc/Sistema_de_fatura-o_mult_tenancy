"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Plus, ShoppingCart, Trash2, User } from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { ToastNotification } from "@/components/ToastNotification";
import { useThemeColors } from "@/context/ThemeContext";
import { documentoFiscalService } from "@/services/DocumentoFiscal";

interface ItemAutoFacturacao {
  descricao: string;
  quantidade: string;
  preco: string;
  taxaIva: "0" | "5" | "14";
}

const novoItem = (): ItemAutoFacturacao => ({
  descricao: "",
  quantidade: "1",
  preco: "",
  taxaIva: "0",
});

export default function AutoFacturacaoPage() {
  const router = useRouter();
  const colors = useThemeColors();
  const [produtor, setProdutor] = useState("");
  const [nifProdutor, setNifProdutor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [tipoBem, setTipoBem] = useState<"bem" | "servico">("bem");
  const [bensEssenciais, setBensEssenciais] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<"dinheiro" | "transferencia" | "cheque">("dinheiro");
  const [referenciaPagamento, setReferenciaPagamento] = useState("");
  const [itens, setItens] = useState<ItemAutoFacturacao[]>([novoItem()]);
  const [aEmitir, setAEmitir] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const total = itens.reduce((soma, item) => {
    const base = (Number(item.quantidade) || 0) * (Number(item.preco) || 0);
    return soma + base + (base * Number(item.taxaIva)) / 100;
  }, 0);

  const alterarItem = (index: number, patch: Partial<ItemAutoFacturacao>) => {
    setItens((atuais) => atuais.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const emitir = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (aEmitir) return;

    const itensValidos = itens.every(
      (item) => item.descricao.trim() && Number(item.quantidade) > 0 && Number(item.preco) >= 0
    );
    if (!produtor.trim() || !motivo.trim() || !itensValidos || total <= 0) {
      setToast({ message: "Preencha produtor, motivo e todos os itens com valores válidos.", type: "error" });
      return;
    }

    setAEmitir(true);
    try {
      await documentoFiscalService.emitirAutoFacturacao({
        cliente_nome: produtor.trim(),
        cliente_nif: nifProdutor.trim() || undefined,
        motivo_auto_faturacao: motivo.trim(),
        tipo_bem: tipoBem,
        bens_essenciais: bensEssenciais,
        itens: itens.map((item) => ({
          descricao: item.descricao.trim(),
          quantidade: Number(item.quantidade),
          preco_venda: Number(item.preco),
          preco_unitario: Number(item.preco),
          taxa_iva: Number(item.taxaIva),
        })),
        dados_pagamento: {
          metodo: metodoPagamento,
          valor: Math.round(total * 100) / 100,
          data: new Date().toISOString().slice(0, 10),
          referencia: referenciaPagamento.trim() || undefined,
        },
      });

      setToast({ message: "Auto-facturação emitida com sucesso.", type: "success" });
      setTimeout(() => router.push("/dashboard/Faturas/Faturas"), 1200);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Não foi possível emitir a auto-facturação.",
        type: "error",
      });
    } finally {
      setAEmitir(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    color: colors.text,
  };

  return (
    <MainEmpresa>
      <main className="mx-auto max-w-5xl space-y-3 px-2 pb-8 sm:px-4" style={{ backgroundColor: colors.background }}>
        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} colors={colors} />}
        <header className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Voltar"
            className="shrink-0 p-1.5 transition-opacity hover:opacity-70"
            style={{ color: colors.primary }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: colors.secondary }}>Auto-facturação</h1>
          </div>
        </header>

        <form onSubmit={emitir} className="space-y-3">
          <section className="overflow-hidden border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: colors.primary }}>
              <User size={14} className="text-white" />
              <span className="text-xs font-medium uppercase tracking-wider text-white">Produtor e fundamento</span>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm" style={{ color: colors.textSecondary }}>
                Nome do produtor/fornecedor *
                <input required maxLength={255} value={produtor} onChange={(e) => setProdutor(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </label>
              <label className="space-y-1 text-sm" style={{ color: colors.textSecondary }}>
                NIF (se existir)
                <input maxLength={20} value={nifProdutor} onChange={(e) => setNifProdutor(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2" style={{ color: colors.textSecondary }}>
                Motivo da auto-facturação *
                <input required maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </label>
              <label className="space-y-1 text-sm" style={{ color: colors.textSecondary }}>
                Tipo de aquisição
                <select
                  value={tipoBem}
                  onChange={(e) => {
                    const value = e.target.value as "bem" | "servico";
                    setTipoBem(value);
                    if (value === "servico") setBensEssenciais(false);
                  }}
                  className="w-full border px-3 py-2 text-sm"
                  style={inputStyle}>
                  <option value="bem">Bens</option>
                  <option value="servico">Serviços</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm sm:pt-6" style={{ color: colors.text }}>
                <input type="checkbox" checked={bensEssenciais} disabled={tipoBem === "servico"} onChange={(e) => setBensEssenciais(e.target.checked)} />
                Bens essenciais
              </label>
            </div>
          </section>

          <section className="overflow-hidden border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-white" />
                <span className="text-xs font-medium uppercase tracking-wider text-white">Bens ou serviços</span>
              </div>
              <button type="button" onClick={() => setItens((atuais) => [...atuais, novoItem()])} className="inline-flex items-center gap-1 text-xs font-medium text-white hover:opacity-80">
                <Plus size={15} /> Adicionar item
              </button>
            </div>
            <div className="space-y-3 p-3">
              {itens.map((item, index) => (
                <div key={index} className="grid gap-2 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_90px_120px_100px_36px]" style={{ borderColor: colors.border }}>
                  <input required maxLength={255} aria-label="Descrição do item" placeholder="Descrição" value={item.descricao} onChange={(e) => alterarItem(index, { descricao: e.target.value })} className="border px-3 py-2 text-sm" style={inputStyle} />
                  <input required type="number" min="0.01" step="0.01" aria-label="Quantidade" placeholder="Qtd." value={item.quantidade} onChange={(e) => alterarItem(index, { quantidade: e.target.value })} className="border px-3 py-2 text-sm" style={inputStyle} />
                  <input required type="number" min="0" step="0.01" aria-label="Preço unitário" placeholder="Preço unit." value={item.preco} onChange={(e) => alterarItem(index, { preco: e.target.value })} className="border px-3 py-2 text-sm" style={inputStyle} />
                  <select aria-label="Taxa de IVA" value={item.taxaIva} onChange={(e) => alterarItem(index, { taxaIva: e.target.value as ItemAutoFacturacao["taxaIva"] })} className="border px-3 py-2 text-sm" style={inputStyle}>
                    <option value="0">IVA 0%</option>
                    <option value="5">IVA 5%</option>
                    <option value="14">IVA 14%</option>
                  </select>
                  <button type="button" aria-label="Remover item" disabled={itens.length === 1} onClick={() => setItens((atuais) => atuais.filter((_, i) => i !== index))} className="flex items-center justify-center disabled:opacity-30" style={{ color: colors.danger }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <p className="border-t pt-3 text-right font-semibold" style={{ borderColor: colors.border, color: colors.text }}>
                Total estimado: {total.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
              </p>
            </div>
          </section>

          <section className="overflow-hidden border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: colors.primary }}>
              <FileText size={14} className="text-white" />
              <span className="text-xs font-medium uppercase tracking-wider text-white">Pagamento</span>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm" style={{ color: colors.textSecondary }}>
                Método de pagamento
                <select value={metodoPagamento} onChange={(e) => setMetodoPagamento(e.target.value as typeof metodoPagamento)} className="w-full border px-3 py-2 text-sm" style={inputStyle}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="cheque">Cheque</option>
                </select>
              </label>
              <label className="space-y-1 text-sm" style={{ color: colors.textSecondary }}>
                Referência do pagamento
                <input maxLength={100} value={referenciaPagamento} onChange={(e) => setReferenciaPagamento(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </label>
            </div>
          </section>

          <button type="submit" disabled={aEmitir} className="flex w-full items-center justify-center gap-2 border px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
            {aEmitir ? "A emitir..." : <><CheckCircle2 size={16} /> Emitir Factura-Recibo</>}
          </button>
        </form>
      </main>
    </MainEmpresa>
  );
}
