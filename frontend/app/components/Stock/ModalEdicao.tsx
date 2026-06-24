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
import { Package, Wrench, Save, Calculator, AlertCircle, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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

interface FormErrors { [key: string]: string; }

export function ModalEdicao({ isOpen, item, onSave, onClose, categorias }: ModalEdicaoProps) {
    const colors = useThemeColors();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        tipo: "produto", categoria_id: "", codigo: "", nome: "", descricao: "",
        preco_compra: "", preco_venda: "", taxa_iva: "", sujeito_iva: true,
        estoque_minimo: "5", status: "ativo", taxa_retencao: "0", duracao_estimada: "1", unidade_medida: "hora",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const categoriasFiltradas = categorias.filter(cat => cat.tipo === formData.tipo || !cat.tipo);
    const isServico = formData.tipo === "servico";

    useEffect(() => {
        if (item) {
            let duracaoNum = "1";
            let unidade: UnidadeMedida = "hora";
            if (item.duracao_estimada) {
                const match = item.duracao_estimada.match(/^(\d+)\s*(\w+)$/);
                if (match) { duracaoNum = match[1]; unidade = match[2] as UnidadeMedida; }
            }
            setFormData({
                tipo: item.tipo, categoria_id: item.categoria_id || "", codigo: item.codigo || "",
                nome: item.nome || "", descricao: item.descricao || "",
                preco_compra: item.preco_compra?.toString() || "0",
                preco_venda: item.preco_venda?.toString() || "0",
                taxa_iva: item.taxa_iva?.toString() || "0",
                sujeito_iva: item.sujeito_iva ?? true,
                estoque_minimo: item.estoque_minimo?.toString() || "5",
                status: item.status || "ativo",
                taxa_retencao: item.taxa_retencao?.toString() || "0",
                duracao_estimada: duracaoNum, unidade_medida: unidade,
            });
            setErrors({});
            setError(null);
        }
    }, [item]);

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
        return venda * ((parseFloat(formData.taxa_retencao) || 0) / 100);
    }, [formData.preco_venda, formData.taxa_retencao, isServico]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
        setError(null);
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.nome.trim()) newErrors.nome = "Nome obrigatório";
        if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) newErrors.preco_venda = "Obrigatório";
        if (!isServico) {
            if (!formData.categoria_id) newErrors.categoria_id = "Obrigatório";
            if (parseFloat(formData.preco_compra) < 0) newErrors.preco_compra = "Inválido";
        }
        if (isServico && parseFloat(formData.taxa_retencao) > 100) newErrors.taxa_retencao = "Máx 100%";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setError(null);
        try {
            const dados: any = {
                tipo: formData.tipo, nome: formData.nome.trim(),
                preco_venda: parseFloat(formData.preco_venda), status: formData.status,
                taxa_iva: parseFloat(formData.taxa_iva) || 0, sujeito_iva: formData.sujeito_iva,
                descricao: formData.descricao?.trim() || null,
            };
            if (!isServico) {
                dados.categoria_id = formData.categoria_id || null;
                dados.codigo = formData.codigo?.trim() || null;
                dados.preco_compra = parseFloat(formData.preco_compra) || 0;
                dados.estoque_minimo = parseInt(formData.estoque_minimo) || 0;
            } else {
                dados.taxa_retencao = parseFloat(formData.taxa_retencao) || 0;
                dados.duracao_estimada = `${formData.duracao_estimada} ${formData.unidade_medida}`;
                dados.unidade_medida = formData.unidade_medida;
            }
            const result = await onSave(dados);
            if (result.success) onClose();
            else setError(result.error || "Erro ao salvar");
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Erro ao salvar alterações");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-2 py-1 border text-xs outline-none";
    const inputStyle = (err?: string) => ({
        backgroundColor: colors.card,
        borderColor: err ? colors.danger : colors.border,
        color: colors.text,
    });
    const labelCls = "block text-xs font-medium mb-0.5";

    return (
        <Dialog open={isOpen && !!item} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
            <DialogContent
                className="sm:max-w-xl p-0 top-[50%]"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <DialogHeader className="p-3 border-b" style={{ borderColor: colors.border }}>
                    <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: colors.text }}>
                        {!isServico
                            ? <Package className="w-4 h-4" style={{ color: colors.primary }} />
                            : <Wrench className="w-4 h-4" style={{ color: colors.secondary }} />
                        }
                        Editar {!isServico ? "Produto" : "Serviço"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="p-3 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 160px)" }}>
                        <div className="space-y-2">
                            {error && (
                                <div className="p-2 border-l-2 text-xs flex items-center gap-2"
                                    style={{ backgroundColor: `${colors.danger}10`, borderColor: colors.danger, color: colors.danger }}>
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
                                </div>
                            )}

                            {/* Indicador de tipo (só leitura) */}
                            <div className="flex gap-2">
                                {[{ val: "produto", label: "Produto", icon: <Package className="w-3 h-3" />, color: colors.primary },
                                  { val: "servico", label: "Serviço", icon: <Wrench className="w-3 h-3" />, color: colors.secondary }
                                ].map(({ val, label, icon, color }) => (
                                    <div key={val}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1 border text-xs ${formData.tipo === val ? "opacity-100" : "opacity-40"}`}
                                        style={{ borderColor: formData.tipo === val ? color : colors.border, backgroundColor: formData.tipo === val ? `${color}10` : "transparent", color: colors.text }}
                                    >
                                        {icon}<span className="font-medium">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Nome + Status numa linha */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <label className={labelCls} style={{ color: colors.text }}>Nome *</label>
                                    <input type="text" name="nome" value={formData.nome} onChange={handleChange}
                                        className={inputCls} style={inputStyle(errors.nome)} />
                                    {errors.nome && <p className="text-[10px] mt-0.5" style={{ color: colors.danger }}>{errors.nome}</p>}
                                </div>
                                <div>
                                    <label className={labelCls} style={{ color: colors.text }}>Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange}
                                        className={inputCls} style={inputStyle()}>
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            {/* Categoria + Código (só produtos) */}
                            {!isServico && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className={labelCls} style={{ color: colors.text }}>Categoria *</label>
                                        <select name="categoria_id" value={formData.categoria_id} onChange={handleChange}
                                            className={inputCls} style={inputStyle(errors.categoria_id)}>
                                            <option value="">Selecione</option>
                                            {categoriasFiltradas.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                            ))}
                                        </select>
                                        {errors.categoria_id && <p className="text-[10px] mt-0.5" style={{ color: colors.danger }}>{errors.categoria_id}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls} style={{ color: colors.text }}>Código/SKU</label>
                                        <input type="text" name="codigo" value={formData.codigo} onChange={handleChange}
                                            className={inputCls} style={inputStyle()} />
                                    </div>
                                </div>
                            )}

                            {/* Preços */}
                            <div className="grid grid-cols-2 gap-2">
                                {!isServico && (
                                    <div>
                                        <label className={labelCls} style={{ color: colors.text }}>Preço Compra</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: colors.textSecondary }}>Kz</span>
                                            <input type="number" name="preco_compra" value={formData.preco_compra} onChange={handleChange}
                                                min="0" step="1" className={`${inputCls} pl-7`} style={inputStyle(errors.preco_compra)} />
                                        </div>
                                    </div>
                                )}
                                <div className={isServico ? "col-span-2" : ""}>
                                    <label className={labelCls} style={{ color: colors.text }}>Preço Venda *</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: colors.textSecondary }}>Kz</span>
                                        <input type="number" name="preco_venda" value={formData.preco_venda} onChange={handleChange}
                                            min="0.01" step="0.01" className={`${inputCls} pl-7`} style={inputStyle(errors.preco_venda)} />
                                    </div>
                                    {errors.preco_venda && <p className="text-[10px] mt-0.5" style={{ color: colors.danger }}>{errors.preco_venda}</p>}
                                </div>
                            </div>

                            {/* IVA + Retenção + Cálculo */}
                            <div className="p-2 border" style={{ borderColor: colors.border }}>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" name="sujeito_iva" checked={formData.sujeito_iva} onChange={handleChange}
                                            className="w-3 h-3" style={{ accentColor: colors.primary }} />
                                        <span className="text-xs" style={{ color: colors.text }}>IVA</span>
                                    </label>
                                    {formData.sujeito_iva && (
                                        <div className="flex items-center gap-1">
                                            <input type="number" name="taxa_iva" value={formData.taxa_iva} onChange={handleChange}
                                                min="0" max="100" className="w-12 px-1 py-0.5 border text-xs outline-none"
                                                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }} />
                                            <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
                                        </div>
                                    )}
                                    {isServico && (
                                        <>
                                            <span className="text-xs" style={{ color: colors.border }}>|</span>
                                            <span className="text-xs" style={{ color: colors.textSecondary }}>Retenção:</span>
                                            <div className="flex items-center gap-1">
                                                <input type="number" name="taxa_retencao" value={formData.taxa_retencao} onChange={handleChange}
                                                    min="0" max="100" className="w-12 px-1 py-0.5 border text-xs outline-none"
                                                    style={{ backgroundColor: colors.card, borderColor: errors.taxa_retencao ? colors.danger : colors.border, color: colors.text }} />
                                                <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: colors.textSecondary }}>
                                        <Calculator className="w-3 h-3" />
                                        <span>c/ IVA:</span>
                                        <span className="font-semibold" style={{ color: colors.text }}>{formatarPreco(precoComIva)}</span>
                                        {!isServico && (
                                            <span className={`ml-2 font-medium ${margemLucro >= 0 ? "text-green-600" : "text-red-500"}`}>
                                                {margemLucro.toFixed(1)}%
                                            </span>
                                        )}
                                        {isServico && valorRetencao > 0 && (
                                            <span className="ml-2 font-medium" style={{ color: colors.secondary }}>
                                                Liq: {formatarPreco(parseFloat(formData.preco_venda) - valorRetencao)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Campos específicos por tipo */}
                            {!isServico ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className={labelCls} style={{ color: colors.text }}>Estoque Mínimo</label>
                                        <input type="number" name="estoque_minimo" value={formData.estoque_minimo} onChange={handleChange}
                                            min="0" className={inputCls} style={inputStyle()} />
                                    </div>
                                    <div>
                                        <label className={labelCls} style={{ color: colors.text }}>Estoque Atual</label>
                                        <input type="number" value={item?.estoque_atual || 0} disabled
                                            className={`${inputCls} cursor-not-allowed`}
                                            style={{ backgroundColor: `${colors.textSecondary}10`, borderColor: colors.border, color: colors.textSecondary }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className={labelCls} style={{ color: colors.text }}>Duração</label>
                                        <input type="number" name="duracao_estimada" value={formData.duracao_estimada} onChange={handleChange}
                                            min="1" className={inputCls} style={inputStyle()} />
                                    </div>
                                    <div>
                                        <label className={labelCls} style={{ color: colors.text }}>Unidade</label>
                                        <select name="unidade_medida" value={formData.unidade_medida} onChange={handleChange}
                                            className={inputCls} style={inputStyle()}>
                                            <option value="hora">Hora</option>
                                            <option value="dia">Dia</option>
                                            <option value="semana">Semana</option>
                                            <option value="mes">Mês</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Descrição */}
                            <div>
                                <label className={labelCls} style={{ color: colors.text }}>Descrição</label>
                                <textarea name="descricao" value={formData.descricao} onChange={handleChange}
                                    rows={2} className={`${inputCls} resize-none`} style={inputStyle()} />
                            </div>
                        </div>
                    </div>

                    {/* Botões fixos no fundo */}
                    <div className="p-3 border-t flex gap-2" style={{ borderColor: colors.border }}>
                        <button type="button" onClick={onClose}
                            className="flex-1 py-1.5 text-xs font-medium"
                            style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-white text-xs font-medium disabled:opacity-50"
                            style={{ backgroundColor: colors.primary }}>
                            {loading ? <><Loader2 className="w-3 h-3 animate-spin" />Salvando...</> : <><Save className="w-3 h-3" />Salvar</>}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
