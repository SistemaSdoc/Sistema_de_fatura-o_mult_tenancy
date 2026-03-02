// src/app/(empresa)/produtos/components/NovoProdutoForm.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    produtoService,
    Categoria,
    TipoProduto,
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
import { useThemeColors } from "@/context/ThemeContext";

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

interface NovoProdutoFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    initialTipo?: TipoProduto;
}

export function NovoProdutoForm({
    onSuccess,
    onCancel,
    initialTipo = "produto"
}: NovoProdutoFormProps) {
    const router = useRouter();
    const colors = useThemeColors();

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCategorias, setLoadingCategorias] = useState(true);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const [formData, setFormData] = useState<FormData>({
        tipo: initialTipo,
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
    const margemLucro = useMemo(() => {
        if (isServico) return 0;
        const compra = parseFloat(formData.preco_compra) || 0;
        const venda = parseFloat(formData.preco_venda) || 0;
        if (!compra || compra <= 0) return 0;
        return calcularMargemLucro(compra, venda);
    }, [formData.preco_compra, formData.preco_venda, isServico]);

    const precoComIva = useMemo(() => {
        const venda = parseFloat(formData.preco_venda) || 0;
        const iva = parseFloat(formData.taxa_iva) || 0;
        if (!formData.sujeito_iva) return venda;
        return venda * (1 + iva / 100);
    }, [formData.preco_venda, formData.taxa_iva, formData.sujeito_iva]);

    const valorRetencao = useMemo(() => {
        if (!isServico) return 0;
        const venda = parseFloat(formData.preco_venda) || 0;
        const retencao = parseFloat(formData.retencao) || 0;
        return venda * (retencao / 100);
    }, [formData.preco_venda, formData.retencao, isServico]);

    const valorLiquido = useMemo(() => {
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

            await produtoService.criarProduto(dados);
            setSuccess(true);

            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.push(`/dashboard/Produtos_servicos/Stock`);
                }
            }, 1000);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            {/* Header com ArrowLeft visível apenas quando NÃO está em modal */}
            {!onCancel && (
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={handleCancel}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: colors.textSecondary }}
                        type="button"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>
                            Novo {isServico ? "Serviço" : "Produto"}
                        </h1>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Preencha os dados para cadastrar um novo {isServico ? "serviço" : "produto"}
                        </p>
                    </div>
                </div>
            )}

            {/* Título simplificado para quando está em modal */}
            {onCancel && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold" style={{ color: colors.primary }}>
                        Novo {isServico ? "Serviço" : "Produto"}
                    </h2>
                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        Preencha os dados abaixo
                    </p>
                </div>
            )}

            {/* Alertas */}
            {success && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm animate-pulse" style={{
                    backgroundColor: `${colors.success}20`,
                    borderColor: colors.success,
                    borderWidth: 1,
                    color: colors.success
                }}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Criado com sucesso! Redirecionando...</span>
                </div>
            )}

            {errors.submit && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{
                    backgroundColor: `${colors.danger}20`,
                    borderColor: colors.danger,
                    borderWidth: 1,
                    color: colors.danger
                }}>
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.submit}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo */}
                <div className="p-4 rounded-lg shadow-sm border" style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleTipoChange("produto")}
                            className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all"
                            style={{
                                borderColor: !isServico ? colors.primary : colors.border,
                                backgroundColor: !isServico ? `${colors.primary}10` : 'transparent',
                                color: !isServico ? colors.primary : colors.textSecondary
                            }}
                        >
                            <Package className="w-5 h-5" />
                            <span className="font-medium">Produto</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTipoChange("servico")}
                            className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all"
                            style={{
                                borderColor: isServico ? colors.secondary : colors.border,
                                backgroundColor: isServico ? `${colors.secondary}10` : 'transparent',
                                color: isServico ? colors.secondary : colors.textSecondary
                            }}
                        >
                            <Wrench className="w-5 h-5" />
                            <span className="font-medium">Serviço</span>
                        </button>
                    </div>
                </div>

                {/* Informações Principais */}
                <div className="p-4 rounded-lg shadow-sm border space-y-4" style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            Nome <span style={{ color: colors.danger }}>*</span>
                        </label>
                        <input
                            type="text"
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            placeholder={isServico ? "Ex: Consultoria TI" : "Ex: Notebook Dell"}
                            className="w-full px-3 py-2 rounded-lg border outline-none transition-all"
                            style={{
                                backgroundColor: colors.card,
                                borderColor: errors.nome ? colors.danger : colors.border,
                                color: colors.text
                            }}
                        />
                        {errors.nome && <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.nome}</p>}
                    </div>

                    {!isServico && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                    Categoria <span style={{ color: colors.danger }}>*</span>
                                </label>
                                <select
                                    name="categoria_id"
                                    value={formData.categoria_id}
                                    onChange={handleChange}
                                    disabled={loadingCategorias}
                                    className="w-full px-3 py-2 rounded-lg border outline-none"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: errors.categoria_id ? colors.danger : colors.border,
                                        color: colors.text
                                    }}
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
                                    <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.categoria_id}</p>
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
                                    className="w-full px-3 py-2 rounded-lg border outline-none"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Preços */}
                <div className="p-4 rounded-lg shadow-sm border" style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!isServico && (
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                    Preço Compra <span style={{ color: colors.danger }}>*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textSecondary }}>Kz</span>
                                    <input
                                        type="number"
                                        name="preco_compra"
                                        value={formData.preco_compra}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border outline-none"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: errors.preco_compra ? colors.danger : colors.border,
                                            color: colors.text
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className={isServico ? "md:col-span-2" : ""}>
                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                Preço Venda <span style={{ color: colors.danger }}>*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textSecondary }}>Kz</span>
                                <input
                                    type="number"
                                    name="preco_venda"
                                    value={formData.preco_venda}
                                    onChange={handleChange}
                                    min="0.01"
                                    step="0.01"
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border outline-none"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: errors.preco_venda ? colors.danger : colors.border,
                                        color: colors.text
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="sujeito_iva"
                                checked={formData.sujeito_iva}
                                onChange={handleChange}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: colors.primary }}
                            />
                            <span className="text-sm" style={{ color: colors.text }}>IVA</span>
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
                                    className="w-20 px-2 py-1 rounded border text-sm"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}
                                />
                                <span className="text-sm" style={{ color: colors.textSecondary }}>%</span>
                            </div>
                        )}

                        {isServico && (
                            <>
                                <div className="w-px h-4" style={{ backgroundColor: colors.border }} />
                                <span className="text-sm" style={{ color: colors.textSecondary }}>Retenção:</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        name="retencao"
                                        value={formData.retencao}
                                        onChange={handleChange}
                                        min="0"
                                        max="100"
                                        className="w-20 px-2 py-1 rounded border text-sm"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.text
                                        }}
                                    />
                                    <span className="text-sm" style={{ color: colors.textSecondary }}>%</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="mt-4 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2 text-sm" style={{
                        backgroundColor: colors.hover
                    }}>
                        <div className="flex items-center gap-2" style={{ color: colors.textSecondary }}>
                            <Calculator className="w-4 h-4" />
                            <span>Total c/ IVA:</span>
                            <span className="font-semibold" style={{ color: colors.primary }}>{formatarPreco(precoComIva)}</span>
                        </div>

                        {!isServico ? (
                            <span className={`font-medium ${margemLucro >= 0 ? "text-green-600" : "text-red-600"}`}>
                                Margem: {margemLucro.toFixed(1)}%
                            </span>
                        ) : valorRetencao > 0 ? (
                            <span className="font-medium" style={{ color: colors.secondary }}>
                                Líquido: {formatarPreco(valorLiquido)}
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Campos Específicos */}
                {!isServico ? (
                    <div className="p-4 rounded-lg shadow-sm border" style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}>
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
                                    className="w-full px-3 py-2 rounded-lg border outline-none"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
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
                                    className="w-full px-3 py-2 rounded-lg border outline-none"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-lg shadow-sm border" style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            Duração Estimada
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="number"
                                name="duracao_estimada"
                                value={formData.duracao_estimada}
                                onChange={handleChange}
                                min="1"
                                className="flex-1 px-3 py-2 rounded-lg border outline-none"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            />
                            <select
                                name="unidade_medida"
                                value={formData.unidade_medida}
                                onChange={handleChange}
                                className="px-3 py-2 rounded-lg border outline-none"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
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
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                        style={{ color: colors.textSecondary }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
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