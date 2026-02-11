"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, CheckCircle2, Calculator, ArrowLeft, AlertTriangle } from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";

// Serviços atualizados
import {
  criarVenda,
  Produto,
  Cliente,
  clienteService,
  produtoService,
  CriarVendaPayload,
  TipoCliente,
  formatarNIF,
  getTipoClienteLabel,
  estaEstoqueBaixo,
  estaSemEstoque,
  isServico,
  formatarPreco,
} from "@/services/vendas";

// Novo serviço de pagamentos
import { pagamentoService, MetodoPagamento, CriarPagamentoInput } from "@/services/pagamentos";

/* ================= CONSTANTES ================= */
const ESTOQUE_MINIMO = 5; // Produtos com estoque <= 5 são considerados baixos

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

// Dados do pagamento - ATUALIZADO para corresponder ao backend
interface PagamentoUI {
  id: string;
  metodo: MetodoPagamento;
  valor_pago: number;
  troco: number; // Adicionado campo troco
  referencia?: string;
  data_pagamento: string;
  hora_pagamento: string;
}

// Tipo para modo de cliente
type ModoCliente = 'cadastrado' | 'avulso';

export default function NovaVendaPage() {
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

  // ===== ESTADO PARA CLIENTE AVULSO =====
  const [modoCliente, setModoCliente] = useState<ModoCliente>('cadastrado');
  const [clienteAvulso, setClienteAvulso] = useState('');

  // Estado do formulário de item
  const [formItem, setFormItem] = useState<FormItemState>({
    produto_id: "",
    quantidade: 1,
    desconto: 0,
  });

  // Preview do cálculo
  const [previewItem, setPreviewItem] = useState<ItemVendaUI | null>(null);

  // ===== ESTADO DE PAGAMENTO =====
  const [pagamentos, setPagamentos] = useState<PagamentoUI[]>([]);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [formPagamento, setFormPagamento] = useState({
    metodo: "dinheiro" as MetodoPagamento,
    valor_pago: "",
    referencia: "",
  });

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
        // Usar os novos serviços
        const [clientesData, produtosData] = await Promise.all([
          clienteService.listar(),
          produtoService.listar({ status: "ativo", paginar: false }).then(res =>
            Array.isArray(res.produtos) ? res.produtos : []
          ),
        ]);

        setClientes(clientesData);
        setProdutos(produtosData);

        // Separar produtos disponíveis (estoque > ESTOQUE_MINIMO) dos de estoque baixo
        // Ignorar serviços (não têm controle de stock)
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
    // Para serviços, não limitar pela quantidade em estoque
    const maxQuantidade = isServico(produto) ? Infinity : produto.estoque_atual;
    const quantidade = Math.min(formItem.quantidade, maxQuantidade);
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
      quantidade: produto ? (isServico(produto) ? 1 : Math.min(1, produto.estoque_atual)) : 1,
      desconto: 0,
    }));
  };

  const handleQuantidadeChange = (valor: number) => {
    const produto = produtos.find(p => p.id === formItem.produto_id);
    if (produto) {
      // Serviços não têm limite de estoque
      const maxEstoque = isServico(produto) ? Infinity : produto.estoque_atual;
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
    if (!produto) return;

    // Validar estoque apenas para produtos físicos
    if (!isServico(produto) && formItem.quantidade > produto.estoque_atual) {
      setError(`Estoque insuficiente. Disponível: ${produto.estoque_atual}`);
      return;
    }

    const novoItem: ItemVendaUI = {
      ...previewItem,
      id: uuidv4(),
    };

    setItens(prev => [...prev, novoItem]);

    // Resetar formulário
    setFormItem({
      produto_id: "",
      quantidade: 1,
      desconto: 0,
    });
    setPreviewItem(null);
    setError(null);

    // Mostrar seção de pagamento se for o primeiro item
    if (itens.length === 0) {
      setMostrarPagamento(true);
      // Inicializar o valor do pagamento com o total da venda
      setFormPagamento(prev => ({
        ...prev,
        valor_pago: novoItem.subtotal.toFixed(2)
      }));
    }
  };

  const removerItem = (id: string) => {
    const novosItens = itens.filter(item => item.id !== id);
    setItens(novosItens);

    // Se não houver mais itens, limpar pagamentos
    if (novosItens.length === 0) {
      setMostrarPagamento(false);
      setPagamentos([]);
    } else {
      // Recalcular pagamentos se necessário
      const novoTotal = novosItens.reduce((acc, item) => acc + item.subtotal, 0);
      const totalPagoAtual = pagamentos.reduce((acc, p) => acc + p.valor_pago, 0);

      if (totalPagoAtual > novoTotal) {
        // Ajustar o último pagamento ou remover pagamentos excedentes
        setPagamentos(prev => {
          let acumulado = 0;
          const novosPagamentos: PagamentoUI[] = [];

          for (const pag of prev) {
            if (acumulado + pag.valor_pago <= novoTotal) {
              novosPagamentos.push(pag);
              acumulado += pag.valor_pago;
            } else {
              const valorRestante = novoTotal - acumulado;
              if (valorRestante > 0) {
                novosPagamentos.push({
                  ...pag,
                  valor_pago: valorRestante,
                  troco: pag.valor_pago - valorRestante
                });
              }
              break;
            }
          }
          return novosPagamentos;
        });
      }
    }
  };

  /* ================= TOTAIS ================= */
  const totalBase = itens.reduce((acc, i) => acc + i.base_tributavel, 0);
  const totalIva = itens.reduce((acc, i) => acc + i.valor_iva, 0);
  const totalRetencao = itens.reduce((acc, i) => acc + i.valor_retencao, 0);
  const totalLiquido = totalBase + totalIva - totalRetencao;

  /* ================= GESTÃO DE PAGAMENTOS ================= */

  // Calcular total já pago
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor_pago, 0);

  // Calcular troco (quando o pago é maior que o total)
  const troco = Math.max(0, totalPago - totalLiquido);

  // Valor efetivamente aplicado à venda (sem o troco)
  const totalEfetivo = Math.min(totalPago, totalLiquido);

  // Valor restante a pagar
  const totalRestante = Math.max(0, totalLiquido - totalPago);

  // Status do pagamento
  const pagamentoCompleto = totalPago >= totalLiquido;
  const pagamentoParcial = totalPago > 0 && totalPago < totalLiquido;
  const pagamentoExcedente = totalPago > totalLiquido;

  // VERIFICAR SE JÁ EXISTE PAGAMENTO (apenas 1 permitido)
  const pagamentoJaAdicionado = pagamentos.length > 0;

  const adicionarPagamento = () => {
    // BLOQUEAR se já existe um pagamento
    if (pagamentoJaAdicionado) {
      setError("Apenas um pagamento é permitido por venda. Remova o pagamento existente para adicionar outro.");
      return;
    }

    const valor = parseFloat(formPagamento.valor_pago);

    if (isNaN(valor) || valor <= 0) {
      setError("Valor de pagamento inválido");
      return;
    }

    // Calcular troco para este pagamento específico
    const trocoCalculado = Math.max(0, valor - totalLiquido);

    const novoPagamento: PagamentoUI = {
      id: uuidv4(),
      metodo: formPagamento.metodo,
      valor_pago: valor,
      troco: trocoCalculado,
      referencia: formPagamento.referencia || undefined,
      data_pagamento: new Date().toISOString().split('T')[0],
      hora_pagamento: new Date().toTimeString().split(' ')[0],
    };

    setPagamentos([novoPagamento]); // Sempre substitui, mas agora só permite um

    // Resetar formulário de pagamento
    setFormPagamento({
      metodo: "dinheiro",
      valor_pago: "",
      referencia: "",
    });
    setError(null);
  };

  const removerPagamento = (id: string) => {
    setPagamentos(prev => prev.filter(p => p.id !== id));
    // Limpar erro quando remove o pagamento
    setError(null);
  };

  const getIconeMetodo = (metodo: MetodoPagamento) => {
    switch (metodo) {
      case "dinheiro": return <Banknote className="w-4 h-4" />;
      case "cartao": return <CreditCard className="w-4 h-4" />;
      case "transferencia": return <Smartphone className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getLabelMetodo = (metodo: MetodoPagamento) => {
    const labels: Record<MetodoPagamento, string> = {
      dinheiro: "Dinheiro",
      cartao: "Cartão",
      transferencia: "Transferência",
    };
    return labels[metodo];
  };

  // Calcular valor sugerido para o próximo pagamento
  const getValorSugerido = () => {
    if (totalRestante > 0) {
      return totalRestante.toFixed(2);
    }
    return totalLiquido.toFixed(2);
  };

  /* ================= SALVAR ================= */
  const salvarVenda = async () => {
    // Validação do cliente atualizada
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

    // Validar pagamento se houver
    if (pagamentos.length > 0 && totalRestante > 0) {
      setError(`Falta pagar ${formatarPreco(totalRestante)}`);
      return;
    }

    setLoading(true);
    setError(null);
    setSucesso(null);

    try {
      // 1. Criar a venda com cliente_id ou cliente_nome
      const payload: CriarVendaPayload = {
        cliente_id: modoCliente === 'cadastrado' ? clienteSelecionado!.id : null,
        cliente_nome: modoCliente === 'avulso' ? clienteAvulso.trim() : null,
        tipo_documento: pagamentoCompleto ? "recibo" : "fatura", // recibo se pago, fatura se pendente
        faturar: true,
        itens: itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_venda: Number(item.preco_venda),
          desconto: Number(item.desconto),
        })),
      };

      console.log("Criando venda com payload:", payload);
      const vendaCriada = await criarVenda(payload);
      console.log("Venda criada:", vendaCriada);

      // 2. Se houver pagamentos, registrar no backend
      if (pagamentos.length > 0 && vendaCriada.fatura?.id && user) {
        console.log("Registrando pagamentos...", pagamentos);

        // Como agora só temos 1 pagamento, simplificamos o processo
        const pag = pagamentos[0];
        const trocoCalculado = totalPago > totalLiquido ? totalPago - totalLiquido : 0;

        const pagamentoData: CriarPagamentoInput = {
          user_id: user.id,
          fatura_id: vendaCriada.fatura!.id,
          metodo: pag.metodo,
          valor_pago: pag.valor_pago,
          troco: trocoCalculado,
          referencia: pag.referencia,
          data_pagamento: pag.data_pagamento,
          hora_pagamento: pag.hora_pagamento,
        };

        try {
          console.log("Enviando pagamento:", pagamentoData);
          await pagamentoService.criarPagamento(pagamentoData);
          console.log("Pagamento registrado com sucesso");
          setSucesso("Venda e pagamento registrados com sucesso!");
        } catch (err) {
          console.error("Erro ao registrar pagamento:", err);
          setSucesso("Venda criada, mas o pagamento não foi registrado. Verifique manualmente.");
        }
      } else {
        setSucesso("Venda criada com sucesso!");
      }

      // Redirecionar após breve delay para mostrar mensagem
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

  /* ================= RENDER ================= */
  const produtoSelecionado = produtos.find(p => p.id === formItem.produto_id);

  return (
    <MainEmpresa>
      <div className="p-6 space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-4 ">
          <button
            onClick={() => router.back()}
            className="p-2  hover:bg-gray-100 rounded-full transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-6 h-6 text-[#123859]" />
          </button>
          <h1 className="text-3xl font-bold text-[#F9941F]">Nova Venda</h1>
        </div>

        {error && (
          <div role="alert" className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        {sucesso && (
          <div role="alert" className="bg-green-100 border border-green-400 text-green-700 p-3 rounded">
            {sucesso}
          </div>
        )}

        {/* CLIENTE - ATUALIZADO COM MODO AVULSO */}
        <div className="bg-white p-4 rounded shadow space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-semibold">Cliente</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setModoCliente('cadastrado');
                  setClienteAvulso('');
                  setClienteSelecionado(null);
                }}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  modoCliente === 'cadastrado'
                    ? 'bg-[#123859] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  modoCliente === 'avulso'
                    ? 'bg-[#123859] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Avulso
              </button>
            </div>
          </div>

          {modoCliente === 'cadastrado' ? (
            <div>
              <label htmlFor="cliente" className="text-sm text-gray-600 block mb-1">
                Selecione um cliente cadastrado
              </label>
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
                    {c.nome} {c.nif ? `(${formatarNIF(c.nif)})` : ""} - {getTipoClienteLabel(c.tipo)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="cliente-avulso" className="text-sm text-gray-600 block mb-1">
                Digite o nome do cliente
              </label>
              <input
                id="cliente-avulso"
                type="text"
                placeholder="Nome do cliente"
                className="w-full border p-2 rounded"
                value={clienteAvulso}
                onChange={e => setClienteAvulso(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este cliente não será cadastrado no sistema, apenas o nome será salvo na venda.
              </p>
            </div>
          )}
        </div>

        {/* FORMULÁRIO - ADICIONAR ITEM */}
        <div className="bg-white p-6 rounded shadow border-2 border-[#123859]/20">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="text-[#123859]" size={24} />
            <h2 className="font-bold text-[#123859] text-xl">Adicionar Item</h2>
          </div>

          {/* Alerta de produtos com estoque baixo */}
          {produtosEstoqueBaixo.length > 0 && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-800 mb-2">
                    Produtos com Estoque Baixo ({produtosEstoqueBaixo.length})
                  </h3>
                  <p className="text-sm text-orange-700 mb-2">
                    Os seguintes produtos não estão disponíveis para venda porque o estoque está baixo (≤ {ESTOQUE_MINIMO} unidades):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {produtosEstoqueBaixo.map(p => (
                      <span
                        key={p.id}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800"
                      >
                        {p.nome} ({p.estoque_atual} unid.)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="produto-form" className="font-semibold text-sm">
                Produto
                <span className="text-gray-500 font-normal ml-2">
                  ({produtosDisponiveis.length} disponíveis)
                </span>
              </label>
              <select
                id="produto-form"
                title="Selecionar produto"
                className="w-full border p-3 rounded mt-1"
                value={formItem.produto_id}
                onChange={e => handleProdutoChange(e.target.value)}
              >
                <option value="">
                  {produtosDisponiveis.length === 0
                    ? "Nenhum produto disponível em estoque"
                    : "Selecione um produto"}
                </option>
                {produtosDisponiveis.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.codigo ? `(${p.codigo})` : ""} (Stock: {p.estoque_atual} | {formatarPreco(p.preco_venda)})
                  </option>
                ))}
              </select>
              {produtosDisponiveis.length === 0 && produtos.length > 0 && (
                <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Todos os produtos estão com estoque baixo ou esgotado
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="qtd-form" className="font-semibold text-sm">Quantidade</label>
                <input
                  id="qtd-form"
                  type="number"
                  min={1}
                  max={produtoSelecionado && !isServico(produtoSelecionado) ? produtoSelecionado.estoque_atual : undefined}
                  className="border p-3 rounded w-full mt-1"
                  value={formItem.quantidade}
                  onChange={e => handleQuantidadeChange(Number(e.target.value))}
                  disabled={!formItem.produto_id}
                />
                {produtoSelecionado && !isServico(produtoSelecionado) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Disponível: {produtoSelecionado.estoque_atual}
                    {estaEstoqueBaixo(produtoSelecionado) && (
                      <span className="text-orange-600 ml-1">(Estoque baixo!)</span>
                    )}
                  </p>
                )}
                {produtoSelecionado && isServico(produtoSelecionado) && (
                  <p className="text-xs text-blue-500 mt-1">
                    Serviço - Sem controle de stock
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
                  value={previewItem ? formatarPreco(previewItem.preco_venda) : "-"}
                />
              </div>
            </div>

            {previewItem && (
              <div className="bg-[#123859]/5 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Base:</span>
                  <p className="font-semibold text-[#123859]">
                    {formatarPreco(previewItem.base_tributavel)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">IVA:</span>
                  <p className="font-semibold text-[#123859]">
                    {formatarPreco(previewItem.valor_iva)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Retenção:</span>
                  <p className="font-semibold text-[#123859]">
                    {formatarPreco(previewItem.valor_retencao)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Subtotal:</span>
                  <p className="font-bold text-[#F9941F] text-lg">
                    {formatarPreco(previewItem.subtotal)}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              title="Adicionar ao carrinho"
              aria-label="Adicionar ao carrinho"
              onClick={adicionarAoCarrinho}
              disabled={!formItem.produto_id || produtosDisponiveis.length === 0}
              className="w-full bg-[#123859] hover:bg-[#0d2840] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Adicionar ao Carrinho ({itens.length} itens)
            </button>
          </div>
        </div>

        {/* LISTA DE ITENS */}
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
                      <span>Preço: {formatarPreco(item.preco_venda)}</span>
                      {item.desconto > 0 && (
                        <span className="text-red-600">Desc: -{formatarPreco(item.desconto)}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Base: {formatarPreco(item.base_tributavel)} |
                      IVA: {formatarPreco(item.valor_iva)} |
                      Ret: {formatarPreco(item.valor_retencao)}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="font-bold text-[#F9941F]">
                      {formatarPreco(item.subtotal)}
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

        {/* SEÇÃO DE PAGAMENTO */}
        {mostrarPagamento && itens.length > 0 && (
          <div className="bg-white p-6 rounded shadow border-2 ">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-[#F9941F]" size={24} />
              <h2 className="font-bold text-[#F9941F] text-xl">Pagamento</h2>
              {pagamentoJaAdicionado && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                  ✓ Pago
                </span>
              )}
            </div>

            {/* Resumo do pagamento - ATUALIZADO COM TROCO */}
            <div className="bg-[#F9941F]/5 p-4 rounded-lg mb-4 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-sm text-[#123859]">Total da Venda:</span>
                <p className="font-bold text-[#123859] text-lg">
                  {formatarPreco(totalLiquido)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Pago:</span>
                <p className="font-bold text-[#123859] text-lg">
                  {formatarPreco(totalPago)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Aplicado:</span>
                <p className="font-bold text-[#123859] text-lg">
                  {formatarPreco(totalEfetivo)}
                </p>
              </div>
              {!pagamentoCompleto && !pagamentoJaAdicionado && (
                <div>
                  <span className="text-sm text-gray-600">Restante:</span>
                  <p className="font-bold text-[#F9941F] text-lg">
                    {formatarPreco(totalRestante)}
                  </p>
                </div>
              )}
              {pagamentoExcedente && (
                <div className=" p-2 rounded">
                  <span className="text-sm text-[#123859] font-semibold">TROCO:</span>
                  <p className="font-bold text-[#123859] text-xl">
                    {formatarPreco(troco)}
                  </p>
                </div>
              )}
            </div>

            {/* Formulário de pagamento - DESABILITADO SE JÁ EXISTIR PAGAMENTO */}
            <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 rounded-lg ${pagamentoJaAdicionado ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}>
              <div>
                <label className="text-sm font-semibold text-gray-700">Método</label>
                <select
                  value={formPagamento.metodo}
                  onChange={e => setFormPagamento(prev => ({ ...prev, metodo: e.target.value as MetodoPagamento }))}
                  className="w-full border p-2 rounded mt-1"
                  disabled={pagamentoJaAdicionado}
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Valor (Kz) {!pagamentoJaAdicionado && totalRestante > 0 && <span className="text-[#F9941F]">(Falta: {formatarPreco(totalRestante)})</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={!pagamentoJaAdicionado ? (getValorSugerido() || "0,00") : "Pagamento já registrado"}
                  value={formPagamento.valor_pago}
                  onChange={e => setFormPagamento(prev => ({ ...prev, valor_pago: e.target.value }))}
                  className="w-full border p-2 rounded mt-1"
                  disabled={pagamentoJaAdicionado}
                />
                {!pagamentoJaAdicionado && pagamentoExcedente && (
                  <p className="text-xs text-blue-600 mt-1">
                    Troco: {formatarPreco(troco)}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Referência</label>
                <input
                  type="text"
                  placeholder="Nº comprovativo, etc."
                  value={formPagamento.referencia}
                  onChange={e => setFormPagamento(prev => ({ ...prev, referencia: e.target.value }))}
                  className="w-full border p-2 rounded mt-1"
                  disabled={pagamentoJaAdicionado}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={adicionarPagamento}
                  disabled={!formPagamento.valor_pago || parseFloat(formPagamento.valor_pago) <= 0 || pagamentoJaAdicionado}
                  className="w-full bg-[#123859] hover:bg-[#123859]/80 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {pagamentoJaAdicionado ? (
                    <>
                      <CheckCircle2 size={18} />
                      Pago
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Adicionar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mensagem informativa quando pagamento já existe */}
            {pagamentoJaAdicionado && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>Para alterar o pagamento, remova o atual primeiro.</span>
              </div>
            )}

            {/* Lista de pagamentos */}
            {pagamentos.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="font-semibold text-gray-700 text-sm">Pagamento Registrado:</h3>
                {pagamentos.map((pag, index) => (
                  <div key={pag.id} className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-full ${pag.metodo === "dinheiro" ? "bg-green-100 text-green-700" :
                        pag.metodo === "cartao" ? "bg-blue-100 text-blue-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>
                        {getIconeMetodo(pag.metodo)}
                      </span>
                      <div>
                        <div className="font-medium text-green-900">#{index + 1} - {getLabelMetodo(pag.metodo)}</div>
                        {pag.referencia && <div className="text-xs text-gray-500">Ref: {pag.referencia}</div>}
                        {pag.troco > 0 && <div className="text-xs text-blue-600 font-semibold">Troco: {formatarPreco(pag.troco)}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[#123859]">
                        {formatarPreco(pag.valor_pago)}
                      </span>
                      <button
                        onClick={() => removerPagamento(pag.id)}
                        className="text-[#F9941F] hover:text-[#d9831a] p-1 hover:bg-orange-50 rounded transition-colors"
                        title="Remover pagamento para adicionar outro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status do pagamento */}
            {pagamentoCompleto && (
              <div className="mt-4 p-4  text-[#123859] rounded-lg flex items-center gap-3">
                <CheckCircle2 size={24} />
                <div>
                  <p className="font-semibold">Pagamento Completo!</p>
                  {troco > 0 ? (
                    <p className="text-sm">Troco a devolver: <strong>{formatarPreco(troco)}</strong></p>
                  ) : (
                    <p className="text-sm">A venda será registrada</p>
                  )}
                </div>
              </div>
            )}

            {pagamentoParcial && (
              <div className="mt-4 p-4 bg-orange-100 text-orange-700 rounded-lg flex items-center gap-3">
                <Calculator size={24} />
                <div>
                  <p className="font-semibold">Pagamento Parcial</p>
                  <p className="text-sm">Falta pagar: <strong>{formatarPreco(totalRestante)}</strong></p>
                  <p className="text-xs mt-1">A venda será registrada como Fatura (FT) - pendente de pagamento</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOTAIS FINAIS */}
        <div className="bg-[#123859] text-white p-6 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-4 text-lg">Resumo da Venda</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-300">Total Base:</span>
              <p className="font-bold text-xl">{formatarPreco(totalBase)}</p>
            </div>
            <div>
              <span className="text-gray-300">Total IVA:</span>
              <p className="font-bold text-xl">{formatarPreco(totalIva)}</p>
            </div>
            <div>
              <span className="text-gray-300">Retenção:</span>
              <p className="font-bold text-xl">{formatarPreco(totalRetencao)}</p>
            </div>
            <div>
              <span className="text-[#F9941F]">TOTAL LÍQUIDO:</span>
              <p className="font-bold text-2xl text-[#F9941F]">
                {formatarPreco(totalLiquido)}
              </p>
            </div>
          </div>

          {/* Resumo do pagamento no footer */}
          {pagamentos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-gray-300">Total Pago:</span>
                <p className="font-bold text-[#F9941F]">{formatarPreco(totalPago)}</p>
              </div>
              {troco > 0 && (
                <div>
                  <span className="text-gray-300">Troco:</span>
                  <p className="font-bold text-[#F9941F]">{formatarPreco(troco)}</p>
                </div>
              )}
              {totalRestante > 0 && (
                <div>
                  <span className="text-gray-300">Pendente:</span>
                  <p className="font-bold text-[#F9941F]">{formatarPreco(totalRestante)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          title="Salvar venda"
          aria-label="Salvar venda"
          onClick={salvarVenda}
          disabled={loading || itens.length === 0}
          className="w-full bg-[#F9941F] hover:bg-[#d9831a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded font-bold text-lg shadow-lg transition-colors"
        >
          {loading ? "Salvando..." : `Finalizar Venda ${pagamentos.length > 0 ? `(Pago)` : ''}`}
        </button>
      </div>
    </MainEmpresa>
  );
}