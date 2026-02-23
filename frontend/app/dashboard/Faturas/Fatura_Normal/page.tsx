"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, ShoppingCart, FileText,
    CheckCircle2, Calculator, ArrowLeft,
    AlertTriangle, User, Package
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";

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
    getNomeTipoDocumento,
    validarPayloadVenda,
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

        const preco_venda = produto.preco_venda;
        const maxQuantidade = isServico(produto) ? Infinity : produto.estoque_atual;
        const quantidade = Math.min(formItem.quantidade, maxQuantidade);
        const desconto = formItem.desconto;

        const base = preco_venda * quantidade - desconto;
        const taxaIva = produto.taxa_iva ?? 14;
        const valorIva = (base * taxaIva) / 100;
        const valorRetencao = produto.tipo === "servico" ? base * 0.065 : 0;

        setPreviewItem({
            id: "preview",
            produto_id: produto.id,
            descricao: produto.nome,
            quantidade,
            preco_venda,
            desconto,
            base_tributavel: base,
            valor_iva: valorIva,
            valor_retencao: valorRetencao,
            subtotal: base + valorIva - valorRetencao,
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

    const handleQuantidadeChange = (valor: number) => {
        const produto = produtos.find(p => p.id === formItem.produto_id);
        if (produto) {
            const maxEstoque = isServico(produto) ? Infinity : produto.estoque_atual;
            const qtd = Math.max(1, Math.min(valor, maxEstoque));
            setFormItem(prev => ({ ...prev, quantidade: qtd }));
        }
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

        const novoItem: ItemVendaUI = {
            ...previewItem,
            id: uuidv4(),
        };

        setItens(prev => [...prev, novoItem]);

        setFormItem({
            produto_id: "",
            quantidade: 1,
            desconto: 0,
        });
        setPreviewItem(null);
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

    const totalBase = itens.reduce((acc, i) => acc + i.base_tributavel, 0);
    const totalIva = itens.reduce((acc, i) => acc + i.valor_iva, 0);
    const totalRetencao = itens.reduce((acc, i) => acc + i.valor_retencao, 0);
    const totalLiquido = totalBase + totalIva - totalRetencao;

    const podeFinalizar = (): boolean => {
        if (itens.length === 0) return false;

        if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
        if (modoCliente === 'avulso' && !clienteAvulso.trim()) return false;

        return true;
    };

    const finalizarVenda = async () => {
        if (modoCliente === 'cadastrado' && !clienteSelecionado) {
            setError("Selecione um cliente cadastrado");
            return;
        }

        if (modoCliente === 'avulso' && !clienteAvulso.trim()) {
            setError("Digite o nome do cliente");
            return;
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
                    preco_venda: Number(item.preco_venda),
                    desconto: Number(item.desconto),
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

            setSucesso("Fatura criada com sucesso! Aguardando pagamento.");

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
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full max-w-full">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title="Voltar"
                        >
                            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-[#123859]" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#F9941F]">Nova Fatura</h1>
                    </div>

                    <div className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {getNomeTipoDocumento('FT')}
                    </div>
                </div>

                {/* Alertas */}
                {error && (
                    <div role="alert" className="bg-red-100 border border-red-400 text-red-700 p-3 rounded text-sm flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {sucesso && (
                    <div role="alert" className="bg-green-100 border border-green-400 text-green-700 p-3 rounded text-sm flex items-center gap-2">
                        <CheckCircle2 size={18} />
                        <span>{sucesso}</span>
                    </div>
                )}

                {/* Alerta de estoque baixo */}
                {produtosEstoqueBaixo.length > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                                <h3 className="font-semibold text-orange-800 mb-1">
                                    Produtos com Estoque Baixo ({produtosEstoqueBaixo.length})
                                </h3>
                                <div className="flex flex-wrap gap-1">
                                    {produtosEstoqueBaixo.map(p => (
                                        <span
                                            key={p.id}
                                            className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 text-orange-800"
                                        >
                                            {p.nome} ({p.estoque_atual})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TABELA PRINCIPAL */}
                <div className="bg-white rounded-lg shadow border-2 border-[#123859]/20 overflow-hidden">
                    <div className="bg-[#123859] text-white px-4 py-2 flex items-center gap-2">
                        <FileText size={18} />
                        <h2 className="font-bold text-sm">DADOS DA FATURA</h2>
                    </div>

                    <table className="w-full border-collapse">
                        <tbody>
                            {/* Linha 1: Cliente */}
                            <tr className="border-b border-gray-200">
                                <td className="p-3 bg-gray-50 font-semibold text-[#123859] text-sm border-r border-gray-200 w-40">
                                    <div className="flex items-center gap-2">
                                        <User size={16} />
                                        <span>Cliente</span>
                                    </div>
                                </td>

                                <td className="p-3">
                                    <div className="flex items-center gap-3 flex-wrap">

                                        {/* Botões modo cliente */}
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModoCliente('cadastrado');
                                                    setClienteAvulso('');
                                                    setClienteAvulsoNif('');
                                                    setClienteSelecionado(null);
                                                }}
                                                className={`px-2 py-1 text-xs rounded ${modoCliente === 'cadastrado'
                                                    ? 'bg-[#123859] text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700'
                                                    }`}
                                            >
                                                Cadastrado
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModoCliente('avulso');
                                                    setClienteSelecionado(null);
                                                }}
                                                className={`px-2 py-1 text-xs rounded ${modoCliente === 'avulso'
                                                    ? 'bg-[#123859] text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700'
                                                    }`}
                                            >
                                                Não cadastrado
                                            </button>
                                        </div>

                                        {/* Cliente cadastrado */}
                                        {modoCliente === 'cadastrado' && (
                                            <select
                                                className="w-72 border border-gray-300 p-2 rounded text-sm"
                                                value={clienteSelecionado?.id ?? ""}
                                                onChange={e =>
                                                    setClienteSelecionado(
                                                        clientes.find(c => c.id === e.target.value) ?? null
                                                    )
                                                }
                                            >
                                                <option value="">Selecione um cliente</option>
                                                {clientes.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nome} {c.nif ? `(${formatarNIF(c.nif)})` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Cliente avulso */}
                                        {modoCliente === 'avulso' && (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="Nome do cliente"
                                                    className="w-60 border border-gray-300 p-2 rounded text-sm"
                                                    value={clienteAvulso}
                                                    onChange={e => setClienteAvulso(e.target.value)}
                                                    required
                                                />

                                                <input
                                                    type="text"
                                                    placeholder="NIF"
                                                    className="w-40 border border-gray-300 p-2 rounded text-sm"
                                                    value={clienteAvulsoNif}
                                                    onChange={e => setClienteAvulsoNif(e.target.value)}
                                                />
                                            </>
                                        )}

                                    </div>
                                </td>
                            </tr>

                            <tr className="border-b border-gray-200">
                                <td className="p-3 bg-gray-50 font-semibold text-[#123859] text-sm border-r border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <Package size={16} />
                                        <span>Produto</span>
                                    </div>
                                </td>

                                <td className="p-3">
                                    <div className="flex items-center gap-3 flex-wrap">

                                        {/* Produto */}
                                        <select
                                            className="w-64 border border-gray-300 p-2 rounded text-sm"
                                            value={formItem.produto_id}
                                            onChange={e => handleProdutoChange(e.target.value)}
                                        >
                                            <option value="">
                                                {produtosDisponiveis.length === 0
                                                    ? "Nenhum produto disponível"
                                                    : "Selecione um produto"}
                                            </option>
                                            {produtos.filter(p => p.status === 'ativo').map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nome} {p.codigo ? `(${p.codigo})` : ""} - {formatarPreco(p.preco_venda)}
                                                    {!isServico(p) && ` (Disp: ${p.estoque_atual})`}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Quantidade */}
                                        <div className="relative w-20">
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder="Qtd"
                                                className="w-full border border-gray-300 p-2 rounded text-sm"
                                                value={formItem.quantidade}
                                                onChange={e => handleQuantidadeChange(Number(e.target.value))}
                                                disabled={!formItem.produto_id}
                                            />
                                            {produtoSelecionado && !isServico(produtoSelecionado) && (
                                                <div className=" absolute -bottom-4 left-0 text-[10px] text-gray-500">
                                                    Disp: {produtoSelecionado.estoque_atual}
                                                </div>
                                            )}
                                        </div>

                                        {/* Desconto */}
                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="Desc. (Kz)"
                                            className="w-28 border border-gray-300 p-2 rounded text-sm"
                                            value={formItem.desconto}
                                            onChange={e =>
                                                setFormItem(prev => ({ ...prev, desconto: Number(e.target.value) }))
                                            }
                                            disabled={!formItem.produto_id}
                                        />

                                        {/* Botão Adicionar */}
                                        <button
                                            type="button"
                                            onClick={adicionarAoCarrinho}
                                            disabled={!formItem.produto_id}
                                            className="bg-[#123859] hover:bg-[#0d2840] disabled:bg-gray-300 disabled:cursor-not-allowed 
                   text-white px-4 py-2 rounded font-semibold flex items-center gap-1 text-sm"
                                        >
                                            <Plus size={16} />
                                            Adicionar
                                        </button>
                                    </div>

                                    {/* Preview do item */}
                                    {previewItem && (
                                        <div className="mt-4 p-2 bg-gray-50 rounded text-xs flex gap-6 border border-gray-200">
                                            <div><span className="text-gray-500">Base:</span> {formatarPreco(previewItem.base_tributavel)}</div>
                                            <div><span className="text-gray-500">IVA:</span> {formatarPreco(previewItem.valor_iva)}</div>
                                            {previewItem.valor_retencao > 0 && (
                                                <div><span className="text-gray-500">Ret.:</span> -{formatarPreco(previewItem.valor_retencao)}</div>
                                            )}
                                            <div>
                                                <span className="text-gray-500">Subtotal:</span>{" "}
                                                <span className="font-bold text-[#F9941F]">
                                                    {formatarPreco(previewItem.subtotal)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {/* Linha 3: Observações */}
                            <tr className="border-b border-gray-200">
                                <td className="p-3 bg-gray-50 font-semibold text-[#123859] text-sm border-r border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} />
                                        <span>Observações</span>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <textarea
                                        rows={2}
                                        placeholder="Observações adicionais (opcional)"
                                        className="w-full border border-gray-300 p-2 rounded text-sm"
                                        value={observacoes}
                                        onChange={e => setObservacoes(e.target.value)}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* TABELA DE ITENS */}
                {itens.length > 0 && (
                    <div className="bg-white rounded-lg shadow border-2 border-[#123859]/20 overflow-hidden">
                        <div className="bg-[#123859] text-white px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={18} />
                                <h2 className="font-bold text-sm">ITENS DA FATURA ({itens.length})</h2>
                            </div>
                            <button
                                onClick={limparCarrinho}
                                className="text-xs bg-[#F9941F] text-white px-2 py-1 rounded transition-colors"
                            >
                                Limpar Itens
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 text-left text-[#123859] font-semibold">Produto</th>
                                        <th className="p-2 text-center text-[#123859] font-semibold">Qtd</th>
                                        <th className="p-2 text-right text-[#123859] font-semibold">Preço</th>
                                        <th className="p-2 text-right text-[#123859] font-semibold">Desc.</th>
                                        <th className="p-2 text-right text-[#123859] font-semibold">IVA</th>
                                        <th className="p-2 text-right text-[#123859] font-semibold">Ret.</th>
                                        <th className="p-2 text-right text-[#123859] font-semibold">Subtotal</th>
                                        <th className="p-2 text-center text-[#123859] font-semibold"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itens.map((item) => (
                                        <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                                            <td className="p-2 font-medium text-[#123859]">{item.descricao}</td>
                                            <td className="p-2 text-center">{item.quantidade}</td>
                                            <td className="p-2 text-right">{formatarPreco(item.preco_venda)}</td>
                                            <td className="p-2 text-right text-red-600">{item.desconto > 0 ? formatarPreco(item.desconto) : '-'}</td>
                                            <td className="p-2 text-right">{formatarPreco(item.valor_iva)}</td>
                                            <td className="p-2 text-right text-orange-600">{item.valor_retencao > 0 ? formatarPreco(item.valor_retencao) : '-'}</td>
                                            <td className="p-2 text-right font-bold text-[#F9941F]">{formatarPreco(item.subtotal)}</td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removerItem(item.id)}
                                                    className="text-orange-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                                                    title="Remover item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* RESUMO */}
                {itens.length > 0 && (
                    <div className="bg-white rounded-lg shadow border-2 border-[#123859]/20 overflow-hidden">
                        <div className="bg-[#123859] text-white px-4 py-2 flex items-center gap-2">
                            <Calculator size={18} />
                            <h2 className="font-bold text-sm">RESUMO - FATURA</h2>
                        </div>

                        <table className="w-full border-collapse text-center">
                            <tbody>
                                {/* Linha 1 – Componentes */}
                                <tr className="bg-gray-50 text-gray-600 font-medium border-b">
                                    <td className="p-2">Base Tributável</td>
                                    <td className="p-2">
                                        IVA ({((totalIva / totalBase) * 100).toFixed(1)}%)
                                    </td>
                                    {totalRetencao > 0 && (
                                        <td className="p-2">Retenção (6.5%)</td>
                                    )}
                                </tr>

                                {/* Linha 2 – Valores */}
                                <tr className="border-b font-semibold">
                                    <td className="p-3">{formatarPreco(totalBase)}</td>
                                    <td className="p-3">{formatarPreco(totalIva)}</td>
                                    {totalRetencao > 0 && (
                                        <td className="p-3 text-red-600">
                                            -{formatarPreco(totalRetencao)}
                                        </td>
                                    )}
                                </tr>

                                {/* Linha 3 – Total */}
                                <tr className="bg-[#123859] text-white">
                                    <td
                                        colSpan={totalRetencao > 0 ? 2 : 1}
                                        className="p-3 font-bold text-left"
                                    >
                                        TOTAL DA FATURA
                                    </td>
                                    <td
                                        colSpan={totalRetencao > 0 ? 1 : 2}
                                        className="p-3 font-bold text-[#F9941F] text-lg text-right"
                                    >
                                        {formatarPreco(totalLiquido)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* BOTÃO FINALIZAR */}
                <button
                    type="button"
                    onClick={finalizarVenda}
                    disabled={loading || !podeFinalizar()}
                    className="w-full bg-[#F9941F] hover:bg-[#d9831a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold text-base shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Processando...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={20} />
                            Finalizar
                        </>
                    )}
                </button>
            </div>
        </MainEmpresa>
    );
}