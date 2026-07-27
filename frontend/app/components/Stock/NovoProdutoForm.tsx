"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  produtoService,
  Categoria,
  TipoProduto,
  UnidadeMedida,
  TipoPreco,
  CodigoIsencao,
  formatarPreco,
  calcularPrecoVenda,
  CriarProdutoInput,
  getTipoPrecoLabel,
  getFormulaDescricao,
} from "@/services/produtos";
import { categoriaService, getTaxaIVALabel } from "@/services/categorias";
import {
  Package,
  Save,
  ArrowLeft,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  DollarSign,
  Tag,
  HelpCircle,
} from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

interface FormData {
  tipo: TipoProduto;
  categoria_id: string;
  codigo: string;
  nome: string;
  descricao: string;

  // Campos de cálculo de preço
  tipo_preco: TipoPreco;
  preco_compra: string;
  despesas_adicionais: string;
  margem_lucro: string;
  markup: string;
  preco_venda: string;

  estoque_atual: string;
  estoque_minimo: string;
}

interface FormErrors {
  [key: string]: string;
}

interface NovoProdutoFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialTipo?: TipoProduto;
}

export function NovoProdutoForm({ onSuccess, onCancel, initialTipo = "produto" }: NovoProdutoFormProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    tipo: initialTipo,
    categoria_id: "",
    codigo: "",
    nome: "",
    descricao: "",

    // Campos de cálculo de preço
    tipo_preco: "margem",
    preco_compra: "",
    despesas_adicionais: "0",
    margem_lucro: "33",
    markup: "33",
    preco_venda: "",

    estoque_atual: "0",
    estoque_minimo: "5",
  });

  // Carregar categorias com dados de IVA
  useEffect(() => {
    async function carregarCategorias() {
      try {
        const response = await categoriaService.paraSelectProdutos();
        setCategorias(response.categorias);
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      } finally {
        setLoadingCategorias(false);
      }
    }
    carregarCategorias();
  }, []);

  // Atualizar categoria selecionada quando mudar
  useEffect(() => {
    if (formData.categoria_id) {
      const cat = categorias.find((c) => c.id === formData.categoria_id);
      setCategoriaSelecionada(cat || null);
    } else {
      setCategoriaSelecionada(null);
    }
  }, [formData.categoria_id, categorias]);

  // ===== CÁLCULOS AUTOMÁTICOS =====

  const precoVendaCalculado = useMemo(() => {
    const compra = parseFloat(formData.preco_compra) || 0;
    const despesas = parseFloat(formData.despesas_adicionais) || 0;
    const base = compra + despesas;

    switch (formData.tipo_preco) {
      case "margem": {
        const margem = parseFloat(formData.margem_lucro) || 0;
        if (margem <= 0 || margem >= 100) return base;
        return base / (1 - margem / 100);
      }
      case "markup": {
        const markup = parseFloat(formData.markup) || 0;
        return base * (1 + markup / 100);
      }
      case "fixo":
      default:
        return parseFloat(formData.preco_venda) || base;
    }
  }, [
    formData.preco_compra,
    formData.despesas_adicionais,
    formData.tipo_preco,
    formData.margem_lucro,
    formData.markup,
    formData.preco_venda,
  ]);

  useEffect(() => {
    if (formData.tipo_preco !== "fixo") {
      const calculado = Math.round(precoVendaCalculado * 100) / 100;
      setFormData((prev) => ({
        ...prev,
        preco_venda: calculado.toString(),
      }));
    }
  }, [precoVendaCalculado, formData.tipo_preco]);

  const custoTotal = useMemo(() => {
    return (parseFloat(formData.preco_compra) || 0) + (parseFloat(formData.despesas_adicionais) || 0);
  }, [formData.preco_compra, formData.despesas_adicionais]);

  const lucroBruto = useMemo(() => {
    const venda = parseFloat(formData.preco_venda) || 0;
    return venda - custoTotal;
  }, [formData.preco_venda, custoTotal]);

  const margemReal = useMemo(() => {
    const venda = parseFloat(formData.preco_venda) || 0;
    if (venda <= 0) return 0;
    return (lucroBruto / venda) * 100;
  }, [lucroBruto, formData.preco_venda]);

  const markupReal = useMemo(() => {
    if (custoTotal <= 0) return 0;
    return (lucroBruto / custoTotal) * 100;
  }, [lucroBruto, custoTotal]);

  // IVA vem da categoria
  const taxaIVA = useMemo(() => {
    return categoriaSelecionada?.taxa_iva || 0;
  }, [categoriaSelecionada]);

  const sujeitoIVA = useMemo(() => {
    return categoriaSelecionada?.sujeito_iva ?? true;
  }, [categoriaSelecionada]);

  const precoComIva = useMemo(() => {
    const venda = parseFloat(formData.preco_venda) || 0;
    if (!sujeitoIVA) return venda;
    return venda * (1 + taxaIVA / 100);
  }, [formData.preco_venda, taxaIVA, sujeitoIVA]);

  // ===== HANDLERS =====

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleTipoPrecoChange = (tipoPreco: TipoPreco) => {
    setFormData((prev) => ({
      ...prev,
      tipo_preco: tipoPreco,
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nome.trim()) newErrors.nome = "Nome obrigatório";

    const precoVenda = parseFloat(formData.preco_venda);
    if (!precoVenda || precoVenda <= 0) {
      newErrors.preco_venda = "Preço de venda obrigatório";
    }

    if (!formData.categoria_id) newErrors.categoria_id = "Categoria obrigatória";

    const precoCompra = parseFloat(formData.preco_compra);
    if (precoCompra === undefined || precoCompra < 0) {
      newErrors.preco_compra = "Preço de compra obrigatório";
    }

    if (formData.tipo_preco === "margem") {
      const margem = parseFloat(formData.margem_lucro);
      if (!margem || margem <= 0 || margem >= 100) {
        newErrors.margem_lucro = "Margem deve ser entre 0.01% e 99.99%";
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
        tipo: "produto",
        nome: formData.nome.trim(),
        preco_venda: parseFloat(formData.preco_venda),
        status: "ativo",
        categoria_id: formData.categoria_id || null,
        codigo: formData.codigo.trim() || null,
        preco_compra: parseFloat(formData.preco_compra) || 0,
        estoque_atual: parseInt(formData.estoque_atual) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 0,
        tipo_preco: formData.tipo_preco,
        despesas_adicionais: parseFloat(formData.despesas_adicionais) || 0,
      };

      if (formData.tipo_preco === "margem") {
        dados.margem_lucro = parseFloat(formData.margem_lucro) || 0;
      } else if (formData.tipo_preco === "markup") {
        dados.markup = parseFloat(formData.markup) || 0;
      }

      // NÃO enviar taxa_iva e sujeito_iva para produtos
      // O backend usa os valores da categoria

      await produtoService.criarProduto(dados);
      setSuccess(true);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/dashboard/Produtos_servicos/Stock`);
        }
      }, 1000);
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

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <div className="transition-colors duration-300 w-full">
      {/* Header */}
      {!onCancel ? (
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleCancel} className="p-2 transition-colors" style={{ color: colors.textSecondary }} type="button">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: colors.secondary }}>
              Novo Produto
            </h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Preencha os dados para cadastrar um novo produto
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-lg font-semibold" style={{ color: colors.secondary }}>
            Novo Produto
          </h2>
          <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
            Preencha os dados abaixo
          </p>
        </div>
      )}

      {/* Alertas */}
      {success && (
        <div
          className="mb-4 p-3 flex items-center gap-2 text-sm animate-pulse"
          style={{
            backgroundColor: `${colors.success}20`,
            borderColor: colors.success,
            borderWidth: 1,
            color: colors.success,
          }}>
          <CheckCircle2 className="w-4 h-4" />
          <span>Criado com sucesso! Redirecionando...</span>
        </div>
      )}

      {errors.submit && (
        <div
          className="mb-4 p-3 flex items-center gap-2 text-sm"
          style={{
            backgroundColor: `${colors.danger}20`,
            borderColor: colors.danger,
            borderWidth: 1,
            color: colors.danger,
          }}>
          <AlertCircle className="w-4 h-4" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informações Principais */}
        <div
          className="p-4 space-y-4"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Nome do Produto *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Insira o nome do produto"
                className="w-full px-3 py-2 border outline-none transition-all"
                style={{
                  backgroundColor: colors.card,
                  borderColor: errors.nome ? colors.danger : colors.border,
                  color: colors.text,
                }}
              />
              {errors.nome && (
                <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                  {errors.nome}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Categoria *
              </label>
              <select
                name="categoria_id"
                value={formData.categoria_id}
                onChange={handleChange}
                disabled={loadingCategorias}
                className="w-full px-3 py-2 border outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: errors.categoria_id ? colors.danger : colors.border,
                  color: colors.text,
                }}>
                <option value="">{loadingCategorias ? "Carregando..." : "Selecione a categoria"}</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome} {cat.label_iva ? `(${cat.label_iva})` : ""}
                  </option>
                ))}
              </select>
              {errors.categoria_id && (
                <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                  {errors.categoria_id}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Código/SKU
              </label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="PROD-001"
                className="w-full px-3 py-2 border outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
              Descrição
            </label>
            <textarea
              name="descricao"
              rows={3}
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Descrição do produto..."
              className="w-full px-3 py-2 border outline-none transition-all resize-none"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>
        </div>

        {/* Seção de Preço */}
        <div
          className="p-4 shadow-sm border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <div className="flex items-center gap-3 mb-4 pb-2 border-b" style={{ borderColor: colors.border }}>
            <h3 className="font-semibold" style={{ color: colors.text }}>
              Configuração de Preço
            </h3>
          </div>

          {/* Seletor de Tipo de Preço */}
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
              {(["fixo", "margem", "markup"] as TipoPreco[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => handleTipoPrecoChange(tipo)}
                  className="flex flex-col items-center gap-1 p-1 border-2 transition-all"
                  style={{
                    borderColor: formData.tipo_preco === tipo ? colors.secondary : colors.border,
                    backgroundColor: formData.tipo_preco === tipo ? `${colors.secondary}10` : "transparent",
                  }}>
                  {tipo === "fixo" && (
                    <Tag
                      className="w-4 h-4"
                      style={{
                        color: formData.tipo_preco === tipo ? colors.textSecondary : colors.textSecondary,
                      }}
                    />
                  )}
                  {tipo === "margem" && (
                    <TrendingUp
                      className="w-4 h-4"
                      style={{
                        color: formData.tipo_preco === tipo ? colors.textSecondary : colors.textSecondary,
                      }}
                    />
                  )}
                  {tipo === "markup" && (
                    <DollarSign
                      className="w-4 h-4"
                      style={{
                        color: formData.tipo_preco === tipo ? colors.textSecondary : colors.textSecondary,
                      }}
                    />
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: formData.tipo_preco === tipo ? colors.textSecondary : colors.text,
                    }}>
                    {getTipoPrecoLabel(tipo)}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
              <HelpCircle className="w-3 h-3 inline mr-1" />
              {getFormulaDescricao(formData.tipo_preco)}
            </p>
          </div>

          {/* Campos de Custo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Preço de Compra (Kz) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textSecondary }}>
                  Kz
                </span>
                <input
                  type="number"
                  name="preco_compra"
                  value={formData.preco_compra}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="w-full pl-10 pr-3 py-2 border outline-none"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: errors.preco_compra ? colors.danger : colors.border,
                    color: colors.text,
                  }}
                />
              </div>
              {errors.preco_compra && (
                <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                  {errors.preco_compra}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Despesas Adicionais (Kz)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textSecondary }}>
                  Kz
                </span>
                <input
                  type="number"
                  name="despesas_adicionais"
                  value={formData.despesas_adicionais}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="Transporte, taxas, etc"
                  className="w-full pl-10 pr-3 py-2 border outline-none"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {formData.tipo_preco === "margem" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4">
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Margem de Lucro (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="margem_lucro"
                      value={formData.margem_lucro}
                      onChange={handleChange}
                      min="1"
                      max="99.99"
                      step="0.01"
                      className="flex-1 px-3 py-2 border outline-none"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: errors.margem_lucro ? colors.danger : colors.border,
                        color: colors.text,
                      }}
                    />
                  </div>
                  {errors.margem_lucro && (
                    <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                      {errors.margem_lucro}
                    </p>
                  )}
                </motion.div>
              )}

              {formData.tipo_preco === "markup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4">
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Markup (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="markup"
                      value={formData.markup}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-2 border outline-none"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Preço de Venda (Kz) {formData.tipo_preco !== "fixo" && "(Calculado)"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textSecondary }}>
                  Kz
                </span>
                <input
                  type="number"
                  name="preco_venda"
                  value={formData.preco_venda}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  readOnly={formData.tipo_preco !== "fixo"}
                  className={`w-full pl-10 pr-3 py-2 border outline-none ${
                    formData.tipo_preco !== "fixo" ? "bg-muted/50" : ""
                  }`}
                  style={{
                    backgroundColor: formData.tipo_preco !== "fixo" ? `${colors.hover}` : colors.card,
                    borderColor: errors.preco_venda ? colors.danger : colors.border,
                    color: colors.text,
                  }}
                />
              </div>
              {errors.preco_venda && (
                <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                  {errors.preco_venda}
                </p>
              )}
            </div>
          </div>

          {/* Preview de Cálculos */}
          <div className="mt-4 p-3 space-y-2" style={{ backgroundColor: colors.hover }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.textSecondary }}>Custo Total:</span>
              <span className="font-medium" style={{ color: colors.text }}>
                {formatarPreco(custoTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.textSecondary }}>Lucro Bruto:</span>
              <span className={`font-medium `}>{formatarPreco(lucroBruto)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs" style={{ color: colors.textSecondary }}>
              <div>Margem Real: {margemReal.toFixed(2)}%</div>
              <div>Markup Real: {markupReal.toFixed(2)}%</div>
            </div>
            <div className="border-t pt-2 mt-2" style={{ borderColor: colors.border }}>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: colors.text }}>
                  Preço Final {sujeitoIVA ? `+ IVA (${taxaIVA}%)` : "(Isento)"}:
                </span>
                <span className="text-lg font-bold" style={{ color: colors.text }}>
                  {formatarPreco(precoComIva)}
                </span>
              </div>
              {categoriaSelecionada && !categoriaSelecionada.sujeito_iva && (
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Isento segundo código {categoriaSelecionada.codigo_isencao || "M00"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Campos de Estoque */}
        <div
          className="p-4 shadow-sm border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <h3 className="font-semibold mb-4 text-sm" style={{ color: colors.text }}>
            Estoque
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Estoque Atual
              </label>
              <input
                type="number"
                name="estoque_atual"
                value={formData.estoque_atual}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Estoque Mínimo
              </label>
              <input
                type="number"
                name="estoque_minimo"
                value={formData.estoque_minimo}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 transition-colors text-sm font-medium"
            style={{ color: colors.textSecondary }}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 text-white transition-colors font-medium disabled:opacity-50"
            style={{ backgroundColor: colors.primary }}>
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
  );
}