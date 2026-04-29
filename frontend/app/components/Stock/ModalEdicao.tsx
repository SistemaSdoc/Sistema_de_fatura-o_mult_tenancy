// src/app/(empresa)/estoque/components/ModalEdicao.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Produto,
    Categoria,
    UnidadeMedida,
    formatarPreco,
    calcularMargemLucro,
} from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";
import { X, Package, Wrench, Save, Calculator, AlertCircle, Loader2 } from "lucide-react";

interface ModalEdicaoProps {
    isOpen: boolean;
    item: Produto | null;
    onSave: (dados: any) => Promise<{ success: boolean; error?: any }>;
    onClose: () => void;
    categorias: Categoria[];
}

interface FormData {
    tipo: "produto" | "servico";
    categoria_id: string;
    codigo: string;
    nome: string;
    descricao: string;
    preco_compra: string;
    preco_venda: string;
    taxa_iva: string;
    sujeito_iva: boolean;
    estoque_minimo: string;
    status: "ativo" | "inativo";
    taxa_retencao: string;
    duracao_estimada: string;
    unidade_medida: UnidadeMedida;
}

interface FormErrors {
    [key: string]: string;
}

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
        taxa_iva: "",
        sujeito_iva: true,
        estoque_minimo: "5",
        status: "ativo",
        taxa_retencao: "0",
        duracao_estimada: "1",
        unidade_medida: "hora",
    });

    const [errors, setErrors] = useState<FormErrors>({});

    const categoriasFiltradas = categorias.filter(
        cat => cat.tipo === formData.tipo || !cat.tipo
    );

    const isServicoItem = formData.tipo === "servico";

useEffect(() => {
    if (item) {
        let duracaoNum = "1";
        let unidade: UnidadeMedida = "hora";

        if (item.duracao_estimada) {
            const match = item.duracao_estimada.match(/^(\d+)\s*(\w+)$/);
            if (match) {
                duracaoNum = match[1];
                unidade = match[2] as UnidadeMedida;
            }
        }

        setFormData({
            tipo: item.tipo,
            categoria_id: item.categoria_id || "",
            codigo: item.codigo || "",
            nome: item.nome || "",
            descricao: item.descricao || "",
            preco_compra: item.preco_compra?.toString() || "0",
            preco_venda: item.preco_venda?.toString() || "0",
            taxa_iva: item.taxa_iva?.toString() || "0",
            
            // ← LINHA CORRIGIDA
            sujeito_iva: item.sujeito_iva ?? true,

            estoque_minimo: item.estoque_minimo?.toString() || "5",
            status: item.status || "ativo",
            taxa_retencao: item.taxa_retencao?.toString() || "0",
            duracao_estimada: duracaoNum,
            unidade_medida: unidade,
        });
        setErrors({});
        setError(null);
    }
}, [item]);

    const margemLucro = useMemo(() => {
        if (isServicoItem) return 0;
        const compra = parseFloat(formData.preco_compra) || 0;
        const venda = parseFloat(formData.preco_venda) || 0;
        if (!compra || compra <= 0) return 0;
        return calcularMargemLucro(compra, venda);
    }, [formData.preco_compra, formData.preco_venda, isServicoItem]);

    const precoComIva = useMemo(() => {
        const venda = parseFloat(formData.preco_venda) || 0;
        const iva = parseFloat(formData.taxa_iva) || 0;
        if (!formData.sujeito_iva) return venda;
        return venda * (1 + iva / 100);
    }, [formData.preco_venda, formData.taxa_iva, formData.sujeito_iva]);

    const valorRetencao = useMemo(() => {
        if (!isServicoItem) return 0;
        const venda = parseFloat(formData.preco_venda) || 0;
        const taxaRetencao = parseFloat(formData.taxa_retencao) || 0;
        return venda * (taxaRetencao / 100);
    }, [formData.preco_venda, formData.taxa_retencao, isServicoItem]);

    const valorLiquido = useMemo(() => {
        const venda = parseFloat(formData.preco_venda) || 0;
        return isServicoItem ? venda - valorRetencao : venda;
    }, [formData.preco_venda, valorRetencao, isServicoItem]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
        setError(null);
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.nome.trim()) newErrors.nome = "Nome obrigatório";
        if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) {
            newErrors.preco_venda = "Preço de venda obrigatório";
        }
        if (!isServicoItem) {
            if (!formData.categoria_id) newErrors.categoria_id = "Categoria obrigatória";
            if (parseFloat(formData.preco_compra) < 0) {
                newErrors.preco_compra = "Preço de compra não pode ser negativo";
            }
        }
        if (isServicoItem && parseFloat(formData.taxa_retencao) > 100) {
            newErrors.taxa_retencao = "A taxa de retenção não pode ser maior que 100%";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError(null);

        try {
            const dadosAtualizacao: any = {
                tipo: formData.tipo,
                nome: formData.nome.trim(),
                preco_venda: parseFloat(formData.preco_venda),
                status: formData.status,
                taxa_iva: parseFloat(formData.taxa_iva) || 0,
                sujeito_iva: formData.sujeito_iva,
                descricao: formData.descricao?.trim() || null,
            };

            if (!isServicoItem) {
                dadosAtualizacao.categoria_id = formData.categoria_id || null;
                dadosAtualizacao.codigo = formData.codigo?.trim() || null;
                dadosAtualizacao.preco_compra = parseFloat(formData.preco_compra) || 0;
                dadosAtualizacao.estoque_minimo = parseInt(formData.estoque_minimo) || 0;
            } else {
                dadosAtualizacao.taxa_retencao = parseFloat(formData.taxa_retencao) || 0;
                dadosAtualizacao.duracao_estimada = `${formData.duracao_estimada} ${formData.unidade_medida}`;
                dadosAtualizacao.unidade_medida = formData.unidade_medida;
            }

            const result = await onSave(dadosAtualizacao);

            if (result.success) {
                onClose();
            } else {
                setError(result.error || "Erro ao salvar alterações");
            }
        } catch (err: any) {
            let errorMessage = "Erro ao salvar alterações";
            
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.errors) {
                const validationErrors = Object.values(err.response.data.errors).flat();
                errorMessage = validationErrors.join(", ");
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !item) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="relative w-full max-w-2xl border shadow-2xl flex flex-col"
                style={{
                    backgroundColor: colors.background,
                    maxHeight: "95vh",
                    borderColor: colors.border,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Compacto */}
                <div
                    className="flex items-center justify-between px-3 py-2 border-b"
                    style={{ borderColor: colors.border }}
                >
                    <div className="flex items-center gap-2">
                        {!isServicoItem ? (
                            <Package className="w-4 h-4" style={{ color: colors.primary }} />
                        ) : (
                            <Wrench className="w-4 h-4" style={{ color: colors.secondary }} />
                        )}
                        <h2 className="text-sm font-semibold" style={{ color: colors.text }}>
                            Editar {!isServicoItem ? "Produto" : "Serviço"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:opacity-70 transition-opacity"
                        type="button"
                    >
                        <X className="w-4 h-4" style={{ color: colors.textSecondary }} />
                    </button>
                </div>

                {/* Conteúdo - Compacto */}
                <div className="px-3 py-2 overflow-y-auto flex-1 space-y-2">
                    {error && (
                        <div
                            className="p-2 border-l-2 text-xs flex items-center gap-2"
                            style={{
                                backgroundColor: `${colors.danger}10`,
                                borderColor: colors.danger,
                                color: colors.danger,
                            }}
                        >
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-2">
                        {/* Tipo - Visual Compacto */}
                        <div className="flex gap-2">
                            <div
                                className={`flex-1 flex items-center justify-center gap-1 p-2 border text-xs ${
                                    !isServicoItem ? "opacity-100" : "opacity-50"
                                }`}
                                style={{
                                    borderColor: !isServicoItem ? colors.primary : colors.border,
                                    backgroundColor: !isServicoItem ? `${colors.primary}10` : "transparent",
                                    color: colors.text,
                                }}
                            >
                                <Package className="w-3 h-3" />
                                <span className="font-medium">Produto</span>
                            </div>
                            <div
                                className={`flex-1 flex items-center justify-center gap-1 p-2 border text-xs ${
                                    isServicoItem ? "opacity-100" : "opacity-50"
                                }`}
                                style={{
                                    borderColor: isServicoItem ? colors.secondary : colors.border,
                                    backgroundColor: isServicoItem ? `${colors.secondary}10` : "transparent",
                                    color: colors.text,
                                }}
                            >
                                <Wrench className="w-3 h-3" />
                                <span className="font-medium">Serviço</span>
                            </div>
                        </div>

                        {/* Nome e Descrição - Linha única onde possível */}
                        <div className="space-y-1">
                            <div>
                                <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1 border text-sm outline-none focus:ring-1"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: errors.nome ? colors.danger : colors.border,
                                        color: colors.text,
                                    }}
                                />
                                {errors.nome && (
                                    <p className="text-xs mt-0.5" style={{ color: colors.danger }}>{errors.nome}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                    Descrição
                                </label>
                                <textarea
                                    name="descricao"
                                    value={formData.descricao}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-2 py-1 border text-sm outline-none resize-none focus:ring-1"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Campos específicos por tipo - Grid compacto */}
                        {!isServicoItem ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                        Categoria *
                                    </label>
                                    <select
                                        name="categoria_id"
                                        value={formData.categoria_id}
                                        onChange={handleChange}
                                        className="w-full px-2 py-1 border text-sm outline-none focus:ring-1"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: errors.categoria_id ? colors.danger : colors.border,
                                            color: colors.text,
                                        }}
                                    >
                                        <option value="">Selecione</option>
                                        {categoriasFiltradas.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.categoria_id && (
                                        <p className="text-xs mt-0.5" style={{ color: colors.danger }}>{errors.categoria_id}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                        Código/SKU
                                    </label>
                                    <input
                                        type="text"
                                        name="codigo"
                                        value={formData.codigo}
                                        onChange={handleChange}
                                        className="w-full px-2 py-1 border text-sm outline-none focus:ring-1"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text,
                                        }}
                                    />
                                </div>
                            </div>
                        ) : null}

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-2 py-1 border text-sm outline-none focus:ring-1"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                            >
                                <option value="ativo">Ativo</option>
                                <option value="inativo">Inativo</option>
                            </select>
                        </div>

                        {/* Preços - Layout horizontal compacto */}
                        <div className="border p-2 space-y-2" style={{ borderColor: colors.border }}>
                            <div className="grid grid-cols-2 gap-2">
                                {!isServicoItem && (
                                    <div>
                                        <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                            Preço Compra
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.textSecondary }}>Kz</span>
                                            <input
                                                type="number"
                                                name="preco_compra"
                                                value={formData.preco_compra}
                                                onChange={handleChange}
                                                min="0"
                                                step="1"
                                                className="w-full pl-8 pr-2 py-1 border text-sm outline-none focus:ring-1"
                                                style={{
                                                    backgroundColor: colors.card,
                                                    borderColor: errors.preco_compra ? colors.danger : colors.border,
                                                    color: colors.text,
                                                }}
                                            />
                                        </div>
                                        {errors.preco_compra && (
                                            <p className="text-xs mt-0.5" style={{ color: colors.danger }}>{errors.preco_compra}</p>
                                        )}
                                    </div>
                                )}

                                <div className={isServicoItem ? "col-span-2" : ""}>
                                    <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                        Preço Venda *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: colors.textSecondary }}>Kz</span>
                                        <input
                                            type="number"
                                            name="preco_venda"
                                            value={formData.preco_venda}
                                            onChange={handleChange}
                                            min="0.01"
                                            step="0.01"
                                            className="w-full pl-8 pr-2 py-1 border text-sm outline-none focus:ring-1"
                                            style={{
                                                backgroundColor: colors.card,
                                                borderColor: errors.preco_venda ? colors.danger : colors.border,
                                                color: colors.text,
                                            }}
                                        />
                                    </div>
                                    {errors.preco_venda && (
                                        <p className="text-xs mt-0.5" style={{ color: colors.danger }}>{errors.preco_venda}</p>
                                    )}
                                </div>
                            </div>

                            {/* IVA e Retenção - Linha única */}
                            <div className="flex flex-wrap items-center gap-3 pt-1 border-t" style={{ borderColor: colors.border }}>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="sujeito_iva"
                                        checked={formData.sujeito_iva}
                                        onChange={handleChange}
                                        className="w-3 h-3"
                                        style={{ accentColor: colors.primary }}
                                    />
                                    <span className="text-xs" style={{ color: colors.text }}>IVA</span>
                                </label>

                                {formData.sujeito_iva && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            name="taxa_iva"
                                            value={formData.taxa_iva}
                                            onChange={handleChange}
                                            min="0"
                                            max="100"
                                            className="w-14 px-1 py-0.5 border text-xs outline-none"
                                            style={{
                                                backgroundColor: colors.card,
                                                borderColor: colors.border,
                                                color: colors.text,
                                            }}
                                        />
                                        <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
                                    </div>
                                )}

                                {isServicoItem && (
                                    <>
                                        <span className="text-xs" style={{ color: colors.textSecondary }}>|</span>
                                        <span className="text-xs" style={{ color: colors.textSecondary }}>Retenção:</span>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                name="taxa_retencao"
                                                value={formData.taxa_retencao}
                                                onChange={handleChange}
                                                min="0"
                                                max="100"
                                                className="w-14 px-1 py-0.5 border text-xs outline-none"
                                                style={{
                                                    backgroundColor: colors.card,
                                                    borderColor: errors.taxa_retencao ? colors.danger : colors.border,
                                                    color: colors.text,
                                                }}
                                            />
                                            <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
                                        </div>
                                        {errors.taxa_retencao && (
                                            <p className="text-xs" style={{ color: colors.danger }}>{errors.taxa_retencao}</p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Preview de cálculo - Inline */}
                            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: colors.border }}>
                                <div className="flex items-center gap-1" style={{ color: colors.textSecondary }}>
                                    <Calculator className="w-3 h-3" />
                                    <span>c/ IVA:</span>
                                    <span className="font-semibold" style={{ color: colors.text }}>{formatarPreco(precoComIva)}</span>
                                </div>

                                {!isServicoItem ? (
                                    <span className={`font-medium text-xs ${margemLucro >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        Margem: {margemLucro.toFixed(1)}%
                                    </span>
                                ) : valorRetencao > 0 ? (
                                    <span className="font-medium text-xs" style={{ color: colors.secondary }}>
                                        Líquido: {formatarPreco(valorLiquido)}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        {/* Campos específicos - Compacto */}
                        {!isServicoItem ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                        Estoque Mínimo
                                    </label>
                                    <input
                                        type="number"
                                        name="estoque_minimo"
                                        value={formData.estoque_minimo}
                                        onChange={handleChange}
                                        min="0"
                                        className="w-full px-2 py-1 border text-sm outline-none focus:ring-1"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text,
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                        Estoque Atual
                                    </label>
                                    <input
                                        type="number"
                                        value={item?.estoque_atual || 0}
                                        disabled
                                        className="w-full px-2 py-1 border text-sm cursor-not-allowed"
                                        style={{
                                            backgroundColor: `${colors.textSecondary}10`,
                                            borderColor: colors.border,
                                            color: colors.textSecondary,
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                        Duração
                                    </label>
                                    <input
                                        type="number"
                                        name="duracao_estimada"
                                        value={formData.duracao_estimada}
                                        onChange={handleChange}
                                        min="1"
                                        className="w-full px-2 py-1 border text-sm outline-none focus:ring-1"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text,
                                        }}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-medium mb-0.5" style={{ color: colors.text }}>
                                        Unidade
                                    </label>
                                    <select
                                        name="unidade_medida"
                                        value={formData.unidade_medida}
                                        onChange={handleChange}
                                        className="w-full px-2 py-1 border text-sm outline-none focus:ring-1"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text,
                                        }}
                                    >
                                        <option value="hora">Hora</option>
                                        <option value="dia">Dia</option>
                                        <option value="semana">Sem</option>
                                        <option value="mes">Mês</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Botões - Compactos */}
                        <div
                            className="flex items-center justify-end gap-2 pt-2 border-t"
                            style={{ borderColor: colors.border }}
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-1.5 border text-xs font-medium hover:opacity-80 transition-opacity"
                                style={{ 
                                    color: colors.textSecondary,
                                    borderColor: colors.border,
                                    backgroundColor: colors.card
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-1 px-4 py-1.5 text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: colors.primary }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3 h-3" />
                                        Salvar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}