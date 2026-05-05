'use client';

import React, { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, ShoppingCart, FileText,
    CheckCircle2, ArrowLeft,
    AlertTriangle, User, Package, Minus, Search, X
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import {
    emitirDocumentoFiscal,
    Produto,
    Cliente,
    clienteService,
    produtoService,
    CriarDocumentoFiscalPayload,
    formatarNIF,
    isServico,
    formatarPreco,
} from "@/services/vendas";

const ESTOQUE_MINIMO = 5;
const arredondar = (v: number) => Math.round(v * 100) / 100;

interface ItemDocumentoUI {
    id: string; produto_id: string; descricao: string;
    quantidade: number; preco_unitario: number;
    base_tributavel: number; valor_iva: number; valor_retencao: number;
    subtotal: number; taxa_iva?: number; codigo_produto?: string;
}
interface FormItemState { produto_id: string; quantidade: number; }
type ModoCliente = 'cadastrado' | 'avulso';
type TipoItem = 'produto' | 'servico';

interface ThemeColors {
    background: string; card: string; border: string; text: string;
    textSecondary: string; primary: string; secondary: string;
    danger: string; success: string; warning: string; hover: string;
}

/* ── Linha fiscal ───────────────────────────────────────────── */
function LinhaFiscal({ label, valor, cor, negrito, colors }: {
    label: string; valor: string; cor?: string; negrito?: boolean; colors: ThemeColors;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-1">
            <span className={`text-sm ${negrito ? "font-semibold" : ""}`}
                style={{ color: negrito ? colors.text : colors.textSecondary }}>
                {label}
            </span>
            <span className={`text-sm tabular-nums ${negrito ? "font-bold" : "font-medium"}`}
                style={{ color: cor || (negrito ? colors.text : colors.textSecondary) }}>
                {valor}
            </span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PÁGINA
═══════════════════════════════════════════════════════════════ */
export default function NovaFaturaProformaPage() {
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

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
    const [itens, setItens] = useState<ItemDocumentoUI[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [modoCliente, setModoCliente] = useState<ModoCliente>('cadastrado');
    const [clienteAvulso, setClienteAvulso] = useState('');
    const [clienteAvulsoNif, setClienteAvulsoNif] = useState('');
    const [nifError, setNifError] = useState<string | null>(null);
    const [formItem, setFormItem] = useState<FormItemState>({ produto_id: "", quantidade: 1 });
    const [previewItem, setPreviewItem] = useState<ItemDocumentoUI | null>(null);
    const [observacoes, setObservacoes] = useState('');
    
    // Estados para o novo componente de busca
    const [tipoItemSelecionado, setTipoItemSelecionado] = useState<TipoItem>('produto');
    const [buscaItem, setBuscaItem] = useState('');
    const [dropdownAberto, setDropdownAberto] = useState(false);
    
    const buscaInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const [clientesData, produtosData] = await Promise.all([
                    clienteService.listar(),
                    produtoService.listar({ status: "ativo", paginar: false }).then(r =>
                        Array.isArray(r.produtos) ? r.produtos : []
                    ),
                ]);
                setClientes(clientesData);
                setProdutos(produtosData);
                const fisicos = produtosData.filter(p => !isServico(p));
                setProdutosEstoqueBaixo(fisicos.filter(p => p.estoque_atual > 0 && p.estoque_atual <= ESTOQUE_MINIMO));
            } catch {
                setError("Erro ao carregar dados iniciais");
            }
        })();
    }, [user]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownAberto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ── NIF ── */
    const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nums = e.target.value.replace(/\D/g, '');
        if (nums.length <= 9) {
            setClienteAvulsoNif(nums);
            if (nums.length > 0 && nums.length !== 9) {
                setNifError("NIF deve ter 9 dígitos");
            } else {
                setNifError(null);
            }
        }
    };

    // Filtrar itens baseado no tipo selecionado e na busca
    const itensFiltrados = produtos.filter(p => {
        if (p.status !== 'ativo') return false;
        if (tipoItemSelecionado === 'produto' && p.tipo !== 'produto') return false;
        if (tipoItemSelecionado === 'servico' && p.tipo !== 'servico') return false;
        if (buscaItem.trim() === '') return true;
        const buscaLower = buscaItem.toLowerCase();
        return p.nome.toLowerCase().includes(buscaLower) || 
               (p.codigo && p.codigo.toLowerCase().includes(buscaLower));
    });

    const handleSelectItem = (produto: Produto) => {
        setFormItem({
            produto_id: produto.id,
            quantidade: produto.tipo === 'produto' ? Math.min(1, produto.estoque_atual) : 1,
        });
        setBuscaItem(produto.nome);
        setDropdownAberto(false);
    };

    /* ── Preview ── */
    useEffect(() => {
        if (!formItem.produto_id) { setPreviewItem(null); return; }
        const p = produtos.find(x => x.id === formItem.produto_id);
        if (!p) { setPreviewItem(null); return; }
        const ehServico = isServico(p);
        const qtd = Math.min(formItem.quantidade, ehServico ? 9999 : p.estoque_atual);
        const base = arredondar(p.preco_venda * qtd);
        const taxaIva = p.taxa_iva ?? 14;
        const iva = arredondar(base * taxaIva / 100);
        const ret = ehServico ? arredondar(base * 0.065) : 0;
        setPreviewItem({
            id: "preview", produto_id: p.id, descricao: p.nome,
            quantidade: qtd, preco_unitario: p.preco_venda,
            base_tributavel: base, valor_iva: iva, valor_retencao: ret,
            subtotal: arredondar(base + iva - ret), taxa_iva: taxaIva,
            codigo_produto: p.codigo || undefined,
        });
    }, [formItem, produtos]);

    /* ── Calcular item ── */
    const calcularItem = (p: Produto, qtd: number, id = uuidv4()): ItemDocumentoUI => {
        const ehServico = isServico(p);
        const base = arredondar(p.preco_venda * qtd);
        const taxaIva = p.taxa_iva ?? 14;
        const iva = arredondar(base * taxaIva / 100);
        const ret = ehServico ? arredondar(base * 0.065) : 0;
        return {
            id, produto_id: p.id, descricao: p.nome, quantidade: qtd,
            preco_unitario: p.preco_venda,
            base_tributavel: base, valor_iva: iva, valor_retencao: ret,
            subtotal: arredondar(base + iva - ret),
            taxa_iva: taxaIva, codigo_produto: p.codigo || undefined,
        };
    };

    /* ── Adicionar ── */
    const adicionarItem = () => {
        if (!formItem.produto_id || !previewItem) { setError("Selecione um produto/serviço"); return; }
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
            setItens(prev => prev.map((it, i) => i === idx ? calcularItem(p, novaQtd, it.id) : it));
        } else {
            setItens(prev => [...prev, calcularItem(p, formItem.quantidade)]);
        }
        setFormItem({ produto_id: "", quantidade: 1 });
        setBuscaItem('');
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
        setItens(prev => prev.map((it, i) => i === idx ? calcularItem(p, novaQtd, item.id) : it));
        setError(null);
    };

    const removerItem = (id: string) => setItens(p => p.filter(i => i.id !== id));

    /* ── Totais ── */
    const totalBase = arredondar(itens.reduce((a, i) => a + i.base_tributavel, 0));
    const totalIva = arredondar(itens.reduce((a, i) => a + i.valor_iva, 0));
    const totalRetencao = arredondar(itens.reduce((a, i) => a + i.valor_retencao, 0));
    const totalLiquido = arredondar(totalBase + totalIva - totalRetencao);

    /* ── Validação ── */
    const podeFinalizar = () => {
        if (itens.length === 0) return false;
        if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
        return true;
    };

    /* ── Finalizar ── */
    const finalizarProforma = async () => {
        if (!podeFinalizar()) return;
        setLoading(true); setError(null); setSucesso(null);
        try {
            const payload: CriarDocumentoFiscalPayload = {
                tipo_documento: 'FP',
                itens: itens.map(item => ({
                    produto_id: item.produto_id, descricao: item.descricao,
                    quantidade: item.quantidade, preco_unitario: arredondar(item.preco_unitario),
                     taxa_iva: item.taxa_iva,
                })),
            };

            if (modoCliente === 'cadastrado' && clienteSelecionado) {
                payload.cliente_id = clienteSelecionado.id;
            } else if (modoCliente === 'avulso') {
                if (clienteAvulso.trim()) {
                    payload.cliente_nome = clienteAvulso.trim();
                } else {
                    payload.cliente_nome = "Consumidor Final";
                }

                if (clienteAvulsoNif.trim() && clienteAvulsoNif.length === 9) {
                    payload.cliente_nif = clienteAvulsoNif.trim();
                } else {
                    payload.cliente_nif = "999999999";
                }
            }

            if (observacoes.trim()) payload.motivo = observacoes.trim();
            setTimeout(() => router.push("/dashboard/Faturas/DC"), 1500);
        } catch (err: unknown) {
            setError(err instanceof AxiosError ? err.response?.data?.message || "Erro ao salvar proforma" : "Erro ao salvar proforma");
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
                <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => router.back()}
                        className="p-1.5 hover:opacity-70 transition-opacity shrink-0"
                        style={{ color: colors.primary }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: colors.secondary }}>Gerar Proforma</h1>
                    </div>
                </div>

                {/* ── Alertas ── */}
                {error && (
                    <div className="p-3 border text-sm flex items-center gap-2"
                        style={{ backgroundColor: `${colors.danger}15`, borderColor: colors.danger, color: colors.danger }}>
                        <AlertTriangle size={15} className="shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}
                {sucesso && (
                    <div className="p-3 border text-sm flex items-center gap-2"
                        style={{ backgroundColor: `${colors.success}15`, borderColor: colors.success, color: colors.success }}>
                        <CheckCircle2 size={15} className="shrink-0" /><span>{sucesso}</span>
                    </div>
                )}
                {produtosEstoqueBaixo.length > 0 && (
                    <div className="p-3 border text-sm flex items-start gap-2"
                        style={{ backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}50` }}>
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: colors.warning }} />
                        <span style={{ color: colors.warning }}>
                            <strong>Estoque baixo: </strong>
                            <span style={{ color: colors.textSecondary }}>
                                {produtosEstoqueBaixo.map(p => `${p.nome} (${p.estoque_atual})`).join(' · ')}
                            </span>
                        </span>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    CARD 1 — Dados da Proforma
                ══════════════════════════════════════════════════════ */}
                <div className="border shadow-sm overflow-hidden"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}>

                    <div className="px-3 py-1.5 flex items-center gap-2"
                        style={{ backgroundColor: colors.primary }}>
                        <ShoppingCart size={14} className="text-white" />
                        <span className="text-white font-medium text-xs uppercase tracking-wider">Dados da Proforma</span>
                    </div>

                    <div className="divide-y" style={{ borderColor: colors.border }}>

                        {/* ── Cliente — numa única linha ── */}
                        <div className="flex min-h-[44px]" style={{ borderColor: colors.border }}>
                            <div className="flex items-center gap-1.5 px-3 py-2.5 w-24 sm:w-28 shrink-0"
                                style={{ backgroundColor: colors.hover }}>
                                <User size={13} style={{ color: colors.text }} />
                                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.text }}>Cliente</span>
                            </div>
                            <div className="flex-1 px-3 py-2.5 flex flex-wrap items-center gap-2 min-w-0">
                                <div className="inline-flex border overflow-hidden shrink-0"
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
                                            className="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                                            style={{
                                                backgroundColor: modoCliente === modo ? colors.primary : 'transparent',
                                                color: modoCliente === modo ? 'white' : colors.textSecondary,
                                            }}>
                                            {modo === 'cadastrado' ? 'Cadastrado' : 'Não cadastrado'}
                                        </button>
                                    ))}
                                </div>

                                {modoCliente === 'cadastrado' ? (
                                    <select className="flex-1 min-w-0 px-3 py-1.5 text-sm outline-none"
                                        style={inp}
                                        value={clienteSelecionado?.id ?? ""}
                                        onChange={e => setClienteSelecionado(clientes.find(c => c.id === e.target.value) ?? null)}>
                                        <option value="">Selecione um cliente…</option>
                                        {clientes.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.nome}{c.nif ? ` — ${formatarNIF(c.nif)}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <>
                                        <input type="text" placeholder="Nome (opcional - Consumidor Final)"
                                            className="flex-1 min-w-0 px-3 py-1.5 text-sm outline-none"
                                            style={inp}
                                            value={clienteAvulso}
                                            onChange={e => setClienteAvulso(e.target.value)} />
                                        <div className="relative w-32 sm:w-36 shrink-0">
                                            <input type="text" inputMode="numeric" placeholder="NIF (opcional)"
                                                className="w-full px-3 py-1.5 text-sm outline-none" maxLength={9}
                                                style={{ ...inp, borderColor: nifError ? colors.danger : inp.borderColor }}
                                                value={clienteAvulsoNif}
                                                onChange={handleNifChange} />
                                            {nifError && (
                                                <span className="absolute -bottom-4 left-0 text-[10px] whitespace-nowrap"
                                                    style={{ color: colors.danger }}>{nifError}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Produto e Serviço - SUBSTITUÍDO ── */}
                        <div className="flex min-h-[44px]" style={{ borderColor: colors.border }}>
                            <div className="flex items-center gap-1.5 px-3 py-2.5 w-24 sm:w-28 shrink-0"
                                style={{ backgroundColor: colors.hover }}>
                                <Package size={13} style={{ color: colors.text }} />
                                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.text }}>Itens</span>
                            </div>
                            <div className="flex-1 px-3 py-2.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    
                                    {/* Seletor de tipo (Produto/Serviço) */}
                                    <div className="inline-flex border overflow-hidden shrink-0" style={{ borderColor: colors.border }}>
                                        {(['produto', 'servico'] as TipoItem[]).map(tipo => (
                                            <button key={tipo} type="button"
                                                onClick={() => {
                                                    setTipoItemSelecionado(tipo);
                                                    setBuscaItem('');
                                                    setFormItem({ produto_id: "", quantidade: 1 });
                                                    setPreviewItem(null);
                                                    setDropdownAberto(false);
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                                                style={{ 
                                                    backgroundColor: tipoItemSelecionado === tipo ? colors.primary : 'transparent', 
                                                    color: tipoItemSelecionado === tipo ? 'white' : colors.textSecondary 
                                                }}>
                                                {tipo === 'produto' ? 'Produto' : 'Serviço'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Campo de busca com dropdown */}
                                    <div className="relative flex-1 min-w-[200px]" ref={dropdownRef}>
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }} />
                                            <input
                                                ref={buscaInputRef}
                                                type="text"
                                                placeholder={tipoItemSelecionado === 'produto' ? "Pesquisar produto..." : "Pesquisar serviço..."}
                                                className="w-full pl-9 pr-8 py-1.5 text-sm outline-none"
                                                style={inp}
                                                value={buscaItem}
                                                onChange={(e) => {
                                                    setBuscaItem(e.target.value);
                                                    setDropdownAberto(true);
                                                    if (e.target.value === '') {
                                                        setFormItem({ produto_id: "", quantidade: 1 });
                                                        setPreviewItem(null);
                                                    }
                                                }}
                                                onFocus={() => setDropdownAberto(true)}
                                            />
                                            {buscaItem && (
                                                <button
                                                    onClick={() => {
                                                        setBuscaItem('');
                                                        setFormItem({ produto_id: "", quantidade: 1 });
                                                        setPreviewItem(null);
                                                        setDropdownAberto(false);
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                                                >
                                                    <X size={14} style={{ color: colors.textSecondary }} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown de resultados */}
                                        {dropdownAberto && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 border shadow-lg max-h-60 overflow-y-auto"
                                                style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                                {itensFiltrados.length > 0 ? (
                                                    itensFiltrados.map(item => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => handleSelectItem(item)}
                                                            className="w-full px-3 py-2 text-left text-sm hover:transition-colors flex justify-between items-center border-b last:border-0"
                                                            style={{ 
                                                                backgroundColor: formItem.produto_id === item.id ? `${colors.primary}10` : 'transparent',
                                                                borderColor: colors.border
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.hover}`}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = formItem.produto_id === item.id ? `${colors.primary}10` : 'transparent'}
                                                        >
                                                            <div className="flex-1">
                                                                <span className="font-medium" style={{ color: colors.text }}>{item.nome}</span>
                                                                {item.codigo && (
                                                                    <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>({item.codigo})</span>
                                                                )}
                                                            </div>
                                                            <div className="text-right shrink-0 ml-3">
                                                                <span className="text-sm font-semibold" style={{ color: colors.secondary }}>
                                                                    {formatarPreco(item.preco_venda)}
                                                                </span>
                                                                {item.tipo === 'produto' && (
                                                                    <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>
                                                                        Stock: {item.estoque_atual}
                                                                    </span>
                                                                )}
                                                                {item.tipo === 'servico' && item.taxa_retencao && (
                                                                    <span className="text-xs ml-2" style={{ color: colors.warning }}>
                                                                        Ret: {item.taxa_retencao}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-center text-sm" style={{ color: colors.textSecondary }}>
                                                        Nenhum {tipoItemSelecionado === 'produto' ? 'produto' : 'serviço'} encontrado
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stepper quantidade */}
                                    <div className="flex items-center border overflow-hidden shrink-0"
                                        style={{ borderColor: colors.border }}>
                                        <button type="button"
                                            className="w-8 h-9 flex items-center justify-center disabled:opacity-30"
                                            style={{ backgroundColor: colors.hover }}
                                            disabled={!formItem.produto_id || formItem.quantidade <= 1}
                                            onClick={() => setFormItem(p => ({ ...p, quantidade: Math.max(1, p.quantidade - 1) }))}>
                                            <Minus size={12} style={{ color: colors.text }} />
                                        </button>
                                        <input type="number" min={1}
                                            className="w-11 text-center text-sm h-9 border-0 outline-none"
                                            style={{ backgroundColor: colors.card, color: colors.text }}
                                            value={formItem.quantidade}
                                            disabled={!formItem.produto_id}
                                            onChange={e => {
                                                const p = produtos.find(x => x.id === formItem.produto_id);
                                                if (p) {
                                                    const max = p.tipo === 'servico' ? 9999 : p.estoque_atual;
                                                    setFormItem(prev => ({ ...prev, quantidade: Math.max(1, Math.min(Number(e.target.value) || 1, max)) }));
                                                }
                                            }} />
                                        <button type="button"
                                            className="w-8 h-9 flex items-center justify-center disabled:opacity-30"
                                            style={{ backgroundColor: colors.hover }}
                                            disabled={!formItem.produto_id || (!!produtoSel && produtoSel.tipo === 'produto' && formItem.quantidade >= produtoSel.estoque_atual)}
                                            onClick={() => {
                                                const p = produtos.find(x => x.id === formItem.produto_id);
                                                if (p) {
                                                    const max = p.tipo === 'servico' ? 9999 : p.estoque_atual;
                                                    setFormItem(prev => ({ ...prev, quantidade: Math.min(prev.quantidade + 1, max) }));
                                                }
                                            }}>
                                            <Plus size={12} style={{ color: colors.text }} />
                                        </button>
                                    </div>

                                    {/* Botão Adicionar */}
                                    <button type="button" onClick={adicionarItem}
                                        disabled={!formItem.produto_id}
                                        className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                                        style={{ backgroundColor: colors.primary }}>
                                        <Plus size={13} />Adicionar
                                    </button>

                                    {/* Indicador de estoque (apenas para produtos) */}
                                    {produtoSel && produtoSel.tipo === 'produto' && (
                                        <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>
                                            disp.: {produtoSel.estoque_atual}
                                        </span>
                                    )}
                                </div>

                                {/* Preview cálculo */}
                                {previewItem && (
                                    <div className="mt-2 px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
                                        style={{ backgroundColor: colors.hover }}>
                                        {[
                                            { label: "Base", val: formatarPreco(previewItem.base_tributavel), clr: colors.text },
                                            { label: "IVA", val: formatarPreco(previewItem.valor_iva), clr: colors.text },
                                            ...(previewItem.valor_retencao > 0
                                                ? [{ label: "Ret.", val: `-${formatarPreco(previewItem.valor_retencao)}`, clr: colors.danger }]
                                                : []),
                                            { label: "Total", val: formatarPreco(previewItem.subtotal), clr: colors.secondary },
                                        ].map(({ label, val, clr }) => (
                                            <span key={label} style={{ color: colors.textSecondary }}>
                                                {label}: <strong style={{ color: clr }}>{val}</strong>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Observações ── */}
                        <div className="flex min-h-[44px]">
                            <div className="flex items-center gap-1.5 px-3 py-2.5 w-24 sm:w-28 shrink-0"
                                style={{ backgroundColor: colors.hover }}>
                                <FileText size={13} style={{ color: colors.text }} />
                                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.text }}>Obs.</span>
                            </div>
                            <div className="flex-1 px-3 py-2.5">
                                <input type="text" placeholder="Observações adicionais (opcional)"
                                    className="w-full px-3 py-1.5 text-sm outline-none"
                                    style={inp}
                                    value={observacoes}
                                    onChange={e => setObservacoes(e.target.value)} />
                            </div>
                        </div>

                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    CARD 2 — Itens + Resumo Fiscal
                ══════════════════════════════════════════════════════════════ */}
                {itens.length > 0 ? (
                    <div className="border shadow-sm overflow-hidden"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}>

                        {/* Header */}
                        <div className="px-3 py-1.5 flex items-center justify-between"
                            style={{ backgroundColor: colors.primary }}>
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={14} className="text-white" />
                                <span className="text-white font-medium text-xs uppercase tracking-wider">
                                    Itens da Proforma
                                    <span className="ml-1.5 text-white/70 font-normal normal-case">
                                        ({itens.length} {itens.length !== 1 ? "itens" : "item"})
                                    </span>
                                </span>
                            </div>
                            <button onClick={() => window.confirm("Limpar todos os itens?") && setItens([])}
                                className="text-white/70 hover:text-white text-xs transition-colors">
                                Limpar tudo
                            </button>
                        </div>

                        {/* Tabela de itens */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead style={{ backgroundColor: colors.hover }}>
                                    <tr className="border-b" style={{ borderColor: colors.border }}>
                                        <th className="py-2.5 px-3 text-left font-semibold text-xs" style={{ color: colors.textSecondary }}>Produto/Serviço</th>
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
                                                className="border-b last:border-0"
                                                style={{
                                                    borderColor: colors.border,
                                                    backgroundColor: idx % 2 !== 0 ? `${colors.hover}60` : 'transparent',
                                                }}>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium truncate max-w-[100px] sm:max-w-[160px]"
                                                            style={{ color: colors.text }}>{item.descricao}</span>
                                                        {p && isServico(p) && (
                                                            <span className="text-[10px] px-1.5 py-0.5 font-bold shrink-0"
                                                                style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                                                                S
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        <button onClick={() => atualizarQtd(item.id, item.quantidade - 1)}
                                                            className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                                                            style={{ backgroundColor: colors.hover }}
                                                            disabled={item.quantidade <= 1}>
                                                            <Minus size={11} style={{ color: colors.text }} />
                                                        </button>
                                                        <span className="w-7 text-center text-sm font-medium"
                                                            style={{ color: colors.text }}>{item.quantidade}</span>
                                                        <button onClick={() => atualizarQtd(item.id, item.quantidade + 1)}
                                                            className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                                                            style={{ backgroundColor: colors.hover }}
                                                            disabled={item.quantidade >= maxEst}>
                                                            <Plus size={11} style={{ color: colors.text }} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right hidden sm:table-cell"
                                                    style={{ color: colors.textSecondary }}>{formatarPreco(item.preco_unitario)}</td>
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
                                                        className="p-1 hover:opacity-70"
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

                        {/* ── Resumo Fiscal — 2 colunas com divisor vertical ── */}
                        <div className="border-t" style={{ borderColor: colors.border }}>
                            <div className="flex flex-col sm:flex-row">
                                <div className="flex-1 px-4 py-3 border-b sm:border-b-0 sm:border-r" style={{ borderColor: colors.border }}>
                                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Base</p>
                                    <LinhaFiscal label="Subtotal" valor={formatarPreco(totalBase)} colors={colors} />
                                    <LinhaFiscal label="Base tributável" valor={formatarPreco(totalBase)} colors={colors} />
                                </div>
                                <div className="flex-1 px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>Impostos</p>
                                    <LinhaFiscal label="IVA" valor={formatarPreco(totalIva)} colors={colors} />
                                        <LinhaFiscal label="Retenção" valor={`−${formatarPreco(totalRetencao)}`} cor={colors.textSecondary} colors={colors} />
                                    <div className="mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                                        <LinhaFiscal label="Total" valor={formatarPreco(totalLiquido)} cor={colors.secondary} negrito colors={colors} />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed"
                        style={{ borderColor: colors.border }}>
                        <ShoppingCart size={28} className="mx-auto mb-2" style={{ color: colors.border }} />
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Adicione produtos ou serviços para criar a proforma
                        </p>
                    </div>
                )}

                {/* ── Botão Finalizar ── */}
                {itens.length > 0 && (
                    <div className="flex justify-end">
                        <button type="button" onClick={finalizarProforma}
                            disabled={loading || !podeFinalizar()}
                            className="w-full sm:w-48 py-2.5 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundColor: colors.secondary }}>
                            {loading ? (
                                <><div className="w-4 rounded-full h-4 border-2 border-white border-t-transparent animate-spin" />A processar…</>
                            ) : (
                                <><CheckCircle2 size={15} />Finalizar Proforma</>
                            )}
                        </button>
                    </div>
                )}

            </div>
        </MainEmpresa>
    );
}