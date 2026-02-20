"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, CheckCircle2, Calculator, ArrowLeft, AlertTriangle, User, Package, FileText } from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";

// Serviços atualizados - IMPORTAÇÕES ATUALIZADAS
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
  TipoDocumentoFiscal,
  NOMES_TIPO_DOCUMENTO,
  getNomeTipoDocumento,
  DadosPagamento,
  // NOVO: Função de validação atualizada
  validarPayloadVenda,
} from "@/services/vendas";

/* ================= CONSTANTES ================= */
const ESTOQUE_MINIMO = 5;

// ATUALIZADO: Tipos de documento válidos para venda (conforme backend)
const TIPOS_DOCUMENTO_VENDA_ATUALIZADOS: TipoDocumentoFiscal[] = ['FT', 'FR'];

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

  // Estado para tipo de documento fiscal - ATUALIZADO: Default FT
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFiscal>('FT');

  // Estado para cliente avulso
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

  // Estado de pagamento - SIMPLIFICADO
  const [formPagamento, setFormPagamento] = useState({
    metodo: "dinheiro" as DadosPagamento['metodo'],
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
    const maxQuantidade = isServico(produto) ? Infinity : produto.estoque_atual;
    const quantidade = Math.min(formItem.quantidade, maxQuantidade);
    const desconto = formItem.desconto;

    const base = preco_venda * quantidade - desconto;
    const taxaIva = produto.taxa_iva ?? 14;
    const valorIva = (base * taxaIva) / 100;
    // ATUALIZADO: Retenção de 6.5% para serviços (conforme backend), não 10%
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

    // ATUALIZADO: Removida validação de pro-forma (PF/PFA não existem mais)
    // Agora valida estoque para todos os produtos físicos
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
  };

  const removerItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id));
  };

  /* ================= TOTAIS ================= */
  const totalBase = itens.reduce((acc, i) => acc + i.base_tributavel, 0);
  const totalIva = itens.reduce((acc, i) => acc + i.valor_iva, 0);
  const totalRetencao = itens.reduce((acc, i) => acc + i.valor_retencao, 0);
  const totalLiquido = totalBase + totalIva - totalRetencao;

  /* ================= VALIDAÇÃO DE PAGAMENTO ================= */
  const valorPagamento = parseFloat(formPagamento.valor_pago) || 0;
  const troco = Math.max(0, valorPagamento - totalLiquido);

  // ATUALIZADO: Apenas FT e FR são válidos agora
  const ehFaturaRecibo = tipoDocumento === 'FR';
  const ehFaturaNormal = tipoDocumento === 'FT';

  let pagamentoValido: boolean;
  if (ehFaturaRecibo) {
    // Fatura-Recibo: pagamento deve ser exatamente igual ao total (não pode ter troco)
    pagamentoValido = valorPagamento === totalLiquido && totalLiquido > 0;
  } else {
    // Fatura normal: pode ter troco
    pagamentoValido = valorPagamento >= totalLiquido && totalLiquido > 0;
  }

  /* ================= SALVAR VENDA COM PAGAMENTO ================= */
  const finalizarVenda = async () => {
    // Validações
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

    if (!pagamentoValido) {
      if (ehFaturaRecibo) {
        setError(`Fatura-Recibo exige pagamento exato de ${formatarPreco(totalLiquido)}. Troco não é permitido.`);
      } else {
        setError(`Valor de pagamento inválido. O valor deve ser maior ou igual a ${formatarPreco(totalLiquido)}`);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setSucesso(null);

    try {
      // ATUALIZADO: Payload simplificado - apenas FT e FR
      const payload: CriarVendaPayload = {
        cliente_id: modoCliente === 'cadastrado' ? clienteSelecionado!.id : null,
        cliente_nome: modoCliente === 'avulso' ? clienteAvulso.trim() : undefined,
        tipo_documento: tipoDocumento,
        faturar: true, // Sempre true agora (não há pro-forma)
        itens: itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_venda: Number(item.preco_venda),
          desconto: Number(item.desconto),
        })),
      };

      // Obrigatório para FR
      if (tipoDocumento === 'FR') {
        payload.dados_pagamento = {
          metodo: formPagamento.metodo,
          valor: totalLiquido,
          referencia: formPagamento.referencia || undefined,
        };
      }

      // NOVO: Validação prévia do payload
      const erroValidacao = validarPayloadVenda(payload);
      if (erroValidacao) {
        setError(erroValidacao);
        setLoading(false);
        return;
      }

      console.log("Criando venda com payload:", payload);
      const vendaCriada = await criarVenda(payload);
      console.log("Venda criada:", vendaCriada);

      if (!vendaCriada) {
        throw new Error("Erro ao criar venda - resposta vazia");
      }

      setSucesso(ehFaturaRecibo
        ? "Fatura-Recibo criada com sucesso! Pagamento registrado automaticamente."
        : "Fatura criada com sucesso!"
      );

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

  /* ================= HELPERS ================= */
  const getIconeMetodo = (metodo: DadosPagamento['metodo']) => {
    switch (metodo) {
      case "dinheiro": return <Banknote className="w-4 h-4" />;
      case "cartao": return <CreditCard className="w-4 h-4" />;
      case "transferencia": return <Smartphone className="w-4 h-4" />;
      case "multibanco": return <Smartphone className="w-4 h-4" />;
      case "cheque": return <FileText className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getLabelMetodo = (metodo: DadosPagamento['metodo']) => {
    const labels: Record<DadosPagamento['metodo'], string> = {
      dinheiro: "Dinheiro",
      cartao: "Cartão",
      transferencia: "Transferência",
      multibanco: "Multibanco",
      cheque: "Cheque",
    };
    return labels[metodo];
  };

  const produtoSelecionado = produtos.find(p => p.id === formItem.produto_id);

  // Verifica se deve mostrar seção de pagamento
  const mostrarPagamento = itens.length > 0;

  return (
    <MainEmpresa>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-[#123859]" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-[#F9941F]">Nova Venda</h1>
        </div>

        {/* Alertas */}
        {error && (
          <div role="alert" className="bg-red-100 border border-red-400 text-red-700 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {sucesso && (
          <div role="alert" className="bg-green-100 border border-green-400 text-green-700 p-3 rounded text-sm">
            {sucesso}
          </div>
        )}

        {/* Alerta de estoque baixo - ATUALIZADO: Sempre aparece se houver produtos com estoque baixo */}
        {produtosEstoqueBaixo.length > 0 && (
          <div className="p-3 md:p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2 md:gap-3">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <h3 className="font-semibold text-orange-800 mb-1">
                  Produtos com Estoque Baixo ({produtosEstoqueBaixo.length})
                </h3>
                <p className="text-orange-700 mb-2 text-xs md:text-sm">
                  Os seguintes produtos têm estoque limitado (≤ {ESTOQUE_MINIMO} unidades):
                </p>
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {produtosEstoqueBaixo.map(p => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800"
                    >
                      {p.nome} ({p.estoque_atual})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FORMULÁRIO UNIFICADO - Layout Responsivo Otimizado */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow border-2 border-[#123859]/20">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <ShoppingCart className="text-[#123859]" size={20} />
            <h2 className="font-bold text-[#123859] text-lg md:text-xl">Dados da Venda</h2>
          </div>

          {/* ✅ LAYOUT RESPONSIVO: 1 coluna mobile, 2 colunas tablet, 3 colunas desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">

            {/* COLUNA 1 - Tipo de Documento */}
            <div className="space-y-4 md:space-y-6">
              {/* SEÇÃO TIPO DE DOCUMENTO - ATUALIZADA */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg border border-blue-200 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[#123859]" />
                  <h3 className="font-semibold text-[#123859] text-sm">Tipo de Documento</h3>
                </div>

                <select
                  id="tipo-documento"
                  title="Selecionar tipo de documento fiscal"
                  className="w-full border border-blue-300 p-2.5 rounded text-sm bg-white font-medium text-[#123859]"
                  value={tipoDocumento}
                  onChange={e => {
                    const novoTipo = e.target.value as TipoDocumentoFiscal;
                    setTipoDocumento(novoTipo);
                    // Limpar itens ao mudar tipo para evitar inconsistências
                    setItens([]);
                    setFormItem({
                      produto_id: "",
                      quantidade: 1,
                      desconto: 0,
                    });
                    setPreviewItem(null);
                    // Resetar pagamento ao mudar tipo
                    setFormPagamento({
                      metodo: "dinheiro",
                      valor_pago: "",
                      referencia: "",
                    });
                  }}
                >
                  {/* ATUALIZADO: Apenas FT e FR */}
                  {TIPOS_DOCUMENTO_VENDA_ATUALIZADOS.map(tipo => (
                    <option key={tipo} value={tipo}>
                      {tipo} - {NOMES_TIPO_DOCUMENTO[tipo]}
                    </option>
                  ))}
                </select>

                {ehFaturaNormal && (
                  <p className="text-xs text-gray-600 mt-2">
                    Fatura (FT): Documento fiscal válido. O pagamento pode ser feito posteriormente via recibo.
                  </p>
                )}

                {ehFaturaRecibo && (
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    ✅ Fatura-Recibo (FR): Pagamento imediato obrigatório. O sistema registra automaticamente o recibo.
                  </p>
                )}
              </div>
            </div>

            {/* COLUNA 2 - Cliente */}
            <div className="space-y-4 md:space-y-6">
              {/* SEÇÃO CLIENTE */}
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg border border-gray-200 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-[#123859]" />
                  <h3 className="font-semibold text-[#123859] text-sm">Cliente</h3>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setModoCliente('cadastrado');
                      setClienteAvulso('');
                      setClienteSelecionado(null);
                    }}
                    className={`flex-1 px-3 py-2 text-xs md:text-sm rounded transition-colors ${modoCliente === 'cadastrado'
                      ? 'bg-[#123859] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
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
                    className={`flex-1 px-3 py-2 text-xs md:text-sm rounded transition-colors ${modoCliente === 'avulso'
                      ? 'bg-[#123859] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    Avulso
                  </button>
                </div>

                {modoCliente === 'cadastrado' ? (
                  <select
                    id="cliente"
                    title="Selecionar cliente"
                    className="w-full border border-gray-300 p-2.5 rounded text-sm"
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
                ) : (
                  <div>
                    <input
                      id="cliente-avulso"
                      type="text"
                      placeholder="Nome do cliente"
                      className="w-full border border-gray-300 p-2.5 rounded text-sm"
                      value={clienteAvulso}
                      onChange={e => setClienteAvulso(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA 3 - Produto */}
            <div className="space-y-4 md:space-y-6 md:col-span-2 xl:col-span-1">
              {/* SEÇÃO PRODUTO */}
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg border border-gray-200 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-[#123859]" />
                  <h3 className="font-semibold text-[#123859] text-sm">Produto</h3>
                </div>

                <div className="space-y-3">
                  <select
                    id="produto-form"
                    title="Selecionar produto"
                    className="w-full border border-gray-300 p-2.5 rounded text-sm"
                    value={formItem.produto_id}
                    onChange={e => handleProdutoChange(e.target.value)}
                  >
                    <option value="">
                      {produtosDisponiveis.length === 0
                        ? "Nenhum produto disponível"
                        : "Selecione um produto"}
                    </option>
                    {/* ATUALIZADO: Mostrar todos os produtos ativos com estoque */}
                    {produtos.filter(p => p.status === 'ativo').map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} {p.codigo ? `(${p.codigo})` : ""} - {formatarPreco(p.preco_venda)}
                        {!isServico(p) && ` (Disp: ${p.estoque_atual})`}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Qtd</label>
                      <input
                        type="number"
                        min={1}
                        max={produtoSelecionado && !isServico(produtoSelecionado) ? produtoSelecionado.estoque_atual : undefined}
                        className="border border-gray-300 p-2 rounded w-full text-sm"
                        value={formItem.quantidade}
                        onChange={e => handleQuantidadeChange(Number(e.target.value))}
                        disabled={!formItem.produto_id}
                      />
                      {produtoSelecionado && !isServico(produtoSelecionado) && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Disp: {produtoSelecionado.estoque_atual}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Desconto (Kz)</label>
                      <input
                        type="number"
                        min={0}
                        className="border border-gray-300 p-2 rounded w-full text-sm"
                        value={formItem.desconto}
                        onChange={e => setFormItem(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                        disabled={!formItem.produto_id}
                      />
                    </div>
                  </div>

                  {previewItem && (
                    <div className="bg-[#123859]/5 p-3 rounded text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base:</span>
                        <span className="font-semibold text-[#123859]">{formatarPreco(previewItem.base_tributavel)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IVA:</span>
                        <span className="font-semibold text-[#123859]">{formatarPreco(previewItem.valor_iva)}</span>
                      </div>
                      {previewItem.valor_retencao > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Retenção (6.5%):</span>
                          <span className="font-semibold text-red-600">-{formatarPreco(previewItem.valor_retencao)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#123859]/20 pt-1 mt-1">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-bold text-[#F9941F]">{formatarPreco(previewItem.subtotal)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={adicionarAoCarrinho}
                    disabled={!formItem.produto_id}
                    className="w-full bg-[#123859] hover:bg-[#0d2840] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Adicionar ({itens.length})
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ SEÇÃO PAGAMENTO - Ocupa largura total em mobile, metade em tablet, 1/3 em desktop */}
            {mostrarPagamento && (
              <div className="md:col-span-2 xl:col-span-1">
                <div className="bg-[#F9941F]/5 p-3 md:p-4 rounded-lg border border-[#F9941F]/20 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-[#F9941F]" />
                    <h3 className="font-semibold text-[#F9941F] text-sm">
                      Pagamento {ehFaturaRecibo && <span className="text-xs font-normal">(Obrigatório)</span>}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Método</label>
                      <select
                        value={formPagamento.metodo}
                        onChange={e => setFormPagamento(prev => ({ ...prev, metodo: e.target.value as DadosPagamento['metodo'] }))}
                        className="w-full border border-gray-300 p-2.5 rounded text-sm bg-white"
                      >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao">Cartão</option>
                        <option value="transferencia">Transferência</option>
                        <option value="multibanco">Multibanco</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        Valor Pago (Kz) {ehFaturaRecibo && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        min={totalLiquido}
                        step="0.01"
                        placeholder={ehFaturaRecibo ? `Exato: ${formatarPreco(totalLiquido)}` : `Mínimo: ${formatarPreco(totalLiquido)}`}
                        value={formPagamento.valor_pago}
                        onChange={e => setFormPagamento(prev => ({ ...prev, valor_pago: e.target.value }))}
                        className={`w-full border p-2.5 rounded text-sm ${valorPagamento > 0 && valorPagamento < totalLiquido
                          ? 'border-red-400 bg-red-50'
                          : valorPagamento === totalLiquido && totalLiquido > 0
                            ? 'border-green-400 bg-green-50'
                            : valorPagamento > totalLiquido && !ehFaturaRecibo
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-300'
                          }`}
                      />
                      {valorPagamento > 0 && valorPagamento < totalLiquido && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Valor insuficiente! Mínimo: {formatarPreco(totalLiquido)}
                        </p>
                      )}
                      {valorPagamento === totalLiquido && totalLiquido > 0 && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          {ehFaturaRecibo ? "Pagamento exato para Fatura-Recibo" : "Pagamento completo"}
                        </p>
                      )}
                      {ehFaturaRecibo && valorPagamento > totalLiquido && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Fatura-Recibo não permite troco. Ajuste o valor.
                        </p>
                      )}
                      {!ehFaturaRecibo && valorPagamento > totalLiquido && (
                        <p className="text-xs text-blue-600 mt-1">
                          Troco: {formatarPreco(troco)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Referência (opcional)</label>
                      <input
                        type="text"
                        placeholder="Nº comprovativo"
                        value={formPagamento.referencia}
                        onChange={e => setFormPagamento(prev => ({ ...prev, referencia: e.target.value }))}
                        className="w-full border border-gray-300 p-2.5 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ RESUMO DA VENDA */}
            {itens.length > 0 && (
              <div className={`${mostrarPagamento ? 'md:col-span-2 xl:col-span-1' : 'md:col-span-2 xl:col-span-3'}`}>
                <div className="bg-[#123859] text-white p-3 md:p-4 rounded-lg h-full">
                  <h3 className="font-semibold mb-3 text-sm border-b border-white/20 pb-2">
                    Resumo - {getNomeTipoDocumento(tipoDocumento)}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Base Tributável:</span>
                      <span className="font-semibold">{formatarPreco(totalBase)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">IVA (14%):</span>
                      <span className="font-semibold">{formatarPreco(totalIva)}</span>
                    </div>
                    {totalRetencao > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Retenção (6.5%):</span>
                        <span className="font-semibold text-red-300">-{formatarPreco(totalRetencao)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-white/20 pt-2 mt-2">
                      <span className="text-[#F9941F] font-bold">TOTAL A PAGAR:</span>
                      <span className="font-bold text-[#F9941F] text-lg">{formatarPreco(totalLiquido)}</span>
                    </div>

                    {ehFaturaRecibo && (
                      <div className="mt-3 pt-2 border-t border-white/10">
                        <p className="text-xs text-green-300 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Pagamento será registrado automaticamente
                        </p>
                      </div>
                    )}

                    {ehFaturaNormal && (
                      <div className="mt-3 pt-2 border-t border-white/10">
                        <p className="text-xs text-blue-300">
                          Fatura pendente de pagamento. Gere recibo após receber.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LISTA DE ITENS - Layout responsivo */}
        {itens.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {itens.map((item) => (
                <div key={item.id} className="border p-3 rounded flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#123859] text-sm truncate">{item.descricao}</div>
                    <div className="text-xs text-gray-600">
                      {item.quantidade}x {formatarPreco(item.preco_venda)}
                      {item.desconto > 0 && (
                        <span className="text-red-600 ml-2">- {formatarPreco(item.desconto)}</span>
                      )}
                      {item.valor_retencao > 0 && (
                        <span className="text-orange-600 ml-2">(Ret: {formatarPreco(item.valor_retencao)})</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3 ml-2">
                    <div className="font-bold text-[#F9941F] text-sm">
                      {formatarPreco(item.subtotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removerItem(item.id)}
                      className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOTÃO FINALIZAR VENDA - Responsivo */}
        <button
          type="button"
          onClick={finalizarVenda}
          disabled={loading || itens.length === 0 || !pagamentoValido}
          className="w-full bg-[#F9941F] hover:bg-[#d9831a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            "Processando..."
          ) : itens.length === 0 ? (
            "Adicione itens para finalizar"
          ) : !pagamentoValido ? (
            ehFaturaRecibo 
              ? `Informe pagamento exato de ${formatarPreco(totalLiquido)}`
              : `Informe pagamento válido (mín. ${formatarPreco(totalLiquido)})`
          ) : ehFaturaRecibo ? (
            <>
              <CheckCircle2 size={20} />
              Finalizar Fatura-Recibo
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              Finalizar Fatura {troco > 0 && `(Troco: ${formatarPreco(troco)})`}
            </>
          )}
        </button>
      </div>
    </MainEmpresa>
  );
}