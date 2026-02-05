"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";

import {
  criarVenda,
  Produto,
  Cliente,
  obterDadosNovaVenda,
  CriarVendaPayload,
} from "@/services/vendas";

/* ================= TIPOS ================= */
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
}

interface FormItemState {
  produto_id: string;
  quantidade: number;
  desconto: number;
}

export default function NovaVendaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<ItemVendaUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado único do formulário (não cria múltiplos)
  const [formItem, setFormItem] = useState<FormItemState>({
    produto_id: "",
    quantidade: 1,
    desconto: 0,
  });

  // Estado para preview do cálculo em tempo real
  const [previewItem, setPreviewItem] = useState<ItemVendaUI | null>(null);

  /* ================= PROTEÇÃO ================= */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  /* ================= DADOS INICIAIS ================= */
  useEffect(() => {
    if (!user) return;

    async function carregarDados() {
      try {
        const data = await obterDadosNovaVenda();
        setClientes(data.clientes);
        setProdutos(data.produtos);
      } catch {
        setError("Erro ao carregar dados iniciais");
      }
    }

    carregarDados();
  }, [user]);

  /* ================= CÁLCULO EM TEMPO REAL ================= */
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
    const quantidade = Math.min(formItem.quantidade, produto.estoque_atual);
    const desconto = formItem.desconto;

    const base = preco_venda * quantidade - desconto;
    const taxaIva = produto.taxa_iva ?? 14;
    const valorIva = (base * taxaIva) / 100;
    const valorRetencao = produto.tipo === "servico" ? base * 0.1 : 0;

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
    });
  }, [formItem, produtos]);

  /* ================= MANIPULAÇÃO DO FORMULÁRIO ================= */
  const handleProdutoChange = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    setFormItem(prev => ({
      ...prev,
      produto_id: produtoId,
      quantidade: produto ? Math.min(1, produto.estoque_atual) : 1,
      desconto: 0,
    }));
  };

  const handleQuantidadeChange = (valor: number) => {
    const produto = produtos.find(p => p.id === formItem.produto_id);
    if (produto) {
      const maxEstoque = produto.estoque_atual;
      const qtd = Math.max(1, Math.min(valor, maxEstoque));
      setFormItem(prev => ({ ...prev, quantidade: qtd }));
    }
  };

  /* ================= ADICIONAR AO CARRINHO ================= */
  const adicionarAoCarrinho = () => {
    if (!formItem.produto_id) {
      setError("Selecione um produto");
      return;
    }

    if (!previewItem) return;

    const produto = produtos.find(p => p.id === formItem.produto_id);
    if (produto && formItem.quantidade > produto.estoque_atual) {
      setError(`Estoque insuficiente. Disponível: ${produto.estoque_atual}`);
      return;
    }

    const novoItem: ItemVendaUI = {
      ...previewItem,
      id: uuidv4(),
    };

    setItens(prev => [...prev, novoItem]);

    // Resetar formulário mantendo apenas a estrutura
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

  /* ================= TOTAIS ================= */
  const totalBase = itens.reduce((acc, i) => acc + i.base_tributavel, 0);
  const totalIva = itens.reduce((acc, i) => acc + i.valor_iva, 0);
  const totalRetencao = itens.reduce((acc, i) => acc + i.valor_retencao, 0);
  const totalLiquido = totalBase + totalIva - totalRetencao;

  /* ================= SALVAR ================= */
  const salvarVenda = async () => {
    if (!clienteSelecionado) {
      setError("Selecione um cliente");
      return;
    }

    if (itens.length === 0) {
      setError("Adicione itens à venda");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: CriarVendaPayload = {
        cliente_id: clienteSelecionado.id,
        tipo_documento: "fatura",
        faturar: true,
        itens: itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_venda: Number(item.preco_venda),
          desconto: Number(item.desconto),
          base_tributavel: Number(item.base_tributavel),
          valor_iva: Number(item.valor_iva),
          valor_retencao: Number(item.valor_retencao),
          subtotal: Number(item.subtotal),
        })),
      };

      await criarVenda(payload);
      router.push("/dashboard/Faturas/Faturas");
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        console.error("Erro Axios:", err.response ?? err.message);
      } else {
        console.error("Erro:", err);
      }
      setError("Erro ao salvar venda");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */
  const produtoSelecionado = produtos.find(p => p.id === formItem.produto_id);

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-[#123859]">Nova Venda</h1>

        {error && (
          <div role="alert" className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        {/* CLIENTE */}
        <div className="bg-white p-4 rounded shadow">
          <label htmlFor="cliente" className="font-semibold">Cliente</label>
          <select
            id="cliente"
            title="Selecionar cliente"
            className="w-full border p-2 rounded mt-1"
            value={clienteSelecionado?.id ?? ""}
            onChange={e =>
              setClienteSelecionado(
                clientes.find(c => c.id === e.target.value) ?? null
              )
            }
          >
            <option value="">Selecione</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.nif ? `(${c.nif})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* FORMULÁRIO ÚNICO - ADICIONAR ITEM */}
        <div className="bg-white p-6 rounded shadow border-2 border-[#123859]/20">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="text-[#123859]" size={24} />
            <h2 className="font-bold text-[#123859] text-xl">Adicionar Item</h2>
          </div>

          <div className="space-y-4">
            {/* PRODUTO */}
            <div>
              <label htmlFor="produto-form" className="font-semibold text-sm">Produto</label>
              <select
                id="produto-form"
                title="Selecionar produto"
                className="w-full border p-3 rounded mt-1"
                value={formItem.produto_id}
                onChange={e => handleProdutoChange(e.target.value)}
              >
                <option value="">Selecione um produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (Stock: {p.estoque_atual} | {p.preco_venda.toLocaleString("pt-AO")} Kz)
                  </option>
                ))}
              </select>
            </div>

            {/* CAMPOS EDITÁVEIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="qtd-form" className="font-semibold text-sm">Quantidade</label>
                <input
                  id="qtd-form"
                  type="number"
                  min={1}
                  max={produtoSelecionado?.estoque_atual ?? 1}
                  className="border p-3 rounded w-full mt-1"
                  value={formItem.quantidade}
                  onChange={e => handleQuantidadeChange(Number(e.target.value))}
                  disabled={!formItem.produto_id}
                />
                {produtoSelecionado && (
                  <p className="text-xs text-gray-500 mt-1">
                    Disponível: {produtoSelecionado.estoque_atual}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="desc-form" className="font-semibold text-sm">Desconto (Kz)</label>
                <input
                  id="desc-form"
                  type="number"
                  min={0}
                  className="border p-3 rounded w-full mt-1"
                  value={formItem.desconto}
                  onChange={e => setFormItem(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                  disabled={!formItem.produto_id}
                />
              </div>

              <div>
                <label htmlFor="preco-form" className="font-semibold text-sm">Preço Unitário</label>
                <input
                  id="preco-form"
                  disabled
                  className="border p-3 rounded bg-gray-100 w-full mt-1 font-mono"
                  value={previewItem ? `${previewItem.preco_venda.toLocaleString("pt-AO")} Kz` : "-"}
                />
              </div>
            </div>

            {/* PREVIEW DOS CÁLCULOS */}
            {previewItem && (
              <div className="bg-[#123859]/5 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Base:</span>
                  <p className="font-semibold text-[#123859]">
                    {previewItem.base_tributavel.toLocaleString("pt-AO")} Kz
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">IVA:</span>
                  <p className="font-semibold text-[#123859]">
                    {previewItem.valor_iva.toLocaleString("pt-AO")} Kz
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Retenção:</span>
                  <p className="font-semibold text-[#123859]">
                    {previewItem.valor_retencao.toLocaleString("pt-AO")} Kz
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Subtotal:</span>
                  <p className="font-bold text-[#F9941F] text-lg">
                    {previewItem.subtotal.toLocaleString("pt-AO")} Kz
                  </p>
                </div>
              </div>
            )}

            {/* BOTÃO ADICIONAR */}
            <button
              type="button"
              title="Adicionar ao carrinho"
              aria-label="Adicionar ao carrinho"
              onClick={adicionarAoCarrinho}
              disabled={!formItem.produto_id}
              className="w-full bg-[#123859] hover:bg-[#0d2840] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Adicionar ao Carrinho ({itens.length} itens)
            </button>
          </div>
        </div>

        {/* LISTA DE ITENS ADICIONADOS (CARRINHO) */}
        {itens.length > 0 && (
          <div className="bg-white p-4 rounded shadow space-y-3">
            <h2 className="font-semibold text-[#123859] flex items-center gap-2">
              <ShoppingCart size={20} />
              Itens no Carrinho ({itens.length})
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {itens.map((item) => (
                <div key={item.id} className="border p-4 rounded flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold text-[#123859]">{item.descricao}</div>
                    <div className="text-sm text-gray-600 space-x-4">
                      <span>Qtd: {item.quantidade}</span>
                      <span>Preço: {item.preco_venda.toLocaleString("pt-AO")} Kz</span>
                      {item.desconto > 0 && (
                        <span className="text-red-600">Desc: -{item.desconto.toLocaleString("pt-AO")} Kz</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Base: {item.base_tributavel.toLocaleString("pt-AO")} |
                      IVA: {item.valor_iva.toLocaleString("pt-AO")} |
                      Ret: {item.valor_retencao.toLocaleString("pt-AO")}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="font-bold text-[#F9941F]">
                      {item.subtotal.toLocaleString("pt-AO")} Kz
                    </div>
                    <button
                      type="button"
                      title="Remover item"
                      aria-label="Remover item"
                      onClick={() => removerItem(item.id)}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOTAIS FINAIS */}
        <div className="bg-[#123859] text-white p-6 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-4 text-lg">Resumo da Venda</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-300">Total Base:</span>
              <p className="font-bold text-xl">{totalBase.toLocaleString("pt-AO")} Kz</p>
            </div>
            <div>
              <span className="text-gray-300">Total IVA:</span>
              <p className="font-bold text-xl">{totalIva.toLocaleString("pt-AO")} Kz</p>
            </div>
            <div>
              <span className="text-gray-300">Retenção:</span>
              <p className="font-bold text-xl">{totalRetencao.toLocaleString("pt-AO")} Kz</p>
            </div>
            <div>
              <span className="text-[#F9941F]">TOTAL LÍQUIDO:</span>
              <p className="font-bold text-2xl text-[#F9941F]">
                {totalLiquido.toLocaleString("pt-AO")} Kz
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          title="Salvar venda"
          aria-label="Salvar venda"
          onClick={salvarVenda}
          disabled={loading || itens.length === 0}
          className="w-full bg-[#F9941F] hover:bg-[#d9831a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded font-bold text-lg shadow-lg transition-colors"
        >
          {loading ? "Salvando..." : `Finalizar Venda (${itens.length} itens)`}
        </button>
      </div>
    </MainEmpresa>
  );
}