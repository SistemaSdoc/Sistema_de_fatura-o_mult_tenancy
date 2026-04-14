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
    calcularMargemLucro,
    calcularPrecoVenda,
    CriarProdutoInput,
    getTipoPrecoLabel,
    getFormulaDescricao,
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
    
    // NOVOS: Campos de cálculo de preço
    tipo_preco: TipoPreco;
    preco_compra: string;
    despesas_adicionais: string;
    margem_lucro: string;
    markup: string;
    preco_venda: string;
    
    taxa_iva: string;
    sujeito_iva: boolean;
    estoque_atual: string;
    estoque_minimo: string;
    taxa_retencao: string;
    duracao_estimada: string;
    unidade_medida: UnidadeMedida;
    codigo_isencao: CodigoIsencao | "";
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
        descricao: "",
        
        // NOVOS: Valores padrão para cálculo de preço
        tipo_preco: "margem",        // Default: margem
        preco_compra: "",
        despesas_adicionais: "0",
        margem_lucro: "30",          // 30% default
        markup: "30",                // 30% default
        preco_venda: "",
        
        taxa_iva: "0",
        sujeito_iva: true,
        estoque_atual: "0",
        estoque_minimo: "5",
        taxa_retencao: "0",
        duracao_estimada: "1",
        unidade_medida: "hora",
        codigo_isencao: "",
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

    // ===== CÁLCULOS AUTOMÁTICOS =====
    
    // Calcular preço de venda automaticamente baseado no tipo_preco
    const precoVendaCalculado = useMemo(() => {
        if (isServico) {
            // Serviços: preço fixo manual
            return parseFloat(formData.preco_venda) || 0;
        }

        const compra = parseFloat(formData.preco_compra) || 0;
        const despesas = parseFloat(formData.despesas_adicionais) || 0;
        const base = compra + despesas;

        switch (formData.tipo_preco) {
            case "margem": {
                const margem = parseFloat(formData.margem_lucro) || 0;
                if (margem <= 0 || margem >= 100) return base;
                return base / (1 - (margem / 100));
            }
            case "markup": {
                const markup = parseFloat(formData.markup) || 0;
                return base * (1 + (markup / 100));
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
        isServico,
    ]);

    // Atualizar preco_venda no form quando calculado (exceto em modo fixo)
    useEffect(() => {
        if (!isServico && formData.tipo_preco !== "fixo") {
            const calculado = Math.round(precoVendaCalculado * 100) / 100;
            setFormData(prev => ({
                ...prev,
                preco_venda: calculado.toString(),
            }));
        }
    }, [precoVendaCalculado, formData.tipo_preco, isServico]);

    // Cálculos de preview
    const custoTotal = useMemo(() => {
        if (isServico) return 0;
        return (parseFloat(formData.preco_compra) || 0) + 
               (parseFloat(formData.despesas_adicionais) || 0);
    }, [formData.preco_compra, formData.despesas_adicionais, isServico]);

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

    const precoComIva = useMemo(() => {
        const venda = parseFloat(formData.preco_venda) || 0;
        const iva = parseFloat(formData.taxa_iva) || 0;
        if (!formData.sujeito_iva) return venda;
        return venda * (1 + iva / 100);
    }, [formData.preco_venda, formData.taxa_iva, formData.sujeito_iva]);

    const valorRetencao = useMemo(() => {
        if (!isServico) return 0;
        const venda = parseFloat(formData.preco_venda) || 0;
        const taxaRetencao = parseFloat(formData.taxa_retencao) || 0;
        return venda * (taxaRetencao / 100);
    }, [formData.preco_venda, formData.taxa_retencao, isServico]);

    const valorLiquido = useMemo(() => {
        const venda = parseFloat(formData.preco_venda) || 0;
        return isServico ? venda - valorRetencao : venda;
    }, [formData.preco_venda, valorRetencao, isServico]);

    // ===== HANDLERS =====

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
    };

    const handleTipoChange = (tipo: TipoProduto) => {
        setFormData((prev) => ({
            ...prev,
            tipo,
            categoria_id: tipo === "servico" ? "" : prev.categoria_id,
            preco_compra: tipo === "servico" ? "0" : prev.preco_compra,
            estoque_atual: tipo === "servico" ? "0" : prev.estoque_atual,
            estoque_minimo: tipo === "servico" ? "0" : prev.estoque_minimo,
            taxa_retencao: tipo === "produto" ? "0" : prev.taxa_retencao,
            tipo_preco: tipo === "servico" ? "fixo" : prev.tipo_preco,
        }));
        setErrors({});
    };

    const handleTipoPrecoChange = (tipoPreco: TipoPreco) => {
        setFormData((prev) => ({
            ...prev,
            tipo_preco: tipoPreco,
            // Resetar valores quando muda o tipo
            preco_venda: tipoPreco === "fixo" ? prev.preco_venda : prev.preco_venda,
        }));
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.nome.trim()) newErrors.nome = "Nome obrigatório";
        
        const precoVenda = parseFloat(formData.preco_venda);
        if (!precoVenda || precoVenda <= 0) {
            newErrors.preco_venda = "Preço de venda obrigatório";
        }

        if (!isServico) {
            if (!formData.categoria_id) newErrors.categoria_id = "Categoria obrigatória";
            
            const precoCompra = parseFloat(formData.preco_compra);
            if (precoCompra === undefined || precoCompra < 0) {
                newErrors.preco_compra = "Preço de compra obrigatório";
            }

            // Validar margem
            if (formData.tipo_preco === "margem") {
                const margem = parseFloat(formData.margem_lucro);
                if (!margem || margem <= 0 || margem >= 100) {
                    newErrors.margem_lucro = "Margem deve ser entre 0.01% e 99.99%";
                }
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
                // SERVIÇO
                dados.taxa_retencao = parseFloat(formData.taxa_retencao) || 0;
                dados.duracao_estimada = `${formData.duracao_estimada} ${formData.unidade_medida}`;
                dados.unidade_medida = formData.unidade_medida;
                dados.codigo_isencao = formData.codigo_isencao || undefined;
                dados.categoria_id = null;
                dados.codigo = null;
                dados.preco_compra = 0;
                dados.estoque_atual = 0;
                dados.estoque_minimo = 0;
            } else {
                // PRODUTO - com novo sistema de preço
                dados.categoria_id = formData.categoria_id || null;
                dados.codigo = formData.codigo.trim() || null;
                dados.preco_compra = parseFloat(formData.preco_compra) || 0;
                dados.estoque_atual = parseInt(formData.estoque_atual) || 0;
                dados.estoque_minimo = parseInt(formData.estoque_minimo) || 0;
                
                // NOVOS: Enviar campos de cálculo para backend
                dados.tipo_preco = formData.tipo_preco;
                dados.despesas_adicionais = parseFloat(formData.despesas_adicionais) || 0;
                
                if (formData.tipo_preco === "margem") {
                    dados.margem_lucro = parseFloat(formData.margem_lucro) || 0;
                } else if (formData.tipo_preco === "markup") {
                    dados.markup = parseFloat(formData.markup) || 0;
                }
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

    // ===== RENDER =====

    return (
        <div className="transition-colors duration-300 w-full">
            {/* Header */}
            {!onCancel ? (
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={handleCancel}
                        className="p-2 transition-colors"
                        style={{ color: colors.textSecondary }}
                        type="button"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold" style={{ color: colors.secondary }}>
                            Novo {isServico ? "Serviço" : "Produto"}
                        </h1>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Preencha os dados para cadastrar um novo {isServico ? "serviço" : "produto"}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold" style={{ color: colors.secondary }}>
                        Novo {isServico ? "Serviço" : "Produto"}
                    </h2>
                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        Preencha os dados abaixo
                    </p>
                </div>
            )}

            {/* Alertas */}
            {success && (
                <div className="mb-4 p-3 flex items-center gap-2 text-sm animate-pulse" style={{
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
                <div className="mb-4 p-3 flex items-center gap-2 text-sm" style={{
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
                <div className="p-4 shadow-sm border" style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleTipoChange("produto")}
                            className="flex items-center justify-center gap-2 p-3 border-2 transition-all"
                            style={{
                                borderColor: !isServico ? colors.primary : colors.border,
                                backgroundColor: !isServico ? `${colors.primary}10` : 'transparent',
                                color: !isServico ? colors.textSecondary : colors.textSecondary
                            }}
                        >
                            <Package className="w-5 h-5" />
                            <span className="font-medium">Produto</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTipoChange("servico")}
                            className="flex items-center justify-center gap-2 p-3 border-2 transition-all"
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
                <div className="p-4 shadow-sm border space-y-4" style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            Nome 
                        </label>
                        <input
                            type="text"
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            placeholder={isServico ? "Insira o nome do serviço" : "Insira o nome do produto"}
                            className="w-full px-3 py-2 border outline-none transition-all"
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
                                        color: colors.text
                                    }}
                                >
                                    <option value="">
                                        {loadingCategorias ? "Carregando..." : "Selecione a categoria"}
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
                                    className="w-full px-3 py-2 border outline-none"
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

                {/* ===== SEÇÃO DE PREÇO ATUALIZADA ===== */}
                <div className="p-4 shadow-sm border" style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: colors.border }}>
                        <Calculator className="w-5 h-5" style={{ color: colors.primary }} />
                        <h3 className="font-semibold" style={{ color: colors.text }}>Configuração de Preço</h3>
                    </div>

                    {/* Seletor de Tipo de Preço (apenas para produtos) */}
                    {!isServico && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                                Método de Cálculo
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['fixo', 'margem', 'markup'] as TipoPreco[]).map((tipo) => (
                                    <button
                                        key={tipo}
                                        type="button"
                                        onClick={() => handleTipoPrecoChange(tipo)}
                                        className="flex flex-col items-center gap-1 p-3 border-2 transition-all rounded-lg"
                                        style={{
                                            borderColor: formData.tipo_preco === tipo ? colors.primary : colors.border,
                                            backgroundColor: formData.tipo_preco === tipo ? `${colors.primary}10` : 'transparent',
                                        }}
                                    >
                                        {tipo === 'fixo' && <Tag className="w-4 h-4" style={{ color: formData.tipo_preco === tipo ? colors.primary : colors.textSecondary }} />}
                                        {tipo === 'margem' && <TrendingUp className="w-4 h-4" style={{ color: formData.tipo_preco === tipo ? colors.primary : colors.textSecondary }} />}
                                        {tipo === 'markup' && <DollarSign className="w-4 h-4" style={{ color: formData.tipo_preco === tipo ? colors.primary : colors.textSecondary }} />}
                                        <span className="text-xs font-medium" style={{ color: formData.tipo_preco === tipo ? colors.primary : colors.text }}>
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
                    )}

                    {/* Campos de Custo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {!isServico && (
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                    Preço de Compra (Kz) *
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
                                        className="w-full pl-10 pr-3 py-2 border outline-none"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: errors.preco_compra ? colors.danger : colors.border,
                                            color: colors.text
                                        }}
                                    />
                                </div>
                                {errors.preco_compra && (
                                    <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.preco_compra}</p>
                                )}
                            </div>
                        )}

                        {!isServico && (
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                    Despesas Adicionais (Kz)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: colors.textSecondary }}>Kz</span>
                                    <input
                                        type="number"
                                        name="despesas_adicionais"
                                        value={formData.despesas_adicionais}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="Transporte, taxas, etc"
                                        className="w-full pl-10 pr-3 py-2 border outline-none"
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

                    {/* Campos Condicionais (Margem/Markup) */}
                    <AnimatePresence mode="wait">
                        {!isServico && formData.tipo_preco === "margem" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4"
                            >
                                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                    Margem de Lucro (%)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        name="margem_lucro"
                                        value={formData.margem_lucro}
                                        onChange={handleChange}
                                        min="0.01"
                                        max="99.99"
                                        step="0.01"
                                        className="flex-1 px-3 py-2 border outline-none"
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: errors.margem_lucro ? colors.danger : colors.border,
                                            color: colors.text
                                        }}
                                    />
                                    <span className="text-lg" style={{ color: colors.textSecondary }}>%</span>
                                </div>
                                {errors.margem_lucro && (
                                    <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.margem_lucro}</p>
                                )}
                                <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                                    Ex: 30% de margem significa que o lucro representa 30% do preço final
                                </p>
                            </motion.div>
                        )}

                        {!isServico && formData.tipo_preco === "markup" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4"
                            >
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
                                            color: colors.text
                                        }}
                                    />
                                    <span className="text-lg" style={{ color: colors.textSecondary }}>%</span>
                                </div>
                                <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                                    Ex: 30% de markup significa que o lucro representa 30% do custo
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Preço de Venda (Read-only exceto em modo fixo) */}
                    <div className={`${isServico ? "md:col-span-2" : ""}`}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            Preço de Venda (Kz) {formData.tipo_preco !== "fixo" && !isServico && "(Calculado)"}
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
                                readOnly={!isServico && formData.tipo_preco !== "fixo"}
                                className={`w-full pl-10 pr-3 py-2 border outline-none ${
                                    !isServico && formData.tipo_preco !== "fixo" ? "bg-muted/50" : ""
                                }`}
                                style={{
                                    backgroundColor: !isServico && formData.tipo_preco !== "fixo" 
                                        ? `${colors.hover}` 
                                        : colors.card,
                                    borderColor: errors.preco_venda ? colors.danger : colors.border,
                                    color: colors.text
                                }}
                            />
                        </div>
                        {errors.preco_venda && (
                            <p className="mt-1 text-xs" style={{ color: colors.danger }}>{errors.preco_venda}</p>
                        )}
                    </div>

                    {/* IVA e Retenção */}
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="sujeito_iva"
                                checked={formData.sujeito_iva}
                                onChange={handleChange}
                                className="w-4 h-4"
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
                                    className="w-20 px-2 py-1 border text-sm"
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
                                        name="taxa_retencao"
                                        value={formData.taxa_retencao}
                                        onChange={handleChange}
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        className="w-20 px-2 py-1 border text-sm"
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

                    {/* Preview de Cálculos */}
                    {!isServico && (
                        <div className="mt-4 p-3 rounded-lg space-y-2" style={{ backgroundColor: colors.hover }}>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: colors.textSecondary }}>Custo Total:</span>
                                <span className="font-medium" style={{ color: colors.text }}>
                                    {formatarPreco(custoTotal)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: colors.textSecondary }}>Lucro Bruto:</span>
                                <span className={`font-medium ${lucroBruto >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatarPreco(lucroBruto)}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs" style={{ color: colors.textSecondary }}>
                                <div>Margem Real: {margemReal.toFixed(2)}%</div>
                                <div>Markup Real: {markupReal.toFixed(2)}%</div>
                            </div>
                            <div className="border-t pt-2 mt-2" style={{ borderColor: colors.border }}>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold" style={{ color: colors.text }}>Preço Final + IVA:</span>
                                    <span className="text-lg font-bold" style={{ color: colors.primary }}>
                                        {formatarPreco(precoComIva)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Serviço */}
                    {isServico && valorRetencao > 0 && (
                        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.hover }}>
                            <div className="flex justify-between items-center">
                                <span style={{ color: colors.textSecondary }}>Valor Líquido (após retenção):</span>
                                <span className="text-lg font-bold" style={{ color: colors.secondary }}>
                                    {formatarPreco(valorLiquido)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Campos Específicos - Produto */}
                {!isServico && (
                    <div className="p-4 shadow-sm border" style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}>
                        <h3 className="font-semibold mb-4 text-sm" style={{ color: colors.text }}>Estoque</h3>
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
                                    className="w-full px-3 py-2 border outline-none"
                                    style={{
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Campos Específicos - Serviço */}
                {isServico && (
                    <div className="p-4 shadow-sm border space-y-4" style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}>
                        <div>
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
                                    className="flex-1 px-3 py-2 border outline-none"
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
                                    className="px-3 py-2 border outline-none"
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

                        {/* NOVO: Código de Isenção (SAF-T AO) */}
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                Código de Isenção de IVA (opcional)
                            </label>
                            <select
                                name="codigo_isencao"
                                value={formData.codigo_isencao}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border outline-none"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            >
                                <option value="">Sem isenção (sujeito a IVA)</option>
                                <option value="M00">M00 - Não sujeito</option>
                                <option value="M01">M01 - Artigo 6.º do CIVA</option>
                                <option value="M02">M02 - Artigo 7.º do CIVA</option>
                                <option value="M03">M03 - Artigo 8.º do CIVA</option>
                                <option value="M04">M04 - Artigo 9.º do CIVA</option>
                                <option value="M05">M05 - Artigo 10.º do CIVA</option>
                                <option value="M06">M06 - Artigo 11.º do CIVA</option>
                                <option value="M99">M99 - Outras isenções</option>
                            </select>
                            <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                                Para serviços isentos de IVA segundo o Código do IVA de Angola
                            </p>
                        </div>
                    </div>
                )}

                {/* Botões */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 transition-colors text-sm font-medium"
                        style={{ color: colors.textSecondary }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 text-white transition-colors font-medium disabled:opacity-50"
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