"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Plus, ShoppingCart, Trash2, User } from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { ToastNotification } from "@/components/ToastNotification";
import { useThemeColors } from "@/context/ThemeContext";
import { documentoFiscalService } from "@/services/DocumentoFiscal";
import { LinhaCampoFormulario } from "@/app/components/Formularios/LinhaCampoFormulario";

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

  const subtotal = itens.reduce(
    (soma, item) => soma + (Number(item.quantidade) || 0) * (Number(item.preco) || 0),
    0
  );
  const totalIva = itens.reduce((soma, item) => {
    const base = (Number(item.quantidade) || 0) * (Number(item.preco) || 0);
    return soma + (base * Number(item.taxaIva)) / 100;
  }, 0);
  const total = subtotal + totalIva;
  const formatarMontante = (valor: number) =>
    valor.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            <h1 className="text-lg font-bold" style={{ color: colors.secondary }}>Auto-facturação</h1>
        </header>

        <form onSubmit={emitir} className="space-y-3">
          <section className="overflow-hidden border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: colors.primary }}>
              <User size={14} className="text-white" />
              <span className="text-xs font-medium uppercase tracking-wider text-white">Dados da Aquisição</span>
            </div>
            <div className="divide-y" style={{ borderColor: colors.border }}>
              <LinhaCampoFormulario label="Produtor/fornecedor *" colors={colors} htmlFor="autofact-produtor">
                <input id="autofact-produtor" required maxLength={255} value={produtor} onChange={(e) => setProdutor(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </LinhaCampoFormulario>
              <LinhaCampoFormulario label="NIF (se existir)" colors={colors} htmlFor="autofact-nif">
                <input id="autofact-nif" maxLength={20} value={nifProdutor} onChange={(e) => setNifProdutor(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </LinhaCampoFormulario>
              <LinhaCampoFormulario label="Motivo *" colors={colors} htmlFor="autofact-motivo">
                <input id="autofact-motivo" required maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </LinhaCampoFormulario>
              <LinhaCampoFormulario label="Tipo de aquisição" colors={colors} htmlFor="autofact-tipo">
                <select
                  id="autofact-tipo"
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
              </LinhaCampoFormulario>
              <LinhaCampoFormulario label="Classificação" colors={colors}>
                <label className="flex items-center gap-2 py-2 text-sm" style={{ color: colors.text }}>
                <input type="checkbox" checked={bensEssenciais} disabled={tipoBem === "servico"} onChange={(e) => setBensEssenciais(e.target.checked)} />
                Bens essenciais
                </label>
              </LinhaCampoFormulario>
            </div>
          </section>

          <section className="overflow-hidden border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-white" />
                <span className="text-xs font-medium uppercase tracking-wider text-white">Itens da Aquisição ({itens.length})</span>
              </div>
              <button type="button" onClick={() => setItens((atuais) => [...atuais, novoItem()])} className="inline-flex shrink-0 items-center gap-1 px-2 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80">
                <Plus size={15} /> Adicionar item
              </button>
            </div>
            <div className="space-y-3 p-3">
              {itens.map((item, index) => (
                <div key={index} className="grid gap-3 border p-3 sm:grid-cols-[minmax(0,1fr)_90px_140px_110px_40px] sm:items-end sm:p-4" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                  <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
                    Descrição
                    <input required maxLength={255} aria-label="Descrição do item" placeholder="Ex.: Matéria-prima" value={item.descricao} onChange={(e) => alterarItem(index, { descricao: e.target.value })} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
                  </label>
                  <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
                    Quantidade
                    <input required type="number" min="0.01" step="0.01" aria-label="Quantidade" placeholder="1" value={item.quantidade} onChange={(e) => alterarItem(index, { quantidade: e.target.value })} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
                  </label>
                  <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
                    Preço unitário
                    <input required type="number" min="0" step="0.01" aria-label="Preço unitário" placeholder="0,00" value={item.preco} onChange={(e) => alterarItem(index, { preco: e.target.value })} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
                  </label>
                  <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
                    Taxa de IVA
                    <select aria-label="Taxa de IVA" value={item.taxaIva} onChange={(e) => alterarItem(index, { taxaIva: e.target.value as ItemAutoFacturacao["taxaIva"] })} className="w-full border px-3 py-2 text-sm" style={inputStyle}>
                      <option value="0">IVA 0%</option>
                      <option value="5">IVA 5%</option>
                      <option value="14">IVA 14%</option>
                    </select>
                  </label>
                  <button type="button" aria-label="Remover item" disabled={itens.length === 1} onClick={() => setItens((atuais) => atuais.filter((_, i) => i !== index))} className="flex h-9 items-center justify-center rounded-md transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30" style={{ color: colors.danger }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="ml-auto w-full max-w-sm border-t pt-3" style={{ borderColor: colors.border }}>
                <div className="flex justify-between py-1 text-sm" style={{ color: colors.textSecondary }}>
                  <span>Subtotal</span><span className="tabular-nums">{formatarMontante(subtotal)} Kz</span>
                </div>
                <div className="flex justify-between py-1 text-sm" style={{ color: colors.textSecondary }}>
                  <span>IVA</span><span className="tabular-nums">{formatarMontante(totalIva)} Kz</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t pt-3" style={{ borderColor: colors.border, color: colors.text }}>
                  <span className="font-semibold">Total estimado</span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: colors.secondary }}>{formatarMontante(total)} Kz</span>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: colors.primary }}>
              <FileText size={14} className="text-white" />
              <span className="text-xs font-medium uppercase tracking-wider text-white">Pagamento</span>
            </div>
            <div className="divide-y" style={{ borderColor: colors.border }}>
              <LinhaCampoFormulario label="Método de pagamento" colors={colors} htmlFor="autofact-metodo">
                <select id="autofact-metodo" value={metodoPagamento} onChange={(e) => setMetodoPagamento(e.target.value as typeof metodoPagamento)} className="w-full border px-3 py-2 text-sm" style={inputStyle}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="cheque">Cheque</option>
                </select>
              </LinhaCampoFormulario>
              <LinhaCampoFormulario label="Referência do pagamento" colors={colors} htmlFor="autofact-referencia">
                <input id="autofact-referencia" maxLength={100} value={referenciaPagamento} onChange={(e) => setReferenciaPagamento(e.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} />
              </LinhaCampoFormulario>
            </div>
            <div className="border-t px-4 py-3" style={{ borderColor: colors.border }}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold" style={{ color: colors.text }}>Total a pagar</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: colors.secondary }}>{formatarMontante(total)} Kz</span>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              O documento será emitido pelo valor total de <strong style={{ color: colors.text }}>{formatarMontante(total)} Kz</strong>.
            </p>
            <button type="submit" disabled={aEmitir} className="flex w-full items-center justify-center gap-2 border px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
              {aEmitir ? "A emitir..." : <><CheckCircle2 size={17} /> Emitir Factura-Recibo</>}
            </button>
          </div>
        </form>
      </main>
    </MainEmpresa>
  );
}
