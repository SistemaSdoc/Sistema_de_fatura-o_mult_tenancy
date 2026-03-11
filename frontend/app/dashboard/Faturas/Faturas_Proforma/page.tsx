'use client';

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, ShoppingCart, FileText,
    CheckCircle2, ArrowLeft, Receipt,
    AlertTriangle, User, Package, Minus
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

// Função auxiliar para arredondar para 2 casas decimais
const arredondar = (valor: number): number => {
    return Math.round(valor * 100) / 100;
};

interface ItemDocumentoUI {
    id: string;
    produto_id: string;
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    desconto: number;
    base_tributavel: number;
    valor_iva: number;
    valor_retencao: number;
    subtotal: number;
    taxa_iva?: number;
    codigo_produto?: string;
}

interface FormItemState {
    produto_id: string;
    quantidade: number;
    desconto: number;
}

type ModoCliente = 'cadastrado' | 'avulso';

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

export default function NovaFaturaProformaPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const colors = useThemeColors();

    const inputStyles = {
        backgroundColor: colors.card,
        borderColor: colors.border,
        color: colors.text,
        borderWidth: 1,
        fontSize: '14px',
    };

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
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

    const [formItem, setFormItem] = useState<FormItemState>({
        produto_id: "",
        quantidade: 1,
        desconto: 0,
    });

    const [previewItem, setPreviewItem] = useState<ItemDocumentoUI | null>(null);
    const [observacoes, setObservacoes] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;

        async function carregarDados() {
            try {
                const [clientesData, produtosData] = await Promise.all([
                    clienteService.listar(),
                    produtoService.listar({ status: "ativo", paginar: false }).then(res =>
                        Array.isArray(res.produtos) ? res.produtos : []
                    ),
                ]);

                setClientes(clientesData);
                setProdutos(produtosData);

                const produtosFisicos = produtosData.filter(p => !isServico(p));
                const disponiveis = produtosFisicos.filter(p => p.estoque_atual > ESTOQUE_MINIMO);
                const estoqueBaixo = produtosFisicos.filter(p =>
                    p.estoque_atual > 0 && p.estoque_atual <= ESTOQUE_MINIMO
                );

                setProdutosDisponiveis(disponiveis);
                setProdutosEstoqueBaixo(estoqueBaixo);
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError("Erro ao carregar dados iniciais");
            }
        }

        carregarDados();
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
        if (!formItem.produto_id) {
            setPreviewItem(null);
            return;
        }

        const produto = produtos.find(p => p.id === formItem.produto_id);
        if (!produto) {
            setPreviewItem(null);
            return;
        }

        const ehServico = isServico(produto);
        const preco_unitario = produto.preco_venda;
        const maxQuantidade = ehServico ? Infinity : produto.estoque_atual;
        const quantidade = Math.min(formItem.quantidade, maxQuantidade);
        const desconto = formItem.desconto;

        const valorBruto = arredondar(preco_unitario * quantidade);
        const baseTributavel = arredondar(valorBruto - desconto);
        const taxaIva = produto.taxa_iva ?? 14;
        const valorIva = arredondar((baseTributavel * taxaIva) / 100);
        const valorRetencao = ehServico ? arredondar(baseTributavel * 0.065) : 0;

        setPreviewItem({
            id: "preview",
            produto_id: produto.id,
            descricao: produto.nome,
            quantidade,
            preco_unitario,
            desconto,
            base_tributavel: baseTributavel,
            valor_iva: valorIva,
            valor_retencao: valorRetencao,
            subtotal: arredondar(baseTributavel + valorIva - valorRetencao),
            taxa_iva: taxaIva,
            codigo_produto: produto.codigo || undefined,
        });
    }, [formItem, produtos]);

    const handleProdutoChange = (produtoId: string) => {
        const produto = produtos.find(p => p.id === produtoId);
        setFormItem(prev => ({
            ...prev,
            produto_id: produtoId,
            quantidade: produto ? (isServico(produto) ? 1 : Math.min(1, produto.estoque_atual)) : 1,
            desconto: 0,
        }));
    };

    // Função auxiliar para calcular item completo com arredondamento
    const calcularItemCompleto = (
        produto: Produto,
        quantidade: number,
        desconto: number,
        id: string = uuidv4()
    ): ItemDocumentoUI => {
        const ehServico = isServico(produto);

        const valorBruto = arredondar(produto.preco_venda * quantidade);
        const baseTributavel = arredondar(valorBruto - desconto);
        const taxaIva = produto.taxa_iva ?? 14;
        const valorIva = arredondar((baseTributavel * taxaIva) / 100);
        const valorRetencao = ehServico ? arredondar(baseTributavel * 0.065) : 0;

        return {
            id,
            produto_id: produto.id,
            descricao: produto.nome,
            quantidade,
            preco_unitario: produto.preco_venda,
            desconto,
            base_tributavel: baseTributavel,
            valor_iva: valorIva,
            valor_retencao: valorRetencao,
            subtotal: arredondar(baseTributavel + valorIva - valorRetencao),
            taxa_iva: taxaIva,
            codigo_produto: produto.codigo || undefined,
        };
    };

    const adicionarAoCarrinho = () => {
        if (!formItem.produto_id) {
            setError("Selecione um produto");
            return;
        }

        if (!previewItem) return;

        const produto = produtos.find(p => p.id === formItem.produto_id);
        if (!produto) return;

        if (!isServico(produto) && formItem.quantidade > produto.estoque_atual) {
            setError(`Estoque insuficiente. Disponível: ${produto.estoque_atual}`);
            return;
        }

        const itemExistenteIndex = itens.findIndex(item => item.produto_id === formItem.produto_id);

        if (itemExistenteIndex >= 0) {
            const itemExistente = itens[itemExistenteIndex];
            const novaQuantidade = itemExistente.quantidade + formItem.quantidade;

            if (!isServico(produto) && novaQuantidade > produto.estoque_atual) {
                setError(`Estoque insuficiente para ${novaQuantidade} unidades. Disponível: ${produto.estoque_atual}`);
                return;
            }

            const itemAtualizado = calcularItemCompleto(
                produto,
                novaQuantidade,
                itemExistente.desconto + formItem.desconto,
                itemExistente.id
            );

            setItens(prev => prev.map((item, index) =>
                index === itemExistenteIndex ? itemAtualizado : item
            ));
        } else {
            const novoItem = calcularItemCompleto(produto, formItem.quantidade, formItem.desconto);
            setItens(prev => [...prev, novoItem]);
        }

        setFormItem({
            produto_id: "",
            quantidade: 1,
            desconto: 0,
        });
        setPreviewItem(null);
        setError(null);
    };

    const atualizarQuantidadeItem = (itemId: string, novaQuantidade: number) => {
        const itemIndex = itens.findIndex(i => i.id === itemId);
        if (itemIndex < 0) return;

        const item = itens[itemIndex];
        const produto = produtos.find(p => p.id === item.produto_id);
        if (!produto) return;

        if (!isServico(produto) && novaQuantidade > produto.estoque_atual) {
            setError(`Estoque insuficiente. Máximo: ${produto.estoque_atual}`);
            return;
        }

        if (novaQuantidade < 1) {
            removerItem(itemId);
            return;
        }

        const itemAtualizado = calcularItemCompleto(
            produto,
            novaQuantidade,
            item.desconto,
            item.id
        );

        setItens(prev => prev.map((i, index) =>
            index === itemIndex ? itemAtualizado : i
        ));
        setError(null);
    };

    const removerItem = (id: string) => {
        setItens(prev => prev.filter(item => item.id !== id));
    };

    const limparCarrinho = () => {
        if (itens.length > 0 && confirm("Tem certeza que deseja limpar todos os itens?")) {
            setItens([]);
        }
    };

    // Totais calculados com arredondamento
    const totalBase = arredondar(itens.reduce((acc, i) => acc + i.base_tributavel, 0));
    const totalIva = arredondar(itens.reduce((acc, i) => acc + i.valor_iva, 0));
    const totalRetencao = arredondar(itens.reduce((acc, i) => acc + i.valor_retencao, 0));
    const totalLiquido = arredondar(totalBase + totalIva - totalRetencao);
    const totalDesconto = arredondar(itens.reduce((acc, i) => acc + i.desconto, 0));

    const podeFinalizar = (): boolean => {
        if (itens.length === 0) return false;

        if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
        if (modoCliente === 'avulso') {
            if (!clienteAvulso.trim()) return false;
            if (clienteAvulsoNif.trim() && !validarNif(clienteAvulsoNif)) return false;
        }

        return true;
    };

    const finalizarProforma = async () => {
        if (modoCliente === 'cadastrado' && !clienteSelecionado) {
            setError("Selecione um cliente cadastrado");
            return;
        }

        if (modoCliente === 'avulso') {
            if (!clienteAvulso.trim()) {
                setError("Digite o nome do cliente");
                return;
            }
            
            if (clienteAvulsoNif.trim() && !validarNif(clienteAvulsoNif)) {
                setError("O NIF deve ter exatamente 9 dígitos");
                return;
            }
        }

        if (itens.length === 0) {
            setError("Adicione itens à proforma");
            return;
        }

        setLoading(true);
        setError(null);
        setSucesso(null);

        try {
            const payload: CriarDocumentoFiscalPayload = {
                tipo_documento: 'FP', // Fatura Proforma
                itens: itens.map(item => ({
                    produto_id: item.produto_id,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    preco_unitario: arredondar(item.preco_unitario),
                    desconto: arredondar(item.desconto),
                    taxa_iva: item.taxa_iva,
                })),
            };

            if (modoCliente === 'cadastrado' && clienteSelecionado) {
                payload.cliente_id = clienteSelecionado.id;
            } else if (modoCliente === 'avulso' && clienteAvulso.trim()) {
                payload.cliente_nome = clienteAvulso.trim();
                if (clienteAvulsoNif.trim()) {
                    payload.cliente_nif = clienteAvulsoNif.trim();
                }
            }

            if (observacoes.trim()) {
                payload.motivo = observacoes.trim();
            }

            console.log('[PROFORMA] Criando Fatura Proforma - NÃO vai mexer em stock');
            console.log('[PROFORMA] Payload:', payload);

            const resultado = await emitirDocumentoFiscal(payload);

            if (!resultado) {
                throw new Error("Erro ao criar proforma - resposta vazia");
            }

            const numeroDocumento = 
                (resultado as { documento?: { numero_documento?: string } })?.documento?.numero_documento ||
                (resultado as { data?: { documento?: { numero_documento?: string } } })?.data?.documento?.numero_documento ||
                'N/A';

            setSucesso(`Fatura Proforma criada com sucesso! Nº: ${numeroDocumento}`);

            setTimeout(() => {
                router.push("/dashboard/Faturas/Faturas");
            }, 1500);

        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                console.error("Erro Axios:", err.response?.data || err.message);
                setError(err.response?.data?.message || "Erro ao salvar proforma");
            } else {
                console.error("Erro:", err);
                setError("Erro ao salvar proforma");
            }
        } finally {
            setLoading(false);
        }
    };

    const produtoSelecionado = produtos.find(p => p.id === formItem.produto_id);

    return (
        <MainEmpresa>
            <div className="space-y-4 pb-8 px-3 sm:px-4 max-w-7xl mx-auto"
                style={{ backgroundColor: colors.background }}>

                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full transition-colors hover:opacity-70"
                        style={{ color: colors.primary }}
                        title="Voltar"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: colors.secondary }}>Nova Fatura Proforma</h1>
                        <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                            Documento comercial sem validade fiscal
                        </p>
                    </div>
                </div>

                {/* ── Alertas ── */}
                {error && (
                    <div
                        className="p-3 rounded-lg border text-sm flex items-center gap-2"
                        style={{
                            backgroundColor: `${colors.danger}15`,
                            borderColor: colors.danger,
                            color: colors.danger
                        }}
                    >
                        <AlertTriangle size={15} className="flex-shrink-0" />
                        <span className="flex-1">{error}</span>
                    </div>
                )}

                {sucesso && (
                    <div
                        className="p-3 rounded-lg border text-sm flex items-center gap-2"
                        style={{
                            backgroundColor: `${colors.success}15`,
                            borderColor: colors.success,
                            color: colors.success
                        }}
                    >
                        <CheckCircle2 size={15} className="flex-shrink-0" />
                        <span className="flex-1">{sucesso}</span>
                    </div>
                )}

                {produtosEstoqueBaixo.length > 0 && (
                    <div
                        className="p-3 rounded-lg border text-sm flex items-start gap-2"
                        style={{
                            backgroundColor: `${colors.warning}12`,
                            borderColor: `${colors.warning}50`
                        }}
                    >
                        <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: colors.warning }} />
                        <span style={{ color: colors.warning }}>
                            <strong>Estoque baixo: </strong>
                            <span style={{ color: colors.textSecondary }}>
                                {produtosEstoqueBaixo.map(p => `${p.nome} (${p.estoque_atual})`).join(' · ')}
                            </span>
                        </span>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    CARD 1 — Dados da Proforma (Cliente + Produto + Obs)
                ══════════════════════════════════════════════════════ */}
                <div
                    className="rounded-xl border shadow-sm overflow-hidden"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    <div
                        className="px-4 py-2.5 flex items-center gap-2"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <FileText size={16} className="text-white" />
                        <span className="text-white font-semibold text-sm tracking-wide">Dados da Proforma</span>
                    </div>

                    {/* Layout com tabela para manter alinhamento */}
                    <table className="w-full border-collapse">
                        <tbody>

                            {/* ── Cliente ── */}
                            <tr className="border-b" style={{ borderColor: colors.border }}>
                                <td className="py-3 pl-4 pr-3 align-middle w-[110px]" style={{ backgroundColor: colors.hover }}>
                                    <div className="flex items-center gap-1.5">
                                        <User size={16} style={{ color: colors.primary }} />
                                        <span className="text-sm font-semibold" style={{ color: colors.primary }}>Cliente</span>
                                    </div>
                                </td>
                                <td className="py-3 px-3 align-middle">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Botões de modo cliente */}
                                        <div className="inline-flex rounded-lg border overflow-hidden flex-shrink-0" style={{ borderColor: colors.border }}>
                                            {(['cadastrado', 'avulso'] as ModoCliente[]).map(modo => (
                                                <button
                                                    key={modo}
                                                    type="button"
                                                    onClick={() => {
                                                        setModoCliente(modo);
                                                        setClienteSelecionado(null);
                                                        setClienteAvulso('');
                                                        setClienteAvulsoNif('');
                                                        setNifError(null);
                                                    }}
                                                    className="px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap"
                                                    style={{
                                                        backgroundColor: modoCliente === modo ? colors.primary : 'transparent',
                                                        color: modoCliente === modo ? 'white' : colors.textSecondary
                                                    }}
                                                >
                                                    {modo === 'cadastrado' ? 'Cadastrado' : 'Avulso'}
                                                </button>
                                            ))}
                                        </div>
                                        {modoCliente === 'cadastrado' ? (
                                            <select
                                                className="flex-1 min-w-[160px] max-w-xs p-2 rounded-lg text-sm outline-none"
                                                style={inputStyles}
                                                value={clienteSelecionado?.id ?? ""}
                                                onChange={e => setClienteSelecionado(
                                                    clientes.find(c => c.id === e.target.value) ?? null
                                                )}
                                            >
                                                <option value="">Selecione um cliente</option>
                                                {clientes.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nome} {c.nif ? `(${formatarNIF(c.nif)})` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Nome do cliente *"
                                                    className="w-44 p-2 rounded-lg text-sm outline-none"
                                                    style={inputStyles}
                                                    value={clienteAvulso}
                                                    onChange={e => setClienteAvulso(e.target.value)}
                                                />
                                                <div className="flex flex-col gap-0.5">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="NIF (9 dígitos)"
                                                        className="w-32 p-2 rounded-lg text-sm outline-none"
                                                        style={{
                                                            ...inputStyles,
                                                            borderColor: nifError ? colors.danger : inputStyles.borderColor
                                                        }}
                                                        value={clienteAvulsoNif}
                                                        onChange={handleNifChange}
                                                        maxLength={9}
                                                    />
                                                    {nifError && (
                                                        <span className="text-xs" style={{ color: colors.danger }}>
                                                            {nifError}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>

                            {/* ── Produto ── */}
                            <tr className="border-b" style={{ borderColor: colors.border }}>
                                <td className="py-3 pl-4 pr-3 align-middle" style={{ backgroundColor: colors.hover }}>
                                    <div className="flex items-center gap-1.5">
                                        <Package size={16} style={{ color: colors.primary }} />
                                        <span className="text-sm font-semibold" style={{ color: colors.primary }}>Produto</span>
                                    </div>
                                </td>
                                <td className="py-3 px-3 align-middle">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            className="w-48 sm:w-60 p-2 rounded-lg text-sm outline-none"
                                            style={inputStyles}
                                            value={formItem.produto_id}
                                            onChange={e => handleProdutoChange(e.target.value)}
                                        >
                                            <option value="">
                                                {produtosDisponiveis.length === 0
                                                    ? "Nenhum produto"
                                                    : "Selecione um produto"}
                                            </option>
                                            {produtos.filter(p => p.status === 'ativo').map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nome} — {formatarPreco(p.preco_venda)}
                                                    {!isServico(p) ? ` (${p.estoque_atual})` : ''}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Stepper quantidade */}
                                        <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: colors.border, height: 38 }}>
                                            <button
                                                type="button"
                                                className="px-2 h-full text-sm transition-colors disabled:opacity-30"
                                                style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                disabled={!formItem.produto_id || formItem.quantidade <= 1}
                                                onClick={() => {
                                                    const p = produtos.find(x => x.id === formItem.produto_id);
                                                    if (p) {
                                                        setFormItem(prev => ({ ...prev, quantidade: Math.max(1, prev.quantidade - 1) }));
                                                    }
                                                }}
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                className="w-10 text-center text-sm border-0 outline-none h-full"
                                                style={{ backgroundColor: colors.card, color: colors.text }}
                                                value={formItem.quantidade}
                                                disabled={!formItem.produto_id}
                                                onChange={e => {
                                                    const p = produtos.find(x => x.id === formItem.produto_id);
                                                    if (p) {
                                                        const maxEstoque = isServico(p) ? Infinity : p.estoque_atual;
                                                        setFormItem(prev => ({ ...prev, quantidade: Math.max(1, Math.min(Number(e.target.value) || 1, maxEstoque)) }));
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="px-2 h-full text-sm transition-colors disabled:opacity-30"
                                                style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                disabled={!formItem.produto_id || (!!produtoSelecionado && !isServico(produtoSelecionado) && formItem.quantidade >= produtoSelecionado.estoque_atual)}
                                                onClick={() => {
                                                    const p = produtos.find(x => x.id === formItem.produto_id);
                                                    if (p) {
                                                        const maxEstoque = isServico(p) ? Infinity : p.estoque_atual;
                                                        setFormItem(prev => ({ ...prev, quantidade: Math.min(prev.quantidade + 1, maxEstoque) }));
                                                    }
                                                }}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="Desconto"
                                            className="w-24 p-2 rounded-lg text-sm outline-none"
                                            style={inputStyles}
                                            value={formItem.desconto || ''}
                                            disabled={!formItem.produto_id}
                                            onChange={e => setFormItem(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                                        />

                                        <button
                                            type="button"
                                            onClick={adicionarAoCarrinho}
                                            disabled={!formItem.produto_id}
                                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ backgroundColor: colors.primary }}
                                        >
                                            <Plus size={14} /> Adicionar
                                        </button>

                                        {produtoSelecionado && !isServico(produtoSelecionado) && (
                                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                                                disp: {produtoSelecionado.estoque_atual}
                                            </span>
                                        )}
                                    </div>

                                    {/* Preview cálculo */}
                                    {previewItem && (
                                        <div
                                            className="mt-2 px-3 py-2 rounded-lg flex flex-wrap gap-x-4 gap-y-1 text-sm"
                                            style={{ backgroundColor: colors.hover }}
                                        >
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
                                </td>
                            </tr>

                            {/* ── Observações ── */}
                            <tr>
                                <td className="py-3 pl-4 pr-3 align-top" style={{ backgroundColor: colors.hover }}>
                                    <div className="flex items-center gap-1.5">
                                        <FileText size={16} style={{ color: colors.primary }} />
                                        <span className="text-sm font-semibold" style={{ color: colors.primary }}>Obs.</span>
                                    </div>
                                </td>
                                <td className="py-3 px-3">
                                    <input
                                        type="text"
                                        placeholder="Observações adicionais (opcional)"
                                        className="w-full p-2 rounded-lg text-sm outline-none"
                                        style={inputStyles}
                                        value={observacoes}
                                        onChange={e => setObservacoes(e.target.value)}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    CARD ÚNICO — Itens + Resumo Fiscal
                ══════════════════════════════════════════════════════════════ */}
                {itens.length > 0 ? (
                    <div
                        className="rounded-xl border shadow-sm overflow-hidden"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    >
                        {/* Header do card */}
                        <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
                            <div className="flex items-center gap-2">
                                <Receipt size={16} className="text-white" />
                                <span className="text-white font-semibold text-sm tracking-wide">
                                    Itens da Proforma
                                    <span className="ml-1.5 text-white/60 font-normal text-xs">
                                        ({itens.length} item{itens.length !== 1 ? 's' : ''})
                                    </span>
                                </span>
                            </div>
                            <button
                                onClick={limparCarrinho}
                                className="text-white/60 hover:text-white text-xs transition-colors"
                            >
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
                                        const produto = produtos.find(p => p.id === item.produto_id);
                                        const maxEstoque = produto && !isServico(produto) ? produto.estoque_atual : Infinity;

                                        return (
                                            <tr key={item.id}
                                                className="border-b last:border-0 transition-colors"
                                                style={{
                                                    borderColor: colors.border,
                                                    backgroundColor: idx % 2 !== 0 ? `${colors.hover}60` : 'transparent',
                                                }}
                                            >
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium truncate max-w-[100px] sm:max-w-[160px]"
                                                            style={{ color: colors.text }}>{item.descricao}</span>
                                                        {produto && isServico(produto) && (
                                                            <span
                                                                className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                                                                style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                                                            >
                                                                S
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.desconto > 0 && (
                                                        <span className="text-[10px]" style={{ color: colors.danger }}>
                                                            desc. −{formatarPreco(item.desconto)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        <button
                                                            onClick={() => atualizarQuantidadeItem(item.id, item.quantidade - 1)}
                                                            className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                                                            style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                            disabled={item.quantidade <= 1}
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="w-7 text-center text-sm font-medium"
                                                            style={{ color: colors.text }}>{item.quantidade}</span>
                                                        <button
                                                            onClick={() => atualizarQuantidadeItem(item.id, item.quantidade + 1)}
                                                            className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                                                            style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                            disabled={item.quantidade >= maxEstoque}
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right hidden sm:table-cell"
                                                    style={{ color: colors.textSecondary }}>
                                                    {formatarPreco(item.preco_unitario)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right hidden md:table-cell"
                                                    style={{ color: colors.text }}>
                                                    {formatarPreco(item.valor_iva)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right hidden lg:table-cell"
                                                    style={{ color: item.valor_retencao > 0 ? colors.danger : colors.textSecondary }}>
                                                    {item.valor_retencao > 0 ? `−${formatarPreco(item.valor_retencao)}` : '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-bold"
                                                    style={{ color: colors.secondary }}>
                                                    {formatarPreco(item.subtotal)}
                                                </td>
                                                <td className="px-2 py-2.5 text-center">
                                                    <button
                                                        onClick={() => removerItem(item.id)}
                                                        className="p-1 rounded hover:opacity-70 transition-colors"
                                                        style={{ color: colors.danger }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Secção: Resumo Fiscal (abaixo dos itens) ── */}
                        <div className="border-t" style={{ borderColor: colors.border }}>
                            <div className="p-4">
                                <p className="text-xs font-bold uppercase tracking-wider mb-3"
                                    style={{ color: colors.textSecondary }}>Resumo Fiscal</p>
                                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                                    <div className="flex-1 max-w-md">
                                        <LinhaFiscal label="Subtotal bruto" valor={formatarPreco(totalBase + totalDesconto)} colors={colors} />
                                        {totalDesconto > 0 && (
                                            <LinhaFiscal label="Descontos" valor={`−${formatarPreco(totalDesconto)}`} cor={colors.danger} colors={colors} />
                                        )}
                                        <LinhaFiscal label="Base tributável" valor={formatarPreco(totalBase)} colors={colors} />
                                        <LinhaFiscal label={`IVA (${itens[0]?.taxa_iva ?? 14}%)`} valor={formatarPreco(totalIva)} colors={colors} />
                                        {totalRetencao > 0 && (
                                            <LinhaFiscal label="Retenção (6.5%)" valor={`−${formatarPreco(totalRetencao)}`} cor={colors.danger} colors={colors} />
                                        )}
                                        <hr />
                                        <LinhaFiscal label="Total a pagar" valor={formatarPreco(totalLiquido)}
                                            cor={colors.secondary} negrito colors={colors} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Estado vazio */
                    <div
                        className="text-center py-8 rounded-xl border-2 border-dashed"
                        style={{ borderColor: colors.border }}
                    >
                        <ShoppingCart size={32} className="mx-auto mb-3" style={{ color: colors.border }} />
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Adicione produtos para criar a proforma
                        </p>
                    </div>
                )}

                {/* ── Botão Finalizar ── */}
                {itens.length > 0 && (
                    <button
                        type="button"
                        onClick={finalizarProforma}
                        disabled={loading || !podeFinalizar()}
                        className="w-full py-3 rounded-xl font-bold text-base text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: colors.secondary }}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                Finalizar Proforma
                            </>
                        )}
                    </button>
                )}

            </div>
        </MainEmpresa>
    );
}