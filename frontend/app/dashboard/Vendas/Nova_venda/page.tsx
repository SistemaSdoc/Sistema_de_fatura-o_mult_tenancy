"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { 
  Plus, Trash2, ShoppingCart, CreditCard, Banknote, 
  Smartphone, CheckCircle2, Calculator, ArrowLeft, 
  AlertTriangle, User, Package, FileText, Info 
} from "lucide-react";
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
  TipoDocumentoFiscal,
  NOMES_TIPO_DOCUMENTO,
  getNomeTipoDocumento,
  DadosPagamento,
  validarPayloadVenda,
  TIPOS_VENDA,
} from "@/services/vendas";

/* ================= CONSTANTES ================= */
const ESTOQUE_MINIMO = 5;

// Tipos de documento válidos para venda
const TIPOS_DOCUMENTO_VENDA_ATUALIZADOS: TipoDocumentoFiscal[] = ['FT', 'FR', 'FP'];

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
  taxa_iva?: number;
  codigo_produto?: string;
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

  // Estado para tipo de documento fiscal - PADRÃO: FR (Fatura-Recibo)
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFiscal>('FR');

  // Estado para cliente avulso
  const [modoCliente, setModoCliente] = useState<ModoCliente>('cadastrado');
  const [clienteAvulso, setClienteAvulso] = useState('');
  const [clienteAvulsoNif, setClienteAvulsoNif] = useState(''); // NIF para cliente avulso (opcional)

  // Estado do formulário de item
  const [formItem, setFormItem] = useState<FormItemState>({
    produto_id: "",
    quantidade: 1,
    desconto: 0,
  });

  // Preview do cálculo
  const [previewItem, setPreviewItem] = useState<ItemVendaUI | null>(null);

  // Estado de pagamento - APENAS PARA FATURA-RECIBO
  const [formPagamento, setFormPagamento] = useState({
    metodo: "dinheiro" as DadosPagamento['metodo'],
    valor_pago: "",
    referencia: "",
    data_pagamento: new Date().toISOString().split('T')[0],
  });

  // Observações da venda
  const [observacoes, setObservacoes] = useState('');

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

    if (!isServico(produto) && formItem.quantidade > produto.estoque_atual) {
      setError(`Estoque insuficiente. Disponível: ${produto.estoque_atual}`);
      return;
    }

    // Verificar se já existe o mesmo produto (opcional - pode querer permitir duplicados)
    const itemExistente = itens.find(i => i.produto_id === formItem.produto_id);
    if (itemExistente) {
      if (!confirm("Este produto já foi adicionado. Deseja adicionar outra unidade?")) {
        return;
      }
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

  const limparCarrinho = () => {
    if (itens.length > 0 && confirm("Tem certeza que deseja limpar todos os itens?")) {
      setItens([]);
    }
  };

  /* ================= TOTAIS ================= */
  const totalBase = itens.reduce((acc, i) => acc + i.base_tributavel, 0);
  const totalIva = itens.reduce((acc, i) => acc + i.valor_iva, 0);
  const totalRetencao = itens.reduce((acc, i) => acc + i.valor_retencao, 0);
  const totalLiquido = totalBase + totalIva - totalRetencao;

  /* ================= VALIDAÇÃO DE PAGAMENTO ================= */
  const valorPagamento = parseFloat(formPagamento.valor_pago) || 0;
  const troco = Math.max(0, valorPagamento - totalLiquido);

  const ehFaturaRecibo = tipoDocumento === 'FR';
  const ehFaturaNormal = tipoDocumento === 'FT';
  const ehFaturaProforma = tipoDocumento === 'FP';

  let pagamentoValido: boolean;
  if (ehFaturaRecibo) {
    // Fatura-Recibo: pagamento deve ser exatamente igual ao total
    pagamentoValido = valorPagamento === totalLiquido && totalLiquido > 0;
  } else {
    // Fatura normal e Proforma: não precisam de pagamento
    pagamentoValido = true;
  }

  // Verifica se deve mostrar seção de pagamento (apenas para Fatura-Recibo)
  const mostrarPagamento = itens.length > 0 && ehFaturaRecibo;

  /* ================= VALIDAÇÕES GLOBAIS ================= */
  const podeFinalizar = (): boolean => {
    if (itens.length === 0) return false;
    
    if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
    if (modoCliente === 'avulso' && !clienteAvulso.trim()) return false;
    
    if (ehFaturaRecibo && !pagamentoValido) return false;
    
    return true;
  };

  /* ================= SALVAR VENDA ================= */
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

    if (ehFaturaRecibo && !pagamentoValido) {
      setError(`Fatura-Recibo exige pagamento exato de ${formatarPreco(totalLiquido)}. Troco não é permitido.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSucesso(null);

    try {
      // Construir payload
      const payload: CriarVendaPayload = {
        itens: itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: Number(item.quantidade),
          preco_venda: Number(item.preco_venda),
          desconto: Number(item.desconto),
        })),
        tipo_documento: tipoDocumento,
        faturar: tipoDocumento !== 'FP', // false para FP, true para FT/FR
      };

      // Adicionar dados do cliente conforme o modo
      if (modoCliente === 'cadastrado' && clienteSelecionado) {
        payload.cliente_id = clienteSelecionado.id;
      } else if (modoCliente === 'avulso' && clienteAvulso.trim()) {
        payload.cliente_nome = clienteAvulso.trim();
        if (clienteAvulsoNif.trim()) {
          payload.cliente_nif = clienteAvulsoNif.trim();
        }
      }

      // Dados de pagamento apenas para FR
      if (tipoDocumento === 'FR') {
        payload.dados_pagamento = {
          metodo: formPagamento.metodo,
          valor: totalLiquido,
          referencia: formPagamento.referencia || undefined,
          data: formPagamento.data_pagamento,
        };
      }

      // Observações
      if (observacoes.trim()) {
        payload.observacoes = observacoes.trim();
      }

      console.log("Payload a ser enviado:", JSON.stringify(payload, null, 2));

      // Validação prévia do payload
      const erroValidacao = validarPayloadVenda(payload);
      if (erroValidacao) {
        setError(erroValidacao);
        setLoading(false);
        return;
      }

      const vendaCriada = await criarVenda(payload);
      console.log("Venda criada:", vendaCriada);

      if (!vendaCriada) {
        throw new Error("Erro ao criar venda - resposta vazia");
      }

      let mensagemSucesso = "";
      if (tipoDocumento === 'FR') {
        mensagemSucesso = "Fatura-Recibo criada com sucesso! Pagamento registrado automaticamente.";
      } else if (tipoDocumento === 'FP') {
        mensagemSucesso = "Fatura Proforma criada com sucesso! Aguardando pagamento.";
      } else {
        mensagemSucesso = "Fatura criada com sucesso!";
      }

      setSucesso(mensagemSucesso);

      // Redirecionar após 1.5 segundos
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
            <h1 className="text-2xl md:text-3xl font-bold text-[#F9941F]">Nova Venda</h1>
          </div>
          
          {/* Badge do tipo de documento */}
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            ehFaturaRecibo ? 'bg-green-100 text-green-800' :
            ehFaturaNormal ? 'bg-blue-100 text-blue-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {getNomeTipoDocumento(tipoDocumento)}
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

        {/* TABELA PRINCIPAL - DADOS DA VENDA */}
        <div className="bg-white rounded-lg shadow border-2 border-[#123859]/20 overflow-hidden">
          <div className="bg-[#123859] text-white px-4 py-2 flex items-center gap-2">
            <ShoppingCart size={18} />
            <h2 className="font-bold text-sm">DADOS DA VENDA</h2>
          </div>

          <table className="w-full border-collapse">
            <tbody>
              {/* Linha 1: Tipo de Documento */}
              <tr className="border-b border-gray-200">
                <td className="p-3 bg-gray-50 font-semibold text-[#123859] text-sm w-1/4 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>Tipo Documento</span>
                  </div>
                </td>
                <td className="p-3 w-3/4">
                  <select
                    className="w-full max-w-xs border border-gray-300 p-2 rounded text-sm bg-white"
                    value={tipoDocumento}
                    onChange={e => {
                      const novoTipo = e.target.value as TipoDocumentoFiscal;
                      setTipoDocumento(novoTipo);
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
                        data_pagamento: new Date().toISOString().split('T')[0],
                      });
                    }}
                  >
                    {TIPOS_DOCUMENTO_VENDA_ATUALIZADOS.map(tipo => (
                      <option key={tipo} value={tipo}>
                        {tipo} - {NOMES_TIPO_DOCUMENTO[tipo] || tipo}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Info size={12} />
                    {ehFaturaRecibo && "Pagamento obrigatório no ato da venda"}
                    {ehFaturaNormal && "Fatura - Pagamento pode ser posterior via recibo"}
                    {ehFaturaProforma && "Proforma - Documento pré-formal, não faturado"}
                  </div>
                </td>
              </tr>

              {/* Linha 2: Cliente */}
              <tr className="border-b border-gray-200">
                <td className="p-3 bg-gray-50 font-semibold text-[#123859] text-sm border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    <span>Cliente</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModoCliente('cadastrado');
                        setClienteAvulso('');
                        setClienteAvulsoNif('');
                        setClienteSelecionado(null);
                      }}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        modoCliente === 'cadastrado'
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
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        modoCliente === 'avulso'
                          ? 'bg-[#123859] text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Não cadastrado
                    </button>
                  </div>

                  {modoCliente === 'cadastrado' ? (
                    <select
                      className="w-full max-w-md border border-gray-300 p-2 rounded text-sm"
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
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nome do cliente *"
                        className="w-full max-w-md border border-gray-300 p-2 rounded text-sm"
                        value={clienteAvulso}
                        onChange={e => setClienteAvulso(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="NIF (opcional)"
                        className="w-full max-w-md border border-gray-300 p-2 rounded text-sm"
                        value={clienteAvulsoNif}
                        onChange={e => setClienteAvulsoNif(e.target.value)}
                      />
                    </div>
                  )}
                </td>
              </tr>

              {/* Linha 3: Produto */}
              <tr className="border-b border-gray-200">
                <td className="p-3 bg-gray-50 font-semibold text-[#123859] text-sm border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    <span>Produto</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2">
                      <select
                        className="w-full border border-gray-300 p-2 rounded text-sm"
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
                    </div>

                    <div>
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
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          Disp: {produtoSelecionado.estoque_atual}
                        </div>
                      )}
                    </div>

                    <div>
                      <input
                        type="number"
                        min={0}
                        placeholder="Desc. (Kz)"
                        className="w-full border border-gray-300 p-2 rounded text-sm"
                        value={formItem.desconto}
                        onChange={e => setFormItem(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                        disabled={!formItem.produto_id}
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={adicionarAoCarrinho}
                        disabled={!formItem.produto_id}
                        className="w-full bg-[#123859] hover:bg-[#0d2840] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded font-semibold flex items-center justify-center gap-1 text-sm"
                      >
                        <Plus size={16} />
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Preview do item */}
                  {previewItem && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs grid grid-cols-5 gap-2 border border-gray-200">
                      <div><span className="text-gray-500">Base:</span> {formatarPreco(previewItem.base_tributavel)}</div>
                      <div><span className="text-gray-500">IVA:</span> {formatarPreco(previewItem.valor_iva)}</div>
                      {previewItem.valor_retencao > 0 && (
                        <div><span className="text-gray-500">Ret.:</span> -{formatarPreco(previewItem.valor_retencao)}</div>
                      )}
                      <div><span className="text-gray-500">Subtotal:</span> <span className="font-bold text-[#F9941F]">{formatarPreco(previewItem.subtotal)}</span></div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">Itens: {itens.length}</span>
                      </div>
                    </div>
                  )}
                </td>
              </tr>

              {/* Linha 4: Pagamento (apenas para Fatura-Recibo) */}
              {mostrarPagamento && (
                <tr className="border-b border-gray-200">
                  <td className="p-3 bg-gray-50 font-semibold text-[#F9941F] text-sm border-r border-gray-200">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} />
                      <span>Pagamento</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <select
                          value={formPagamento.metodo}
                          onChange={e => setFormPagamento(prev => ({ ...prev, metodo: e.target.value as DadosPagamento['metodo'] }))}
                          className="w-full border border-gray-300 p-2 rounded text-sm bg-white"
                        >
                          <option value="dinheiro">Dinheiro</option>
                          <option value="cartao">Cartão</option>
                          <option value="transferencia">Transferência</option>
                          <option value="multibanco">Multibanco</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          min={totalLiquido}
                          step="0.01"
                          placeholder={`Valor (${formatarPreco(totalLiquido)})`}
                          value={formPagamento.valor_pago}
                          onChange={e => setFormPagamento(prev => ({ ...prev, valor_pago: e.target.value }))}
                          className={`w-full border p-2 rounded text-sm ${
                            valorPagamento > 0 && valorPagamento < totalLiquido
                              ? 'border-red-400 bg-red-50'
                              : valorPagamento === totalLiquido && totalLiquido > 0
                                ? 'border-green-400 bg-green-50'
                                : valorPagamento > totalLiquido
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-300'
                          }`}
                        />
                      </div>

                      <div>
                        <input
                          type="date"
                          className="w-full border border-gray-300 p-2 rounded text-sm"
                          value={formPagamento.data_pagamento}
                          onChange={e => setFormPagamento(prev => ({ ...prev, data_pagamento: e.target.value }))}
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Referência"
                          value={formPagamento.referencia}
                          onChange={e => setFormPagamento(prev => ({ ...prev, referencia: e.target.value }))}
                          className="w-full border border-gray-300 p-2 rounded text-sm"
                        />
                      </div>
                    </div>

                    {valorPagamento > 0 && valorPagamento < totalLiquido && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Insuficiente! Mínimo: {formatarPreco(totalLiquido)}
                      </p>
                    )}
                    {valorPagamento === totalLiquido && totalLiquido > 0 && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Pagamento exato
                      </p>
                    )}
                    {valorPagamento > totalLiquido && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        FR não permite troco. Ajuste o valor.
                      </p>
                    )}
                  </td>
                </tr>
              )}

              {/* Linha 5: Observações (opcional) */}
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

        {/* TABELA DE ITENS ADICIONADOS */}
        {itens.length > 0 && (
          <div className="bg-white rounded-lg shadow border-2 border-[#123859]/20 overflow-hidden">
            <div className="bg-[#123859] text-white px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} />
                <h2 className="font-bold text-sm">ITENS DA VENDA ({itens.length})</h2>
              </div>
              <button
                onClick={limparCarrinho}
                className="text-xs bg-[#F9941F]  text-white px-2 py-1 rounded transition-colors"
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

        {/* TABELA DE RESUMO */}
        {itens.length > 0 && (
          <div className="bg-white rounded-lg shadow border-2 border-[#123859]/20 overflow-hidden">
            <div className="bg-[#123859] text-white px-4 py-2 flex items-center gap-2">
              <Calculator size={18} />
              <h2 className="font-bold text-sm">RESUMO - {getNomeTipoDocumento(tipoDocumento)}</h2>
            </div>

            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-3 bg-gray-50 font-medium text-gray-600 w-1/3">Base Tributável</td>
                  <td className="p-3 font-semibold">{formatarPreco(totalBase)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-3 bg-gray-50 font-medium text-gray-600">IVA ({((totalIva / totalBase) * 100).toFixed(1)}%)</td>
                  <td className="p-3 font-semibold">{formatarPreco(totalIva)}</td>
                </tr>
                {totalRetencao > 0 && (
                  <tr className="border-b border-gray-200">
                    <td className="p-3 bg-gray-50 font-medium text-gray-600">Retenção (6.5%)</td>
                    <td className="p-3 font-semibold text-red-600">-{formatarPreco(totalRetencao)}</td>
                  </tr>
                )}
                <tr className="bg-[#123859] text-white">
                  <td className="p-3 font-bold">TOTAL A PAGAR</td>
                  <td className="p-3 font-bold text-[#F9941F] text-lg">{formatarPreco(totalLiquido)}</td>
                </tr>
                {ehFaturaRecibo && (
                  <tr>
                    <td colSpan={2} className="p-2 text-xs text-green-600 bg-green-50 flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      Pagamento será registrado automaticamente
                    </td>
                  </tr>
                )}
                {ehFaturaNormal && (
                  <tr>
                    <td colSpan={2} className="p-2 text-xs text-blue-600 bg-blue-50 flex items-center gap-1">
                      <Info size={14} />
                      Fatura pendente de pagamento. Gere recibo após receber.
                    </td>
                  </tr>
                )}
                {ehFaturaProforma && (
                  <tr>
                    <td colSpan={2} className="p-2 text-xs text-purple-600 bg-purple-50 flex items-center gap-1">
                      <FileText size={14} />
                      Fatura Proforma - Documento prévio, não faturado.
                    </td>
                  </tr>
                )}
                {modoCliente === 'avulso' && (
                  <tr>
                    <td colSpan={2} className="p-2 text-xs text-gray-600 bg-gray-50">
                      Cliente Avulso: {clienteAvulso} {clienteAvulsoNif && `(NIF: ${clienteAvulsoNif})`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* BOTÃO FINALIZAR VENDA */}
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
          ) : itens.length === 0 ? (
            "Adicione itens para finalizar"
          ) : ehFaturaRecibo && !pagamentoValido ? (
            `Informe pagamento exato de ${formatarPreco(totalLiquido)}`
          ) : ehFaturaRecibo ? (
            <>
              <CheckCircle2 size={20} />
              Finalizar
            </>
          ) : ehFaturaProforma ? (
            <>
              <FileText size={20} />
              Finalizar
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              Finalizar
            </>
          )}
        </button>

        {/* Informações adicionais */}
        <div className="text-xs text-gray-500 text-center">
          <p>
            {ehFaturaRecibo && "✓ Fatura-Recibo: Pagamento registrado automaticamente"}
            {ehFaturaNormal && "📄 Fatura: Pode gerar recibo posteriormente"}
            {ehFaturaProforma && "📋 Proforma: Documento não fiscal, pode ser convertido em fatura"}
          </p>
        </div>
      </div>
    </MainEmpresa>
  );
}