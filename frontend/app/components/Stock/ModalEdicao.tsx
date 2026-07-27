// src/app/(empresa)/estoque/components/ModalEdicao.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Produto, Categoria, formatarPreco, calcularMargemLucro } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";
import { Package, Save, Calculator, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ModalEdicaoProps {
  isOpen: boolean;
  item: Produto | null;
  onSave: (dados: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
  categorias: Categoria[];
}

interface FormData {
  tipo: "produto";
  categoria_id: string;
  codigo: string;
  nome: string;
  descricao: string;
  preco_compra: string;
  preco_venda: string;
  estoque_minimo: string;
  status: "ativo" | "inativo";
}

interface FormErrors {
  [key: string]: string;
}

type SavePayload = Record<string, unknown>;

type AxiosLikeError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

export function ModalEdicao({ isOpen, item, onSave, onClose, categorias }: ModalEdicaoProps) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    tipo: "produto",
    categoria_id: "",
    codigo: "",
    nome: "",
    descricao: "",
    preco_compra: "",
    preco_venda: "",
    estoque_minimo: "5",
    status: "ativo",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const categoriasFiltradas = categorias.filter((cat) => cat.tipo === "produto" || !cat.tipo);

  useEffect(() => {
    if (item) {
      setFormData({
        tipo: "produto",
        categoria_id: item.categoria_id || "",
        codigo: item.codigo || "",
        nome: item.nome || "",
        descricao: item.descricao || "",
        preco_compra: item.preco_compra?.toString() || "0",
        preco_venda: item.preco_venda?.toString() || "0",
        estoque_minimo: item.estoque_minimo?.toString() || "5",
        status: item.status || "ativo",
      });
      setErrors({});
      setError(null);
    }
  }, [item]);

  const margemLucro = useMemo(() => {
    const compra = parseFloat(formData.preco_compra) || 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    if (!compra || compra <= 0) return 0;
    return calcularMargemLucro(compra, venda);
  }, [formData.preco_compra, formData.preco_venda]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    setError(null);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.nome.trim()) newErrors.nome = "Nome obrigatório";
    if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) newErrors.preco_venda = "Obrigatório";
    if (!formData.categoria_id) newErrors.categoria_id = "Obrigatório";
    if (parseFloat(formData.preco_compra) < 0) newErrors.preco_compra = "Inválido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const dados: SavePayload = {
        tipo: "produto",
        nome: formData.nome.trim(),
        preco_venda: parseFloat(formData.preco_venda),
        status: formData.status,
        descricao: formData.descricao?.trim() || null,
        categoria_id: formData.categoria_id || null,
        codigo: formData.codigo?.trim() || null,
        preco_compra: parseFloat(formData.preco_compra) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 0,
      };
      const result = await onSave(dados);
      if (result.success) onClose();
      else setError(result.error || "Erro ao salvar");
    } catch (err: unknown) {
      const apiError = err as AxiosLikeError;
      setError(apiError.response?.data?.message || apiError.message || "Erro ao salvar alterações");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border text-sm outline-none transition-colors focus:ring-2";
  const inputStyle = (err?: string) => ({
    backgroundColor: colors.background,
    borderColor: err ? colors.danger : colors.border,
    color: colors.text,
    boxShadow: "none",
  });
  const labelCls = "block text-xs font-semibold mb-1 tracking-wide";

  return (
    <Dialog
      open={isOpen && !!item}
      onOpenChange={(v) => {
        if (!v && !loading) onClose();
      }}>
      <DialogContent
        className="sm:max-w-2xl p-0 top-[50%] gap-0 overflow-hidden "
        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: colors.border }}>
          <DialogTitle className="flex items-center gap-2 text-base" style={{ color: colors.blue }}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
              <Package className="w-4 h-4" style={{ color: colors.blue }} />
            </span>
            Edite o produto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 180px)" }}>
            <div className="space-y-4">
              {error && (
                <div
                  className="p-3 rounded-md border-l-4 text-sm flex items-center gap-2"
                  style={{ backgroundColor: `${colors.danger}10`, borderColor: colors.danger, color: colors.danger }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {/* Nome */}
                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Nome do produto
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className={inputCls}
                    style={inputStyle(errors.nome)}
                  />
                  {errors.nome && (
                    <p className="text-xs mt-1" style={{ color: colors.danger }}>
                      {errors.nome}
                    </p>
                  )}
                </div>

                {/* Categoria + Código */}

                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Categoria *
                  </label>
                  <select
                    name="categoria_id"
                    value={formData.categoria_id}
                    onChange={handleChange}
                    className={inputCls}
                    style={inputStyle(errors.categoria_id)}>
                    <option value="">Selecione</option>
                    {categoriasFiltradas.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                  {errors.categoria_id && (
                    <p className="text-xs mt-1" style={{ color: colors.danger }}>
                      {errors.categoria_id}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Código/SKU
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    className={inputCls}
                    style={inputStyle()}
                  />
                </div>
              </div>

              {/* Preços */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Preço Compra
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: colors.textSecondary }}>
                      Kz
                    </span>
                    <input
                      type="number"
                      name="preco_compra"
                      value={formData.preco_compra}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className={`${inputCls} pl-9`}
                      style={inputStyle(errors.preco_compra)}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Preço Venda *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: colors.textSecondary }}>
                      Kz
                    </span>
                    <input
                      type="number"
                      name="preco_venda"
                      value={formData.preco_venda}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      className={`${inputCls} pl-9`}
                      style={inputStyle(errors.preco_venda)}
                    />
                  </div>
                  {errors.preco_venda && (
                    <p className="text-xs mt-1" style={{ color: colors.danger }}>
                      {errors.preco_venda}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Margem Lucro
                  </label>
                  <div
                    className={`${inputCls} flex items-center gap-2`}
                    style={{ backgroundColor: colors.background, borderColor: colors.border }}>

                    <span
                      className="px-2 py-0.5 font-semibold text-xs"
                      style={{
                        color: margemLucro >= 0 ? colors.blue : colors.danger,
                        
                      }}>
                      {margemLucro.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Estoque */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    name="estoque_minimo"
                    value={formData.estoque_minimo}
                    onChange={handleChange}
                    min="0"
                    className={inputCls}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: colors.textSecondary }}>
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    value={item?.estoque_atual || 0}
                    disabled
                    className={`${inputCls} cursor-not-allowed`}
                    style={{ backgroundColor: `${colors.textSecondary}10`, borderColor: colors.border, color: colors.textSecondary }}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className={labelCls} style={{ color: colors.textSecondary }}>
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  style={inputStyle()}
                />
              </div>
            </div>
          </div>

          {/* Botões fixos no fundo */}
          <div className="px-5 py-4 border-t flex gap-3" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium transition-colors hover:opacity-80 active:scale-95"
              style={{ color: colors.textSecondary, border: `1px solid ${colors.border}`, backgroundColor: colors.card }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-medium disabled:opacity-50 transition-transform active:scale-95"
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
      </DialogContent>
    </Dialog>
  );
}
