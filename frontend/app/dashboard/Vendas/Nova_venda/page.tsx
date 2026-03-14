'use client';

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ShoppingCart, CheckCircle2, ArrowLeft,
  AlertTriangle, User, Package, FileText, Minus, Calculator, Receipt,
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import {
  vendaService, clienteService, produtoService,
  formatarNIF, isServico, formatarPreco, validarPayloadVenda,
} from "@/services/vendas";
import type {
  Produto, Cliente, CriarVendaPayload, DadosPagamento, TipoDocumentoFiscal,
} from "@/services/vendas";

/* ─── Constantes ─────────────────────────────────────────────────── */
const ESTOQUE_MINIMO = 5;

/* ─── Tipos ──────────────────────────────────────────────────────── */
interface ItemVendaUI {
  id: string; produto_id: string; descricao: string;
  quantidade: number; preco_venda: number; desconto: number;
  base_tributavel: number; valor_iva: number; valor_retencao: number;
  subtotal: number; taxa_iva?: number; taxa_retencao?: number;
  codigo_produto?: string; eh_servico: boolean;
}
interface FormItemState { produto_id: string; quantidade: number; desconto: number; }
type ModoCliente = 'cadastrado' | 'avulso';

/* ─── Helpers ────────────────────────────────────────────────────── */
const arredondar = (v: number) => Math.round(v * 100) / 100;

function calcularItem(produto: Produto, qtd: number, desc: number, id = uuidv4()): ItemVendaUI {
  const ehServico = isServico(produto);
  const base = arredondar(arredondar(produto.preco_venda * qtd) - desc);
  const taxaIva = produto.taxa_iva ?? 14;
  const iva = arredondar(base * taxaIva / 100);
  const taxaRet = ehServico ? 6.5 : 0;
  const ret = ehServico ? arredondar(base * taxaRet / 100) : 0;
  return {
    id, produto_id: produto.id, descricao: produto.nome, quantidade: qtd,
    preco_venda: produto.preco_venda, desconto: desc, base_tributavel: base,
    valor_iva: iva, valor_retencao: ret, subtotal: arredondar(base + iva - ret),
    taxa_iva: taxaIva, taxa_retencao: taxaRet,
    codigo_produto: produto.codigo || undefined, eh_servico: ehServico,
  };
}

/* ─── Linha de detalhe fiscal ──────────────────────────────────── */
interface ThemeColors {
  background: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  danger: string;
  success: string;
  warning: string;
  hover: string;
}

function LinhaFiscal({
  label, valor, cor, negrito, separador, colors,
}: {
  label: string; valor: string; cor?: string;
  negrito?: boolean; separador?: boolean; colors: ThemeColors;
}) {
  return (
    <>
      {separador && <div className="my-1 border-t" style={{ borderColor: colors.border }} />}
      <div className="flex items-center justify-between gap-2 py-0.5">
        <span className={`text-sm ${negrito ? "font-semibold" : ""}`}
          style={{ color: negrito ? colors.text : colors.textSecondary }}>
          {label}
        </span>
        <span className={`text-sm ${negrito ? "font-bold" : "font-medium"} tabular-nums`}
          style={{ color: cor || (negrito ? colors.text : colors.textSecondary) }}>
          {valor}
        </span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA
═══════════════════════════════════════════════════════════════════ */
export default function NovaFaturaReciboPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const colors = useThemeColors();

  const inp = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    color: colors.text,
    borderWidth: 1,
    fontSize: '14px',
  };

  /* ── Estado ── */
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<ItemVendaUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [modoCliente, setModoCliente] = useState<ModoCliente>('cadastrado');
  const [clienteAvulso, setClienteAvulso] = useState('');
  const [clienteAvulsoNif, setClienteAvulsoNif] = useState('');
  const [nifError, setNifError] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<FormItemState>({ produto_id: "", quantidade: 1, desconto: 0 });
  const [previewItem, setPreviewItem] = useState<ItemVendaUI | null>(null);
  const [formPagamento, setFormPagamento] = useState({
    metodo: "dinheiro" as DadosPagamento['metodo'],
    valor_pago: "",
    referencia: "",
    data_pagamento: new Date().toISOString().split('T')[0],
  });
  const [observacoes, setObservacoes] = useState('');

  /* ── Auth ── */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  /* ── Carregar dados ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [clientesData, produtosData] = await Promise.all([
          clienteService.listar({ status: 'ativo' }),
          produtoService.listar({ status: "ativo", paginar: false }).then(r =>
            Array.isArray(r.produtos) ? r.produtos : []
          ),
        ]);
        setClientes(clientesData);
        setProdutos(produtosData);
        const fisicos = produtosData.filter(p => !isServico(p));
        setProdutosEstoqueBaixo(fisicos.filter(p => p.estoque_atual > 0 && p.estoque_atual <= ESTOQUE_MINIMO));
      } catch {
        setError("Erro ao carregar dados");
      }
    })();
  }, [user]);

  /* ── NIF ── */
  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nums = e.target.value.replace(/\D/g, '');
    if (nums.length <= 9) {
      setClienteAvulsoNif(nums);
      setNifError(nums.length > 0 && nums.length !== 9 ? "NIF deve ter 9 dígitos" : null);
    }
  };

  /* ── Preview item ── */
  useEffect(() => {
    if (!formItem.produto_id) { setPreviewItem(null); return; }
    const p = produtos.find(x => x.id === formItem.produto_id);
    if (!p) { setPreviewItem(null); return; }
    const qtd = Math.min(formItem.quantidade, isServico(p) ? 9999 : p.estoque_atual);
    setPreviewItem({ ...calcularItem(p, qtd, formItem.desconto), id: "preview" });
  }, [formItem, produtos]);

  /* ── Adicionar item ── */
  const adicionarItem = () => {
    if (!formItem.produto_id || !previewItem) { setError("Selecione um produto"); return; }
    const p = produtos.find(x => x.id === formItem.produto_id);
    if (!p) return;
    if (!isServico(p) && formItem.quantidade > p.estoque_atual) {
      setError(`Estoque insuficiente. Disponível: ${p.estoque_atual}`); return;
    }
    const idx = itens.findIndex(i => i.produto_id === formItem.produto_id);
    if (idx >= 0) {
      const novaQtd = itens[idx].quantidade + formItem.quantidade;
      if (!isServico(p) && novaQtd > p.estoque_atual) {
        setError(`Estoque insuficiente para ${novaQtd} unidades.`); return;
      }
      setItens(prev => prev.map((it, i) => i === idx ? calcularItem(p, novaQtd, formItem.desconto, it.id) : it));
    } else {
      setItens(prev => [...prev, calcularItem(p, formItem.quantidade, formItem.desconto)]);
    }
    setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
    setPreviewItem(null);
    setError(null);
  };

  const atualizarQtd = (itemId: string, novaQtd: number) => {
    const idx = itens.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    if (novaQtd < 1) { setItens(p => p.filter(i => i.id !== itemId)); return; }
    const item = itens[idx];
    const p = produtos.find(x => x.id === item.produto_id);
    if (!p) return;
    if (!isServico(p) && novaQtd > p.estoque_atual) {
      setError(`Máximo disponível: ${p.estoque_atual}`); return;
    }
    setItens(prev => prev.map((it, i) => i === idx ? calcularItem(p, novaQtd, item.desconto, item.id) : it));
  };

  const removerItem = (id: string) => setItens(p => p.filter(i => i.id !== id));

  /* ── Totais ── */
  const totalBase = arredondar(itens.reduce((a, i) => a + i.base_tributavel, 0));
  const totalIva = arredondar(itens.reduce((a, i) => a + i.valor_iva, 0));
  const totalRetencao = arredondar(itens.reduce((a, i) => a + i.valor_retencao, 0));
  const totalLiquido = arredondar(itens.reduce((a, i) => a + i.subtotal, 0));
  const totalDesconto = arredondar(itens.reduce((a, i) => a + i.desconto, 0));

  /* ── Sincronizar valor_pago ── */
  useEffect(() => {
    setFormPagamento(p => ({
      ...p, valor_pago: itens.length > 0 ? totalLiquido.toString() : "",
    }));
  }, [itens, totalLiquido]);

  const valorPagamento = parseFloat(formPagamento.valor_pago) || 0;
  const troco = valorPagamento > totalLiquido ? arredondar(valorPagamento - totalLiquido) : 0;
  const falta = valorPagamento > 0 && valorPagamento < totalLiquido ? arredondar(totalLiquido - valorPagamento) : 0;
  const pagamentoSuficiente = valorPagamento >= totalLiquido && totalLiquido > 0;

  /* ── Validação ── */
  const podeFinalizar = () => {
    if (itens.length === 0) return false;
    if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
    if (modoCliente === 'avulso') {
      if (!clienteAvulso.trim()) return false;
      if (clienteAvulsoNif.trim() && clienteAvulsoNif.length !== 9) return false;
    }
    return pagamentoSuficiente;
  };

  /* ── Finalizar ── */
  const finalizarVenda = async () => {
    if (!podeFinalizar()) return;
    setLoading(true); setError(null); setSucesso(null);
    try {
      const payload: CriarVendaPayload = {
        itens: itens.map(it => ({
          produto_id: it.produto_id, quantidade: it.quantidade,
          preco_venda: arredondar(it.preco_venda), desconto: arredondar(it.desconto),
          taxa_retencao: it.eh_servico ? it.taxa_retencao : undefined,
        })),
        tipo_documento: 'FR' as TipoDocumentoFiscal,
        faturar: true,
        dados_pagamento: {
          metodo: formPagamento.metodo,
          valor: arredondar(Math.min(valorPagamento, totalLiquido)),
          referencia: formPagamento.referencia || undefined,
          data: formPagamento.data_pagamento,
        },
      };
      if (modoCliente === 'cadastrado' && clienteSelecionado)
        payload.cliente_id = clienteSelecionado.id;
      else if (modoCliente === 'avulso' && clienteAvulso.trim()) {
        payload.cliente_nome = clienteAvulso.trim();
        if (clienteAvulsoNif.trim()) payload.cliente_nif = clienteAvulsoNif.trim();
      }
      if (observacoes.trim()) payload.observacoes = observacoes.trim();
      const erroVal = validarPayloadVenda(payload);
      if (erroVal) { setError(erroVal); return; }
      await vendaService.criar(payload);
      setSucesso("Fatura-Recibo criada!" + (troco > 0 ? " Troco: " + formatarPreco(troco) : ""));
      setTimeout(() => router.push("/dashboard/Faturas/Faturas"), 1500);
    } catch (err: unknown) {
      setError(err instanceof AxiosError ? err.response?.data?.message || "Erro ao salvar" : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const produtoSel = produtos.find(p => p.id === formItem.produto_id);

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <MainEmpresa>
      <div className="space-y-3 pb-8 px-2 sm:px-4 max-w-5xl mx-auto" 
        style={{ backgroundColor: colors.background }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-2 mb-1 mt-2">
          <button onClick={() => router.back()}
            className="p-1.5 rounded-md transition-colors hover:bg-black/5"
            style={{ color: colors.primary }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: colors.secondary }}>Nova Venda</h1>
          </div>
        </div>

        {/* ── Alertas ── */}
        {error && (
          <div className="p-3 rounded-lg border text-sm flex items-center gap-2"
            style={{ backgroundColor: `${colors.danger}15`, borderColor: colors.danger, color: colors.danger }}>
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">
              <Minus size={14} />
            </button>
          </div>
        )}
        {sucesso && (
          <div className="p-3 rounded-lg border text-sm flex items-center gap-2"
            style={{ backgroundColor: `${colors.success}15`, borderColor: colors.success, color: colors.success }}>
            <CheckCircle2 size={15} className="flex-shrink-0" /><span>{sucesso}</span>
          </div>
        )}
        {produtosEstoqueBaixo.length > 0 && (
          <div className="p-3 rounded-lg border text-sm flex items-start gap-2"
            style={{ backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}50` }}>
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: colors.warning }} />
            <span style={{ color: colors.warning }}>
              <strong>Estoque baixo: </strong>
              <span style={{ color: colors.textSecondary }}>
                {produtosEstoqueBaixo.map((p) => p.nome + " (" + p.estoque_atual + ")").join(' · ')}
              </span>
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            CARD 1 — Dados da Venda (Cliente + Produto + Obs)
        ══════════════════════════════════════════════════════ */}
        <div className=" shadow-sm border overflow-hidden"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}>

          <div className="px-3 py-1.5 flex items-center gap-2"
            style={{ backgroundColor: colors.primary }}>
            <ShoppingCart size={14} className="text-white" />
            <span className="text-white font-medium text-xs uppercase tracking-wider">Dados da Venda</span>
          </div>

          <table className="w-full border-collapse">
            <tbody>

              {/* ── Cliente ── */}
              <tr className="border-b" style={{ borderColor: colors.border }}>
                <td className="py-2 pl-3 pr-2 align-middle w-[100px]"
                  style={{ backgroundColor: colors.hover }}>
                  <div className="flex items-center gap-1.5">
                    <User size={13} style={{ color: colors.text }} />
                    <span className="text-sm font-semibold" style={{ color: colors.text }}>Cliente</span>
                  </div>
                </td>
                <td className="py-2 px-2 align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Toggle modo */}
                    <div className="inline-flex rounded-md border overflow-hidden flex-shrink-0"
                      style={{ borderColor: colors.border }}>
                      {(['cadastrado', 'avulso'] as ModoCliente[]).map(modo => (
                        <button key={modo} type="button"
                          onClick={() => {
                            setModoCliente(modo);
                            setClienteSelecionado(null);
                            setClienteAvulso('');
                            setClienteAvulsoNif('');
                            setNifError(null);
                          }}
                          className="px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap"
                          style={{
                            backgroundColor: modoCliente === modo ? colors.primary : 'transparent',
                            color: modoCliente === modo ? 'white' : colors.textSecondary,
                          }}>
                          {modo === 'cadastrado' ? 'Cadastrado' : 'Não cadastrado'}
                        </button>
                      ))}
                    </div>

                    {modoCliente === 'cadastrado' ? (
                      <select className="flex-1 min-w-[150px] max-w-xs px-2.5 py-1.5 rounded-md text-sm outline-none"
                        style={inp}
                        value={clienteSelecionado?.id ?? ""}
                        onChange={e => setClienteSelecionado(clientes.find(c => c.id === e.target.value) ?? null)}>
                        <option value="">Selecione um cliente</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nome}{c.nif ? ` — ${formatarNIF(c.nif)}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <input type="text" placeholder="Nome do cliente *"
                          className="w-40 px-2.5 py-1.5 rounded-md text-sm outline-none" style={inp}
                          value={clienteAvulso}
                          onChange={e => setClienteAvulso(e.target.value)} />
                        <div className="flex items-center gap-2 relative">
                          <input type="text" inputMode="numeric" placeholder="NIF (9 dígitos)"
                            className="w-32 px-2.5 py-1.5 rounded-md text-sm outline-none" maxLength={9}
                            style={{ ...inp, borderColor: nifError ? colors.danger : inp.borderColor }}
                            value={clienteAvulsoNif}
                            onChange={handleNifChange} />
                          {nifError && <span className="text-[10px] absolute -bottom-4 right-0" style={{ color: colors.danger }}>{nifError}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>

              {/* ── Produto ── */}
              <tr className="border-b" style={{ borderColor: colors.border }}>
                <td className="py-2 pl-3 pr-2 align-middle"
                  style={{ backgroundColor: colors.hover }}>
                  <div className="flex items-center gap-1.5">
                    <Package size={13} style={{ color: colors.text }} />
                    <span className="text-sm font-semibold" style={{ color: colors.text }}>Produto</span>
                  </div>
                </td>
                <td className="py-2 px-2 align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="w-48 sm:w-56 px-2.5 py-1.5 rounded-md text-sm outline-none" style={inp}
                      value={formItem.produto_id}
                      onChange={e => {
                        const p = produtos.find(x => x.id === e.target.value);
                        setFormItem({ produto_id: e.target.value, quantidade: p ? (isServico(p) ? 1 : Math.min(1, p.estoque_atual)) : 1, desconto: 0 });
                      }}>
                      <option value="">Selecione…</option>
                      {produtos.filter(p => p.status === 'ativo').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {formatarPreco(p.preco_venda)}{!isServico(p) ? " (" + p.estoque_atual + ")" : ""}
                        </option>
                      ))}
                    </select>

                    {/* Stepper qtd */}
                    <div className="flex items-center rounded-md overflow-hidden border"
                      style={{ borderColor: colors.border }}>
                      <button type="button"
                        className="w-7 h-8 flex items-center justify-center disabled:opacity-30"
                        style={{ backgroundColor: colors.hover, color: colors.text }}
                        disabled={!formItem.produto_id || formItem.quantidade <= 1}
                        onClick={() => setFormItem(p => ({ ...p, quantidade: Math.max(1, p.quantidade - 1) }))}>
                        <Minus size={12} style={{ color: colors.text }} />
                      </button>
                      <input type="number" min={1}
                        className="w-10 text-center text-sm h-8 border-0 outline-none"
                        style={{ backgroundColor: colors.card, color: colors.text }}
                        value={formItem.quantidade} disabled={!formItem.produto_id}
                        onChange={e => {
                          const p = produtos.find(x => x.id === formItem.produto_id);
                          if (p) {
                            const max = isServico(p) ? 9999 : p.estoque_atual;
                            setFormItem(prev => ({ ...prev, quantidade: Math.max(1, Math.min(Number(e.target.value) || 1, max)) }));
                          }
                        }} />
                      <button type="button"
                        className="w-7 h-8 flex items-center justify-center disabled:opacity-30"
                        style={{ backgroundColor: colors.hover, color: colors.text }}
                        disabled={!formItem.produto_id || (!!produtoSel && !isServico(produtoSel) && formItem.quantidade >= produtoSel.estoque_atual)}
                        onClick={() => {
                          const p = produtos.find(x => x.id === formItem.produto_id);
                          if (p) {
                            const max = isServico(p) ? 9999 : p.estoque_atual;
                            setFormItem(prev => ({ ...prev, quantidade: Math.min(prev.quantidade + 1, max) }));
                          }
                        }}>
                        <Plus size={12} style={{ color: colors.text }} />
                      </button>
                    </div>

                    <input type="number" min={0} placeholder="Desconto"
                      className="w-20 px-2.5 py-1.5 rounded-md text-sm outline-none" style={inp}
                      value={formItem.desconto || ''} disabled={!formItem.produto_id}
                      onChange={e => setFormItem(p => ({ ...p, desconto: Number(e.target.value) }))} />

                    <button type="button" onClick={adicionarItem} disabled={!formItem.produto_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-40"
                      style={{ backgroundColor: colors.primary }}>
                      <Plus size={13} />Adic.
                    </button>

                    {produtoSel && !isServico(produtoSel) && (
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        disp.: {produtoSel.estoque_atual}
                      </span>
                    )}
                  </div>
                </td>
              </tr>

              {/* ── Observações ── */}
              <tr>
                <td className="py-2 pl-3 pr-2 align-top"
                  style={{ backgroundColor: colors.hover }}>
                  <div className="flex items-center gap-1.5">
                    <FileText size={13} style={{ color: colors.text }} />
                    <span className="text-sm font-semibold" style={{ color: colors.text }}>Obs.</span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  <input type="text" placeholder="Observações adicionais…"
                    className="w-full px-2.5 py-1.5 rounded-md text-sm outline-none" style={inp}
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)} />
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CARD ÚNICO — Itens + Resumo Fiscal + Pagamento (empilhado)
        ══════════════════════════════════════════════════════════════ */}
        {itens.length > 0 ? (
          <div className=" border shadow-sm overflow-hidden"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}>

            {/* Header do card */}
            <div className="px-3 py-1.5 flex items-center justify-between"
              style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-white" />
                <span className="text-white font-medium text-xs uppercase tracking-wider">
                  Itens da Venda
                  <span className="ml-1.5 text-white/70 font-normal text-xs normal-case">
                    ({itens.length} {itens.length !== 1 ? "itens" : "item"})
                  </span>
                </span>
              </div>
              <button
                onClick={() => window.confirm("Limpar todos os itens?") && setItens([])}
                className="text-white/70 hover:text-white text-xs transition-colors">
                Limpar tudo
              </button>
            </div>

            {/* Tabela de Itens */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: colors.hover }}>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    <th className="py-2.5 px-3 text-left font-semibold text-xs" style={{ color: colors.textSecondary }}>Produto</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-xs" style={{ color: colors.textSecondary }}>Qtd.</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-xs hidden sm:table-cell" style={{ color: colors.textSecondary }}>Preço unit.</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-xs hidden md:table-cell" style={{ color: colors.textSecondary }}>IVA</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-xs hidden lg:table-cell" style={{ color: colors.textSecondary }}>Ret.</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-xs" style={{ color: colors.textSecondary }}>Subtotal</th>
                    <th className="py-2.5 px-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, idx) => {
                    const p = produtos.find(x => x.id === item.produto_id);
                    const maxEst = p && !isServico(p) ? p.estoque_atual : 9999;
                    return (
                      <tr key={item.id}
                        className="border-b last:border-0 transition-colors"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: idx % 2 !== 0 ? `${colors.hover}60` : 'transparent',
                        }}>

                        {/* Produto */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate max-w-[100px] sm:max-w-[160px]"
                              style={{ color: colors.text }}>{item.descricao}</span>
                          </div>
                          {item.desconto > 0 && (
                            <span className="text-[10px]" style={{ color: colors.danger }}>
                              desc. −{formatarPreco(item.desconto)}
                            </span>
                          )}
                        </td>

                        {/* Qtd stepper inline */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => atualizarQtd(item.id, item.quantidade - 1)}
                              className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover, color: colors.primary }}
                              disabled={item.quantidade <= 1}>
                              <Minus size={11} style={{ color: colors.text }} />
                            </button>
                            <span className="w-7 text-center text-sm font-medium"
                              style={{ color: colors.text }}>{item.quantidade}</span>
                            <button onClick={() => atualizarQtd(item.id, item.quantidade + 1)}
                              className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover, color: colors.primary }}
                              disabled={item.quantidade >= maxEst}>
                              <Plus size={11} style={{ color: colors.text }} />
                            </button>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right hidden sm:table-cell"
                          style={{ color: colors.textSecondary }}>{formatarPreco(item.preco_venda)}</td>
                        <td className="px-3 py-2.5 text-right hidden md:table-cell"
                          style={{ color: colors.text }}>{formatarPreco(item.valor_iva)}</td>
                        <td className="px-3 py-2.5 text-right hidden lg:table-cell"
                          style={{ color: item.valor_retencao > 0 ? colors.danger : colors.textSecondary }}>
                          {item.valor_retencao > 0 ? `−${formatarPreco(item.valor_retencao)}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold"
                          style={{ color: colors.secondary }}>{formatarPreco(item.subtotal)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => removerItem(item.id)}
                            className="p-1 rounded hover:opacity-70 transition-colors"
                            style={{ color: colors.danger }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Secção: Resumo Fiscal + Pagamento (abaixo dos itens) ── */}
            <div className="border-t" style={{ borderColor: colors.border }}>
              {/* Resumo Fiscal - Formato original (duas colunas) */}
              <div className="p-3 border-b" style={{ borderColor: colors.border }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3"
                  style={{ color: colors.textSecondary }}>Resumo Fiscal</p>
                <div className=" flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 max-w-md">
                    <LinhaFiscal label="Subtotal bruto" valor={formatarPreco(totalBase + totalDesconto)} colors={colors} />
                    {totalDesconto > 0 && (
                      <LinhaFiscal label="Descontos" valor={`−${formatarPreco(totalDesconto)}`} cor={colors.danger} colors={colors} />
                    )}
                    <LinhaFiscal label="Base tributável" valor={formatarPreco(totalBase)} colors={colors} />
                    </div>
                    <div className="flex-1 max-w-md gap-2 mt-2 lg:mt-0 lg:gap-0">
                    <LinhaFiscal label={"IVA (" + (itens[0]?.taxa_iva ?? 14) + "%)"} valor={formatarPreco(totalIva)} colors={colors} />
                    {totalRetencao > 0 && (
                      <LinhaFiscal label="Retenção (6.5%)" valor={`−${formatarPreco(totalRetencao)}`} cor={colors.danger} colors={colors} />
                    )}
                    <LinhaFiscal label="Total" valor={formatarPreco(totalLiquido)}
                      cor={colors.secondary} negrito colors={colors} />
                    </div>
                    <hr />

                  </div>
                </div>
              </div>

              {/* Pagamento - Linha única abaixo do Resumo Fiscal */}
              <div className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  {/* Método de Pagamento */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1"
                      style={{ color: colors.textSecondary }}>Método de Pagamento</label>
                    <select
                      value={formPagamento.metodo}
                      onChange={e => setFormPagamento(p => ({ ...p, metodo: e.target.value as DadosPagamento['metodo'] }))}
                      className="w-full p-2.5 rounded-lg text-sm outline-none"
                      style={inp}>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao">Cartão</option>
                      <option value="transferencia">Transferência</option>
                      <option value="multibanco">Multibanco</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  {/* Valor Pago */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>Valor a pagar</label>
                      <span className="text-xs font-semibold" style={{ color: colors.secondary }}>
                        troco: {formatarPreco(troco)}
                      </span>
                      {falta > 0 && (
                        <p className="text-sm flex items-center gap-1" style={{ color: colors.danger }}>
                          <AlertTriangle size={14} />Faltam <strong>{formatarPreco(falta)}</strong>
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <Calculator size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: colors.textSecondary }} />
                      <input type="number" min={0} step="0.01"
                        placeholder={formatarPreco(totalLiquido)}
                        value={formPagamento.valor_pago}
                        onChange={e => setFormPagamento(p => ({ ...p, valor_pago: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm font-semibold outline-none"
                        style={{
                          ...inp,
                          borderWidth: 2,
                          borderColor: falta > 0 ? colors.danger
                            : pagamentoSuficiente ? colors.success
                              : inp.borderColor,
                          color: pagamentoSuficiente ? colors.success : colors.text,
                        }} />
                    </div>
                  </div>

                  {/* Botão Finalizar */}
                  <div className="flex-1 lg:flex-none lg:w-48">
                    <button type="button" onClick={finalizarVenda}
                      disabled={loading || !podeFinalizar()}
                      className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.secondary }}>
                      {loading ? (
                        <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Processando</>
                      ) : !pagamentoSuficiente ? (
                        <><AlertTriangle size={15} />Pagar</>
                      ) : (
                        <><CheckCircle2 size={15} />
                          Finalizar{troco > 0 ? " · Troco " + formatarPreco(troco) : ""}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        ) : (
          /* Estado vazio */
          <div className="text-center py-8 rounded-xl border-2 border-dashed"
            style={{ borderColor: colors.border }}>
            <ShoppingCart size={28} className="mx-auto mb-2" style={{ color: colors.border }} />
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Adicione produtos para ver o resumo e finalizar
            </p>
          </div>
        )}

      </div>
    </MainEmpresa>
  );
}