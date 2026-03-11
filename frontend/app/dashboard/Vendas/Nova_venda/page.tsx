'use client';

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ShoppingCart, CreditCard, CheckCircle2, ArrowLeft,
  AlertTriangle, User, Package, FileText, Minus, Calculator
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import {
  vendaService, Produto, Cliente, clienteService, produtoService,
  CriarVendaPayload, formatarNIF, isServico, formatarPreco,
  DadosPagamento, validarPayloadVenda, TipoDocumentoFiscal,
} from "@/services/vendas";

const ESTOQUE_MINIMO = 5;

interface ItemVendaUI {
  id: string;
  produto_id: string;
  descricao: string;
  quantidade: number;
  preco_venda: number;
  desconto: number;
  base_tributavel: number;
  valor_iva: number;
  valor_retencao: number;
  subtotal: number;
  taxa_iva?: number;
  taxa_retencao?: number;
  codigo_produto?: string;
  eh_servico: boolean;
}

interface FormItemState {
  produto_id: string;
  quantidade: number;
  desconto: number;
}

type ModoCliente = 'cadastrado' | 'avulso';

const arredondar = (v: number) => Math.round(v * 100) / 100;

/* ---- Reusable section label with icon ---- */
const SectionLabel = ({ icon: Icon, label, colors }: { icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>; label: string; colors: ReturnType<typeof useThemeColors> }) => (
  <div className="flex items-center gap-1.5 mb-1.5">
    <Icon size={13} style={{ color: colors.primary }} />
    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.primary }}>
      {label}
    </span>
  </div>
);

export default function NovaFaturaReciboPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const colors = useThemeColors();

  const inputStyles = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    color: colors.text,
    borderWidth: 1,
  };

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

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
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
    }
    load();
  }, [user]);

  // Validação de NIF
  const validarNif = (nif: string): boolean => {
    const numerosApenas = nif.replace(/\D/g, '');
    return numerosApenas.length === 9;
  };

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numerosApenas = value.replace(/\D/g, '');
    
    if (numerosApenas.length <= 9) {
      setClienteAvulsoNif(numerosApenas);
      
      if (numerosApenas.length > 0 && numerosApenas.length !== 9) {
        setNifError("O NIF deve ter exatamente 9 dígitos");
      } else {
        setNifError(null);
      }
    }
  };

  useEffect(() => {
    if (!formItem.produto_id) { setPreviewItem(null); return; }
    const produto = produtos.find(p => p.id === formItem.produto_id);
    if (!produto) { setPreviewItem(null); return; }
    const ehServico = isServico(produto);
    const qtd = Math.min(formItem.quantidade, ehServico ? Infinity : produto.estoque_atual);
    const base = arredondar(arredondar(produto.preco_venda * qtd) - formItem.desconto);
    const taxaIva = produto.taxa_iva ?? 14;
    const iva = arredondar(base * taxaIva / 100);
    const taxaRet = ehServico ? 6.5 : 0;
    const ret = ehServico ? arredondar(base * taxaRet / 100) : 0;
    setPreviewItem({
      id: "preview", produto_id: produto.id, descricao: produto.nome, quantidade: qtd,
      preco_venda: produto.preco_venda, desconto: formItem.desconto, base_tributavel: base,
      valor_iva: iva, valor_retencao: ret, subtotal: arredondar(base + iva - ret),
      taxa_iva: taxaIva, taxa_retencao: taxaRet, codigo_produto: produto.codigo || undefined,
      eh_servico: ehServico,
    });
  }, [formItem, produtos]);

  const calcularItem = (produto: Produto, qtd: number, desc: number, id = uuidv4()): ItemVendaUI => {
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
      taxa_iva: taxaIva, taxa_retencao: taxaRet, codigo_produto: produto.codigo || undefined,
      eh_servico: ehServico,
    };
  };

  const adicionarItem = () => {
    if (!formItem.produto_id || !previewItem) { setError("Selecione um produto"); return; }
    const produto = produtos.find(p => p.id === formItem.produto_id);
    if (!produto) return;
    if (!isServico(produto) && formItem.quantidade > produto.estoque_atual) {
      setError(`Estoque insuficiente. Disponível: ${produto.estoque_atual}`); return;
    }
    const existeIdx = itens.findIndex(i => i.produto_id === formItem.produto_id);
    if (existeIdx >= 0) {
      const novaQtd = itens[existeIdx].quantidade + formItem.quantidade;
      if (!isServico(produto) && novaQtd > produto.estoque_atual) {
        setError(`Estoque insuficiente para ${novaQtd} unidades.`); return;
      }
      setItens(prev => prev.map((it, i) => i === existeIdx ? calcularItem(produto, novaQtd, formItem.desconto, it.id) : it));
    } else {
      setItens(prev => [...prev, calcularItem(produto, formItem.quantidade, formItem.desconto)]);
    }
    setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
    setPreviewItem(null);
    setError(null);
  };

  const atualizarQtd = (itemId: string, novaQtd: number) => {
    const idx = itens.findIndex(i => i.id === itemId);
    if (idx < 0) return;
    if (novaQtd < 1) { removerItem(itemId); return; }
    const item = itens[idx];
    const produto = produtos.find(p => p.id === item.produto_id);
    if (!produto) return;
    if (!isServico(produto) && novaQtd > produto.estoque_atual) {
      setError(`Estoque insuficiente. Máximo: ${produto.estoque_atual}`); return;
    }
    setItens(prev => prev.map((it, i) => i === idx ? calcularItem(produto, novaQtd, item.desconto, item.id) : it));
  };

  const removerItem = (id: string) => setItens(prev => prev.filter(i => i.id !== id));

  /* ---- Totais ---- */
  const totalBase = arredondar(itens.reduce((a, i) => a + i.base_tributavel, 0));
  const totalIva = arredondar(itens.reduce((a, i) => a + i.valor_iva, 0));
  const totalRetencao = arredondar(itens.reduce((a, i) => a + i.valor_retencao, 0));
  const totalLiquido = arredondar(itens.reduce((a, i) => a + i.subtotal, 0));

  // Atualiza automaticamente o valor_pago quando o totalLiquido mudar
  useEffect(() => {
    if (itens.length > 0) {
      setFormPagamento(prev => ({
        ...prev,
        valor_pago: totalLiquido.toString()
      }));
    } else {
      setFormPagamento(prev => ({
        ...prev,
        valor_pago: ""
      }));
    }
  }, [itens, totalLiquido]);

  const valorPagamento = parseFloat(formPagamento.valor_pago) || 0;
  const troco = valorPagamento > totalLiquido ? arredondar(valorPagamento - totalLiquido) : 0;
  const pagamentoSuficiente = valorPagamento >= totalLiquido && totalLiquido > 0;

  const podeFinalizar = () => {
    if (itens.length === 0) return false;
    if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
    if (modoCliente === 'avulso') {
      if (!clienteAvulso.trim()) return false;
      if (clienteAvulsoNif.trim() && !validarNif(clienteAvulsoNif)) return false;
    }
    return pagamentoSuficiente;
  };

  const finalizarVenda = async () => {
    if (!podeFinalizar()) return;
    setLoading(true); setError(null); setSucesso(null);
    try {
      const valorBackend = arredondar(Math.min(valorPagamento, totalLiquido));
      const payload: CriarVendaPayload = {
        itens: itens.map(it => ({
          produto_id: it.produto_id, quantidade: it.quantidade,
          preco_venda: arredondar(it.preco_venda), desconto: arredondar(it.desconto),
          taxa_retencao: it.eh_servico ? it.taxa_retencao : undefined,
        })),
        tipo_documento: 'FR' as TipoDocumentoFiscal,
        faturar: true,
        dados_pagamento: {
          metodo: formPagamento.metodo, valor: valorBackend,
          referencia: formPagamento.referencia || undefined, data: formPagamento.data_pagamento,
        },
      };
      if (modoCliente === 'cadastrado' && clienteSelecionado) payload.cliente_id = clienteSelecionado.id;
      else if (modoCliente === 'avulso' && clienteAvulso.trim()) {
        payload.cliente_nome = clienteAvulso.trim();
        if (clienteAvulsoNif.trim()) payload.cliente_nif = clienteAvulsoNif.trim();
      }
      if (observacoes.trim()) payload.observacoes = observacoes.trim();
      const erroVal = validarPayloadVenda(payload);
      if (erroVal) { setError(erroVal); return; }
      await vendaService.criar(payload);
      setSucesso(`Fatura-Recibo criada!${troco > 0 ? ` Troco: ${formatarPreco(troco)}` : ''}`);
      setTimeout(() => router.push("/dashboard/Faturas/Faturas"), 1500);
    } catch (err: unknown) {
      setError(err instanceof AxiosError ? err.response?.data?.message || "Erro ao salvar" : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const produtoSelecionado = produtos.find(p => p.id === formItem.produto_id);

  return (
    <MainEmpresa>
      <div className="space-y-3 pb-8 px-2 sm:px-0 max-w-6xl mx-auto" style={{ backgroundColor: colors.background }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-1.5 rounded-full transition-colors hover:bg-opacity-10" style={{ color: colors.primary }}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: colors.secondary }}>Nova Fatura-Recibo</h1>
        </div>

        {/* ── Alertas ── */}
        {error && (
          <div className="p-2.5 rounded-lg border text-xs flex items-center gap-2"
            style={{ backgroundColor: colors.danger + '15', borderColor: colors.danger, color: colors.danger }}>
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}
        {sucesso && (
          <div className="p-2.5 rounded-lg border text-xs flex items-center gap-2"
            style={{ backgroundColor: colors.success + '15', borderColor: colors.success, color: colors.success }}>
            <CheckCircle2 size={13} className="flex-shrink-0" />
            <span className="flex-1">{sucesso}</span>
          </div>
        )}
        {produtosEstoqueBaixo.length > 0 && (
          <div className="p-2.5 rounded-lg border text-xs flex items-center gap-2 flex-wrap"
            style={{ backgroundColor: colors.warning + '15', borderColor: colors.warning }}>
            <AlertTriangle size={13} className="flex-shrink-0" style={{ color: colors.warning }} />
            <span style={{ color: colors.warning }} className="font-semibold">Estoque baixo:</span>
            <span style={{ color: colors.textSecondary }} className="flex-1">
              {produtosEstoqueBaixo.map(p => `${p.nome} (${p.estoque_atual})`).join(' · ')}
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════
            CARD: Cliente + Produto + Observações
        ══════════════════════════════════════ */}
        <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: colors.primary }}>
            <ShoppingCart size={14} className="text-white" />
            <span className="text-white font-semibold text-xs uppercase tracking-wide">Dados da Venda</span>
          </div>

          {/* Layout com tabela para manter alinhamento compacto */}
          <table className="w-full border-collapse">
            <tbody>

              {/* ── Cliente ── */}
              <tr className="border-b" style={{ borderColor: colors.border }}>
                <td className="py-2 pl-4 pr-2 align-middle w-[80px] sm:w-[100px]" style={{ backgroundColor: colors.hover }}>
                  <div className="flex items-center gap-1.5">
                    <User size={13} style={{ color: colors.primary }} />
                    <span className="text-[11px] font-semibold" style={{ color: colors.primary }}>Cliente</span>
                  </div>
                </td>
                <td className="py-2 px-3 align-middle">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Botões de modo cliente - compactos */}
                    <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: colors.border }}>
                      {(['cadastrado', 'avulso'] as ModoCliente[]).map(modo => (
                        <button key={modo} type="button"
                          onClick={() => { setModoCliente(modo); setClienteSelecionado(null); setClienteAvulso(''); setClienteAvulsoNif(''); setNifError(null); }}
                          className="px-2 py-1 font-medium transition-colors whitespace-nowrap text-[11px]"
                          style={{ backgroundColor: modoCliente === modo ? colors.primary : 'transparent', color: modoCliente === modo ? 'white' : colors.textSecondary }}>
                          {modo === 'cadastrado' ? 'Cadastrado' : 'Avulso'}
                        </button>
                      ))}
                    </div>
                    {modoCliente === 'cadastrado' ? (
                      <select className="flex-1 min-w-[140px] max-w-[200px] p-1 rounded-lg text-xs" style={inputStyles}
                        value={clienteSelecionado?.id ?? ""}
                        onChange={e => setClienteSelecionado(clientes.find(c => c.id === e.target.value) ?? null)}>
                        <option value="">Selecione um cliente</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}{c.nif ? ` (${formatarNIF(c.nif)})` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input type="text" placeholder="Nome do cliente *"
                          className="w-[140px] sm:w-[160px] p-1 rounded-lg text-xs" style={inputStyles}
                          value={clienteAvulso} onChange={e => setClienteAvulso(e.target.value)} />
                        <div className="relative inline-block">
                          <input type="text" inputMode="numeric" placeholder="NIF"
                            className="w-[80px] p-1 rounded-lg text-xs" style={{
                              ...inputStyles,
                              borderColor: nifError ? colors.danger : inputStyles.borderColor
                            }}
                            value={clienteAvulsoNif} onChange={handleNifChange} maxLength={9} />
                          {nifError && (
                            <p className="absolute -bottom-4 left-0 text-[8px]" style={{ color: colors.danger }}>
                              {nifError}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>

              {/* ── Produto ── */}
              <tr className="border-b" style={{ borderColor: colors.border }}>
                <td className="py-2 pl-4 pr-2 align-middle w-[80px] sm:w-[100px]" style={{ backgroundColor: colors.hover }}>
                  <div className="flex items-center gap-1.5">
                    <Package size={13} style={{ color: colors.primary }} />
                    <span className="text-[11px] font-semibold" style={{ color: colors.primary }}>Produto</span>
                  </div>
                </td>
                <td className="py-2 px-3 align-middle">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select className="w-[140px] sm:w-[160px] p-1 rounded-lg text-xs" style={inputStyles}
                      value={formItem.produto_id}
                      onChange={e => {
                        const p = produtos.find(x => x.id === e.target.value);
                        setFormItem({ produto_id: e.target.value, quantidade: p ? (isServico(p) ? 1 : Math.min(1, p.estoque_atual)) : 1, desconto: 0 });
                      }}>
                      <option value="">Selecione</option>
                      {produtos.filter(p => p.status === 'ativo').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {formatarPreco(p.preco_venda)}{!isServico(p) ? ` (${p.estoque_atual})` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Stepper quantidade - compacto */}
                    <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: colors.border, height: 26 }}>
                      <button type="button"
                        className="px-1.5 h-full text-xs transition-colors disabled:opacity-30"
                        style={{ backgroundColor: colors.hover, color: colors.primary }}
                        disabled={!formItem.produto_id || formItem.quantidade <= 1}
                        onClick={() => {
                          const p = produtos.find(x => x.id === formItem.produto_id);
                          if (p) setFormItem(prev => ({ ...prev, quantidade: Math.max(1, prev.quantidade - 1) }));
                        }}>
                        <Minus size={10} />
                      </button>
                      <input type="number" min={1}
                        className="w-8 text-center text-[11px] border-0 outline-none h-full"
                        style={{ backgroundColor: colors.card, color: colors.text }}
                        value={formItem.quantidade} disabled={!formItem.produto_id}
                        onChange={e => {
                          const p = produtos.find(x => x.id === formItem.produto_id);
                          if (p) {
                            const max = isServico(p) ? Infinity : p.estoque_atual;
                            setFormItem(prev => ({ ...prev, quantidade: Math.max(1, Math.min(Number(e.target.value) || 1, max)) }));
                          }
                        }} />
                      <button type="button"
                        className="px-1.5 h-full text-xs transition-colors disabled:opacity-30"
                        style={{ backgroundColor: colors.hover, color: colors.primary }}
                        disabled={!formItem.produto_id || (!!produtoSelecionado && !isServico(produtoSelecionado) && formItem.quantidade >= produtoSelecionado.estoque_atual)}
                        onClick={() => {
                          const p = produtos.find(x => x.id === formItem.produto_id);
                          if (p) {
                            const max = isServico(p) ? Infinity : p.estoque_atual;
                            setFormItem(prev => ({ ...prev, quantidade: Math.min(prev.quantidade + 1, max) }));
                          }
                        }}>
                        <Plus size={10} />
                      </button>
                    </div>

                    <input type="number" min={0} placeholder="Desc."
                      className="w-[70px] p-1 rounded-lg text-xs" style={inputStyles}
                      value={formItem.desconto || ''} disabled={!formItem.produto_id}
                      onChange={e => setFormItem(prev => ({ ...prev, desconto: Number(e.target.value) }))} />

                    <button type="button" onClick={adicionarItem} disabled={!formItem.produto_id}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.primary }}>
                      <Plus size={11} /> Add
                    </button>

                    {produtoSelecionado && !isServico(produtoSelecionado) && (
                      <span className="text-[9px]" style={{ color: colors.textSecondary }}>
                        disp: {produtoSelecionado.estoque_atual}
                      </span>
                    )}
                  </div>

                  {/* Preview cálculo */}
                  {previewItem && (
                    <div className="mt-1.5 px-2 py-1 rounded-lg flex flex-wrap gap-2 text-[10px]"
                      style={{ backgroundColor: colors.hover }}>
                      <span style={{ color: colors.textSecondary }}>Base: <span style={{ color: colors.text }}>{formatarPreco(previewItem.base_tributavel)}</span></span>
                      <span style={{ color: colors.textSecondary }}>IVA: <span style={{ color: colors.text }}>{formatarPreco(previewItem.valor_iva)}</span></span>
                      {previewItem.valor_retencao > 0 && (
                        <span style={{ color: colors.textSecondary }}>Ret.: <span style={{ color: colors.danger }}>-{formatarPreco(previewItem.valor_retencao)}</span></span>
                      )}
                      <span style={{ color: colors.textSecondary }}>Total: <span style={{ color: colors.secondary }}>{formatarPreco(previewItem.subtotal)}</span></span>
                    </div>
                  )}
                </td>
              </tr>

              {/* ── Observações ── */}
              <tr>
                <td className="py-2 pl-4 pr-2 align-top w-[80px] sm:w-[100px]" style={{ backgroundColor: colors.hover }}>
                  <div className="flex items-center gap-1.5">
                    <FileText size={13} style={{ color: colors.primary }} />
                    <span className="text-[11px] font-semibold" style={{ color: colors.primary }}>Obs.</span>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <input type="text" placeholder="Observações (opcional)..."
                    className="w-full p-1 rounded-lg text-xs" style={inputStyles}
                    value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* ══════════════════════════
            CARD: Itens + Totais
        ══════════════════════════ */}
        {itens.length > 0 && (
          <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={13} className="text-white" />
                <span className="text-white font-semibold text-[11px] uppercase tracking-wide">Itens ({itens.length})</span>
              </div>
              <button onClick={() => itens.length > 0 && confirm("Limpar todos os itens?") && setItens([])}
                className="text-[10px] text-white/70 hover:text-white transition-colors">
                Limpar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b" style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
                    <th className="px-2 py-1.5 text-left font-semibold" style={{ color: colors.textSecondary }}>Produto</th>
                    <th className="px-2 py-1.5 text-center font-semibold" style={{ color: colors.textSecondary }}>Qtd</th>
                    <th className="px-2 py-1.5 text-right font-semibold hidden xs:table-cell" style={{ color: colors.textSecondary }}>Preço</th>
                    <th className="px-2 py-1.5 text-right font-semibold hidden sm:table-cell" style={{ color: colors.textSecondary }}>Base</th>
                    <th className="px-2 py-1.5 text-right font-semibold hidden sm:table-cell" style={{ color: colors.textSecondary }}>IVA</th>
                    <th className="px-2 py-1.5 text-right font-semibold hidden md:table-cell" style={{ color: colors.textSecondary }}>Ret.</th>
                    <th className="px-2 py-1.5 text-right font-semibold" style={{ color: colors.textSecondary }}>Subtotal</th>
                    <th className="px-2 py-1.5 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => {
                    const p = produtos.find(x => x.id === item.produto_id);
                    const maxEst = p && !isServico(p) ? p.estoque_atual : Infinity;
                    return (
                      <tr key={item.id} className="border-b last:border-0" style={{ borderColor: colors.border }}>
                        <td className="px-2 py-1.5 font-medium" style={{ color: colors.text }}>
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px]">{item.descricao}</span>
                            {item.eh_servico && (
                              <span className="text-[8px] px-1 py-0.5 rounded" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>
                                S
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => atualizarQtd(item.id, item.quantidade - 1)}
                              className="w-4 h-4 rounded flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover, color: colors.primary }}
                              disabled={item.quantidade <= 1}>
                              <Minus size={8} />
                            </button>
                            <span className="w-5 text-center" style={{ color: colors.text }}>{item.quantidade}</span>
                            <button onClick={() => atualizarQtd(item.id, item.quantidade + 1)}
                              className="w-4 h-4 rounded flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover, color: colors.primary }}
                              disabled={item.quantidade >= maxEst}>
                              <Plus size={8} />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right hidden xs:table-cell" style={{ color: colors.textSecondary }}>
                          {formatarPreco(item.preco_venda)}
                        </td>
                        <td className="px-2 py-1.5 text-right hidden sm:table-cell" style={{ color: colors.text }}>
                          {formatarPreco(item.base_tributavel)}
                        </td>
                        <td className="px-2 py-1.5 text-right hidden sm:table-cell" style={{ color: colors.text }}>
                          {formatarPreco(item.valor_iva)}
                        </td>
                        <td className="px-2 py-1.5 text-right hidden md:table-cell"
                          style={{ color: item.valor_retencao > 0 ? colors.danger : colors.textSecondary }}>
                          {item.valor_retencao > 0 ? `-${formatarPreco(item.valor_retencao)}` : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right font-bold" style={{ color: colors.secondary }}>
                          {formatarPreco(item.subtotal)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button onClick={() => removerItem(item.id)} className="p-0.5 hover:opacity-70" style={{ color: colors.danger }}>
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totais no rodapé */}
            <div className="px-3 py-1.5 flex flex-wrap justify-end gap-x-3 gap-y-0.5 border-t text-[10px]"
              style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
              <span style={{ color: colors.textSecondary }}>Base: <span style={{ color: colors.text }}>{formatarPreco(totalBase)}</span></span>
              <span style={{ color: colors.textSecondary }}>IVA: <span style={{ color: colors.text }}>{formatarPreco(totalIva)}</span></span>
              {totalRetencao > 0 && (
                <span style={{ color: colors.textSecondary }}>Ret.: <span style={{ color: colors.danger }}>-{formatarPreco(totalRetencao)}</span></span>
              )}
              <span style={{ color: colors.textSecondary }}>
                Total: <span className="text-xs" style={{ color: colors.secondary }}>{formatarPreco(totalLiquido)}</span>
              </span>
            </div>
          </div>
        )}

        {/* ══════════════════════════
            CARD: Pagamento
        ══════════════════════════ */}
        {itens.length > 0 && (
          <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-2">
                <CreditCard size={13} className="text-white" />
                <span className="text-white font-semibold text-[11px] uppercase tracking-wide">Pagamento</span>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <SectionLabel icon={CreditCard} label="Método" colors={colors} />
                  <select value={formPagamento.metodo}
                    onChange={e => setFormPagamento(p => ({ ...p, metodo: e.target.value as DadosPagamento['metodo'] }))}
                    className="w-full p-1 rounded-lg text-xs" style={inputStyles}>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="multibanco">Multibanco</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calculator size={11} style={{ color: colors.primary }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.primary }}>
                      Valor Pago <span style={{ color: colors.danger }}>*</span>
                    </span>
                  </div>
                  <input type="number" min={0} step="0.01"
                    placeholder={formatarPreco(totalLiquido)}
                    value={formPagamento.valor_pago}
                    onChange={e => setFormPagamento(p => ({ ...p, valor_pago: e.target.value }))}
                    className="w-full p-1 rounded-lg text-xs"
                    style={{
                      ...inputStyles,
                      borderColor: valorPagamento > 0 && valorPagamento < totalLiquido
                        ? colors.danger : pagamentoSuficiente ? colors.success : inputStyles.borderColor,
                    }} />
                </div>

                <div>
                  <SectionLabel icon={FileText} label="Data" colors={colors} />
                  <input type="date" className="w-full p-1 rounded-lg text-xs" style={inputStyles}
                    value={formPagamento.data_pagamento}
                    onChange={e => setFormPagamento(p => ({ ...p, data_pagamento: e.target.value }))} />
                </div>

                <div>
                  <SectionLabel icon={FileText} label="Referência" colors={colors} />
                  <input type="text" placeholder="Opcional" className="w-full p-1 rounded-lg text-xs" style={inputStyles}
                    value={formPagamento.referencia}
                    onChange={e => setFormPagamento(p => ({ ...p, referencia: e.target.value }))} />
                </div>
              </div>

              {valorPagamento > 0 && valorPagamento < totalLiquido && (
                <p className="text-[10px] flex items-center gap-1" style={{ color: colors.danger }}>
                  <AlertTriangle size={10} /> Faltam {formatarPreco(totalLiquido - valorPagamento)}
                </p>
              )}
              {troco > 0 && (
                <p className="text-[10px] flex items-center gap-1 font-semibold" style={{ color: colors.success }}>
                  <CheckCircle2 size={10} /> Troco: {formatarPreco(troco)}
                </p>
              )}
              {pagamentoSuficiente && troco === 0 && (
                <p className="text-[10px] flex items-center gap-1" style={{ color: colors.success }}>
                  <CheckCircle2 size={10} /> Pagamento OK
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Botão Finalizar ── */}
        <button type="button" onClick={finalizarVenda} disabled={loading || !podeFinalizar()}
          className="w-full py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: colors.secondary }}>
          {loading
            ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Processando...</>
            : itens.length === 0 ? "Adicione itens para continuar"
            : !pagamentoSuficiente ? "Informe o valor do pagamento"
            : <><CheckCircle2 size={16} /> Finalizar Fatura-Recibo{troco > 0 ? ` · Troco ${formatarPreco(troco)}` : ''}</>
          }
        </button>

      </div>
    </MainEmpresa>
  );
}