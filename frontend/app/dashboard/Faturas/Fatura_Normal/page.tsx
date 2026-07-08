"use client";

import React, { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ShoppingCart,
  FileText,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  User,
  Package,
  Minus,
  Search,
  X,
  Building2,
  Hash,
  Globe,
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../../components/MainEmpresa";
import { useAuth, getIncompleteEmpresaFields, formatIncompleteFields } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import { criarVenda, Produto, produtoService, CriarVendaPayload, isServico, formatarPreco, validarPayloadVenda } from "@/services/vendas";
import { ModalDadosIncompletos } from "../../../components/ModalDadosIncompletos";

import { clienteService, formatarNIF, type Cliente } from "@/services/clientes";

const ESTOQUE_MINIMO = 5;
const arredondar = (v: number) => Math.round(v * 100) / 100;

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
type ModoCliente = "cadastrado" | "avulso";
type TipoItem = "produto" | "servico";

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

// --- Componente de Notificacao Toast ---
interface ToastNotificationProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  colors: ThemeColors;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type, onClose, colors }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={24} style={{ color: colors.success }} />;
      case "error":
        return <AlertTriangle size={24} style={{ color: colors.danger }} />;
      case "warning":
        return <AlertTriangle size={24} style={{ color: colors.warning }} />;
      case "info":
        return <CheckCircle2 size={24} style={{ color: colors.primary }} />;
      default:
        return <CheckCircle2 size={24} style={{ color: colors.success }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return colors.success;
      case "error":
        return colors.danger;
      case "warning":
        return colors.warning;
      case "info":
        return colors.primary;
      default:
        return colors.success;
    }
  };

  return (
    <div
      className="fixed top-6 right-6 z-50 max-w-md animate-slide-in-right"
      style={{
        backgroundColor: colors.card,
        borderLeft: `4px solid ${getBorderColor()}`,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
      }}>
      <div className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {message}
          </p>
        </div>
        <button onClick={onClose} className="flex-shrink-0 transition-opacity hover:opacity-70" style={{ color: colors.textSecondary }}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

function LinhaFiscal({
  label,
  valor,
  cor,
  negrito,
  colors,
}: {
  label: string;
  valor: string;
  cor?: string;
  negrito?: boolean;
  colors: ThemeColors;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={`text-sm ${negrito ? "font-semibold" : ""}`} style={{ color: negrito ? colors.text : colors.textSecondary }}>
        {label}
      </span>
      <span
        className={`text-sm tabular-nums ${negrito ? "font-bold" : "font-medium"}`}
        style={{ color: cor || (negrito ? colors.text : colors.textSecondary) }}>
        {valor}
      </span>
    </div>
  );
}

export default function NovaFaturaNormalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const colors = useThemeColors();

  const inp = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    color: colors.text,
    borderWidth: 1,
    fontSize: "14px",
  };

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<ItemVendaUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);
  const [modoCliente, setModoCliente] = useState<ModoCliente>("cadastrado");
  const [clienteAvulso, setClienteAvulso] = useState("");
  const [clienteAvulsoNif, setClienteAvulsoNif] = useState("");
  const [nifError, setNifError] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<FormItemState>({
    produto_id: "",
    quantidade: 1,
    desconto: 0,
  });
  const [previewItem, setPreviewItem] = useState<ItemVendaUI | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [modalDadosIncompletosOpen, setModalDadosIncompletosOpen] = useState(false);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);

  // ✅ Estados para dados bancários
  const [nomeBanco, setNomeBanco] = useState("");
  const [iban, setIban] = useState("");
  const [numeroConta, setNumeroConta] = useState("");

  // Estados para o novo componente de busca
  const [tipoItemSelecionado, setTipoItemSelecionado] = useState<TipoItem>("produto");
  const [buscaItem, setBuscaItem] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const buscaInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setToast({ message, type });
  };

  const bloquearSeDadosIncompletos = () => {
    const missingFields = getIncompleteEmpresaFields(user?.empresa);

    if (missingFields.length === 0) return false;

    const camposFormatados = missingFields.map((field) => {
      const labels: Record<string, string> = {
        nif: "NIF",
        telefone: "Telefone",
        endereco: "Endereço",
        regime_fiscal: "Regime Fiscal",
        nome_banco: "Nome do Banco",
        numero_conta: "Número da Conta",
        iban: "IBAN",
        logo: "Logo",
      };
      return labels[field] || field;
    });

    setCamposFaltantes(camposFormatados);
    setModalDadosIncompletosOpen(true);
    return true;
  };

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  // ✅ Carregar dados iniciais e dados bancários da empresa
  useEffect(() => {
    if (!user) return;

    // Carregar dados bancários da empresa
    if (user.empresa) {
      setNomeBanco(user.empresa.nome_banco || "");
      setIban(user.empresa.iban || "");
      setNumeroConta(user.empresa.numero_conta || "");
    }

    const carregarDados = async () => {
      try {
        // 1. Carregar clientes
        const clientesResponse = await clienteService.listar({
          status: "ativo",
          per_page: 12,
        });

        const clientesData = clientesResponse.data || [];
        setClientes(clientesData);

        // 2. Carregar produtos
        const produtosData = await produtoService
          .listar({ status: "ativo", paginar: false })
          .then((r) => (Array.isArray(r.produtos) ? r.produtos : []));
        setProdutos(produtosData);

        // 3. Verificar estoque baixo
        const fisicos = produtosData.filter((p) => !isServico(p));
        const estoqueBaixo = fisicos.filter((p) => p.estoque_atual > 0 && p.estoque_atual <= ESTOQUE_MINIMO);
        setProdutosEstoqueBaixo(estoqueBaixo);

        if (estoqueBaixo.length > 0) {
          showToast(`${estoqueBaixo.length} produtos com estoque baixo`, "warning");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        showToast("Erro ao carregar dados iniciais", "error");
      }
    };

    carregarDados();
  }, [user]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // CORRIGIDO: Preview com taxa de retencao dinamica
  useEffect(() => {
    if (!formItem.produto_id) {
      setPreviewItem(null);
      return;
    }
    const p = produtos.find((x) => x.id === formItem.produto_id);
    if (!p) {
      setPreviewItem(null);
      return;
    }
    const ehServico = isServico(p);
    const qtd = Math.min(formItem.quantidade, ehServico ? 12 : p.estoque_atual);
    const base = arredondar(arredondar(p.preco_venda * qtd) - formItem.desconto);
    const taxaIva = p.taxa_iva ?? 0;
    const iva = arredondar((base * taxaIva) / 100);

    const taxaRetencao = ehServico ? p.taxa_retencao || 0 : 0;
    const ret = ehServico ? arredondar((base * taxaRetencao) / 100) : 0;

    setPreviewItem({
      id: "preview",
      produto_id: p.id,
      descricao: p.nome,
      quantidade: qtd,
      preco_venda: p.preco_venda,
      desconto: formItem.desconto,
      base_tributavel: base,
      valor_iva: iva,
      valor_retencao: ret,
      subtotal: arredondar(base + iva - ret),
      taxa_iva: taxaIva,
      codigo_produto: p.codigo || undefined,
    });
  }, [formItem, produtos]);

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    const clean = value.replace(/[^A-Z0-9]/g, "");

    if (clean.length <= 14) {
      setClienteAvulsoNif(clean);

      if (clean.length > 0 && clean.length < 10) {
        setNifError("NIF/BI demasiado curto (minimo 10 caracteres)");
      } else if (clean.length > 10 && clean.length < 14) {
        setNifError("BI deve ter 14 caracteres (9 numeros + 2 letras + 3 numeros)");
      } else {
        setNifError(null);
      }
    }
  };

  // Filtrar itens baseado no tipo selecionado e na busca
  const itensFiltrados = produtos.filter((p) => {
    if (p.status !== "ativo") return false;
    if (tipoItemSelecionado === "produto" && p.tipo !== "produto") return false;
    if (tipoItemSelecionado === "servico" && p.tipo !== "servico") return false;
    if (buscaItem.trim() === "") return true;
    const buscaLower = buscaItem.toLowerCase();
    return p.nome.toLowerCase().includes(buscaLower) || (p.codigo && p.codigo.toLowerCase().includes(buscaLower));
  });

  // FUNCAO PARA ADICIONAR ITEM AUTOMATICAMENTE AO CARRINHO
  const adicionarItemAutomaticamente = (produto: Produto, quantidade: number = 1) => {
    const idx = itens.findIndex((i) => i.produto_id === produto.id);

    if (idx >= 0) {
      const novaQtd = itens[idx].quantidade + quantidade;
      if (!isServico(produto) && novaQtd > produto.estoque_atual) {
        showToast(`Estoque insuficiente para ${novaQtd} unidades de ${produto.nome}.`, "error");
        return;
      }
      setItens((prev) => prev.map((it, i) => (i === idx ? calcularItem(produto, novaQtd, it.desconto, it.id) : it)));
      showToast(` ${produto.nome} adicionado (quantidade: ${novaQtd})`, "success");
    } else {
      setItens((prev) => [...prev, calcularItem(produto, quantidade, 0)]);
      showToast(`${produto.nome} adicionado ao carrinho`, "success");
    }

    setBuscaItem("");
    setFormItem({
      produto_id: "",
      quantidade: 1,
      desconto: 0,
    });
    setPreviewItem(null);
    setDropdownAberto(false);
  };

  // FUNCAO PARA BUSCAR PRODUTO POR CODIGO
  const buscarProdutoPorCodigo = (codigo: string) => {
    if (!codigo.trim()) return null;

    let produto = produtos.find((p) => p.codigo === codigo.trim());

    if (!produto) {
      produto = produtos.find((p) => p.codigo?.includes(codigo.trim()));
    }

    return produto;
  };

  // HANDLER PARA SELECIONAR ITEM DO DROPDOWN
  const handleSelectItem = (produto: Produto) => {
    const qtd = produto.tipo === "produto" ? Math.min(1, produto.estoque_atual) : 1;
    adicionarItemAutomaticamente(produto, qtd);
  };

  // MANIPULADOR PARA PRESSIONAR ENTER NO CAMPO DE BUSCA
  const handleBuscaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const codigoBusca = buscaItem.trim();
      if (!codigoBusca) return;

      const produto = buscarProdutoPorCodigo(codigoBusca);

      if (produto) {
        const qtd = produto.tipo === "produto" ? Math.min(1, produto.estoque_atual) : 1;
        adicionarItemAutomaticamente(produto, qtd);
      } else {
        showToast(`Produto com codigo "${codigoBusca}" nao encontrado`, "error");
      }
    }
  };

  // CORRIGIDO: calcularItem com taxa de retencao dinamica
  const calcularItem = (p: Produto, qtd: number, desc: number, id = uuidv4()): ItemVendaUI => {
    const ehServico = isServico(p);
    const base = arredondar(arredondar(p.preco_venda * qtd) - desc);
    const taxaIva = p.taxa_iva ?? 0;
    const iva = arredondar((base * taxaIva) / 100);

    const taxaRetencao = ehServico ? p.taxa_retencao || 0 : 0;
    const ret = ehServico ? arredondar((base * taxaRetencao) / 100) : 0;

    return {
      id,
      produto_id: p.id,
      descricao: p.nome,
      quantidade: qtd,
      preco_venda: p.preco_venda,
      desconto: desc,
      base_tributavel: base,
      valor_iva: iva,
      valor_retencao: ret,
      subtotal: arredondar(base + iva - ret),
      taxa_iva: taxaIva,
      codigo_produto: p.codigo || undefined,
    };
  };

  const adicionarItem = () => {
    if (!formItem.produto_id || !previewItem) {
      showToast("Selecione um produto/servico", "error");
      return;
    }
    const p = produtos.find((x) => x.id === formItem.produto_id);
    if (!p) return;
    if (!isServico(p) && formItem.quantidade > p.estoque_atual) {
      showToast(`Estoque insuficiente. Disponivel: ${p.estoque_atual}`, "error");
      return;
    }
    const idx = itens.findIndex((i) => i.produto_id === formItem.produto_id);
    if (idx >= 0) {
      const novaQtd = itens[idx].quantidade + formItem.quantidade;
      if (!isServico(p) && novaQtd > p.estoque_atual) {
        showToast(`Estoque insuficiente para ${novaQtd} unidades.`, "error");
        return;
      }
      setItens((prev) => prev.map((it, i) => (i === idx ? calcularItem(p, novaQtd, it.desconto + formItem.desconto, it.id) : it)));
    } else {
      setItens((prev) => [...prev, calcularItem(p, formItem.quantidade, formItem.desconto)]);
    }
    showToast(`${p.nome} adicionado ao carrinho`, "success");
    setTimeout(() => setToast(null), 3000);
    setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
    setBuscaItem("");
    setPreviewItem(null);
  };

  const atualizarQtd = (itemId: string, novaQtd: number) => {
    const idx = itens.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    if (novaQtd < 1) {
      setItens((p) => p.filter((i) => i.id !== itemId));
      return;
    }
    const item = itens[idx];
    const p = produtos.find((x) => x.id === item.produto_id);
    if (!p) return;
    if (!isServico(p) && novaQtd > p.estoque_atual) {
      showToast(`Maximo disponivel: ${p.estoque_atual}`, "error");
      return;
    }
    setItens((prev) => prev.map((it, i) => (i === idx ? calcularItem(p, novaQtd, item.desconto, item.id) : it)));
  };

  const removerItem = (id: string) => setItens((p) => p.filter((i) => i.id !== id));

  // Calculo dos totais
  const subtotalBruto = arredondar(itens.reduce((a, i) => a + i.preco_venda * i.quantidade, 0));
  const totalDesconto = arredondar(itens.reduce((a, i) => a + i.desconto, 0));
  const totalBase = arredondar(itens.reduce((a, i) => a + i.base_tributavel, 0));
  const totalIva = arredondar(itens.reduce((a, i) => a + i.valor_iva, 0));
  const totalRetencao = arredondar(itens.reduce((a, i) => a + i.valor_retencao, 0));
  const totalLiquido = arredondar(totalBase + totalIva - totalRetencao);

  const percentualDesconto = subtotalBruto > 0 ? (totalDesconto / subtotalBruto) * 100 : 0;

  const podeFinalizar = () => {
    if (itens.length === 0) return false;
    if (modoCliente === "cadastrado" && !clienteSelecionado) return false;
    return true;
  };

  const finalizarVenda = async () => {
    if (bloquearSeDadosIncompletos()) return;
    if (!podeFinalizar()) return;
    setLoading(true);
    try {
      const payload: CriarVendaPayload = {
        itens: itens.map((it) => ({
          produto_id: it.produto_id,
          quantidade: Number(it.quantidade),
          preco_venda: arredondar(Number(it.preco_venda)),
          desconto: arredondar(Number(it.desconto)),
        })),
        tipo_documento: "FT",
        faturar: true,
        desconto_global: totalDesconto,
        troco: 0,
      };

      if (modoCliente === "cadastrado" && clienteSelecionado) {
        payload.cliente_id = clienteSelecionado.id;
      } else if (modoCliente === "avulso") {
        if (clienteAvulso.trim()) {
          payload.cliente_nome = clienteAvulso.trim();
        } else {
          payload.cliente_nome = "Consumidor Final";
        }

        if (clienteAvulsoNif.trim() && clienteAvulsoNif.length >= 10) {
          payload.cliente_nif = clienteAvulsoNif.trim();
        } else {
          payload.cliente_nif = "9999999999";
        }
      }

      if (observacoes.trim()) payload.observacoes = observacoes.trim();

      // ✅ ADICIONAR DADOS BANCÁRIOS AO PAYLOAD
      if (nomeBanco && nomeBanco.trim()) {
        payload.nome_banco = nomeBanco.trim();
      }
      if (iban && iban.trim()) {
        payload.iban = iban.trim();
      }
      if (numeroConta && numeroConta.trim()) {
        payload.numero_conta = numeroConta.trim();
      }

      // ✅ Log para debug
      console.log('[Finalizar Venda] Payload com dados bancários:', {
        nome_banco: payload.nome_banco,
        iban: payload.iban,
        numero_conta: payload.numero_conta,
      });

      const erroVal = validarPayloadVenda(payload);
      if (erroVal) {
        showToast(erroVal, "error");
        setLoading(false);
        return;
      }
      await criarVenda(payload);
      showToast("Factura criada com sucesso! Redirecionando...", "success");
      setTimeout(() => router.push("/dashboard/Faturas/Faturas"), 1500);
    } catch (err: unknown) {
      showToast(err instanceof AxiosError ? err.response?.data?.message || "Erro ao salvar" : "Erro ao salvar", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handler para selecao de cliente
  const handleClienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cliente = clientes.find((c) => c.id === e.target.value);
    setClienteSelecionado(cliente || null);
  };

  const produtoSel = produtos.find((p) => p.id === formItem.produto_id);

  return (
    <MainEmpresa>
      <div className="space-y-3 pb-8 px-2 sm:px-4 max-w-5xl mx-auto" style={{ backgroundColor: colors.background }}>
        {/* Toast Notification */}
        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} colors={colors} />}

        {/* Modal de Dados Incompletos */}
        <ModalDadosIncompletos
          isOpen={modalDadosIncompletosOpen}
          onClose={() => setModalDadosIncompletosOpen(false)}
          camposFaltantes={camposFaltantes}
          colors={colors}
        />

        {/* Header */}
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => router.back()} className="p-1.5 hover:opacity-70 shrink-0" style={{ color: colors.primary }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: colors.secondary }}>
              Venda a prazo
            </h1>
          </div>
        </div>

        {/* Alertas de estoque baixo */}
        {produtosEstoqueBaixo.length > 0 && (
          <div
            className="p-3 border text-sm flex items-start gap-2"
            style={{
              backgroundColor: `${colors.warning}12`,
              borderColor: `${colors.warning}50`,
            }}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: colors.warning }} />
            <span style={{ color: colors.warning }}>
              <strong>Estoque baixo: </strong>
              <span style={{ color: colors.textSecondary }}>
                {produtosEstoqueBaixo.map((p) => `${p.nome} (${p.estoque_atual})`).join(" · ")}
              </span>
            </span>
          </div>
        )}

        {/* CARD 1 — Dados da Fatura */}
        <div className="border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: colors.primary }}>
            <ShoppingCart size={14} className="text-white" />
            <span className="text-white font-medium text-xs uppercase tracking-wider">Dados da Factura</span>
          </div>

          <div className="divide-y" style={{ borderColor: colors.border }}>
            {/* Cliente */}
            <div className="flex min-h-44px">
              <div className="flex items-center gap-1.5 px-3 py-2.5 w-24 sm:w-28 shrink-0" style={{ backgroundColor: colors.hover }}>
                <User size={13} style={{ color: colors.text }} />
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.text }}>
                  Cliente
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5 flex flex-wrap items-center gap-2 min-w-0">
                <div className="inline-flex border overflow-hidden shrink-0" style={{ borderColor: colors.border }}>
                  {(["cadastrado", "avulso"] as ModoCliente[]).map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => {
                        setModoCliente(modo);
                        setClienteSelecionado(null);
                        setClienteAvulso("");
                        setClienteAvulsoNif("");
                        setNifError(null);
                      }}
                      className="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                      style={{
                        backgroundColor: modoCliente === modo ? colors.primary : "transparent",
                        color: modoCliente === modo ? "white" : colors.textSecondary,
                      }}>
                      {modo === "cadastrado" ? "Cadastrado" : "Nao cadastrado"}
                    </button>
                  ))}
                </div>
                {modoCliente === "cadastrado" ? (
                  <select
                    className="flex-1 min-w-0 px-3 py-1.5 text-sm outline-none"
                    style={inp}
                    value={clienteSelecionado?.id ?? ""}
                    onChange={handleClienteChange}>
                    <option value="">Selecione um cliente…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.nif ? ` (${formatarNIF(c.nif)})` : ""}
                        {c.tipo === "empresa"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Nome (opcional - Consumidor Final)"
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm outline-none"
                      style={inp}
                      value={clienteAvulso}
                      onChange={(e) => setClienteAvulso(e.target.value)}
                    />
                    <div className="relative w-32 sm:w-36 shrink-0">
                      <input
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        placeholder="NIF / BI (opcional)"
                        maxLength={14}
                        className="w-full px-3 py-1.5 text-sm outline-none"
                        style={{
                          ...inp,
                          borderColor: nifError ? colors.danger : inp.borderColor,
                        }}
                        value={clienteAvulsoNif}
                        onChange={handleNifChange}
                      />
                      {nifError && (
                        <span className="absolute -bottom-4 left-0 text-[10px] whitespace-nowrap" style={{ color: colors.danger }}>
                          {nifError}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Produto e Servico */}
            <div className="flex min-h-[44px]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 w-24 sm:w-28 shrink-0" style={{ backgroundColor: colors.hover }}>
                <Package size={13} style={{ color: colors.text }} />
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.text }}>
                  Itens
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Seletor de tipo */}
                  <div className="inline-flex border overflow-hidden shrink-0" style={{ borderColor: colors.border }}>
                    {(["produto", "servico"] as TipoItem[]).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => {
                          setTipoItemSelecionado(tipo);
                          setBuscaItem("");
                          setFormItem({
                            produto_id: "",
                            quantidade: 1,
                            desconto: 0,
                          });
                          setPreviewItem(null);
                          setDropdownAberto(false);
                        }}
                        className="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                        style={{
                          backgroundColor: tipoItemSelecionado === tipo ? colors.primary : "transparent",
                          color: tipoItemSelecionado === tipo ? "white" : colors.textSecondary,
                        }}>
                        {tipo === "produto" ? "Produto" : "Servico"}
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
                        placeholder={
                          tipoItemSelecionado === "produto" ? "Digite codigo ou nome do produto..." : "Digite codigo ou nome do servico..."
                        }
                        className="w-full pl-9 pr-8 py-1.5 text-sm outline-none"
                        style={inp}
                        value={buscaItem}
                        onChange={(e) => {
                          setBuscaItem(e.target.value);
                          setDropdownAberto(true);
                          if (e.target.value === "") {
                            setFormItem({
                              produto_id: "",
                              quantidade: 1,
                              desconto: 0,
                            });
                            setPreviewItem(null);
                          }
                        }}
                        onFocus={() => setDropdownAberto(true)}
                        onKeyDown={handleBuscaKeyDown}
                      />
                      {buscaItem && (
                        <button
                          onClick={() => {
                            setBuscaItem("");
                            setFormItem({
                              produto_id: "",
                              quantidade: 1,
                              desconto: 0,
                            });
                            setPreviewItem(null);
                            setDropdownAberto(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70">
                          <X size={14} style={{ color: colors.textSecondary }} />
                        </button>
                      )}
                    </div>

                    {/* Dropdown de resultados */}
                    {dropdownAberto && (
                      <div
                        className="absolute z-50 left-0 right-0 mt-1 border shadow-lg max-h-60 overflow-y-auto"
                        style={{
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        }}>
                        {itensFiltrados.length > 0 ? (
                          itensFiltrados.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectItem(item)}
                              className="w-full px-3 py-2 text-left text-sm hover:transition-colors flex justify-between items-center border-b last:border-0"
                              style={{
                                backgroundColor: formItem.produto_id === item.id ? `${colors.primary}10` : "transparent",
                                borderColor: colors.border,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${colors.hover}`)}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  formItem.produto_id === item.id ? `${colors.primary}10` : "transparent")
                              }>
                              <div className="flex-1">
                                <span className="font-medium" style={{ color: colors.text }}>
                                  {item.nome}
                                </span>
                                {item.codigo && (
                                  <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>
                                    ({item.codigo})
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <span className="text-sm font-semibold" style={{ color: colors.secondary }}>
                                  {formatarPreco(item.preco_venda)}
                                </span>
                                {item.tipo === "produto" && (
                                  <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>
                                    Stock: {item.estoque_atual}
                                  </span>
                                )}
                                {item.tipo === "servico" && item.taxa_retencao && (
                                  <span className="text-xs ml-2" style={{ color: colors.warning }}>
                                    Ret: {item.taxa_retencao}%
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: colors.textSecondary }}>
                            Nenhum {tipoItemSelecionado === "produto" ? "produto" : "servico"} encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Controles de quantidade */}
                  <div className="flex items-center border overflow-hidden shrink-0" style={{ borderColor: colors.border }}>
                    <button
                      type="button"
                      className="w-8 h-9 flex items-center justify-center disabled:opacity-30"
                      style={{ backgroundColor: colors.hover }}
                      disabled={!formItem.produto_id || formItem.quantidade <= 1}
                      onClick={() =>
                        setFormItem((p) => ({
                          ...p,
                          quantidade: Math.max(1, p.quantidade - 1),
                        }))
                      }>
                      <Minus size={12} style={{ color: colors.text }} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      className="w-11 text-center text-sm h-9 border-0 outline-none"
                      style={{
                        backgroundColor: colors.card,
                        color: colors.text,
                      }}
                      value={formItem.quantidade}
                      disabled={!formItem.produto_id}
                      onChange={(e) => {
                        const p = produtos.find((x) => x.id === formItem.produto_id);
                        if (p) {
                          const maxQtd = p.tipo === "servico" ? 12 : p.estoque_atual;
                          setFormItem((prev) => ({
                            ...prev,
                            quantidade: Math.max(1, Math.min(Number(e.target.value) || 1, maxQtd)),
                          }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="w-8 h-9 flex items-center justify-center disabled:opacity-30"
                      style={{ backgroundColor: colors.hover }}
                      disabled={
                        !formItem.produto_id ||
                        (produtoSel && produtoSel.tipo === "produto" && formItem.quantidade >= produtoSel.estoque_atual)
                      }
                      onClick={() => {
                        const p = produtos.find((x) => x.id === formItem.produto_id);
                        if (p) {
                          const maxQtd = p.tipo === "servico" ? 9999 : p.estoque_atual;
                          setFormItem((prev) => ({
                            ...prev,
                            quantidade: Math.min(prev.quantidade + 1, maxQtd),
                          }));
                        }
                      }}>
                      <Plus size={12} style={{ color: colors.text }} />
                    </button>
                  </div>

                  {/* Campo de desconto */}
                  <input
                    type="number"
                    min={0}
                    placeholder="Desconto"
                    className="w-24 shrink-0 px-3 py-1.5 text-sm outline-none"
                    style={inp}
                    value={formItem.desconto || ""}
                    disabled={!formItem.produto_id}
                    onChange={(e) =>
                      setFormItem((p) => ({
                        ...p,
                        desconto: Number(e.target.value),
                      }))
                    }
                  />

                  {/* Botao adicionar */}
                  <button
                    type="button"
                    onClick={adicionarItem}
                    disabled={!formItem.produto_id}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    style={{ backgroundColor: colors.primary }}>
                    <Plus size={13} />
                    Adicionar
                  </button>

                  {/* Indicador de estoque */}
                  {produtoSel && produtoSel.tipo === "produto" && (
                    <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>
                      disp.: {produtoSel.estoque_atual}
                    </span>
                  )}
                </div>

                {/* Preview do item */}
                {previewItem && (
                  <div className="mt-2 px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ backgroundColor: colors.hover }}>
                    {[
                      {
                        label: "Base",
                        val: formatarPreco(previewItem.base_tributavel),
                        clr: colors.text,
                      },
                      {
                        label: "IVA",
                        val: formatarPreco(previewItem.valor_iva),
                        clr: colors.text,
                      },
                      ...(previewItem.valor_retencao > 0
                        ? [
                            {
                              label: "Ret.",
                              val: `-${formatarPreco(previewItem.valor_retencao)}`,
                              clr: colors.danger,
                            },
                          ]
                        : []),
                      {
                        label: "Total",
                        val: formatarPreco(previewItem.subtotal),
                        clr: colors.secondary,
                      },
                    ].map(({ label, val, clr }) => (
                      <span key={label} style={{ color: colors.textSecondary }}>
                        {label}: <strong style={{ color: clr }}>{val}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Observacoes */}
            <div className="flex min-h-[44px]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 w-24 sm:w-28 shrink-0" style={{ backgroundColor: colors.hover }}>
                <FileText size={13} style={{ color: colors.text }} />
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.text }}>
                  Obs.
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5">
                <input
                  type="text"
                  placeholder="Observacoes adicionais (opcional)"
                  className="w-full px-3 py-1.5 text-sm outline-none"
                  style={inp}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </div>

            {/* ✅ Dados Bancários */}
            <div className="flex min-h-[44px]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 w-24 sm:w-28 shrink-0" style={{ backgroundColor: colors.hover }}>
                <Building2 size={13} style={{ color: colors.text }} />
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.text }}>
                  Banco
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[120px]">
                    <Building2
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: colors.textSecondary }}
                    />
                    <input
                      type="text"
                      placeholder="Nome do banco (opcional)"
                      className="w-full pl-9 pr-3 py-1.5 text-sm outline-none"
                      style={inp}
                      value={nomeBanco}
                      onChange={(e) => setNomeBanco(e.target.value)}
                    />
                  </div>
                  <div className="relative flex-1 min-w-[120px]">
                    <Hash
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: colors.textSecondary }}
                    />
                    <input
                      type="text"
                      placeholder="Nº conta (opcional)"
                      className="w-full pl-9 pr-3 py-1.5 text-sm outline-none"
                      style={inp}
                      value={numeroConta}
                      onChange={(e) => setNumeroConta(e.target.value)}
                    />
                  </div>
                  <div className="relative flex-1 min-w-[150px]">
                    <Globe
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: colors.textSecondary }}
                    />
                    <input
                      type="text"
                      placeholder="IBAN (opcional)"
                      className="w-full pl-9 pr-3 py-1.5 text-sm outline-none"
                      style={inp}
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2 — Itens + Resumo Fiscal */}
        {itens.length > 0 ? (
          <div className="border shadow-sm overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-white" />
                <span className="text-white font-medium text-xs uppercase tracking-wider">
                  Itens da Factura
                  <span className="ml-1.5 text-white/70 font-normal normal-case">
                    ({itens.length} {itens.length !== 1 ? "itens" : "item"})
                  </span>
                </span>
              </div>
              <button onClick={() => setItens([])} className="text-white/70 hover:text-white text-xs transition-colors">
                Limpar tudo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: colors.hover }}>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    <th className="py-2.5 px-3 text-left font-semibold text-xs" style={{ color: colors.textSecondary }}>
                      Produto/Serviço
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold text-xs" style={{ color: colors.textSecondary }}>
                      Qtd.
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold text-xs" style={{ color: colors.textSecondary }}>
                      Desconto
                    </th>
                    <th
                      className="py-2.5 px-3 text-right font-semibold text-xs hidden sm:table-cell"
                      style={{ color: colors.textSecondary }}>
                      Preço unit.
                    </th>
                    <th
                      className="py-2.5 px-3 text-right font-semibold text-xs hidden md:table-cell"
                      style={{ color: colors.textSecondary }}>
                      IVA
                    </th>
                    <th
                      className="py-2.5 px-3 text-right font-semibold text-xs hidden lg:table-cell"
                      style={{ color: colors.textSecondary }}>
                      Ret.
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold text-xs" style={{ color: colors.textSecondary }}>
                      Subtotal
                    </th>
                    <th className="py-2.5 px-2 w-8" />
                  </tr>
                </thead>

                <tbody>
                  {itens.map((item, idx) => {
                    const p = produtos.find((x) => x.id === item.produto_id);
                    const maxEst = p && !isServico(p) ? p.estoque_atual : 9999;
                    return (
                      <tr
                        key={item.id}
                        className="border-b last:border-0"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: idx % 2 !== 0 ? `${colors.hover}60` : "transparent",
                        }}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate max-w-[100px] sm:max-w-[160px]" style={{ color: colors.text }}>
                              {item.descricao}
                            </span>
                            {p && isServico(p) && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 font-bold shrink-0"
                                style={{
                                  backgroundColor: `${colors.primary}20`,
                                  color: colors.primary,
                                }}>
                                S
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => atualizarQtd(item.id, item.quantidade - 1)}
                              className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover }}
                              disabled={item.quantidade <= 1}>
                              <Minus size={11} style={{ color: colors.text }} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={maxEst}
                              value={item.quantidade}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1) {
                                  const p = produtos.find((x) => x.id === item.produto_id);
                                  if (p) {
                                    const maxQtd = isServico(p) ? 9999 : p.estoque_atual;
                                    const novaQtd = Math.min(Math.max(1, val), maxQtd);
                                    atualizarQtd(item.id, novaQtd);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val) || val < 1) {
                                  atualizarQtd(item.id, 1);
                                }
                              }}
                              className="w-12 text-center text-sm font-medium outline-none border rounded"
                              style={{
                                backgroundColor: colors.card,
                                color: colors.text,
                                borderColor: colors.border,
                              }}
                            />
                            <button
                              onClick={() => atualizarQtd(item.id, item.quantidade + 1)}
                              className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover }}
                              disabled={item.quantidade >= maxEst}>
                              <Plus size={11} style={{ color: colors.text }} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={item.desconto}
                              maxLength={100}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  const p = produtos.find((x) => x.id === item.produto_id);
                                  if (p) {
                                    const novoItem = calcularItem(p, item.quantidade, val, item.id);
                                    setItens((prev) => prev.map((it) => (it.id === item.id ? novoItem : it)));
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val < 0) {
                                  const p = produtos.find((x) => x.id === item.produto_id);
                                  if (p) {
                                    const novoItem = calcularItem(p, item.quantidade, 0, item.id);
                                    setItens((prev) => prev.map((it) => (it.id === item.id ? novoItem : it)));
                                  }
                                }
                              }}
                              className="w-20 text-center text-sm font-medium outline-none border rounded px-2"
                              style={{
                                backgroundColor: colors.card,
                                color: colors.text,
                                borderColor: colors.border,
                              }}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right hidden sm:table-cell" style={{ color: colors.textSecondary }}>
                          {formatarPreco(item.preco_venda)}
                        </td>
                        <td className="px-3 py-2.5 text-right hidden md:table-cell" style={{ color: colors.text }}>
                          {formatarPreco(item.valor_iva)}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right hidden lg:table-cell"
                          style={{
                            color: item.valor_retencao > 0 ? colors.danger : colors.textSecondary,
                          }}>
                          {item.valor_retencao > 0 ? `-${formatarPreco(item.valor_retencao)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold" style={{ color: colors.secondary }}>
                          {formatarPreco(item.subtotal)}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => removerItem(item.id)} className="p-1 hover:opacity-70" style={{ color: colors.danger }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumo Fiscal */}
            <div className="border-t" style={{ borderColor: colors.border }}>
              <div className="flex flex-col sm:flex-row">
                <div className="flex-1 px-4 py-3 border-b sm:border-b-0 sm:border-r" style={{ borderColor: colors.border }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    Base
                  </p>
                  <LinhaFiscal label="Subtotal bruto" valor={formatarPreco(subtotalBruto)} colors={colors} />
                  <LinhaFiscal label="Desconto" valor={`${percentualDesconto.toFixed(2)}%`} cor={colors.textSecondary} colors={colors} />
                  <LinhaFiscal label="Base tributavel" valor={formatarPreco(totalBase)} colors={colors} />
                </div>
                <div className="flex-1 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    Impostos
                  </p>
                  <LinhaFiscal label="IVA" valor={formatarPreco(totalIva)} colors={colors} />

                  <LinhaFiscal label="Retencao" valor={`-${formatarPreco(totalRetencao)}`} cor={colors.textSecondary} colors={colors} />

                  <div className="mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                    <LinhaFiscal label="Total" valor={formatarPreco(totalLiquido)} cor={colors.secondary} negrito colors={colors} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed" style={{ borderColor: colors.border }}>
            <ShoppingCart size={28} className="mx-auto mb-2" style={{ color: colors.border }} />
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Use o scanner ou digite o codigo do produto para adicionar automaticamente
            </p>
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              Pressione ENTER para adicionar ao carrinho
            </p>
          </div>
        )}

        {/* Botao Finalizar */}
        {itens.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={finalizarVenda}
              disabled={loading || !podeFinalizar()}
              className="w-full rounded sm:w-48 py-2.5 font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.secondary }}>
              {loading ? (
                <>
                  <div className="w-4 rounded-full h-4 border-2 border-white border-t-transparent animate-spin" />A processar…
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Finalizar Factura
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}