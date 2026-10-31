"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  User,
  Package,
  FileText,
  Minus,
  Calculator,
  Search,
  X,
  ChevronDown,
  Lock,
} from "lucide-react";
import { AxiosError } from "axios";
import MainEmpresa from "../../components/MainEmpresa";
import { useAuth, getIncompleteEmpresaFields } from "@/context/authprovider";
import { useThemeColors } from "@/context/ThemeContext";
import { vendaService, produtoService, formatarPreco, validarPayloadVenda, isServico } from "@/services/vendas";
import type { Produto, CriarVendaPayload, DadosPagamento, TipoDocumentoFiscal } from "@/services/vendas";
import { documentoFiscalService } from "@/services/DocumentoFiscal";
import { ModalDadosIncompletos } from "../../components/ModalDadosIncompletos";
import { ToastNotification } from "@/components/ToastNotification";

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
  taxa_retencao?: number;
  codigo_produto?: string;
  eh_servico: boolean;
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
  blue?: string;
}

const TIPOS_DOCUMENTO_OPCOES: {
  value: TipoDocumentoFiscal;
  label: string;
  descricao: string;
}[] = [
  {
    value: "FT",
    label: "Factura",
    descricao: "Documento base · Pode ser paga a crédito",
  },
  {
    value: "FR",
    label: "Factura-Recibo",
    descricao: "Factura e comprovativo de pagamento imediato",
  },
  {
    value: "FG",
    label: "Factura Global",
    descricao: "Período de referência + anexos · Art. 8.º DP 71/25",
  },
  {
    value: "FGR",
    label: "Factura Global-Recibo",
    descricao: "Factura Global com pagamento imediato",
  },
  {
    value: "FA",
    label: "Factura de Adiantamento",
    descricao: "Adiantamento associado a um cliente; pode ser regularizado numa FT",
  },
  {
    value: "ND",
    label: "Nota de Débito",
    descricao: "Débito autónomo para um cliente; sem liquidação de IVA",
  },
  {
    value: "AC",
    label: "Aviso de Cobrança",
    descricao: "Documento específico para empresas seguradoras",
  },
  {
    value: "TV",
    label: "Talão de Venda",
    descricao: "Consumidor final sem NIF · Art. 5.º DP 71/25",
  },
];

const TITULOS_DOCUMENTO: Record<TipoDocumentoFiscal, string> = {
  FT: "Factura",
  FR: "Factura-Recibo",
  FG: "Factura Global",
  FGR: "Factura Global-Recibo",
  TV: "Talão de Venda",
  FP: "Factura Proforma",
  FA: "Factura de Adiantamento",
  NC: "Nota de Crédito",
  ND: "Nota de Débito",
  RC: "Recibo",
  FGEN: "Factura Genérica",
  AC: "Aviso de Cobrança",
  ACR: "Aviso de Cobrança-Recibo",
};

type TipoAlerta = "error" | "warning" | "info" | "success";

interface Alerta {
  id: string;
  tipo: TipoAlerta;
  titulo?: string;
  mensagem: string;
}

// ✅ NOVO — Normaliza taxa de IVA (vem como "14.00" string do BD)
function normalizarTaxaIva(taxa: number | string | null | undefined): 0 | 5 | 14 {
  const n = typeof taxa === "string" ? parseFloat(taxa) : taxa;
  if (n === null || n === undefined || isNaN(n)) return 0;
  if (n >= 10) return 14;
  if (n > 0) return 5;
  return 0;
}

function calcularItem(produto: Produto, qtd: number, desc: number, id = uuidv4()): ItemVendaUI {
  const ehServico = isServico(produto);
  const base = arredondar(arredondar(produto.preco_venda * qtd) - desc);

  // 🔧 CORRIGIDO — normaliza "14.00" → 14, "5.00" → 5, "0.00" → 0
  const taxaIva = normalizarTaxaIva(produto.taxa_iva);
  const iva = arredondar((base * taxaIva) / 100);

  const retRaw = typeof produto.taxa_retencao === "string" ? parseFloat(produto.taxa_retencao) : produto.taxa_retencao;
  const taxaRet = ehServico ? (retRaw || 0) : 0;
  const ret = ehServico ? arredondar((base * taxaRet) / 100) : 0;

  return {
    id,
    produto_id: produto.id,
    descricao: produto.nome,
    quantidade: qtd,
    preco_venda: produto.preco_venda,
    desconto: desc,
    base_tributavel: base,
    valor_iva: iva,
    valor_retencao: ret,
    subtotal: arredondar(base + iva - ret),
    taxa_iva: taxaIva,
    taxa_retencao: taxaRet,
    codigo_produto: produto.codigo || undefined,
    eh_servico: ehServico,
  };
}

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

function AlertaContextual({ alerta, colors }: { alerta: Alerta; colors: ThemeColors }) {
  const paleta: Record<
    TipoAlerta,
    {
      bg: string;
      border: string;
      cor: string;
      Icone: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    }
  > = {
    error: { bg: `${colors.danger}15`, border: colors.danger, cor: colors.danger, Icone: AlertCircle },
    warning: { bg: `${colors.secondary}15`, border: colors.secondary, cor: colors.secondary, Icone: AlertTriangle },
    info: { bg: `${colors.primary}15`, border: colors.primary, cor: colors.primary, Icone: Info },
    success: { bg: `${colors.success}15`, border: colors.success, cor: colors.success, Icone: CheckCircle2 },
  };

  const p = paleta[alerta.tipo];
  const { Icone } = p;

  return (
    <div
      className="flex items-start gap-2 px-3 py-2 border-l-4 text-sm"
      style={{ backgroundColor: p.bg, borderColor: p.border }}>
      <Icone size={16} className="shrink-0 mt-0.5" style={{ color: p.cor }} />
      <div className="flex-1 min-w-0">
        {alerta.titulo && (
          <div className="font-semibold mb-0.5 text-xs uppercase tracking-wide" style={{ color: p.cor }}>
            {alerta.titulo}
          </div>
        )}
        <div style={{ color: colors.text }}>{alerta.mensagem}</div>
      </div>
    </div>
  );
}

export default function NovaFaturaReciboPage() {
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

  // ─── STATES ──────────────────────────────────────────────────────────
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
  const [formPagamento, setFormPagamento] = useState({
    metodo: "dinheiro" as DadosPagamento["metodo"],
    valor_pago: "",
    referencia: "",
    data_pagamento: new Date().toISOString().split("T")[0],
  });
  const [observacoes, setObservacoes] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFiscal>("FR");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [tipoAnexo, setTipoAnexo] = useState<"guia_remessa" | "guia_transporte" | "folha_servico" | "outro">("guia_remessa");
  const [referenciaAnexo, setReferenciaAnexo] = useState("");
  const [dataAnexo, setDataAnexo] = useState("");
  const [modalDadosIncompletosOpen, setModalDadosIncompletosOpen] = useState(false);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);

  const [tipoItemSelecionado, setTipoItemSelecionado] = useState<TipoItem>("produto");
  const [buscaItem, setBuscaItem] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [metodoDropdownAberto, setMetodoDropdownAberto] = useState(false);
  const [tipoDocDropdownAberto, setTipoDocDropdownAberto] = useState(false);

  const buscaInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);
  const metodoDropdownRef = useRef<HTMLDivElement>(null);
  const tipoDocDropdownRef = useRef<HTMLDivElement>(null);

  const processandoBuscaRef = useRef(false);

  const METODOS_PAGAMENTO: { value: DadosPagamento["metodo"]; label: string }[] = [
    { value: "dinheiro", label: "Dinheiro" },
    { value: "cartao", label: "Cartão" },
    { value: "transferencia", label: "Transferência" },
  ];

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

  // ✅ NOVO — Handler do tipo de documento com reset inteligente
  const handleTipoDocumentoChange = (tipo: TipoDocumentoFiscal) => {
    if (tipo === tipoDocumento) {
      setTipoDocDropdownAberto(false);
      return;
    }

    setTipoDocumento(tipo);

    setPeriodoInicio("");
    setPeriodoFim("");
    setReferenciaAnexo("");
    setDataAnexo("");
    setTipoAnexo("guia_remessa");

    if (tipo === "TV") {
      // TV: FORÇA modo avulso, nunca cadastrado
      setModoCliente("avulso");
      setClienteSelecionado(null);
      setClienteAvulso("Consumidor Final");
      setClienteAvulsoNif("");
      setNifError(null);
    } else if (tipo === "FG" || tipo === "FGR") {
      setModoCliente("cadastrado");
      setClienteSelecionado(null);
      setClienteAvulso("");
      setClienteAvulsoNif("");
      setNifError(null);
    } else if (["FT", "FR", "FA", "ND", "AC"].includes(tipo)) {
      setModoCliente("cadastrado");
      setClienteSelecionado(null);
      setClienteAvulso("");
      setClienteAvulsoNif("");
      setNifError(null);
      if (tipo === "ND") setTipoItemSelecionado("servico");
    }

    setTipoDocDropdownAberto(false);
  };

  // ✅ NOVO — Handler do botão "Cadastrado" com bloqueio para TV
  const handleModoClienteChange = (modo: ModoCliente) => {
    if (modo === "avulso" && ["FA", "ND", "AC"].includes(tipoDocumento)) {
      showToast("Este documento exige um cliente cadastrado.", "warning");
      return;
    }

    if (documentoTalao && modo === "cadastrado") {
      showToast(
        "Talão de Venda só pode ser emitido para consumidor final (não cadastrado). Use Factura-Recibo para clientes cadastrados.",
        "warning"
      );
      return;
    }

    setModoCliente(modo);
    setClienteSelecionado(null);
    setClienteAvulso("");
    setClienteAvulsoNif("");
    setNifError(null);
  };

  const recarregarProdutos = useCallback(async (opts?: { avisarEstoqueBaixo?: boolean }) => {
    const avisar = opts?.avisarEstoqueBaixo ?? true;
    try {
      const produtosData = await produtoService
        .listar({ status: "ativo", paginar: false })
        .then((r) => (Array.isArray(r.produtos) ? r.produtos : []));

      setProdutos(produtosData);

      const fisicos = produtosData.filter((p) => !isServico(p));
      const estoqueBaixo = fisicos.filter((p) => p.estoque_atual > 0 && p.estoque_atual <= ESTOQUE_MINIMO);
      setProdutosEstoqueBaixo(estoqueBaixo);

      if (avisar && estoqueBaixo.length > 0) {
        const nomes = estoqueBaixo.slice(0, 3).map((p) => p.nome).join(", ");
        const extra = estoqueBaixo.length > 3 ? ` e mais ${estoqueBaixo.length - 3}` : "";
        showToast(` ${estoqueBaixo.length} produto(s) com estoque baixo: ${nomes}${extra}`, "warning");
      }

      return produtosData;
    } catch (error) {
      console.error(" Erro ao atualizar produtos:", error);
      return null;
    }
  }, []);

  // ─── EFFECTS ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const carregarDadosIniciais = async () => {
      try {
        const clientesResponse = await clienteService.listar({ status: "ativo", per_page: 10 });
        const clientesData = clientesResponse.data || [];
        setClientes(clientesData);
        await recarregarProdutos();
      } catch (error) {
        console.error(" Erro ao carregar dados:", error);
        showToast(" Erro ao carregar dados", "error");
      }
    };

    carregarDadosIniciais();
  }, [user, recarregarProdutos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownAberto(false);
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(event.target as Node)) setClienteDropdownAberto(false);
      if (metodoDropdownRef.current && !metodoDropdownRef.current.contains(event.target as Node)) setMetodoDropdownAberto(false);
      if (tipoDocDropdownRef.current && !tipoDocDropdownRef.current.contains(event.target as Node)) setTipoDocDropdownAberto(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const qtd = Math.min(formItem.quantidade, isServico(p) ? 9999 : p.estoque_atual);
    setPreviewItem({ ...calcularItem(p, qtd, formItem.desconto), id: "preview" });
  }, [formItem, produtos]);

  useEffect(() => {
    setFormPagamento((p) => ({
      ...p,
      valor_pago: itens.length > 0 ? totalLiquido.toString() : "",
    }));
  }, [itens]);

  // ─── HANDLERS ───────────────────────────────────────────────────────

  const selecionarCliente = (cliente: Cliente | null) => {
    setClienteSelecionado(cliente);
    setClienteDropdownAberto(false);
  };

  const selecionarMetodoPagamento = (metodo: DadosPagamento["metodo"]) => {
    setFormPagamento((p) => ({ ...p, metodo }));
    setMetodoDropdownAberto(false);
  };

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    const clean = value.replace(/[^A-Z0-9]/g, "");

    if (clean.length <= 14) {
      setClienteAvulsoNif(clean);
      if (clean.length > 0 && clean.length < 10) {
        setNifError("NIF/BI demasiado curto (mínimo 10 caracteres)");
      } else if (clean.length > 10 && clean.length < 14) {
        setNifError("BI deve ter 14 caracteres (9 números + 2 letras + 3 números)");
      } else {
        setNifError(null);
      }
    }
  };

  const montarFeedbackEstoque = (produto: Produto, novaQtd: number, mensagemBase: string) => {
    if (isServico(produto)) return { mensagem: mensagemBase, tipo: "success" as const };
    const restante = produto.estoque_atual - novaQtd;
    if (restante <= ESTOQUE_MINIMO) {
      return { mensagem: ` ${mensagemBase} — estoque restante baixo: ${restante}`, tipo: "warning" as const };
    }
    return { mensagem: mensagemBase, tipo: "success" as const };
  };

  const adicionarItemAutomaticamente = (produto: Produto, quantidade: number = 1) => {
    let mensagem = "";
    let tipoToast: "success" | "error" | "warning" = "success";

    setItens((prev) => {
      const idx = prev.findIndex((i) => i.produto_id === produto.id);

      if (idx >= 0) {
        const novaQtd = prev[idx].quantidade + quantidade;
        if (!isServico(produto) && novaQtd > produto.estoque_atual) {
          mensagem = ` Estoque insuficiente para ${novaQtd} unidades de ${produto.nome}.`;
          tipoToast = "error";
          return prev;
        }
        const feedback = montarFeedbackEstoque(produto, novaQtd, `${produto.nome} adicionado (quantidade: ${novaQtd})`);
        mensagem = feedback.mensagem;
        tipoToast = feedback.tipo;
        return prev.map((it, i) => (i === idx ? calcularItem(produto, novaQtd, it.desconto, it.id) : it));
      }

      const feedback = montarFeedbackEstoque(produto, quantidade, `${produto.nome} adicionado ao carrinho`);
      mensagem = feedback.mensagem;
      tipoToast = feedback.tipo;
      return [...prev, calcularItem(produto, quantidade, 0)];
    });

    showToast(mensagem, tipoToast);
    setTimeout(() => setToast(null), 3000);

    setBuscaItem("");
    setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
    setPreviewItem(null);
    setDropdownAberto(false);
  };

  const buscarProdutoPorCodigo = (codigo: string) => {
    if (!codigo.trim()) return null;
    let produto = produtos.find((p) => p.codigo === codigo.trim());
    if (!produto) produto = produtos.find((p) => p.codigo?.includes(codigo.trim()));
    if (produto && produto.tipo === "produto" && produto.estoque_atual <= 0) return null;
    return produto;
  };

  const handleSelectItem = (produto: Produto) => {
    const qtd = produto.tipo === "produto" ? Math.min(1, produto.estoque_atual) : 1;
    adicionarItemAutomaticamente(produto, qtd);
  };

  const handleBuscaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (processandoBuscaRef.current) return;

      const codigoBusca = buscaItem.trim();
      if (!codigoBusca) return;

      processandoBuscaRef.current = true;
      const produto = buscarProdutoPorCodigo(codigoBusca);

      if (produto) {
        const qtd = produto.tipo === "produto" ? Math.min(1, produto.estoque_atual) : 1;
        adicionarItemAutomaticamente(produto, qtd);
      } else {
        showToast(` Produto com código "${codigoBusca}" não encontrado`, "error");
        setTimeout(() => setToast(null), 3000);
      }

      setTimeout(() => { processandoBuscaRef.current = false; }, 300);
    }
  };

  const adicionarItem = () => {
    if (!formItem.produto_id || !previewItem) {
      showToast(" Selecione um produto/serviço", "error");
      return;
    }
    const p = produtos.find((x) => x.id === formItem.produto_id);
    if (!p) return;

    let mensagem = "";
    let tipoToast: "success" | "error" | "warning" = "success";
    let bloqueado = false;

    setItens((prev) => {
      const idx = prev.findIndex((i) => i.produto_id === formItem.produto_id);

      if (idx >= 0) {
        const novaQtd = prev[idx].quantidade + formItem.quantidade;
        if (!isServico(p) && novaQtd > p.estoque_atual) {
          mensagem = ` Estoque insuficiente para ${novaQtd} unidades.`;
          tipoToast = "error";
          bloqueado = true;
          return prev;
        }
        const feedback = montarFeedbackEstoque(p, novaQtd, `${p.nome} adicionado ao carrinho`);
        mensagem = feedback.mensagem;
        tipoToast = feedback.tipo;
        return prev.map((it, i) => (i === idx ? calcularItem(p, novaQtd, formItem.desconto, it.id) : it));
      }

      if (!isServico(p) && formItem.quantidade > p.estoque_atual) {
        mensagem = ` Estoque insuficiente. Disponível: ${p.estoque_atual}`;
        tipoToast = "error";
        bloqueado = true;
        return prev;
      }

      const feedback = montarFeedbackEstoque(p, formItem.quantidade, `${p.nome} adicionado ao carrinho`);
      mensagem = feedback.mensagem;
      tipoToast = feedback.tipo;
      return [...prev, calcularItem(p, formItem.quantidade, formItem.desconto)];
    });

    showToast(mensagem, tipoToast);
    setTimeout(() => setToast(null), 3000);

    if (!bloqueado) {
      setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
      setBuscaItem("");
      setPreviewItem(null);
    }
  };

  const atualizarQtd = (itemId: string, novaQtd: number) => {
    setItens((prev) => {
      const idx = prev.findIndex((i) => i.id === itemId);
      if (idx < 0) return prev;
      if (novaQtd < 1) return prev.filter((i) => i.id !== itemId);

      const item = prev[idx];
      const p = produtos.find((x) => x.id === item.produto_id);
      if (!p) return prev;

      if (!isServico(p) && novaQtd > p.estoque_atual) {
        showToast(` Máximo disponível: ${p.estoque_atual}`, "error");
        return prev;
      }

      return prev.map((it, i) => (i === idx ? calcularItem(p, novaQtd, item.desconto, item.id) : it));
    });
  };

  const removerItem = (id: string) => setItens((p) => p.filter((i) => i.id !== id));

  // ─── CÁLCULOS ──────────────────────────────────────────────────────

  const subtotalBruto = arredondar(itens.reduce((a, i) => a + i.preco_venda * i.quantidade, 0));
  const totalDesconto = arredondar(itens.reduce((a, i) => a + i.desconto, 0));
  const totalBase = arredondar(itens.reduce((a, i) => a + i.base_tributavel, 0));
  const totalIva = tipoDocumento === "ND" ? 0 : arredondar(itens.reduce((a, i) => a + i.valor_iva, 0));
  const totalRetencao = arredondar(itens.reduce((a, i) => a + i.valor_retencao, 0));
  const totalLiquido = arredondar(
    itens.reduce((a, i) => a + (tipoDocumento === "ND" ? i.base_tributavel - i.valor_retencao : i.subtotal), 0)
  );

  const percentualDesconto = subtotalBruto > 0 ? (totalDesconto / subtotalBruto) * 100 : 0;

  const valorPagamento = parseFloat(formPagamento.valor_pago) || 0;
  const troco = valorPagamento > totalLiquido ? arredondar(valorPagamento - totalLiquido) : 0;
  const falta = valorPagamento > 0 && valorPagamento < totalLiquido ? arredondar(totalLiquido - valorPagamento) : 0;

  const pagamentoSuficiente =
    totalLiquido > 0 && (["FG", "FT", "FA", "ND", "AC"].includes(tipoDocumento) || valorPagamento >= totalLiquido);

  const documentoGlobal = tipoDocumento === "FG" || tipoDocumento === "FGR";
  const documentoTalao = tipoDocumento === "TV";
  const documentoCredito = tipoDocumento === "FT";
  const documentoNotaDebito = tipoDocumento === "ND";
  const documentoAdiantamento = tipoDocumento === "FA";
  const documentoAvisoCobranca = tipoDocumento === "AC";

  // ✅ NOVO — Calcula alertas contextuais em tempo real
  const alertas: Alerta[] = useMemo(() => {
    const lista: Alerta[] = [];

    if (itens.length === 0) {
      lista.push({
        id: "carrinho-vazio",
        tipo: "info",
        mensagem: "Adicione pelo menos 1 item ao carrinho para continuar.",
      });
      return lista;
    }

    if (tipoDocumento === "FR" && modoCliente === "avulso" && !clienteAvulso.trim()) {
      lista.push({
        id: "fr-sem-nome",
        tipo: "warning",
        titulo: "Factura-Recibo exige identificação do adquirente",
        mensagem: "Preencha o nome do adquirente ou mude para «Cadastrado» para escolher um cliente existente.",
      });
    }

    if (tipoDocumento === "FR" && modoCliente === "cadastrado" && !clienteSelecionado) {
      lista.push({
        id: "fr-sem-cliente",
        tipo: "warning",
        mensagem: "Selecione um cliente cadastrado para emitir a Factura-Recibo.",
      });
    }

    if ((documentoAdiantamento || documentoNotaDebito || documentoAvisoCobranca) && !clienteSelecionado) {
      lista.push({
        id: "documento-sem-cliente",
        tipo: "error",
        mensagem: "Este documento exige um cliente cadastrado.",
      });
    }

    if (documentoNotaDebito && itens.some((item) => !item.eh_servico)) {
      lista.push({
        id: "nd-produto-fisico",
        tipo: "error",
        mensagem: "A Nota de Débito autónoma só pode conter serviços, juros ou multas.",
      });
    }

    if (documentoGlobal && modoCliente === "avulso") {
      lista.push({
        id: "fg-avulso",
        tipo: "error",
        titulo: "Factura Global exige cliente cadastrado",
        mensagem: "Art. 3.º al. j) do DP 71/25. Mude para «Cadastrado» e selecione o cliente.",
      });
    }

    if (documentoGlobal && modoCliente === "cadastrado" && !clienteSelecionado) {
      lista.push({
        id: "fg-sem-cliente",
        tipo: "error",
        mensagem: "Selecione o cliente para emitir a Factura Global.",
      });
    }

    // ✅ NOVO — Alerta extra quando TV e NIF preenchido
    if (documentoTalao && clienteAvulsoNif.trim()) {
      lista.push({
        id: "tv-com-nif",
        tipo: "error",
        titulo: "Talão de Venda não leva NIF",
        mensagem: "Se o cliente tem NIF, use Factura-Recibo. O talão destina-se a consumidor final sem NIF (Art. 5.º DP 71/25).",
      });
    }

    // ✅ NOVO — Alerta informativo quando TV está selecionado
    if (documentoTalao) {
      lista.push({
        id: "tv-informativo",
        tipo: "info",
        titulo: "Modo Talão activo",
        mensagem: "Só pode emitir para «Não cadastrado» (consumidor final sem NIF). O botão «Cadastrado» está bloqueado.",
      });
    }

    if (documentoGlobal && (!periodoInicio || !periodoFim)) {
      lista.push({
        id: "fg-sem-periodo",
        tipo: "warning",
        mensagem: "Factura Global exige período de referência (data de início e fim).",
      });
    }

    if (documentoGlobal && periodoInicio && periodoFim) {
      const dias = Math.ceil(
        (new Date(periodoFim).getTime() - new Date(periodoInicio).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dias < 0) {
        lista.push({
          id: "fg-periodo-invertido",
          tipo: "error",
          mensagem: "A data de início do período deve ser anterior à data de fim.",
        });
      } else if (dias > 31) {
        lista.push({
          id: "fg-periodo-longo",
          tipo: "error",
          mensagem: `O período de ${dias} dias excede o máximo de 31 dias permitido (Art. 3.º al. j do DP 71/25).`,
        });
      }
    }

    if (documentoGlobal && (!referenciaAnexo.trim() || !dataAnexo)) {
      lista.push({
        id: "fg-sem-anexo",
        tipo: "warning",
        mensagem: "Factura Global exige pelo menos 1 anexo válido (guia de remessa, folha de serviço, etc.) com referência e data.",
      });
    }

    if (tipoDocumento === "FR" && totalLiquido > 0 && valorPagamento > 0 && valorPagamento < totalLiquido - 0.01) {
      const faltaCalc = totalLiquido - valorPagamento;
      lista.push({
        id: "fr-pagamento-parcial",
        tipo: "error",
        mensagem: `Factura-Recibo exige pagamento total. Faltam ${formatarPreco(faltaCalc)}.`,
      });
    }

    if (nifError) {
      lista.push({ id: "nif-invalido", tipo: "warning", mensagem: nifError });
    }

    if (tipoDocumento === "FT" && totalLiquido > 0 && valorPagamento === 0 && itens.length > 0) {
      lista.push({
        id: "ft-credito",
        tipo: "info",
        mensagem: "A Factura será emitida a crédito. O pagamento pode ser registado depois com um Recibo.",
      });
    }

    if (itens.length > 0 && totalLiquido <= 0) {
      lista.push({
        id: "total-zero",
        tipo: "warning",
        mensagem: "O total da venda é 0 Kz. Verifique os descontos aplicados — pode ser um erro.",
      });
    }

    return lista.sort((a, b) => {
      const ordem: Record<TipoAlerta, number> = { error: 0, warning: 1, info: 2, success: 3 };
      return ordem[a.tipo] - ordem[b.tipo];
    });
  }, [
    itens, tipoDocumento, modoCliente, clienteAvulso, clienteSelecionado, clienteAvulsoNif,
    documentoGlobal, documentoTalao, documentoAdiantamento, documentoNotaDebito, documentoAvisoCobranca,
    periodoInicio, periodoFim, referenciaAnexo, dataAnexo,
    valorPagamento, totalLiquido, nifError,
  ]);

  // ─── FINALIZAR VENDA ──────────────────────────────────────────────

  const podeFinalizar = () => {
    if (itens.length === 0) return false;
    if (!pagamentoSuficiente) return false;

    if (documentoTalao) {
      return modoCliente === "avulso" && !clienteAvulsoNif.trim();
    }

    if ((documentoAdiantamento || documentoNotaDebito || documentoAvisoCobranca) && !clienteSelecionado) return false;
    if (documentoNotaDebito && itens.some((item) => !item.eh_servico)) return false;
    if (modoCliente === "cadastrado") return !!clienteSelecionado;
    return clienteAvulso.trim().length > 0;
  };

  const revalidarEstoqueAntesDeFinalizar = async (): Promise<boolean> => {
    const produtosAtuais = await recarregarProdutos({ avisarEstoqueBaixo: false });
    if (!produtosAtuais) return true;

    const insuficientes = itens.filter((it) => {
      const p = produtosAtuais.find((x) => x.id === it.produto_id);
      return !!p && !isServico(p) && it.quantidade > p.estoque_atual;
    });

    if (insuficientes.length === 0) return true;

    const nomes = insuficientes.map((i) => i.descricao).join(", ");
    showToast(` Estoque insuficiente para: ${nomes}. As quantidades foram ajustadas — revise antes de finalizar.`, "error");

    setItens((prev) =>
      prev
        .map((it) => {
          const p = produtosAtuais.find((x) => x.id === it.produto_id);
          if (p && !isServico(p) && it.quantidade > p.estoque_atual) {
            return p.estoque_atual > 0 ? calcularItem(p, p.estoque_atual, it.desconto, it.id) : it;
          }
          return it;
        })
        .filter((it) => {
          const p = produtosAtuais.find((x) => x.id === it.produto_id);
          return !p || isServico(p) || p.estoque_atual > 0;
        })
    );

    return false;
  };

  const finalizarVenda = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (bloquearSeDadosIncompletos()) return;
      if (!podeFinalizar()) return;

      const estoqueOk = await revalidarEstoqueAntesDeFinalizar();
      if (!estoqueOk) return;

      if (documentoGlobal && (!periodoInicio || !periodoFim || !tipoAnexo || !referenciaAnexo.trim() || !dataAnexo)) {
        showToast("Informe o período de referência e os dados de pelo menos um anexo para a Factura Global.", "error");
        return;
      }

      if (documentoGlobal && !clienteSelecionado && !clienteAvulso.trim()) {
        showToast("A Factura Global requer a identificação do cliente.", "error");
        return;
      }

      if (documentoTalao && (modoCliente !== "avulso" || clienteAvulsoNif.trim())) {
        showToast("O Talão de Venda destina-se a consumidor sem NIF. Use cliente avulso e não informe NIF.", "error");
        return;
      }

      if (documentoAdiantamento || documentoNotaDebito || documentoAvisoCobranca) {
        if (!clienteSelecionado) {
          showToast("Este documento exige um cliente cadastrado.", "error");
          return;
        }

        const itensEmissao = itens.map((item) => ({
          produto_id: item.produto_id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          preco_unitario: arredondar(item.preco_venda),
          desconto: arredondar(item.desconto),
          taxa_iva: documentoNotaDebito ? 0 : normalizarTaxaIva(item.taxa_iva),
          eh_servico: item.eh_servico,
          taxa_retencao: item.eh_servico ? item.taxa_retencao : undefined,
        }));

        if (documentoAdiantamento) {
          await documentoFiscalService.emitir({
            tipo_documento: "FA",
            cliente_id: clienteSelecionado.id,
            itens: itensEmissao,
            observacoes: observacoes.trim() || undefined,
          });
        } else if (documentoNotaDebito) {
          await documentoFiscalService.emitirNotaDebitoAutonoma({
            cliente_id: clienteSelecionado.id,
            itens: itensEmissao,
            motivo: observacoes.trim() || undefined,
          });
        } else {
          await documentoFiscalService.emitirAvisoCobranca({
            cliente_id: clienteSelecionado.id,
            itens: itensEmissao,
            motivo: observacoes.trim() || undefined,
          });
        }

        showToast("Documento emitido com sucesso! Redirecionando...", "success");
        await recarregarProdutos({ avisarEstoqueBaixo: false });
        setTimeout(() => router.push("/dashboard/Faturas/Faturas"), 1500);
        return;
      }

      const isPagamentoObrigatorio = ["FR", "FGR", "TV"].includes(tipoDocumento);
      const temPagamento = valorPagamento > 0;
      const deveEnviarPagamento = isPagamentoObrigatorio || temPagamento;

      const payload: CriarVendaPayload = {
        itens: itens.map((it) => ({
          produto_id: it.produto_id,
          quantidade: it.quantidade,
          preco_venda: arredondar(it.preco_venda),
          desconto: arredondar(it.desconto),
          // 🔧 CORRIGIDO — normaliza "14.00" → 14
          taxa_iva: normalizarTaxaIva(it.taxa_iva),
          taxa_retencao: it.eh_servico ? it.taxa_retencao : undefined,
        })),
        tipo_documento: tipoDocumento,
        faturar: true,
        desconto_global: totalDesconto,
        troco: troco,
      };

      if (deveEnviarPagamento) {
        payload.dados_pagamento = {
          metodo: formPagamento.metodo,
          valor: arredondar(temPagamento ? Math.min(valorPagamento, totalLiquido) : totalLiquido),
          referencia: formPagamento.referencia || undefined,
          data: formPagamento.data_pagamento,
        };
      }

      if (modoCliente === "cadastrado" && clienteSelecionado) {
        payload.cliente_id = clienteSelecionado.id;
      } else if (modoCliente === "avulso") {
        const nomeClienteAvulso = clienteAvulso.trim();
        if (nomeClienteAvulso) {
          payload.cliente_nome = nomeClienteAvulso;
        } else if (tipoDocumento !== "FR") {
          payload.cliente_nome = "Consumidor Final";
        }

        if (clienteAvulsoNif.trim() && clienteAvulsoNif.length >= 10 && !documentoTalao) {
          payload.cliente_nif = clienteAvulsoNif.trim();
        } else if (!documentoTalao && tipoDocumento !== "FR") {
          payload.cliente_nif = "9999999999";
        }
      }

      if (observacoes.trim()) payload.observacoes = observacoes.trim();

      if (documentoGlobal || documentoTalao) {
        const itensEmissao = itens.map((item) => ({
          produto_id: item.produto_id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          preco_venda: arredondar(item.preco_venda),
          preco_unitario: arredondar(item.preco_venda),
          desconto: arredondar(item.desconto),
          // 🔧 CORRIGIDO — força ser 0, 5 ou 14 (não "14.00")
          taxa_iva: normalizarTaxaIva(item.taxa_iva),
        }));
        const pagamento = {
          metodo: formPagamento.metodo,
          valor: arredondar(Math.min(valorPagamento, totalLiquido)),
          referencia: formPagamento.referencia || undefined,
          data: formPagamento.data_pagamento,
        };
        const clienteNome = modoCliente === "cadastrado" ? clienteSelecionado?.nome : clienteAvulso.trim();
        const clienteNif = modoCliente === "cadastrado" ? clienteSelecionado?.nif ?? undefined : clienteAvulsoNif.trim() || undefined;

        if (documentoGlobal) {
          await documentoFiscalService.emitirFacturaGlobal({
            tipo_documento: tipoDocumento === "FGR" ? "FGR" : "FG",
            cliente_id: modoCliente === "cadastrado" ? clienteSelecionado?.id : undefined,
            cliente_nome: clienteNome || undefined,
            cliente_nif: clienteNif,
            itens: itensEmissao,
            periodo_referencia_inicio: periodoInicio,
            periodo_referencia_fim: periodoFim,
            dados_pagamento: tipoDocumento === "FGR" ? pagamento : undefined,
            anexos: [{ tipo_anexo: tipoAnexo, referencia: referenciaAnexo.trim(), data_anexo: dataAnexo }],
            observacoes: observacoes.trim() || undefined,
          });
        } else {
          await documentoFiscalService.emitirTalaoVenda({
            cliente_nome: clienteNome || "Consumidor Final",
            itens: itensEmissao,
            dados_pagamento: pagamento,
          });
        }

        showToast("Documento emitido com sucesso! Redirecionando...", "success");
        await recarregarProdutos({ avisarEstoqueBaixo: false });
        setTimeout(() => router.push("/dashboard/Faturas/Faturas"), 1500);
        return;
      }

      const erroVal = validarPayloadVenda(payload);
      if (erroVal) {
        showToast(` ${erroVal}`, "error");
        return;
      }
      await vendaService.criar(payload);
      showToast(" Venda criada com sucesso! Redirecionando...", "success");

      await recarregarProdutos({ avisarEstoqueBaixo: false });
      setTimeout(() => router.push("/dashboard/Faturas/Faturas"), 1500);
    } catch (err: unknown) {
      const mensagemErro = err instanceof AxiosError
        ? err.response?.data?.message || "Erro ao salvar"
        : err instanceof Error ? err.message : "Erro ao salvar";

      showToast(` ${mensagemErro}`, "error");

      const mensagemLower = mensagemErro.toLowerCase();
      if (mensagemLower.includes("stock insuficiente") || mensagemLower.includes("estoque insuficiente")) {
        await recarregarProdutos({ avisarEstoqueBaixo: false });
        setTimeout(() => {
          showToast(" Estoque atualizado. Verifique as quantidades no carrinho antes de tentar novamente.", "warning");
        }, 400);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────

  const produtoSel = produtos.find((p) => p.id === formItem.produto_id);
  const itensFiltrados = produtos.filter((p) => {
    if (p.status !== "ativo") return false;
    if (tipoDocumento === "ND" && p.tipo !== "servico") return false;
    if (tipoItemSelecionado === "produto" && p.tipo !== "produto") return false;
    if (tipoItemSelecionado === "servico" && p.tipo !== "servico") return false;
    if (p.tipo === "produto" && p.estoque_atual <= 0) return false;
    if (buscaItem.trim() === "") return true;
    const buscaLower = buscaItem.toLowerCase();
    return p.nome.toLowerCase().includes(buscaLower) || (p.codigo && p.codigo.toLowerCase().includes(buscaLower));
  });

  const opcaoActual = TIPOS_DOCUMENTO_OPCOES.find((t) => t.value === tipoDocumento);

  return (
    <MainEmpresa>
      <div className="space-y-3 pb-8 px-2 sm:px-4 max-w-5xl mx-auto" style={{ backgroundColor: colors.background }}>
        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} colors={colors} />}

        <ModalDadosIncompletos
          isOpen={modalDadosIncompletosOpen}
          onClose={() => setModalDadosIncompletosOpen(false)}
          camposFaltantes={camposFaltantes}
          colors={colors}
        />

        {/* ── Header ── */}
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => router.back()} className="p-1.5 hover:opacity-70 shrink-0" style={{ color: colors.primary }}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: colors.secondary }}>
            {TITULOS_DOCUMENTO[tipoDocumento] ?? tipoDocumento}
          </h1>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            CARD 1 — Dados da Venda
        ════════════════════════════════════════════════════════════════ */}
        <div className="border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: colors.primary }}>
            <ShoppingCart size={14} className="text-white" />
            <span className="text-white font-medium text-xs uppercase tracking-wider">Dados da Venda</span>
          </div>

          <div className="divide-y" style={{ borderColor: colors.border }}>
            {/* ── Documento ── */}
            <div className="flex flex-col sm:flex-row min-h-[44px]">
              <label htmlFor="tipo-documento" className="flex items-center px-3 py-2.5 w-full sm:w-40 shrink-0 text-sm font-semibold" style={{ backgroundColor: colors.hover, color: colors.blue }}>
                Documento
              </label>
              <div className="flex-1 px-3 py-2.5 space-y-2">
                <div className="relative" ref={tipoDocDropdownRef}>
                  <button
                    type="button"
                    id="tipo-documento"
                    onClick={() => setTipoDocDropdownAberto((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm outline-none text-left"
                    style={inp}>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="font-medium truncate" style={{ color: colors.text }}>
                        {opcaoActual?.label ?? tipoDocumento}
                      </span>
                      <span className="text-xs truncate" style={{ color: colors.textSecondary }}>
                        {opcaoActual?.descricao}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform ${tipoDocDropdownAberto ? "rotate-180" : ""}`}
                      style={{ color: colors.textSecondary }}
                    />
                  </button>

                  {tipoDocDropdownAberto && (
                    <div
                      className="absolute z-50 left-0 right-0 mt-1 border shadow-lg max-h-80 overflow-y-auto"
                      style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                      {TIPOS_DOCUMENTO_OPCOES
                        .filter((opcao) => opcao.value !== "AC" || user?.empresa?.is_seguradora)
                        .map((opcao) => (
                        <button
                          key={opcao.value}
                          type="button"
                          onClick={() => handleTipoDocumentoChange(opcao.value)}
                          className="w-full px-3 py-2.5 text-left text-sm border-b last:border-0"
                          style={{
                            backgroundColor: tipoDocumento === opcao.value ? `${colors.primary}10` : "transparent",
                            borderColor: colors.border,
                            color: colors.blue,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.hover)}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              tipoDocumento === opcao.value ? `${colors.primary}10` : "transparent")
                          }>
                          <div className="font-medium">{opcao.label}</div>
                          <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                            {opcao.descricao}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {documentoGlobal && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs" style={{ color: colors.textSecondary }}>
                      Início do período de referência
                      <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm" style={inp} />
                    </label>
                    <label className="text-xs" style={{ color: colors.textSecondary }}>
                      Fim do período de referência
                      <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm" style={inp} />
                    </label>
                    <select value={tipoAnexo} onChange={(e) => setTipoAnexo(e.target.value as typeof tipoAnexo)} className="px-3 py-2 text-sm" style={inp}>
                      <option value="guia_remessa">Guia de remessa</option>
                      <option value="guia_transporte">Guia de transporte</option>
                      <option value="folha_servico">Folha de serviço</option>
                      <option value="outro">Outro anexo</option>
                    </select>
                    <input type="text" placeholder="Referência do anexo" value={referenciaAnexo} onChange={(e) => setReferenciaAnexo(e.target.value)} className="px-3 py-2 text-sm" style={inp} />
                    <label className="text-xs sm:col-span-2" style={{ color: colors.textSecondary }}>
                      Data do anexo
                      <input type="date" value={dataAnexo} onChange={(e) => setDataAnexo(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm" style={inp} />
                    </label>
                  </div>
                )}

                {documentoTalao && (
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Para consumidor final sem NIF. O formulário está em modo «Não cadastrado» e não enviará NIF.
                  </p>
                )}

                {documentoCredito && (
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    💡 Factura pode ser emitida sem pagamento imediato (crédito). Para pagamento imediato, use <strong>Factura-Recibo</strong>.
                  </p>
                )}
              </div>
            </div>

            {/* ── Cliente ── */}
            <div className="flex flex-col sm:flex-row min-h-[44px]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 w-full sm:w-28 shrink-0" style={{ backgroundColor: colors.hover }}>
                <User size={13} style={{ color: colors.blue }} />
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.blue }}>
                  Cliente
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5 flex flex-wrap items-center gap-2 min-w-0">
                {/* ✅ NOVO — Botões com bloqueio condicional */}
                <div className="inline-flex border overflow-hidden shrink-0" style={{ borderColor: colors.border }}>
                  {(["cadastrado", "avulso"] as ModoCliente[]).map((modo) => {
                    const bloqueadoPorTalao = documentoTalao && modo === "cadastrado";
                    const activo = modoCliente === modo;

                    return (
                      <button
                        key={modo}
                        type="button"
                        onClick={() => handleModoClienteChange(modo)}
                        disabled={bloqueadoPorTalao}
                        title={
                          bloqueadoPorTalao
                            ? "Talão de Venda só aceita consumidor final sem NIF. Use «Não cadastrado»."
                            : undefined
                        }
                        className="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: activo ? colors.primary : "transparent",
                          color: activo ? "white" : bloqueadoPorTalao ? `${colors.textSecondary}80` : colors.textSecondary,
                          opacity: bloqueadoPorTalao && !activo ? 0.5 : 1,
                        }}>
                        {bloqueadoPorTalao && <Lock size={10} />}
                        {modo === "cadastrado" ? "Cadastrado" : "Não cadastrado"}
                      </button>
                    );
                  })}
                </div>

                {modoCliente === "cadastrado" ? (
                  <div className="relative w-full sm:flex-1 sm:min-w-0" ref={clienteDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setClienteDropdownAberto((v) => !v)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm outline-none text-left"
                      style={inp}>
                      <span className="truncate" style={{ color: clienteSelecionado ? colors.text : colors.textSecondary }}>
                        {clienteSelecionado
                          ? `${clienteSelecionado.nome}${clienteSelecionado.nif ? ` — ${formatarNIF(clienteSelecionado.nif)}` : ""}`
                          : "Selecione um cliente…"}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform ${clienteDropdownAberto ? "rotate-180" : ""}`}
                        style={{ color: colors.textSecondary }}
                      />
                    </button>

                    {clienteDropdownAberto && (
                      <div
                        className="absolute z-50 left-0 right-0 mt-1 border shadow-lg max-h-60 overflow-y-auto"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        <button
                          type="button"
                          onClick={() => selecionarCliente(null)}
                          className="w-full px-3 py-2 text-left text-sm border-b last:border-0"
                          style={{
                            backgroundColor: !clienteSelecionado ? `${colors.primary}10` : "transparent",
                            borderColor: colors.border,
                            color: colors.textSecondary,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.hover)}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = !clienteSelecionado ? `${colors.primary}10` : "transparent")
                          }>
                          Selecione um cliente…
                        </button>
                        {clientes.length > 0 ? (
                          clientes.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selecionarCliente(c)}
                              className="w-full px-3 py-2 text-left text-sm border-b last:border-0"
                              style={{
                                backgroundColor: clienteSelecionado?.id === c.id ? `${colors.primary}10` : "transparent",
                                borderColor: colors.border,
                                color: colors.blue,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.hover)}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  clienteSelecionado?.id === c.id ? `${colors.primary}10` : "transparent")
                              }>
                              {c.nome}
                              {c.nif ? ` — ${formatarNIF(c.nif)}` : ""}
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: colors.textSecondary }}>
                            Nenhum cliente encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder={tipoDocumento === "FR" ? "Nome do adquirente (obrigatório)" : "Nome (opcional - Consumidor Final)"}
                      className="w-full sm:flex-1 sm:min-w-0 px-3 py-1.5 text-sm outline-none"
                      style={inp}
                      value={clienteAvulso}
                      onChange={(e) => setClienteAvulso(e.target.value)}
                    />
                    <div className="relative w-full sm:w-36 shrink-0">
                      <input
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        placeholder="NIF / BI (opcional)"
                        maxLength={14}
                        className="w-full px-3 py-1.5 text-sm outline-none"
                        style={{
                          ...inp,
                          borderColor: nifError ? colors.secondary : inp.borderColor,
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

            {/* ── Produto e Serviços ── */}
            <div className="flex flex-col sm:flex-row min-h-[44px]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 w-full sm:w-28 shrink-0" style={{ backgroundColor: colors.hover }}>
                <Package size={13} style={{ color: colors.blue }} />
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.blue }}>
                  Itens
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex border overflow-hidden shrink-0" style={{ borderColor: colors.border }}>
                    {(["produto", "servico"] as TipoItem[]).map((tipo) => {
                      const bloqueadoPorNotaDebito = documentoNotaDebito && tipo === "produto";
                      return (
                        <button
                          key={tipo}
                          type="button"
                          disabled={bloqueadoPorNotaDebito}
                          onClick={() => {
                            setTipoItemSelecionado(tipo);
                            setBuscaItem("");
                            setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
                            setPreviewItem(null);
                            setDropdownAberto(false);
                          }}
                          className="px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: tipoItemSelecionado === tipo ? colors.primary : "transparent",
                            color: tipoItemSelecionado === tipo ? "white" : colors.textSecondary,
                            opacity: bloqueadoPorNotaDebito ? 0.45 : 1,
                          }}>
                          {tipo === "produto" ? "Produto" : "Serviço"}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative w-full sm:flex-1 sm:min-w-[200px]" ref={dropdownRef}>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }} />
                      <input
                        ref={buscaInputRef}
                        type="text"
                        placeholder={
                          tipoItemSelecionado === "produto" ? "Digite código ou nome do produto..." : "Digite código ou nome do serviço..."
                        }
                        className="w-full pl-9 pr-8 py-1.5 text-sm outline-none"
                        style={inp}
                        value={buscaItem}
                        onChange={(e) => {
                          setBuscaItem(e.target.value);
                          setDropdownAberto(true);
                          if (e.target.value === "") {
                            setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
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
                            setFormItem({ produto_id: "", quantidade: 1, desconto: 0 });
                            setPreviewItem(null);
                            setDropdownAberto(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70">
                          <X size={14} style={{ color: colors.textSecondary }} />
                        </button>
                      )}
                    </div>

                    {dropdownAberto && (
                      <div
                        className="absolute z-50 left-0 right-0 mt-1 border shadow-lg max-h-60 overflow-y-auto"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        {itensFiltrados.length > 0 ? (
                          itensFiltrados.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectItem(item)}
                              className="w-full px-3 py-2 text-left text-sm hover:transition-colors flex flex-wrap sm:flex-nowrap justify-between items-center gap-x-3 gap-y-0.5 border-b last:border-0"
                              style={{
                                backgroundColor: formItem.produto_id === item.id ? `${colors.primary}10` : "transparent",
                                borderColor: colors.border,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${colors.hover}`)}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  formItem.produto_id === item.id ? `${colors.primary}10` : "transparent")
                              }>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium" style={{ color: colors.blue }}>
                                  {item.nome}
                                </span>
                                {item.codigo && (
                                  <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>
                                    ({item.codigo})
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-0 sm:ml-3">
                                <span className="text-sm font-semibold" style={{ color: colors.secondary }}>
                                  {formatarPreco(item.preco_venda)}
                                </span>
                                {item.tipo === "produto" && (
                                  <span
                                    className="text-xs ml-2"
                                    style={{
                                      color: item.estoque_atual <= ESTOQUE_MINIMO ? colors.secondary : colors.textSecondary,
                                    }}>
                                    Stock: {item.estoque_atual}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: colors.textSecondary }}>
                            Nenhum {tipoItemSelecionado === "produto" ? "produto" : "serviço"} encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={adicionarItem}
                    disabled={!formItem.produto_id}
                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    style={{ backgroundColor: colors.primary }}>
                    <Plus size={13} />
                    Adicionar
                  </button>

                  {produtoSel && produtoSel.tipo === "produto" && (
                    <span
                      className="text-xs shrink-0"
                      style={{ color: produtoSel.estoque_atual <= ESTOQUE_MINIMO ? colors.secondary : colors.textSecondary }}>
                      disp.: {produtoSel.estoque_atual}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Observações ── */}
            <div className="flex flex-col sm:flex-row min-h-[44px]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 w-full sm:w-28 shrink-0" style={{ backgroundColor: colors.hover }}>
                <FileText size={13} style={{ color: colors.blue }} />
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: colors.blue }}>
                  Obs.
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5">
                <input
                  type="text"
                  placeholder="Observações adicionais…"
                  className="w-full px-3 py-1.5 text-sm outline-none"
                  style={inp}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Alertas contextuais */}
        {alertas.length > 0 && (
          <div className="space-y-1.5">
            {alertas.map((a) => (
              <AlertaContextual key={a.id} alerta={a} colors={colors} />
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CARD 2 — Itens + Resumo Fiscal + Pagamento
        ════════════════════════════════════════════════════════════════ */}
        {itens.length > 0 ? (
          <div className="border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="px-3 py-1.5 flex items-center justify-between gap-2" style={{ backgroundColor: colors.primary }}>
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingCart size={14} className="text-white shrink-0" />
                <span className="text-white font-medium text-xs uppercase tracking-wider truncate">
                  Itens da Venda
                  <span className="ml-1.5 text-white/70 font-normal normal-case">
                    ({itens.length} {itens.length !== 1 ? "itens" : "item"})
                  </span>
                </span>
              </div>
              <button onClick={() => setItens([])} className="shrink-0 text-white/70 hover:text-white text-xs transition-colors">
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
                    <th className="py-2.5 px-3 text-right font-semibold text-xs hidden sm:table-cell" style={{ color: colors.textSecondary }}>
                      Preço unit.
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold text-xs hidden md:table-cell" style={{ color: colors.textSecondary }}>
                      IVA
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold text-xs hidden lg:table-cell" style={{ color: colors.textSecondary }}>
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
                          <span className="font-medium truncate max-w-[120px] sm:max-w-[180px] block" style={{ color: colors.blue }}>
                            {item.descricao}
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => atualizarQtd(item.id, item.quantidade - 1)}
                              className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover }}
                              disabled={item.quantidade <= 1}>
                              <Minus size={11} style={{ color: colors.blue }} />
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
                                if (isNaN(val) || val < 1) atualizarQtd(item.id, 1);
                              }}
                              className="w-12 text-center text-sm font-medium outline-none border rounded"
                              style={{ backgroundColor: colors.card, color: colors.blue, borderColor: colors.border }}
                            />
                            <button
                              onClick={() => atualizarQtd(item.id, item.quantidade + 1)}
                              className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                              style={{ backgroundColor: colors.hover }}
                              disabled={item.quantidade >= maxEst}>
                              <Plus size={11} style={{ color: colors.blue }} />
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
                              style={{ backgroundColor: colors.card, color: colors.blue, borderColor: colors.border }}
                              placeholder="0"
                            />
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right hidden sm:table-cell" style={{ color: colors.textSecondary }}>
                          {formatarPreco(item.preco_venda)}
                        </td>
                        <td className="px-3 py-2.5 text-right hidden md:table-cell" style={{ color: colors.blue }}>
                          {formatarPreco(documentoNotaDebito ? 0 : item.valor_iva)}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right hidden lg:table-cell"
                          style={{ color: item.valor_retencao > 0 ? colors.secondary : colors.textSecondary }}>
                          {item.valor_retencao > 0 ? `−${formatarPreco(item.valor_retencao)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold" style={{ color: colors.secondary }}>
                          {formatarPreco(documentoNotaDebito ? item.base_tributavel - item.valor_retencao : item.subtotal)}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => removerItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
                            style={{ color: colors.secondary }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Resumo Fiscal ── */}
            <div className="border-t" style={{ borderColor: colors.border }}>
              <div className="flex flex-col sm:flex-row">
                <div className="flex-1 px-4 py-3 border-b sm:border-b-0 sm:border-r" style={{ borderColor: colors.border }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    Base
                  </p>
                  <LinhaFiscal label="Subtotal bruto" valor={formatarPreco(subtotalBruto)} colors={colors} />
                  <LinhaFiscal label="Base tributável" valor={formatarPreco(totalBase)} colors={colors} />
                  <LinhaFiscal label="Desconto" valor={`${percentualDesconto.toFixed(2)}%`} cor={colors.textSecondary} colors={colors} />
                  <LinhaFiscal label="Troco" valor={formatarPreco(troco)} cor={colors.blue} colors={colors} />
                </div>
                <div className="flex-1 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                    Impostos
                  </p>
                  <LinhaFiscal label="IVA" valor={formatarPreco(totalIva)} colors={colors} />
                  {totalRetencao > 0 && (
                    <LinhaFiscal label="Retenção" valor={`−${formatarPreco(totalRetencao)}`} cor={colors.secondary} colors={colors} />
                  )}
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                    <LinhaFiscal label="Total" valor={formatarPreco(totalLiquido)} cor={colors.secondary} negrito colors={colors} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Pagamento ── */}
            <div className="border-t px-4 py-3" style={{ borderColor: colors.border }}>
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="w-full lg:flex-1 lg:min-w-[140px]">
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Método de Pagamento
                  </label>
                  <div className="relative w-full" ref={metodoDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setMetodoDropdownAberto((v) => !v)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm outline-none text-left"
                      style={inp}>
                      <span style={{ color: colors.text }}>{METODOS_PAGAMENTO.find((m) => m.value === formPagamento.metodo)?.label}</span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform ${metodoDropdownAberto ? "rotate-180" : ""}`}
                        style={{ color: colors.textSecondary }}
                      />
                    </button>

                    {metodoDropdownAberto && (
                      <div
                        className="absolute z-50 left-0 right-0 mt-1 border shadow-lg max-h-60 overflow-y-auto"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        {METODOS_PAGAMENTO.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => selecionarMetodoPagamento(m.value)}
                            className="w-full px-3 py-2 text-left text-sm border-b last:border-0"
                            style={{
                              backgroundColor: formPagamento.metodo === m.value ? `${colors.primary}10` : "transparent",
                              borderColor: colors.border,
                              color: colors.text,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.hover)}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                formPagamento.metodo === m.value ? `${colors.primary}10` : "transparent")
                            }>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full lg:flex-1 lg:min-w-[140px]">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                      {documentoCredito
                        ? "Pagamento recebido (opcional)"
                        : tipoDocumento === "FG"
                          ? "Pagamento recebido (opcional)"
                          : "Valor a pagar"}
                    </label>
                    {falta > 0 && (
                      <span className="text-xs font-semibold flex items-center gap-1 text-right" style={{ color: colors.danger }}>
                        <AlertTriangle size={12} className="shrink-0" />
                        Faltam {formatarPreco(falta)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Calculator size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }} />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={formatarPreco(totalLiquido)}
                      value={formPagamento.valor_pago}
                      onChange={(e) =>
                        setFormPagamento((p) => ({
                          ...p,
                          valor_pago: e.target.value,
                        }))
                      }
                      className="w-full pl-9 pr-3 py-2 text-sm font-semibold outline-none"
                      style={{
                        ...inp,
                        borderWidth: 2,
                        borderColor: falta > 0 ? colors.danger : pagamentoSuficiente ? colors.border : inp.borderColor,
                        color: pagamentoSuficiente ? colors.blue : colors.secondary,
                      }}
                    />
                  </div>
                </div>

                <div className="w-full lg:w-44 shrink-0">
                  <button
                    type="button"
                    onClick={finalizarVenda}
                    disabled={loading || !podeFinalizar()}
                    title={
                      !podeFinalizar() && !loading
                        ? alertas.find((a) => a.tipo === "error" || a.tipo === "warning")?.mensagem ??
                          "Preencha os dados para continuar"
                        : undefined
                    }
                    className="w-full py-2.5 font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.secondary }}>
                    {loading ? (
                      <>
                        <div className="w-4 rounded-full h-4 border-2 border-white border-t-transparent animate-spin" />A processar…
                      </>
                    ) : !pagamentoSuficiente ? (
                      <>
                        <AlertTriangle size={15} />
                        Pagar
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        Finalizar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed" style={{ borderColor: colors.border }}>
            <ShoppingCart size={28} className="mx-auto mb-2" style={{ color: colors.border }} />
            <p className="text-sm px-4" style={{ color: colors.textSecondary }}>
              Use o scanner ou digite o código do produto para adicionar automaticamente
            </p>
            <p className="text-xs mt-1 px-4" style={{ color: colors.textSecondary }}>
              Pressione ENTER para adicionar ao carrinho
            </p>
          </div>
        )}
      </div>
    </MainEmpresa>
  );
}