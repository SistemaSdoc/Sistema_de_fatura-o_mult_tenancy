// src/app/(empresa)/produtos/novo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  produtoService,
  Categoria,
  TipoProduto,
  StatusProduto,
  UnidadeMedida,
  formatarPreco,
  calcularMargemLucro,
  CriarProdutoInput,
} from "@/services/produtos";
import {
  Package,
  Wrench,
  Save,
  ArrowLeft,
  Calculator,
  Tag,
  Box,
  DollarSign,
  Percent,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Clock,
} from "lucide-react";

interface FormData {
  tipo: TipoProduto;
  categoria_id: string;
  codigo: string;
  nome: string;
  descricao: string;
  preco_compra: string;
  preco_venda: string;
  taxa_iva: string;
  sujeito_iva: boolean;
  estoque_atual: string;
  estoque_minimo: string;
  status: StatusProduto;
  // Campos específicos para serviço
  retencao: string;
  duracao_estimada: string;
  unidade_medida: UnidadeMedida;
}

interface FormErrors {
  [key: string]: string;
}

export default function NovoProdutoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    tipo: "produto",
    categoria_id: "",
    codigo: "",
    nome: "",
    descricao: "",
    preco_compra: "",
    preco_venda: "",
    taxa_iva: "14",
    sujeito_iva: true,
    estoque_atual: "0",
    estoque_minimo: "5",
    status: "ativo",
    // Serviço
    retencao: "0",
    duracao_estimada: "",
    unidade_medida: "hora",
  });

  // Carregar categorias ao montar
  useEffect(() => {
    async function carregarCategorias() {
      try {
        const data = await produtoService.listarCategorias();
        // Filtrar apenas categorias ativas (não deletadas)
        const categoriasAtivas = data.filter((c) => !c.deleted_at);
        setCategorias(categoriasAtivas);
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
        setErrors((prev) => ({
          ...prev,
          categorias: "Erro ao carregar categorias. Tente recarregar a página.",
        }));
      } finally {
        setLoadingCategorias(false);
      }
    }
    carregarCategorias();
  }, []);

  // Calcular margem de lucro (apenas produtos)
  const margemLucro = React.useMemo(() => {
    if (formData.tipo === "servico") return 0;
    const compra = parseFloat(formData.preco_compra) || 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    if (!compra || compra <= 0) return 0;
    return calcularMargemLucro(compra, venda);
  }, [formData.preco_compra, formData.preco_venda, formData.tipo]);

  // Calcular preço com IVA
  const precoComIva = React.useMemo(() => {
    const venda = parseFloat(formData.preco_venda) || 0;
    const iva = parseFloat(formData.taxa_iva) || 0;
    if (!formData.sujeito_iva) return venda;
    return venda * (1 + iva / 100);
  }, [formData.preco_venda, formData.taxa_iva, formData.sujeito_iva]);

  // Calcular retenção na fonte (apenas serviços)
  const valorRetencao = React.useMemo(() => {
    if (formData.tipo === "produto") return 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    const retencao = parseFloat(formData.retencao) || 0;
    return venda * (retencao / 100);
  }, [formData.preco_venda, formData.retencao, formData.tipo]);

  // Valor líquido do serviço
  const valorLiquidoServico = React.useMemo(() => {
    if (formData.tipo === "produto") return 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    return venda - valorRetencao;
  }, [formData.preco_venda, valorRetencao, formData.tipo]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Limpar erro do campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleTipoChange = (tipo: TipoProduto) => {
    setFormData((prev) => ({
      ...prev,
      tipo,
      // Resetar campos específicos ao trocar de tipo
      estoque_atual: tipo === "servico" ? "0" : prev.estoque_atual,
      estoque_minimo: tipo === "servico" ? "0" : prev.estoque_minimo,
      preco_compra: tipo === "servico" ? "0" : prev.preco_compra,
      codigo: tipo === "servico" ? "" : prev.codigo,
      categoria_id: tipo === "servico" ? "" : prev.categoria_id,
      // Resetar campos de serviço se voltar para produto
      retencao: tipo === "produto" ? "0" : prev.retencao,
      duracao_estimada: tipo === "produto" ? "" : prev.duracao_estimada,
      unidade_medida: tipo === "produto" ? "hora" : prev.unidade_medida,
    }));

    // Limpar erros ao trocar tipo
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.tipo === "produto") {
      if (!formData.categoria_id) {
        newErrors.categoria_id = "Selecione uma categoria";
      }
      if (!formData.preco_compra || parseFloat(formData.preco_compra) < 0) {
        newErrors.preco_compra = "Preço de compra é obrigatório para produtos";
      }
    }

    if (formData.tipo === "servico") {
      if (!formData.duracao_estimada || parseInt(formData.duracao_estimada) <= 0) {
        newErrors.duracao_estimada = "Duração estimada é obrigatória para serviços";
      }
    }

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    } else if (formData.nome.trim().length < 3) {
      newErrors.nome = "Nome deve ter pelo menos 3 caracteres";
    }

    if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) {
      newErrors.preco_venda = "Preço de venda deve ser maior que zero";
    }

    // Validação de estoque mínimo não maior que atual
    if (formData.tipo === "produto") {
      const atual = parseInt(formData.estoque_atual) || 0;
      const minimo = parseInt(formData.estoque_minimo) || 0;
      if (minimo > atual && atual > 0) {
        newErrors.estoque_minimo = "Estoque mínimo não pode ser maior que o estoque atual";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Scroll para o primeiro erro
      const firstError = document.querySelector(".border-red-500");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    setSuccess(false);
    setErrors({});

    try {
      // Preparar dados para envio conforme interface CriarProdutoInput
      const dadosParaEnvio: CriarProdutoInput = {
        tipo: formData.tipo,
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        preco_venda: parseFloat(formData.preco_venda),
        taxa_iva: parseFloat(formData.taxa_iva) || 0,
        sujeito_iva: formData.sujeito_iva,
        status: formData.status,
      };

      if (formData.tipo === "produto") {
        dadosParaEnvio.categoria_id = formData.categoria_id || null;
        dadosParaEnvio.codigo = formData.codigo.trim() || null;
        dadosParaEnvio.preco_compra = parseFloat(formData.preco_compra) || 0;
        dadosParaEnvio.estoque_atual = parseInt(formData.estoque_atual) || 0;
        dadosParaEnvio.estoque_minimo = parseInt(formData.estoque_minimo) || 0;
      } else {
        // Serviço
        dadosParaEnvio.retencao = parseFloat(formData.retencao) || 0;
        dadosParaEnvio.duracao_estimada = formData.duracao_estimada;
        dadosParaEnvio.unidade_medida = formData.unidade_medida;
        // Campos não aplicáveis a serviços
        dadosParaEnvio.categoria_id = null;
        dadosParaEnvio.codigo = null;
        dadosParaEnvio.preco_compra = 0;
        dadosParaEnvio.estoque_atual = 0;
        dadosParaEnvio.estoque_minimo = 0;
      }

      const resposta = await produtoService.criarProduto(dadosParaEnvio);
      setSuccess(true);

      // Redirecionar após sucesso
      setTimeout(() => {
        router.push(`/produtos/${resposta.produto.id}`);
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao criar produto:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao criar produto. Tente novamente.";

      // Verificar se é erro de validação do Laravel
      if (error?.response?.data?.errors) {
        const laravelErrors = error.response.data.errors;
        const formattedErrors: FormErrors = {};

        Object.keys(laravelErrors).forEach((key) => {
          formattedErrors[key] = Array.isArray(laravelErrors[key])
            ? laravelErrors[key][0]
            : laravelErrors[key];
        });

        setErrors(formattedErrors);
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const isServico = formData.tipo === "servico";

  return (
    <MainEmpresa>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#123859]">
              Novo {isServico ? "Serviço" : "Produto"}
            </h1>
            <p className="text-gray-500 text-sm">
              Cadastre um novo {isServico ? "serviço" : "produto"} no sistema
            </p>
          </div>
        </div>

        {/* Alertas */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 animate-fade-in">
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isServico ? "Serviço" : "Produto"} criado com sucesso! Redirecionando...
            </span>
          </div>
        )}

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo: Produto ou Serviço */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Tipo de Item
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTipoChange("produto")}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${formData.tipo === "produto"
                    ? "border-[#123859] bg-[#123859]/5 text-[#123859]"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
              >
                <Package className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Produto</div>
                  <div className="text-xs opacity-75">Com controle de estoque</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange("servico")}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${formData.tipo === "servico"
                    ? "border-[#F9941F] bg-[#F9941F]/5 text-[#F9941F]"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
              >
                <Wrench className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Serviço</div>
                  <div className="text-xs opacity-75">Sem controle de estoque</div>
                </div>
              </button>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Informações Básicas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Categoria - APENAS PRODUTOS */}
              {!isServico && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="categoria_id"
                    value={formData.categoria_id}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.categoria_id ? "border-red-500" : "border-gray-300"
                      } focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all`}
                    disabled={loadingCategorias}
                  >
                    <option value="">
                      {loadingCategorias ? "Carregando categorias..." : "Selecione uma categoria"}
                    </option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                  {errors.categoria_id && (
                    <p className="mt-1 text-sm text-red-500">{errors.categoria_id}</p>
                  )}
                </div>
              )}

              {/* Código/SKU - APENAS PRODUTOS */}
              {!isServico && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código/SKU
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    placeholder="Ex: PROD-001"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Código único para identificação do produto
                  </p>
                </div>
              )}

              {/* Nome */}
              <div className={isServico ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder={isServico ? "Ex: Instalação de Rede" : "Ex: Computador Dell"}
                  className={`w-full px-4 py-2.5 rounded-lg border ${errors.nome ? "border-red-500" : "border-gray-300"
                    } focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all`}
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-500">{errors.nome}</p>
                )}
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Descreva o item..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Preços */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Preços e Tributação
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preço de Compra - APENAS PRODUTOS */}
              {!isServico && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço de Compra <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      AOA
                    </span>
                    <input
                      type="number"
                      name="preco_compra"
                      value={formData.preco_compra}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      className={`w-full pl-12 pr-4 py-2.5 rounded-lg border ${errors.preco_compra ? "border-red-500" : "border-gray-300"
                        } focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all`}
                    />
                  </div>
                  {errors.preco_compra && (
                    <p className="mt-1 text-sm text-red-500">{errors.preco_compra}</p>
                  )}
                </div>
              )}

              {/* Preço de Venda */}
              <div className={isServico ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço de Venda <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    AOA
                  </span>
                  <input
                    type="number"
                    name="preco_venda"
                    value={formData.preco_venda}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    placeholder="0,00"
                    className={`w-full pl-12 pr-4 py-2.5 rounded-lg border ${errors.preco_venda ? "border-red-500" : "border-gray-300"
                      } focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all`}
                  />
                </div>
                {errors.preco_venda && (
                  <p className="mt-1 text-sm text-red-500">{errors.preco_venda}</p>
                )}
              </div>

              {/* IVA */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Percent className="w-4 h-4" />
                  Taxa de IVA
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    name="taxa_iva"
                    value={formData.taxa_iva}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={!formData.sujeito_iva}
                    className={`w-32 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all ${!formData.sujeito_iva ? "bg-gray-100 text-gray-500" : ""
                      }`}
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="sujeito_iva"
                      checked={formData.sujeito_iva}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#123859] rounded focus:ring-[#123859]"
                    />
                    <span className="text-sm text-gray-700">Sujeito a IVA</span>
                  </label>
                </div>
              </div>

              {/* Retenção na Fonte - APENAS SERVIÇOS */}
              {isServico && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4" />
                    Retenção na Fonte (IRT)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="retencao"
                      value={formData.retencao}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-32 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Percentual de retenção de imposto de retenção na fonte
                  </p>
                </div>
              )}

              {/* Preview de Preços */}
              <div
                className={`bg-gray-50 p-4 rounded-lg ${isServico ? "md:col-span-2" : "md:col-span-2"
                  }`}
              >
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                  <Calculator className="w-4 h-4" />
                  Resumo de Preços
                </div>
                <div
                  className={`grid gap-4 text-sm ${isServico ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-3"
                    }`}
                >
                  <div>
                    <span className="text-gray-500 block">Preço Base</span>
                    <span className="font-semibold text-[#123859]">
                      {formatarPreco(parseFloat(formData.preco_venda) || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Preço Final (c/ IVA)</span>
                    <span className="font-semibold text-[#123859]">
                      {formatarPreco(precoComIva)}
                    </span>
                  </div>
                  {!isServico ? (
                    <div>
                      <span className="text-gray-500 block">Margem de Lucro</span>
                      <span
                        className={`font-semibold ${margemLucro >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                      >
                        {margemLucro.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-500 block">Valor Líquido</span>
                      <span className="font-semibold text-green-600">
                        {formatarPreco(valorLiquidoServico)}
                      </span>
                      {valorRetencao > 0 && (
                        <span className="block text-xs text-red-500">
                          - Retenção: {formatarPreco(valorRetencao)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Estoque - APENAS PRODUTOS */}
          {!isServico && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-[#123859] mb-4 flex items-center gap-2">
                <Box className="w-5 h-5" />
                Controle de Estoque
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    name="estoque_atual"
                    value={formData.estoque_atual}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    name="estoque_minimo"
                    value={formData.estoque_minimo}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.estoque_minimo ? "border-red-500" : "border-gray-300"
                      } focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all`}
                  />
                  {errors.estoque_minimo && (
                    <p className="mt-1 text-sm text-red-500">{errors.estoque_minimo}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Alerta quando estoque atingir este valor
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Duração Estimada - APENAS SERVIÇOS */}
          {isServico && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-[#F9941F] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Informações do Serviço
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duração Estimada <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="duracao_estimada"
                      value={formData.duracao_estimada}
                      onChange={handleChange}
                      min="1"
                      placeholder="Ex: 2"
                      className={`flex-1 px-4 py-2.5 rounded-lg border ${errors.duracao_estimada ? "border-red-500" : "border-gray-300"
                        } focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all`}
                    />
                    <select
                      name="unidade_medida"
                      value={formData.unidade_medida}
                      onChange={handleChange}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none bg-white"
                    >
                      <option value="hora">Hora(s)</option>
                      <option value="dia">Dia(s)</option>
                      <option value="semana">Semana(s)</option>
                      <option value="mes">Mês(es)</option>
                    </select>
                  </div>
                  {errors.duracao_estimada && (
                    <p className="mt-1 text-sm text-red-500">{errors.duracao_estimada}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="ativo"
                  checked={formData.status === "ativo"}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#123859] focus:ring-[#123859]"
                />
                <span className="text-sm text-gray-700">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inativo"
                  checked={formData.status === "inativo"}
                  onChange={handleChange}
                  className="w-4 h-4 text-gray-400 focus:ring-gray-400"
                />
                <span className="text-sm text-gray-700">Inativo</span>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#123859] hover:bg-[#1a4d7a] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar {isServico ? "Serviço" : "Produto"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </MainEmpresa>
  );
}