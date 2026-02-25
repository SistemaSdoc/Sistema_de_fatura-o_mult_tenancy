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
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface FormData {
  tipo: TipoProduto;
  categoria_id: string;
  codigo: string;
  nome: string;
  preco_compra: string;
  preco_venda: string;
  taxa_iva: string;
  sujeito_iva: boolean;
  estoque_atual: string;
  estoque_minimo: string;
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
    preco_compra: "",
    preco_venda: "",
    taxa_iva: "14",
    sujeito_iva: true,
    estoque_atual: "0",
    estoque_minimo: "5",
    retencao: "0",
    duracao_estimada: "1",
    unidade_medida: "hora",
  });

  useEffect(() => {
    async function carregarCategorias() {
      try {
        const data = await produtoService.listarCategorias();
        setCategorias(data.filter((c) => !c.deleted_at));
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      } finally {
        setLoadingCategorias(false);
      }
    }
    carregarCategorias();
  }, []);

  const isServico = formData.tipo === "servico";

  // Cálculos
  const margemLucro = React.useMemo(() => {
    if (isServico) return 0;
    const compra = parseFloat(formData.preco_compra) || 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    if (!compra || compra <= 0) return 0;
    return calcularMargemLucro(compra, venda);
  }, [formData.preco_compra, formData.preco_venda, isServico]);

  const precoComIva = React.useMemo(() => {
    const venda = parseFloat(formData.preco_venda) || 0;
    const iva = parseFloat(formData.taxa_iva) || 0;
    if (!formData.sujeito_iva) return venda;
    return venda * (1 + iva / 100);
  }, [formData.preco_venda, formData.taxa_iva, formData.sujeito_iva]);

  const valorRetencao = React.useMemo(() => {
    if (!isServico) return 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    const retencao = parseFloat(formData.retencao) || 0;
    return venda * (retencao / 100);
  }, [formData.preco_venda, formData.retencao, isServico]);

  const valorLiquido = React.useMemo(() => {
    const venda = parseFloat(formData.preco_venda) || 0;
    return isServico ? venda - valorRetencao : venda;
  }, [formData.preco_venda, valorRetencao, isServico]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleTipoChange = (tipo: TipoProduto) => {
    setFormData((prev) => ({
      ...prev,
      tipo,
      categoria_id: tipo === "servico" ? "" : prev.categoria_id,
      preco_compra: tipo === "servico" ? "0" : prev.preco_compra,
      estoque_atual: tipo === "servico" ? "0" : prev.estoque_atual,
      estoque_minimo: tipo === "servico" ? "0" : prev.estoque_minimo,
      retencao: tipo === "produto" ? "0" : prev.retencao,
    }));
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nome.trim()) newErrors.nome = "Nome obrigatório";
    if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) {
      newErrors.preco_venda = "Preço de venda obrigatório";
    }
    if (!isServico) {
      if (!formData.categoria_id) newErrors.categoria_id = "Categoria obrigatória";
      if (!formData.preco_compra || parseFloat(formData.preco_compra) < 0) {
        newErrors.preco_compra = "Preço de compra obrigatório";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const dados: CriarProdutoInput = {
        tipo: formData.tipo,
        nome: formData.nome.trim(),
        preco_venda: parseFloat(formData.preco_venda),
        taxa_iva: parseFloat(formData.taxa_iva) || 0,
        sujeito_iva: formData.sujeito_iva,
        status: "ativo",
      };

      if (isServico) {
        dados.retencao = parseFloat(formData.retencao) || 0;
        dados.duracao_estimada = `${formData.duracao_estimada} ${formData.unidade_medida}`;
        dados.unidade_medida = formData.unidade_medida;
        dados.categoria_id = null;
        dados.codigo = null;
        dados.preco_compra = 0;
        dados.estoque_atual = 0;
        dados.estoque_minimo = 0;
      } else {
        dados.categoria_id = formData.categoria_id || null;
        dados.codigo = formData.codigo.trim() || null;
        dados.preco_compra = parseFloat(formData.preco_compra) || 0;
        dados.estoque_atual = parseInt(formData.estoque_atual) || 0;
        dados.estoque_minimo = parseInt(formData.estoque_minimo) || 0;
      }

      const resposta = await produtoService.criarProduto(dados);
      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/Produtos_servicos/Stock`), 1000);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Erro ao criar. Tente novamente.";
      if (error?.response?.data?.errors) {
        const errs: FormErrors = {};
        Object.entries(error.response.data.errors).forEach(([k, v]) => {
          errs[k] = Array.isArray(v) ? v[0] : (v as string);
        });
        setErrors(errs);
      } else {
        setErrors({ submit: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainEmpresa>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#123859]">
              Novo {isServico ? "Serviço" : "Produto"}
            </h1>
          </div>
        </div>

        {/* Alertas */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Criado com sucesso! Redirecionando...</span>
          </div>
        )}

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTipoChange("produto")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${!isServico
                    ? "border-[#123859] bg-[#123859]/5 text-[#123859]"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
              >
                <Package className="w-5 h-5" />
                <span className="font-medium">Produto</span>
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange("servico")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${isServico
                    ? "border-[#F9941F] bg-[#F9941F]/5 text-[#F9941F]"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
              >
                <Wrench className="w-5 h-5" />
                <span className="font-medium">Serviço</span>
              </button>
            </div>
          </div>

          {/* Informações Principais */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
            {/* Nome + Categoria/Código em grid */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder={isServico ? "Ex: Consultoria TI" : "Ex: Notebook Dell"}
                  className={`w-full px-3 py-2 rounded-lg border ${errors.nome ? "border-red-500" : "border-gray-300"
                    } focus:ring-2 focus:ring-[#123859] focus:border-transparent outline-none`}
                />
                {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome}</p>}
              </div>

              {!isServico && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="categoria_id"
                      value={formData.categoria_id}
                      onChange={handleChange}
                      disabled={loadingCategorias}
                      className={`w-full px-3 py-2 rounded-lg border ${errors.categoria_id ? "border-red-500" : "border-gray-300"
                        } focus:ring-2 focus:ring-[#123859] outline-none bg-white`}
                    >
                      <option value="">
                        {loadingCategorias ? "Carregando..." : "Selecione"}
                      </option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                    {errors.categoria_id && (
                      <p className="mt-1 text-xs text-red-500">{errors.categoria_id}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código/SKU
                    </label>
                    <input
                      type="text"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleChange}
                      placeholder="PROD-001"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preços - Compacto */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preço Compra (apenas produtos) */}
              {!isServico && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço Compra <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Kz</span>
                    <input
                      type="number"
                      name="preco_compra"
                      value={formData.preco_compra}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className={`w-full pl-10 pr-3 py-2 rounded-lg border ${errors.preco_compra ? "border-red-500" : "border-gray-300"
                        } focus:ring-2 focus:ring-[#123859] outline-none`}
                    />
                  </div>
                </div>
              )}

              {/* Preço Venda */}
              <div className={isServico ? "md:col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Venda <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Kz</span>
                  <input
                    type="number"
                    name="preco_venda"
                    value={formData.preco_venda}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    className={`w-full pl-10 pr-3 py-2 rounded-lg border ${errors.preco_venda ? "border-red-500" : "border-gray-300"
                      } focus:ring-2 focus:ring-[#123859] outline-none`}
                  />
                </div>
              </div>
            </div>

            {/* IVA e Retenção em linha */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="sujeito_iva"
                  checked={formData.sujeito_iva}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#123859] rounded"
                />
                <span className="text-sm text-gray-700">IVA</span>
              </label>

              {formData.sujeito_iva && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="taxa_iva"
                    value={formData.taxa_iva}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-20 px-2 py-1 rounded border border-gray-300 text-sm"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              )}

              {isServico && (
                <>
                  <div className="w-px h-4 bg-gray-300" />
                  <span className="text-sm text-gray-500">Retenção:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="retencao"
                      value={formData.retencao}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-20 px-2 py-1 rounded border border-gray-300 text-sm"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </>
              )}
            </div>

            {/* Preview Compacto */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calculator className="w-4 h-4" />
                <span>Total c/ IVA:</span>
                <span className="font-semibold text-[#123859]">{formatarPreco(precoComIva)}</span>
              </div>

              {!isServico ? (
                <span className={`font-medium ${margemLucro >= 0 ? "text-green-600" : "text-red-600"}`}>
                  Margem: {margemLucro.toFixed(1)}%
                </span>
              ) : valorRetencao > 0 ? (
                <span className="text-orange-600 font-medium">
                  Líquido: {formatarPreco(valorLiquido)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Campos Específicos */}
          {!isServico ? (
            // Estoque (Produtos)
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    name="estoque_atual"
                    value={formData.estoque_atual}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    name="estoque_minimo"
                    value={formData.estoque_minimo}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Duração (Serviços)
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração Estimada
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="duracao_estimada"
                  value={formData.duracao_estimada}
                  onChange={handleChange}
                  min="1"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none"
                />
                <select
                  name="unidade_medida"
                  value={formData.unidade_medida}
                  onChange={handleChange}
                  className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#123859] outline-none bg-white"
                >
                  <option value="hora">Hora(s)</option>
                  <option value="dia">Dia(s)</option>
                  <option value="semana">Semana(s)</option>
                  <option value="mes">Mês(es)</option>
                </select>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-[#123859] hover:bg-[#1a4d7a] text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </MainEmpresa>
  );
}