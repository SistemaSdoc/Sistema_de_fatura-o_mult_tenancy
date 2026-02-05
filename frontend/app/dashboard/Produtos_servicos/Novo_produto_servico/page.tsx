// src/app/(empresa)/produtos/novo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import { produtoService, Categoria, TipoProduto, StatusProduto } from "@/services/produtos";
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
  });

  // Carregar categorias ao montar
  useEffect(() => {
    async function carregarCategorias() {
      try {
        const data = await produtoService.listarCategorias();
        setCategorias(data);
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      } finally {
        setLoadingCategorias(false);
      }
    }
    carregarCategorias();
  }, []);

  // Calcular margem de lucro
  const margemLucro = React.useMemo(() => {
    const compra = parseFloat(formData.preco_compra) || 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    if (!compra) return 0;
    return ((venda - compra) / compra) * 100;
  }, [formData.preco_compra, formData.preco_venda]);

  // Calcular preço com IVA
  const precoComIva = React.useMemo(() => {
    const venda = parseFloat(formData.preco_venda) || 0;
    const iva = parseFloat(formData.taxa_iva) || 0;
    if (!formData.sujeito_iva) return venda;
    return venda * (1 + iva / 100);
  }, [formData.preco_venda, formData.taxa_iva, formData.sujeito_iva]);

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
      // Resetar campos de estoque se for serviço
      estoque_atual: tipo === "servico" ? "0" : prev.estoque_atual,
      estoque_minimo: tipo === "servico" ? "0" : prev.estoque_minimo,
      // Serviços geralmente não têm preço de compra
      preco_compra: tipo === "servico" ? "0" : prev.preco_compra,
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.categoria_id) {
      newErrors.categoria_id = "Selecione uma categoria";
    }
    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) {
      newErrors.preco_venda = "Preço de venda deve ser maior que zero";
    }
    if (formData.tipo === "produto" && (!formData.preco_compra || parseFloat(formData.preco_compra) < 0)) {
      newErrors.preco_compra = "Preço de compra é obrigatório para produtos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setSuccess(false);

    try {
      const dadosParaEnvio = {
        ...formData,
        preco_compra: parseFloat(formData.preco_compra) || 0,
        preco_venda: parseFloat(formData.preco_venda),
        taxa_iva: parseFloat(formData.taxa_iva) || 0,
        estoque_atual: parseInt(formData.estoque_atual) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 0,
      };

      await produtoService.criarProduto(dadosParaEnvio);
      setSuccess(true);

      // Redirecionar após 1.5 segundos
      setTimeout(() => {
        router.push("/dashboard/Produtos_servicos/Stock");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao criar produto:", error);
      setErrors({
        submit: error.response?.data?.message || "Erro ao criar produto. Tente novamente.",
      });
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
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#123859]">Novo Produto/Serviço</h1>
            <p className="text-gray-500 text-sm">Cadastre um novo item no sistema</p>
          </div>
        </div>

        {/* Alertas */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span>Produto criado com sucesso! Redirecionando...</span>
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
              {/* Categoria */}
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
                    {loadingCategorias ? "Carregando..." : "Selecione uma categoria"}
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

              {/* Código */}
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
              </div>

              {/* Nome */}
              <div>
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
              {/* Preço de Compra (oculto para serviços ou opcional) */}
              {!isServico && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço de Compra <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">AOA</span>
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">AOA</span>
                  <input
                    type="number"
                    name="preco_venda"
                    value={formData.preco_venda}
                    onChange={handleChange}
                    min="0"
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

              {/* Preview de Preços */}
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                  <Calculator className="w-4 h-4" />
                  Resumo de Preços
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Preço Final (s/ IVA)</span>
                    <span className="font-semibold text-[#123859]">
                      {(parseFloat(formData.preco_venda) || 0).toLocaleString("pt-PT", {
                        style: "currency",
                        currency: "AOA",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Preço Final (c/ IVA)</span>
                    <span className="font-semibold text-[#123859]">
                      {precoComIva.toLocaleString("pt-PT", {
                        style: "currency",
                        currency: "AOA",
                      })}
                    </span>
                  </div>
                  {!isServico && (
                    <div>
                      <span className="text-gray-500 block">Margem de Lucro</span>
                      <span className={`font-semibold ${margemLucro >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {margemLucro.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Estoque (apenas para produtos) */}
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
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Alerta quando estoque atingir este valor
                  </p>
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