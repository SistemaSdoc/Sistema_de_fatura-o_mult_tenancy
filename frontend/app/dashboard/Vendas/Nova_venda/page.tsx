'use client';

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ShoppingCart, CreditCard, CheckCircle2, Calculator, ArrowLeft,
  AlertTriangle, User, Package, FileText, Minus, Bug
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";

import {
  vendaService,
  Produto,
  Cliente,
  clienteService,
  produtoService,
  CriarVendaPayload,
  formatarNIF,
  isServico,
  formatarPreco,
  DadosPagamento,
  validarPayloadVenda,
  TipoDocumentoFiscal,
} from "@/services/vendas";

const ESTOQUE_MINIMO = 5;

// Interface do item com campos completos de retenção
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
  subtotal: number;           // base + iva - retencao
  taxa_iva?: number;
  taxa_retencao?: number;     // Taxa percentual de retenção (6.5 para serviços)
  codigo_produto?: string;
  eh_servico: boolean;        // Flag para identificar serviço
}

interface FormItemState {
  produto_id: string;
  quantidade: number;
  desconto: number;
}

type ModoCliente = 'cadastrado' | 'avulso';

// Função auxiliar para arredondar para 2 casas decimais
const arredondar = (valor: number): number => {
  return Math.round(valor * 100) / 100;
};

export default function NovaFaturaReciboPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const colors = useThemeColors();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<ItemVendaUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const [modoCliente, setModoCliente] = useState<ModoCliente>('cadastrado');
  const [clienteAvulso, setClienteAvulso] = useState('');
  const [clienteAvulsoNif, setClienteAvulsoNif] = useState('');

  const [formItem, setFormItem] = useState<FormItemState>({
    produto_id: "",
    quantidade: 1,
    desconto: 0,
  });

  const [previewItem, setPreviewItem] = useState<ItemVendaUI | null>(null);

  const [formPagamento, setFormPagamento] = useState({
    metodo: "dinheiro" as DadosPagamento['metodo'],
    valor_pago: "",
    referencia: "",
    data_pagamento: new Date().toISOString().split('T')[0],
  });

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
          clienteService.listar({ status: 'ativo' }),
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

  // Cálculo do preview com arredondamento em cada etapa
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

    const taxaRetencao = ehServico ? 6.5 : 0;
    const valorRetencao = ehServico ? arredondar((baseTributavel * taxaRetencao) / 100) : 0;

    const subtotal = arredondar(baseTributavel + valorIva - valorRetencao);

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
      subtotal: subtotal,
      taxa_iva: taxaIva,
      taxa_retencao: taxaRetencao,
      codigo_produto: produto.codigo || undefined,
      eh_servico: ehServico,
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

  // Função para preencher automaticamente o valor do pagamento
  const preencherValorPagamento = () => {
    setFormPagamento(prev => ({
      ...prev,
      valor_pago: totalLiquido.toString()
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
    const taxaRetencao = ehServico ? 6.5 : 0;
    const valorRetencao = ehServico ? arredondar((baseTributavel * taxaRetencao) / 100) : 0;
    const subtotal = arredondar(baseTributavel + valorIva - valorRetencao);

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
      subtotal,
      taxa_iva: taxaIva,
      taxa_retencao: taxaRetencao,
      codigo_produto: produto.codigo || undefined,
      eh_servico: ehServico,
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
        formItem.desconto,
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
  };

  const removerItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id));
  };

  const limparCarrinho = () => {
    if (itens.length > 0 && confirm("Tem certeza que deseja limpar todos os itens?")) {
      setItens([]);
      setFormPagamento(prev => ({ ...prev, valor_pago: "" }));
    }
  };

  // Totais calculados com arredondamento
  const totalBase = arredondar(itens.reduce((acc, i) => acc + i.base_tributavel, 0));
  const totalIva = arredondar(itens.reduce((acc, i) => acc + i.valor_iva, 0));
  const totalRetencao = arredondar(itens.reduce((acc, i) => acc + i.valor_retencao, 0));
  const totalLiquido = arredondar(itens.reduce((acc, i) => acc + i.subtotal, 0));

  const valorPagamento = parseFloat(formPagamento.valor_pago) || 0;

  // ✅ CÁLCULO DO TROCO - Só existe quando valor pago > total
  const troco = valorPagamento > totalLiquido ? arredondar(valorPagamento - totalLiquido) : 0;

  // ✅ VALIDAÇÃO: Pagamento deve ser MAIOR OU IGUAL ao total (para interface)
  // Mas para o backend FR, enviaremos o valor exato do total
  const pagamentoSuficiente = valorPagamento >= totalLiquido && totalLiquido > 0;

  const percentualIva = totalBase > 0 ? ((totalIva / totalBase) * 100).toFixed(1) : "0.0";

  const mostrarPagamento = itens.length > 0;

  const podeFinalizar = (): boolean => {
    if (itens.length === 0) return false;
    if (modoCliente === 'cadastrado' && !clienteSelecionado) return false;
    if (modoCliente === 'avulso' && !clienteAvulso.trim()) return false;
    if (!pagamentoSuficiente) return false;
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

    const totalVenda = totalLiquido;
    const valorPagoNumerico = arredondar(parseFloat(formPagamento.valor_pago) || 0);

    // ✅ IMPORTANTE: Para Fatura-Recibo (FR), o backend exige valor exato do total
    // O troco é apenas informativo na interface até o backend ser ajustado
    const valorParaBackend = valorPagoNumerico > totalVenda ? totalVenda : valorPagoNumerico;

    const debugData = {
      totalCalculado: totalVenda,
      valorPagoInput: valorPagoNumerico,
      valorEnviadoBackend: valorParaBackend,
      trocoCalculado: troco,
      // ✅ Só inclui troco no debug se existir
      ...(troco > 0 && { troco }),
      itens: itens.map(i => ({
        nome: i.descricao,
        qtd: i.quantidade,
        preco: i.preco_venda,
        base: i.base_tributavel,
        iva: i.valor_iva,
        retencao: i.valor_retencao,
        subtotal: i.subtotal,
        eh_servico: i.eh_servico
      }))
    };

    console.log('[DEBUG] Cálculos da venda:', debugData);
    setDebugInfo(JSON.stringify(debugData, null, 2));

    if (!pagamentoSuficiente) {
      setError(`Valor insuficiente! Total: ${formatarPreco(totalVenda)}, Pago: ${formatarPreco(valorPagoNumerico)}`);
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
          taxa_retencao: item.eh_servico ? item.taxa_retencao : undefined,
        })),
        tipo_documento: 'FR' as TipoDocumentoFiscal,
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

      payload.dados_pagamento = {
        metodo: formPagamento.metodo,
        valor: valorParaBackend, // ✅ Envia o valor exato do total (ou menor, nunca maior)
        referencia: formPagamento.referencia || undefined,
        data: formPagamento.data_pagamento,
      };

      if (observacoes.trim()) {
        payload.observacoes = observacoes.trim();
      }

      const erroValidacao = validarPayloadVenda(payload);
      if (erroValidacao) {
        setError(erroValidacao);
        setLoading(false);
        return;
      }

      console.log('========== ENVIANDO PARA BACKEND ==========');
      console.log('Payload completo:', JSON.stringify(payload, null, 2));

      const vendaCriada = await vendaService.criar(payload);

      if (!vendaCriada) {
        throw new Error("Erro ao criar venda - resposta vazia");
      }

      // ✅ Mensagem de sucesso com troco (se existir)
      const mensagemTroco = troco > 0 ? ` Troco: ${formatarPreco(troco)}` : '';
      setSucesso(`Fatura-Recibo criada com sucesso!${mensagemTroco}`);

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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full max-w-full transition-colors duration-300" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              style={{ color: colors.primary }}
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: colors.secondary }}>Fatura-Recibo</h1>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="border p-3 rounded text-sm flex items-center gap-2" style={{
            backgroundColor: colors.danger + '20',
            borderColor: colors.danger,
            color: colors.danger
          }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {sucesso && (
          <div className="border p-3 rounded text-sm flex items-center gap-2" style={{
            backgroundColor: colors.success + '20',
            borderColor: colors.success,
            color: colors.success
          }}>
            <CheckCircle2 size={18} />
            <span>{sucesso}</span>
          </div>
        )}

        {/* DEBUG INFO */}
        {debugInfo && (
          <div className="p-3 rounded text-xs font-mono overflow-auto max-h-40" style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: '#4ade80'
          }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: colors.secondary }}>
              <Bug size={14} />
              <span className="font-bold">DEBUG INFO (para desenvolvimento)</span>
            </div>
            <pre>{debugInfo}</pre>
          </div>
        )}

        {/* Alerta de estoque baixo */}
        {produtosEstoqueBaixo.length > 0 && (
          <div className="p-3 rounded-lg" style={{
            backgroundColor: colors.warning + '20',
            borderColor: colors.warning,
            borderWidth: 1
          }}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.warning }} />
              <div className="text-xs">
                <h3 className="font-semibold mb-1" style={{ color: colors.warning }}>
                  Produtos com Estoque Baixo ({produtosEstoqueBaixo.length})
                </h3>
                <div className="flex flex-wrap gap-1">
                  {produtosEstoqueBaixo.map(p => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: colors.warning + '20',
                        color: colors.warning
                      }}
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
        <div className="rounded-lg shadow border overflow-hidden" style={{
          backgroundColor: colors.card,
          borderColor: colors.border
        }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{
            backgroundColor: colors.primary,
            color: 'white'
          }}>
            <ShoppingCart size={18} />
            <h2 className="font-bold text-sm">DADOS DA VENDA</h2>
          </div>

          <table className="w-full border-collapse">
            <tbody>
              {/* Linha 1: Cliente */}
              <tr className="border-b" style={{ borderColor: colors.border }}>
                <td className="p-3 font-semibold text-sm border-r" style={{
                  backgroundColor: colors.hover,
                  color: colors.primary,
                  borderColor: colors.border,
                  width: '160px'
                }}>
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
                        style={{
                          backgroundColor: modoCliente === 'cadastrado' ? colors.primary : 'transparent',
                          color: modoCliente === 'cadastrado' ? 'white' : colors.textSecondary,
                          borderColor: colors.border
                        }}
                        className={`px-2 py-1 text-xs rounded border transition-colors`}
                      >
                        Cadastrado
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModoCliente('avulso');
                          setClienteSelecionado(null);
                        }}
                        style={{
                          backgroundColor: modoCliente === 'avulso' ? colors.primary : 'transparent',
                          color: modoCliente === 'avulso' ? 'white' : colors.textSecondary,
                          borderColor: colors.border
                        }}
                        className={`px-2 py-1 text-xs rounded border transition-colors`}
                      >
                        Não cadastrado
                      </button>
                    </div>

                    {/* Cliente cadastrado */}
                    {modoCliente === 'cadastrado' && (
                      <select
                        className="w-72 p-2 rounded text-sm"
                        style={{
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          color: colors.text,
                          borderWidth: 1
                        }}
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
                          className="w-60 p-2 rounded text-sm"
                          style={{
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            color: colors.text,
                            borderWidth: 1
                          }}
                          value={clienteAvulso}
                          onChange={e => setClienteAvulso(e.target.value)}
                          required
                        />

                        <input
                          type="text"
                          placeholder="NIF"
                          className="w-40 p-2 rounded text-sm"
                          style={{
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            color: colors.text,
                            borderWidth: 1
                          }}
                          value={clienteAvulsoNif}
                          onChange={e => setClienteAvulsoNif(e.target.value)}
                        />
                      </>
                    )}

                  </div>
                </td>
              </tr>

              {/* Linha 2: Produto */}
              <tr className="border-b" style={{ borderColor: colors.border }}>
                <td className="p-3 font-semibold text-sm border-r" style={{
                  backgroundColor: colors.hover,
                  color: colors.primary,
                  borderColor: colors.border
                }}>
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    <span>Produto</span>
                  </div>
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-3 flex-wrap">

                    {/* Produto */}
                    <select
                      className="w-64 p-2 rounded text-sm"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                        borderWidth: 1
                      }}
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
                          {isServico(p) && p.retencao ? ` (Ret: ${p.retencao}%)` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Quantidade */}
                    <div className="relative w-20">
                      <input
                        type="number"
                        min={1}
                        placeholder="Qtd"
                        className="w-full p-2 rounded text-sm"
                        style={{
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          color: colors.text,
                          borderWidth: 1
                        }}
                        value={formItem.quantidade}
                        onChange={e => handleQuantidadeChange(Number(e.target.value))}
                        disabled={!formItem.produto_id}
                      />
                      {produtoSelecionado && !isServico(produtoSelecionado) && (
                        <div className="absolute -bottom-4 left-0 text-[10px]" style={{ color: colors.textSecondary }}>
                          Disp: {produtoSelecionado.estoque_atual}
                        </div>
                      )}
                    </div>

                    {/* Desconto */}
                    <input
                      type="number"
                      min={0}
                      placeholder="Desc. (Kz)"
                      className="w-28 p-2 rounded text-sm"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                        borderWidth: 1
                      }}
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
                      className="text-white px-4 py-2 rounded font-semibold flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: colors.primary,
                        opacity: !formItem.produto_id ? 0.5 : 1
                      }}
                    >
                      <Plus size={16} />
                      Adicionar
                    </button>
                  </div>

                  {/* Preview do item */}
                  {previewItem && (
                    <div className="mt-4 p-2 rounded text-xs flex gap-6 border flex-wrap" style={{
                      backgroundColor: colors.hover,
                      borderColor: colors.border
                    }}>
                      <div><span style={{ color: colors.textSecondary }}>Base:</span> {formatarPreco(previewItem.base_tributavel)}</div>
                      <div><span style={{ color: colors.textSecondary }}>IVA ({previewItem.taxa_iva}%):</span> {formatarPreco(previewItem.valor_iva)}</div>
                      {previewItem.valor_retencao > 0 && (
                        <div><span style={{ color: colors.textSecondary }}>Ret. ({previewItem.taxa_retencao}%):</span> -{formatarPreco(previewItem.valor_retencao)}</div>
                      )}
                      <div>
                        <span style={{ color: colors.textSecondary }}>Subtotal:</span>{" "}
                        <span className="font-bold" style={{ color: colors.secondary }}>
                          {formatarPreco(previewItem.subtotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </td>
              </tr>

              {/* Linha 3: Observações */}
              <tr className="border-b" style={{ borderColor: colors.border }}>
                <td className="p-3 font-semibold text-sm border-r" style={{
                  backgroundColor: colors.hover,
                  color: colors.primary,
                  borderColor: colors.border
                }}>
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>Observações</span>
                  </div>
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    placeholder="Observações adicionais (opcional)"
                    className="w-full p-2 rounded text-sm"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: 1
                    }}
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
          <div className="rounded-lg shadow border overflow-hidden" style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}>
            <div className="px-4 py-2 flex items-center justify-between" style={{
              backgroundColor: colors.primary,
              color: 'white'
            }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} />
                <h2 className="font-bold text-sm">ITENS DA FATURA</h2>
              </div>
              <button
                onClick={limparCarrinho}
                className="text-xs text-white px-2 py-1 rounded transition-colors"
                style={{ backgroundColor: colors.secondary }}
              >
                Limpar Itens
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ backgroundColor: colors.hover }}>
                    <th className="p-2 text-left font-semibold" style={{ color: colors.primary }}>Produto</th>
                    <th className="p-2 text-center font-semibold" style={{ color: colors.primary }}>Qtd</th>
                    <th className="p-2 text-right font-semibold" style={{ color: colors.primary }}>Preço</th>
                    <th className="p-2 text-right font-semibold" style={{ color: colors.primary }}>Desc.</th>
                    <th className="p-2 text-right font-semibold" style={{ color: colors.primary }}>Base</th>
                    <th className="p-2 text-right font-semibold" style={{ color: colors.primary }}>IVA</th>
                    <th className="p-2 text-right font-semibold" style={{ color: colors.primary }}>Ret.</th>
                    <th className="p-2 text-right font-semibold" style={{ color: colors.primary }}>Subtotal</th>
                    <th className="p-2 text-center font-semibold" style={{ color: colors.primary }}></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const produto = produtos.find(p => p.id === item.produto_id);
                    const maxEstoque = produto && !isServico(produto) ? produto.estoque_atual : Infinity;

                    return (
                      <tr key={item.id} className="border-t" style={{ borderColor: colors.border }}>
                        <td className="p-2 font-medium" style={{ color: colors.primary }}>{item.descricao}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => atualizarQuantidadeItem(item.id, item.quantidade - 1)}
                              className="p-1 rounded"
                              style={{ color: colors.primary }}
                              disabled={item.quantidade <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center" style={{ color: colors.text }}>{item.quantidade}</span>
                            <button
                              onClick={() => atualizarQuantidadeItem(item.id, item.quantidade + 1)}
                              className="p-1 rounded"
                              style={{ color: colors.primary }}
                              disabled={item.quantidade >= maxEstoque}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="p-2 text-right" style={{ color: colors.text }}>{formatarPreco(item.preco_venda)}</td>
                        <td className="p-2 text-right" style={{ color: colors.danger }}>{item.desconto > 0 ? formatarPreco(item.desconto) : '-'}</td>
                        <td className="p-2 text-right" style={{ color: colors.text }}>{formatarPreco(item.base_tributavel)}</td>
                        <td className="p-2 text-right" style={{ color: colors.text }}>{formatarPreco(item.valor_iva)}</td>
                        <td className="p-2 text-right" style={{ color: colors.secondary }}>
                          {item.valor_retencao > 0 ? `-${formatarPreco(item.valor_retencao)}` : '-'}
                        </td>
                        <td className="p-2 text-right font-bold" style={{ color: colors.secondary }}>{formatarPreco(item.subtotal)}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removerItem(item.id)}
                            className="p-1 rounded transition-colors"
                            style={{ color: colors.secondary }}
                            title="Remover item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Linha de Pagamento */}
        {mostrarPagamento && (
          <div className="rounded-lg shadow border overflow-hidden" style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}>
            <div className="px-4 py-2 flex items-center justify-between" style={{
              backgroundColor: colors.primary,
              color: 'white'
            }}>
              <div className="flex items-center gap-2">
                <CreditCard size={18} />
                <h2 className="font-bold text-sm">PAGAMENTO</h2>
              </div>
              <button
                onClick={preencherValorPagamento}
                className="text-xs text-white px-2 py-1 rounded transition-colors"
                style={{ backgroundColor: colors.secondary }}
                title="Preencher com o valor total"
              >
                Preencher Total
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>Método</label>
                  <select
                    value={formPagamento.metodo}
                    onChange={e => setFormPagamento(prev => ({ ...prev, metodo: e.target.value as DadosPagamento['metodo'] }))}
                    className="w-full p-2 rounded text-sm"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: 1
                    }}
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="multibanco">Multibanco</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>
                    Valor Pago <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={formatarPreco(totalLiquido)}
                    value={formPagamento.valor_pago}
                    onChange={e => setFormPagamento(prev => ({ ...prev, valor_pago: e.target.value }))}
                    style={{
                      backgroundColor: colors.card,
                      borderColor: valorPagamento > 0 && valorPagamento < totalLiquido
                        ? colors.danger
                        : valorPagamento >= totalLiquido && totalLiquido > 0
                          ? colors.success
                          : colors.border,
                      color: colors.text,
                      borderWidth: 1
                    }}
                    className={`w-full p-2 rounded text-sm`}
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>Data</label>
                  <input
                    type="date"
                    className="w-full p-2 rounded text-sm"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: 1
                    }}
                    value={formPagamento.data_pagamento}
                    onChange={e => setFormPagamento(prev => ({ ...prev, data_pagamento: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: colors.textSecondary }}>Referência</label>
                  <input
                    type="text"
                    placeholder="Referência (opcional)"
                    value={formPagamento.referencia}
                    onChange={e => setFormPagamento(prev => ({ ...prev, referencia: e.target.value }))}
                    className="w-full p-2 rounded text-sm"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                      borderWidth: 1
                    }}
                  />
                </div>
              </div>

              {valorPagamento > 0 && valorPagamento < totalLiquido && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: colors.danger }}>
                  <AlertTriangle size={12} />
                  Valor insuficiente! Faltam {formatarPreco(totalLiquido - valorPagamento)}
                </p>
              )}

              {/* ✅ EXIBIÇÃO DO TROCO - Só aparece quando existe */}
              {troco > 0 && (
                <div className="mt-2 p-2 border rounded" style={{
                  backgroundColor: colors.success + '20',
                  borderColor: colors.success
                }}>
                  <p className="text-sm font-bold flex items-center gap-1" style={{ color: colors.success }}>
                    <CheckCircle2 size={16} />
                    Troco a devolver: {formatarPreco(troco)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    Nota: O backend atualmente não aceita troco. Enviando valor exato do total.
                  </p>
                </div>
              )}

              {valorPagamento >= totalLiquido && totalLiquido > 0 && troco === 0 && (
                <div className="mt-2 p-2 border rounded" style={{
                  backgroundColor: colors.success + '20',
                  borderColor: colors.success
                }}>
                  <p className="text-xs flex items-center gap-1" style={{ color: colors.success }}>
                    <CheckCircle2 size={12} />
                    Pagamento exato - OK
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESUMO */}
        {itens.length > 0 && (
          <div className="rounded-lg shadow border overflow-hidden" style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{
              backgroundColor: colors.primary,
              color: 'white'
            }}>
              <Calculator size={18} />
              <h2 className="font-bold text-sm">RESUMO - FATURA-RECIBO</h2>
            </div>

            <table className="w-full text-center border-collapse">
              <tbody>
                {/* Linha 1 – Componentes */}
                <tr style={{ backgroundColor: colors.hover }}>
                  <td className="p-2" style={{ color: colors.textSecondary }}>Base Tributável</td>
                  <td className="p-2" style={{ color: colors.textSecondary }}>IVA ({percentualIva}%)</td>
                  <td className="p-2" style={{ color: colors.textSecondary }}>Retenção</td>
                  <td className="p-2" style={{ color: colors.textSecondary }}>Total Líquido</td>
                </tr>

                {/* Linha 2 – Valores */}
                <tr className="border-b font-semibold" style={{ borderColor: colors.border }}>
                  <td className="p-2" style={{ color: colors.text }}>{formatarPreco(totalBase)}</td>
                  <td className="p-2" style={{ color: colors.text }}>{formatarPreco(totalIva)}</td>
                  <td className="p-2" style={{ color: colors.text }}>-{formatarPreco(totalRetencao)}</td>
                  <td className="p-2 font-bold" style={{ color: colors.secondary }}>{formatarPreco(totalLiquido)}</td>
                </tr>

                {/* Linha 3 – Info */}
                <tr style={{ backgroundColor: colors.hover }}>
                  <td colSpan={4} className="p-2 text-xs" style={{ color: colors.textSecondary }}>
                    {itens.some(i => i.eh_servico) && (
                      <span>Inclui serviços com retenção de 6.5% | </span>
                    )}
                    <strong style={{ color: colors.primary }}>Total a pagar: {formatarPreco(totalLiquido)}</strong>
                    {/* ✅ TROCO NO RESUMO - Só aparece quando existe */}
                    {troco > 0 && (
                      <span className="ml-2" style={{ color: colors.success }}>
                        | Troco: {formatarPreco(troco)}
                      </span>
                    )}
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
          className="w-full py-3 rounded-lg font-bold text-base shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: colors.secondary,
            color: 'white'
          }}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processando...
            </>
          ) : itens.length === 0 ? (
            "Adicione itens para finalizar"
          ) : !pagamentoSuficiente ? (
            `Valor insuficiente: ${formatarPreco(valorPagamento)} de ${formatarPreco(totalLiquido)}`
          ) : troco > 0 ? (
            <>
              <CheckCircle2 size={20} />
              Finalizar com troco de {formatarPreco(troco)}
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              Finalizar Fatura-Recibo
            </>
          )}
        </button>
      </div>
    </MainEmpresa>
  );
}