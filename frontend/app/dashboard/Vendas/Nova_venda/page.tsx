"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
  subtotal: number; // base + IVA - retenção
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

  /* ================= ITENS ================= */
  const adicionarItem = () => {
    setItens(prev => [
      ...prev,
      {
        id: uuidv4(),
        produto_id: "",
        descricao: "",
        quantidade: 1,
        preco_venda: 0,
        desconto: 0,
        base_tributavel: 0,
        valor_iva: 0,
        valor_retencao: 0,
        subtotal: 0,
      },
    ]);
  };

  const atualizarItem = (
    index: number,
    campo: keyof ItemVendaUI,
    valor: string | number
  ) => {
    setItens(prev => {
      const novos = [...prev];
      const item = { ...novos[index] };

      if (campo === "produto_id" && typeof valor === "string") {
        const produto = produtos.find(p => p.id === valor);
        if (produto) {
          item.produto_id = produto.id;
          item.descricao = produto.nome;
          item.preco_venda = produto.preco_venda;
          item.quantidade = Math.min(item.quantidade, produto.estoque_atual);
        }
      }

      if (campo === "quantidade" || campo === "desconto") {
        item[campo] = Number(valor);
      }

      // ================= CÁLCULO FISCAL =================
      const base = item.preco_venda * item.quantidade - item.desconto;
      const taxaIva = item.produto_id
        ? produtos.find(p => p.id === item.produto_id)?.taxa_iva ?? 14
        : 0;
      const valorIva = (base * taxaIva) / 100;
      const valorRetencao = produtos.find(p => p.id === item.produto_id)?.tipo === "servico"
        ? base * 0.1
        : 0;

      item.base_tributavel = base;
      item.valor_iva = valorIva;
      item.valor_retencao = valorRetencao;
      item.subtotal = base + valorIva - valorRetencao;

      novos[index] = item;
      return novos;
    });
  };

  const removerItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index));
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

  if (itens.some(i => !i.produto_id)) {
    setError("Selecione todos os produtos");
    return;
  }

  for (const item of itens) {
    const produto = produtos.find(p => p.id === item.produto_id);
    if (produto && item.quantidade > produto.estoque_atual) {
      setError(`Estoque insuficiente para ${produto.nome}`);
      return;
    }
  }

  setLoading(true);
  setError(null);

  try {
    // ================= LOGS PARA ANÁLISE =================
    console.log("Itens antes de enviar:", itens);

    const payload: CriarVendaPayload = {
      cliente_id: clienteSelecionado.id,
      tipo_documento: "fatura",
      faturar: true,
      itens: itens.map(item => {
        const obj = {
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_venda: Number(item.preco_venda),
          desconto: Number(item.desconto),
          base_tributavel: Number(item.base_tributavel),
          valor_iva: Number(item.valor_iva),
          valor_retencao: Number(item.valor_retencao),
          subtotal: Number(item.subtotal),
        };
        console.log("Item enviado ao backend:", obj);
        return obj;
      }),
    };

    console.log("Payload completo a enviar:", payload);

    await criarVenda(payload);
    router.push("/dashboard/Faturas/Faturas");
  } catch (err: unknown) {
    if (err instanceof AxiosError) {
      console.error("Erro Axios ao salvar venda:", err.response ?? err.message);
    } else {
      console.error("Erro inesperado ao salvar venda:", err);
    }
    setError("Erro ao salvar venda. Veja o console para detalhes.");
  } finally {
    setLoading(false);
  }
};



  /* ================= RENDER ================= */
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
            className="w-full border p-2 rounded"
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

        {/* ITENS */}
        <div className="bg-white p-4 rounded shadow space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Itens da Venda</h2>
            <button
              type="button"
              title="Adicionar item"
              aria-label="Adicionar item"
              onClick={adicionarItem}
              className="bg-[#123859] text-white px-3 py-1 rounded flex gap-2"
            >
              <Plus size={16} />
              <span>Adicionar</span>
            </button>
          </div>

          {itens.map((item, index) => (
            <div key={item.id} className="border p-4 rounded space-y-3">
              <label htmlFor={`produto-${item.id}`}>Produto</label>
              <select
                id={`produto-${item.id}`}
                title="Selecionar produto"
                className="w-full border p-2 rounded"
                value={item.produto_id}
                onChange={e => atualizarItem(index, "produto_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.estoque_atual})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-6 gap-3 items-end">
                <div>
                  <label htmlFor={`qtd-${item.id}`}>Qtd</label>
                  <input
                    id={`qtd-${item.id}`}
                    type="number"
                    min={1}
                    className="border p-2 rounded w-full"
                    value={item.quantidade}
                    onChange={e =>
                      atualizarItem(index, "quantidade", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label htmlFor={`desc-${item.id}`}>Desconto</label>
                  <input
                    id={`desc-${item.id}`}
                    type="number"
                    className="border p-2 rounded w-full"
                    value={item.desconto}
                    onChange={e =>
                      atualizarItem(index, "desconto", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label htmlFor="preco">Preço</label>
                  <input
                  id="preco"
                    disabled
                    className="border p-2 rounded bg-gray-100 w-full"
                    value={item.preco_venda.toLocaleString("pt-AO")}
                  />
                </div>

                <div>
                  <label htmlFor="base">Base</label>
                  <input
                  id="base"
                    disabled
                    className="border p-2 rounded bg-gray-100 w-full"
                    value={item.base_tributavel.toLocaleString("pt-AO")}
                  />
                </div>

                <div>
                  <label htmlFor="iva">IVA</label>
                  <input
                  id="iva"
                    disabled
                    className="border p-2 rounded bg-gray-100 w-full"
                    value={item.valor_iva.toLocaleString("pt-AO")}
                  />
                </div>

                <div>
                  <label htmlFor="sub">Subtotal</label>
                  <input
                  id="sub"
                    disabled
                    className="border p-2 rounded bg-gray-100 w-full"
                    value={item.subtotal.toLocaleString("pt-AO")}
                  />
                </div>

                <button
                  type="button"
                  title="Remover item"
                  aria-label="Remover item"
                  onClick={() => removerItem(index)}
                  className="text-red-600"
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* TOTAIS FINAIS */}
        <div className="text-right font-bold text-xl text-[#F9941F]">
          Base: {totalBase.toLocaleString("pt-AO")} Kz
          <br />
          IVA: {totalIva.toLocaleString("pt-AO")} Kz
          <br />
          Retenção: {totalRetencao.toLocaleString("pt-AO")} Kz
          <br />
          Total Líquido: {totalLiquido.toLocaleString("pt-AO")} Kz
        </div>

        <button
          type="button"
          title="Salvar venda"
          aria-label="Salvar venda"
          onClick={salvarVenda}
          disabled={loading}
          className="w-full bg-[#F9941F] text-white py-3 rounded font-semibold"
        >
          {loading ? "Salvando..." : "Salvar Venda"}
        </button>
      </div>
    </MainEmpresa>
  );
}
