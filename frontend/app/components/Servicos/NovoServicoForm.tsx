"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { produtoService, UnidadeMedida, CodigoIsencao, CriarProdutoInput } from "@/services/produtos";
import { Save, AlertCircle, CheckCircle2, Loader2, Percent, ArrowLeft, Calculator } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

interface FormErrors {
  [key: string]: string;
}

interface NovoServicoFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const OPCOES_ISENCAO = [
  { value: "", label: "Sem isenção" },
  { value: "M00", label: "Sujeito a IVA (normal)" },
  { value: "M01", label: "Isento (Art. 12 - Operações isentas)" },
  { value: "M02", label: "Isento (Art. 13 - Exportações)" },
  { value: "M03", label: "Isento (Art. 14 - Serviços financeiros)" },
  { value: "M04", label: "Isento (Art. 15 - Operações imobiliárias)" },
  { value: "M05", label: "Isento (Art. 16 - Serviços de saúde)" },
  { value: "M06", label: "Isento (Art. 17 - Educação)" },
  { value: "M99", label: "Outras isenções" },
] as const;

export function NovoServicoForm({ onSuccess, onCancel }: NovoServicoFormProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco_venda: "",
    taxa_iva: "14",
    sujeito_iva: true,
    taxa_retencao: "0",
    duracao_estimada: "1",
    unidade_medida: "hora" as UnidadeMedida,
    codigo_isencao: "" as CodigoIsencao | "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "O nome do serviço é obrigatório.";
    }

    if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) {
      newErrors.preco_venda = "Preço de venda inválido.";
    }

    //  VALIDAÇÃO: Retenção não pode ser menor que 0
    const retencao = parseFloat(formData.taxa_retencao);
    if (!isNaN(retencao) && retencao < 0) {
      newErrors.taxa_retencao = "Retenção não pode ser menor que 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // VALIDAÇÃO: Retenção não pode ser menor que 0
    if (name === "taxa_retencao") {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue < 0) {
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const payload: CriarProdutoInput = {
        tipo: "servico",
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        preco_venda: parseFloat(formData.preco_venda),
        status: "ativo",
      };

      // IVA: Só envia se o checkbox estiver marcado
      if (formData.sujeito_iva) {
        payload.taxa_iva = parseFloat(formData.taxa_iva) || 0;
        payload.sujeito_iva = true;
      } else {
        payload.taxa_iva = undefined;
        payload.sujeito_iva = false;
      }

      // RETENÇÃO: Aceita 0 ou valores positivos
      const retencao = parseFloat(formData.taxa_retencao) || 0;
      payload.taxa_retencao = Math.max(0, retencao);

      //CÓDIGO DE ISENÇÃO: Só envia se tiver valor
      payload.codigo_isencao = formData.codigo_isencao || undefined;

      // Campos específicos de serviço
      payload.duracao_estimada = `${formData.duracao_estimada} ${formData.unidade_medida}`;
      payload.unidade_medida = formData.unidade_medida;
      payload.categoria_id = null;
      payload.codigo = null;
      payload.preco_compra = 0;
      payload.estoque_atual = 0;
      payload.estoque_minimo = 0;

      await produtoService.criarProduto(payload);
      setSuccess(true);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard/Produtos_servicos/Servicos");
        }
      }, 1000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Erro ao criar serviço.";
      if (err?.response?.data?.errors) {
        const errs: FormErrors = {};
        Object.entries(err.response.data.errors).forEach(([k, v]) => {
          errs[k] = Array.isArray(v) ? v[0] : (v as string);
        });
        setErrors(errs);
      } else {
        setErrors({ submit: errorMsg });
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

  // Cálculos para preview
  const valorRetencao = parseFloat(formData.preco_venda) * (parseFloat(formData.taxa_retencao) / 100) || 0;
  const valorLiquido = parseFloat(formData.preco_venda) - valorRetencao || 0;

  return (
    <div className="transition-colors duration-300 w-full">
      {/* Header */}
      {!onCancel ? (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleCancel}
            className="p-2 transition-colors hover:opacity-70"
            style={{ color: colors.textSecondary }}
            type="button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: colors.secondary }}>
              Novo Serviço
            </h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Preencha os dados para cadastrar um novo serviço
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-lg font-semibold" style={{ color: colors.secondary }}>
            Novo Serviço
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
          }}
        >
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
          }}
        >
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
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Nome do Serviço 
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Insira o nome do serviço"
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
                Descrição
              </label>
              <textarea
                name="descricao"
                rows={1}
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Detalhes ou âmbito do serviço..."
                className="w-full h-[42px] px-3 py-2 border outline-none transition-all resize-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
          </div>
        </div>

        {/* Seção de Preço */}
        <div
          className="p-4 shadow-sm border"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          <div className="flex items-center gap-3 mb-4 pb-2 border-b" style={{ borderColor: colors.border }}>
            <Calculator className="w-4 h-4" style={{ color: colors.blue }} />
            <h3 className="font-semibold" style={{ color: colors.blue }}>
              Configuração de Preço
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Preço de Venda (Kz) 
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
                  className="w-full pl-10 pr-3 py-2  border outline-none"
                  style={{
                    backgroundColor: colors.card,
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

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Unidade de Medida
              </label>
              <select
                name="unidade_medida"
                value={formData.unidade_medida}
                onChange={handleChange}
                className="w-full px-3 py-2 border outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                <option value="hora">Hora(s)</option>
                <option value="dia">Dia(s)</option>
                <option value="semana">Semana(s)</option>
                <option value="mes">Mês(es)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Duração Estimada
              </label>
              <input
                type="number"
                name="duracao_estimada"
                value={formData.duracao_estimada}
                onChange={handleChange}
                min="1"
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
                Taxa de Retenção (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
                <input
                  type="number"
                  name="taxa_retencao"
                  value={formData.taxa_retencao}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full pl-10 pr-3 py-2 border outline-none"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: errors.taxa_retencao ? colors.danger : colors.border,
                    color: colors.text,
                  }}
                />
              </div>
              {errors.taxa_retencao && (
                <p className="mt-1 text-xs" style={{ color: colors.danger }}>
                  {errors.taxa_retencao}
                </p>
              )}
            </div>
          </div>

          {/* IVA */}
          <div
            className="mt-4 p-3 border grid grid-cols-1 md:grid-cols-2 gap-4"
            style={{ backgroundColor: colors.hover, borderColor: colors.border }}
          >
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Sujeito a IVA
              </label>
              <div
                className="flex items-center gap-4 h-[42px] px-3 border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="sujeito_iva"
                    checked={formData.sujeito_iva}
                    onChange={handleChange}
                    className="w-4 h-4"
                    style={{ accentColor: colors.primary }}
                  />
                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                    Aplicar IVA
                  </span>
                </label>

                {formData.sujeito_iva && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="number"
                      name="taxa_iva"
                      value={formData.taxa_iva}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="1"
                      className="w-16 px-2 py-1 border text-sm"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                      }}
                    />
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      %
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Código de Isenção de IVA (opcional)
              </label>
              <select
                name="codigo_isencao"
                value={formData.codigo_isencao}
                onChange={handleChange}
                className="w-full h-[42px] px-3 py-2 border outline-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                {OPCOES_ISENCAO.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                Conforme Código do IVA de Angola
              </p>
            </div>
          </div>

          {/* Preview de Cálculos */}
          {parseFloat(formData.preco_venda) > 0 && parseFloat(formData.taxa_retencao) > 0 && (
            <div className="mt-4 p-3" style={{ backgroundColor: colors.hover }}>
              <div className="flex justify-between items-center">
                <span style={{ color: colors.textSecondary }}>Valor Líquido (após retenção):</span>
                <span className="text-lg font-bold" style={{ color: colors.secondary }}>
                  {new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" }).format(valorLiquido)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 transition-colors text-sm font-medium hover:opacity-70"
            style={{ color: colors.textSecondary }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 text-white transition-transform active:scale-95 font-medium disabled:opacity-50"
            style={{ backgroundColor: colors.primary }}
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
  );
}