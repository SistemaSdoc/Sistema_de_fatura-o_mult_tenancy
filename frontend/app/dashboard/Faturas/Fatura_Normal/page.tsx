'use client';

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, ShoppingCart, FileText,
    CheckCircle2, ArrowLeft,
    AlertTriangle, User, Package, Minus
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";

import {
    criarVenda,
    Produto,
    Cliente,
    clienteService,
    produtoService,
    CriarVendaPayload,
    formatarNIF,
    isServico,
    formatarPreco,
    validarPayloadVenda,
} from "@/services/vendas";

const ESTOQUE_MINIMO = 5;

// Função auxiliar para arredondar para 2 casas decimais
const arredondar = (valor: number): number => {
    return Math.round(valor * 100) / 100;
};

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
    codigo_produto?: string;
}

interface FormItemState {
    produto_id: string;
    quantidade: number;
    desconto: number;
}

type ModoCliente = 'cadastrado' | 'avulso';

export default function NovaFaturaNormalPage() {
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
    const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
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

    const [formItem, setFormItem] = useState<FormItemState>({
        produto_id: "",
        quantidade: 1,
        desconto: 0,
    });

    const [previewItem, setPreviewItem] = useState<ItemVendaUI | null>(null);
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
        const preco_venda = produto.preco_venda;
        const maxQuantidade = ehServico ? Infinity : produto.estoque_atual;
        const quantidade = Math.min(formItem.quantidade, maxQuantidade);
        const desconto = formItem.desconto;

        const valorBruto = arredondar(preco_venda * quantidade);
        const baseTributavel = arredondar(valorBruto - desconto);
        const taxaIva = produto.taxa_iva ?? 14;
        const valorIva = arredondar((baseTributavel * taxaIva) / 100);
        const valorRetencao = ehServico ? arredondar(baseTributavel * 0.065) : 0;

        setPreviewItem({
            id: "preview",
            produto_id: produto.id,
            descricao: produto.nome,
            quantidade,
            preco_venda,
            desconto,
            base_tributavel: baseTributavel,
            valor_iva: valorIva,
            valor_retencao: valorRetencao,
            subtotal: arredondar(baseTributavel + valorIva - valorRetencao),
            taxa_iva: taxaIva,
            codigo_produto: produto.codigo || undefined,
        });
    }, [formItem, produtos]);

    // Validação de NIF
    const validarNif = (nif: string): boolean => {
        const numerosApenas = nif.replace(/\D/g, '');
        return numerosApenas.length === 9;
    };

    const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Permite apenas números
        const numerosApenas = value.replace(/\D/g, '');
        
        // Limita a 9 caracteres
        if (numerosApenas.length <= 9) {
            setClienteAvulsoNif(numerosApenas);
            
            if (numerosApenas.length > 0 && numerosApenas.length !== 9) {
                setNifError("O NIF deve ter exatamente 9 dígitos");
            } else {
                setNifError(null);
            }
        }
    };

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
    ): ItemVendaUI => {
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
            preco_venda: produto.preco_venda,
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

    const podeFinalizar = (): boolean => {
        if (itens.length === 0) return false;

        if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
        if (modoCliente === 'avulso') {
            if (!clienteAvulso.trim()) return false;
            // Se foi preenchido NIF, validar se tem 9 dígitos
            if (clienteAvulsoNif.trim() && !validarNif(clienteAvulsoNif)) return false;
        }

        return true;
    };

    const finalizarVenda = async () => {
        if (modoCliente === 'cadastrado' && !clienteSelecionado) {
            setError("Selecione um cliente cadastrado");
            return;
        }

        if (modoCliente === 'avulso') {
            if (!clienteAvulso.trim()) {
                setError("Digite o nome do cliente");
                return;
            }
            
            // Validar NIF se foi preenchido
            if (clienteAvulsoNif.trim() && !validarNif(clienteAvulsoNif)) {
                setError("O NIF deve ter exatamente 9 dígitos");
                return;
            }
        }

        if (itens.length === 0) {
            setError("Adicione itens à venda");
            return;
        }

        setLoading(true);
        setError(null);
        setSucesso(null);

        try {
            const payload: CriarVendaPayload = {
                itens: itens.map(item => ({
                    produto_id: item.produto_id,
                    quantidade: Number(item.quantidade),
                    preco_venda: arredondar(Number(item.preco_venda)),
                    desconto: arredondar(Number(item.desconto)),
                })),
                tipo_documento: 'FT',
                faturar: true,
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
                payload.observacoes = observacoes.trim();
            }

            const erroValidacao = validarPayloadVenda(payload);
            if (erroValidacao) {
                setError(erroValidacao);
                setLoading(false);
                return;
            }

            const vendaCriada = await criarVenda(payload);

            if (!vendaCriada) {
                throw new Error("Erro ao criar venda - resposta vazia");
            }

            setSucesso("Fatura criada com sucesso!");

            setTimeout(() => {
                router.push("/dashboard/Faturas/Faturas");
            }, 1500);

        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                console.error("Erro Axios:", err.response?.data || err.message);
                setError(err.response?.data?.message || "Erro ao salvar venda");
            } else {
                console.error("Erro:", err);
                setError("Erro ao salvar venda");
            }
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
                    <button
                        onClick={() => router.back()}
                        className="p-1.5 rounded-full transition-colors hover:bg-opacity-10"
                        style={{ color: colors.primary }}
                        title="Voltar"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg sm:text-xl font-bold" style={{ color: colors.secondary }}>Nova Fatura</h1>
                </div>

                {/* ── Alertas ── */}
                {error && (
                    <div
                        className="p-2.5 rounded-lg border text-xs flex items-center gap-2"
                        style={{
                            backgroundColor: `${colors.danger}15`,
                            borderColor: colors.danger,
                            color: colors.danger
                        }}
                    >
                        <AlertTriangle size={13} className="flex-shrink-0" />
                        <span className="flex-1">{error}</span>
                    </div>
                )}

                {sucesso && (
                    <div
                        className="p-2.5 rounded-lg border text-xs flex items-center gap-2"
                        style={{
                            backgroundColor: `${colors.success}15`,
                            borderColor: colors.success,
                            color: colors.success
                        }}
                    >
                        <CheckCircle2 size={13} className="flex-shrink-0" />
                        <span className="flex-1">{sucesso}</span>
                    </div>
                )}

                {produtosEstoqueBaixo.length > 0 && (
                    <div
                        className="p-2.5 rounded-lg border text-xs flex items-center gap-2 flex-wrap"
                        style={{
                            backgroundColor: `${colors.warning}15`,
                            borderColor: colors.warning
                        }}
                    >
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
                <div
                    className="rounded-xl border shadow-sm overflow-hidden"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    <div
                        className="px-4 py-2 flex items-center gap-2"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <ShoppingCart size={14} className="text-white" />
                        <span className="text-white font-semibold text-xs uppercase tracking-wide">Dados da Fatura</span>
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
                                                    className="px-2 py-1 font-medium transition-colors whitespace-nowrap text-[11px]"
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
                                                className="flex-1 min-w-[140px] max-w-[200px] p-1 rounded-lg text-xs"
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
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="Nome do cliente *"
                                                    className="w-[140px] sm:w-[160px] p-1 rounded-lg text-xs"
                                                    style={inputStyles}
                                                    value={clienteAvulso}
                                                    onChange={e => setClienteAvulso(e.target.value)}
                                                />
                                                <div className="relative inline-block">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="NIF"
                                                        className="w-[80px] p-1 rounded-lg text-xs"
                                                        style={{
                                                            ...inputStyles,
                                                            borderColor: nifError ? colors.danger : inputStyles.borderColor
                                                        }}
                                                        value={clienteAvulsoNif}
                                                        onChange={handleNifChange}
                                                        maxLength={9}
                                                    />
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
                                        <select
                                            className="w-[140px] sm:w-[160px] p-1 rounded-lg text-xs"
                                            style={inputStyles}
                                            value={formItem.produto_id}
                                            onChange={e => handleProdutoChange(e.target.value)}
                                        >
                                            <option value="">
                                                {produtosDisponiveis.length === 0
                                                    ? "Nenhum produto"
                                                    : "Selecione"}
                                            </option>
                                            {produtos.filter(p => p.status === 'ativo').map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nome} — {formatarPreco(p.preco_venda)}
                                                    {!isServico(p) ? ` (${p.estoque_atual})` : ''}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Stepper quantidade - compacto */}
                                        <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: colors.border, height: 26 }}>
                                            <button
                                                type="button"
                                                className="px-1.5 h-full text-xs transition-colors disabled:opacity-30"
                                                style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                disabled={!formItem.produto_id || formItem.quantidade <= 1}
                                                onClick={() => {
                                                    const p = produtos.find(x => x.id === formItem.produto_id);
                                                    if (p) {
                                                        setFormItem(prev => ({ ...prev, quantidade: Math.max(1, prev.quantidade - 1) }));
                                                    }
                                                }}
                                            >
                                                <Minus size={10} />
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                className="w-8 text-center text-[11px] border-0 outline-none h-full"
                                                style={{ backgroundColor: colors.card, color: colors.text }}
                                                value={formItem.quantidade}
                                                disabled={!formItem.produto_id}
                                                onChange={e => {
                                                    const p = produtos.find(x => x.id === formItem.produto_id);
                                                    if (p) {
                                                        const maxEstoqueAtual = isServico(p) ? Infinity : p.estoque_atual;
                                                        setFormItem(prev => ({ ...prev, quantidade: Math.max(1, Math.min(Number(e.target.value) || 1, maxEstoqueAtual)) }));
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="px-1.5 h-full text-xs transition-colors disabled:opacity-30"
                                                style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                disabled={!formItem.produto_id || (!!produtoSelecionado && !isServico(produtoSelecionado) && formItem.quantidade >= produtoSelecionado.estoque_atual)}
                                                onClick={() => {
                                                    const p = produtos.find(x => x.id === formItem.produto_id);
                                                    if (p) {
                                                        const maxEstoqueAtual = isServico(p) ? Infinity : p.estoque_atual;
                                                        setFormItem(prev => ({ ...prev, quantidade: Math.min(prev.quantidade + 1, maxEstoqueAtual) }));
                                                    }
                                                }}
                                            >
                                                <Plus size={10} />
                                            </button>
                                        </div>

                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="Desconto"
                                            className="w-[70px] p-1 rounded-lg text-xs"
                                            style={inputStyles}
                                            value={formItem.desconto || ''}
                                            disabled={!formItem.produto_id}
                                            onChange={e => setFormItem(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                                        />

                                        <button
                                            type="button"
                                            onClick={adicionarAoCarrinho}
                                            disabled={!formItem.produto_id}
                                            className="px-2 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ backgroundColor: colors.primary }}
                                        >
                                            <Plus size={11} /> Adicionar
                                        </button>

                                        {produtoSelecionado && !isServico(produtoSelecionado) && (
                                            <span className="text-[9px]" style={{ color: colors.textSecondary }}>
                                                disp: {produtoSelecionado.estoque_atual}
                                            </span>
                                        )}
                                    </div>

                                    {/* Preview cálculo */}
                                    {previewItem && (
                                        <div
                                            className="mt-1.5 px-2 py-1 rounded-lg flex flex-wrap gap-2 text-[10px]"
                                            style={{ backgroundColor: colors.hover }}
                                        >
                                            <span style={{ color: colors.textSecondary }}>
                                                Base: <span style={{ color: colors.text }}>{formatarPreco(previewItem.base_tributavel)}</span>
                                            </span>
                                            <span style={{ color: colors.textSecondary }}>
                                                IVA: <span style={{ color: colors.text }}>{formatarPreco(previewItem.valor_iva)}</span>
                                            </span>
                                            {previewItem.valor_retencao > 0 && (
                                                <span style={{ color: colors.textSecondary }}>
                                                    Ret.: <span style={{ color: colors.danger }}>-{formatarPreco(previewItem.valor_retencao)}</span>
                                                </span>
                                            )}
                                            <span style={{ color: colors.textSecondary }}>
                                                Total: <span style={{ color: colors.secondary }}>{formatarPreco(previewItem.subtotal)}</span>
                                            </span>
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
                                    <input
                                        type="text"
                                        placeholder="Observações adicionais (opcional)"
                                        className="w-full p-1 rounded-lg text-xs"
                                        style={inputStyles}
                                        value={observacoes}
                                        onChange={e => setObservacoes(e.target.value)}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ══════════════════════════
                    CARD: Itens + Totais
                ══════════════════════════ */}
                {itens.length > 0 && (
                    <div
                        className="rounded-xl border shadow-sm overflow-hidden"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    >
                        <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={13} className="text-white" />
                                <span className="text-white font-semibold text-[11px] uppercase tracking-wide">Itens ({itens.length})</span>
                            </div>
                            <button
                                onClick={limparCarrinho}
                                className="text-[10px] text-white/70 hover:text-white transition-colors"
                            >
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
                                    {itens.map((item) => {
                                        const produto = produtos.find(p => p.id === item.produto_id);
                                        const maxEstoque = produto && !isServico(produto) ? produto.estoque_atual : Infinity;

                                        return (
                                            <tr key={item.id} className="border-b last:border-0" style={{ borderColor: colors.border }}>
                                                <td className="px-2 py-1.5 font-medium" style={{ color: colors.text }}>
                                                    <div className="flex items-center gap-1">
                                                        <span className="truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px]">{item.descricao}</span>
                                                        {produto && isServico(produto) && (
                                                            <span className="text-[8px] px-1 py-0.5 rounded" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                                                                S
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        <button
                                                            onClick={() => atualizarQuantidadeItem(item.id, item.quantidade - 1)}
                                                            className="w-4 h-4 rounded flex items-center justify-center disabled:opacity-30"
                                                            style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                            disabled={item.quantidade <= 1}
                                                        >
                                                            <Minus size={8} />
                                                        </button>
                                                        <span className="w-5 text-center" style={{ color: colors.text }}>{item.quantidade}</span>
                                                        <button
                                                            onClick={() => atualizarQuantidadeItem(item.id, item.quantidade + 1)}
                                                            className="w-4 h-4 rounded flex items-center justify-center disabled:opacity-30"
                                                            style={{ backgroundColor: colors.hover, color: colors.primary }}
                                                            disabled={item.quantidade >= maxEstoque}
                                                        >
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
                                                    style={{ color: item.valor_retencao > 0 ? colors.danger : colors.textSecondary }}
                                                >
                                                    {item.valor_retencao > 0 ? `-${formatarPreco(item.valor_retencao)}` : '—'}
                                                </td>
                                                <td className="px-2 py-1.5 text-right font-bold" style={{ color: colors.secondary }}>
                                                    {formatarPreco(item.subtotal)}
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <button
                                                        onClick={() => removerItem(item.id)}
                                                        className="p-0.5 hover:opacity-70 transition-opacity"
                                                        style={{ color: colors.danger }}
                                                    >
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
                        <div
                            className="px-3 py-1.5 flex flex-wrap justify-end gap-x-3 gap-y-0.5 border-t text-[10px]"
                            style={{ backgroundColor: colors.hover, borderColor: colors.border }}
                        >
                            <span style={{ color: colors.textSecondary }}>
                                Base: <span style={{ color: colors.text }}>{formatarPreco(totalBase)}</span>
                            </span>
                            <span style={{ color: colors.textSecondary }}>
                                IVA: <span style={{ color: colors.text }}>{formatarPreco(totalIva)}</span>
                            </span>
                            {totalRetencao > 0 && (
                                <span style={{ color: colors.textSecondary }}>
                                    Ret.: <span style={{ color: colors.danger }}>-{formatarPreco(totalRetencao)}</span>
                                </span>
                            )}
                            <span style={{ color: colors.textSecondary }}>
                                Total: <span className="text-xs" style={{ color: colors.secondary }}>{formatarPreco(totalLiquido)}</span>
                            </span>
                        </div>
                    </div>
                )}

                {/* ── Botão Finalizar ── */}
                <button
                    type="button"
                    onClick={finalizarVenda}
                    disabled={loading || !podeFinalizar()}
                    className="w-full py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.secondary }}
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Processando...
                        </>
                    ) : itens.length === 0 ? (
                        "Adicione itens para continuar"
                    ) : (
                        <>
                            <CheckCircle2 size={16} />
                            Finalizar Fatura
                        </>
                    )}
                </button>

            </div>
        </MainEmpresa>
    );
}