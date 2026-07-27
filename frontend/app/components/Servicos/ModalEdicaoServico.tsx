"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Produto,
    UnidadeMedida,
    formatarPreco,
} from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";
import { Wrench, Save, AlertCircle, Loader2, Calculator } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ModalEdicaoServicoProps {
    isOpen: boolean;
    item: Produto | null;
    onSave: (dados: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
    onClose: () => void;
}

interface FormData {
    nome: string;
    descricao: string;
    preco_venda: string;
    taxa_iva: string;
    sujeito_iva: boolean;
    status: "ativo" | "inativo";
    taxa_retencao: string;
    duracao_estimada: string;
    unidade_medida: UnidadeMedida;
}

interface FormErrors { [key: string]: string; }

type AxiosLikeError = {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
};

export function ModalEdicaoServico({ isOpen, item, onSave, onClose }: ModalEdicaoServicoProps) {
    const colors = useThemeColors();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>({
        nome: "", descricao: "",
        preco_venda: "", taxa_iva: "", sujeito_iva: true,
        status: "ativo", taxa_retencao: "0", duracao_estimada: "1", unidade_medida: "hora",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (item) {
            let duracaoNum = "1";
            let unidade: UnidadeMedida = "hora";
            if (item.duracao_estimada) {
                const match = item.duracao_estimada.match(/^(\d+)\s*(\w+)$/);
                if (match) { duracaoNum = match[1]; unidade = match[2] as UnidadeMedida; }
            }
            setFormData({
                nome: item.nome || "", descricao: item.descricao || "",
                preco_venda: item.preco_venda?.toString() || "0",
                taxa_iva: item.taxa_iva?.toString() || "0",
                sujeito_iva: item.sujeito_iva ?? true,
                status: item.status || "ativo",
                taxa_retencao: item.taxa_retencao?.toString() || "0",
                duracao_estimada: duracaoNum, unidade_medida: unidade,
            });
            setErrors({});
            setError(null);
        }
    }, [item]);

    const precoComIva = useMemo(() => {
        const venda = parseFloat(formData.preco_venda) || 0;
        const iva = parseFloat(formData.taxa_iva) || 0;
        if (!formData.sujeito_iva) return venda;
        return venda * (1 + iva / 100);
    }, [formData.preco_venda, formData.taxa_iva, formData.sujeito_iva]);

    const valorRetencao = useMemo(() => {
        const venda = parseFloat(formData.preco_venda) || 0;
        return venda * ((parseFloat(formData.taxa_retencao) || 0) / 100);
    }, [formData.preco_venda, formData.taxa_retencao]);

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
        if (!formData.preco_venda || parseFloat(formData.preco_venda) <= 0) newErrors.preco_venda = "Preço inválido";
        if (parseFloat(formData.taxa_retencao) > 100) newErrors.taxa_retencao = "Máx 100%";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !item) return;

        setLoading(true);
        setError(null);

        try {
            const dadosSalvar = {
                tipo: "servico",
                nome: formData.nome.trim(),
                descricao: formData.descricao.trim() || null,
                preco_venda: parseFloat(formData.preco_venda),
                status: formData.status,
                taxa_iva: formData.sujeito_iva ? parseFloat(formData.taxa_iva) : 0,
                sujeito_iva: formData.sujeito_iva,
                taxa_retencao: parseFloat(formData.taxa_retencao) || 0,
                duracao_estimada: `${formData.duracao_estimada} ${formData.unidade_medida}`,
                unidade_medida: formData.unidade_medida,
            };

            const result = await onSave(dadosSalvar);
            if (result.success) {
                onClose();
            } else {
                setError(result.error || "Erro ao salvar o serviço");
            }
        } catch (err: unknown) {
            const apiError = err as AxiosLikeError;
            setError(apiError.response?.data?.message || apiError.message || "Erro ao salvar alterações");
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

    if (!item) return null;

    return (
        <Dialog open={isOpen && !!item} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
            <DialogContent
                className="sm:max-w-xl p-0 top-[50%]"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <DialogHeader className="p-3 border-b" style={{ borderColor: colors.border }}>
                    <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: colors.text }}>
                        <Wrench className="w-4 h-4" style={{ color: colors.secondary }} />
                        Editar Serviço
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
                                {[{ val: "servico", label: "Serviço", icon: <Wrench className="w-3 h-3" />, color: colors.secondary }].map(({ val, label, icon, color }) => (
                                    <div key={val}
                                        className="flex-1 flex items-center justify-center gap-1 py-1 border text-xs opacity-100"
                                        style={{ borderColor: color, backgroundColor: `${color}10`, color: colors.text }}>
                                        {icon}<span className="font-medium">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Nome + Status */}
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

                            {/* Preços */}
                            <div className="grid grid-cols-1 gap-2">
                                <div>
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
                                        <input
                                            type="checkbox"
                                            name="sujeito_iva"
                                            checked={formData.sujeito_iva}
                                            onChange={handleChange}
                                            className="w-3 h-3" style={{ accentColor: colors.primary }} />
                                        <span className="text-xs" style={{ color: colors.text }}>IVA</span>
                                    </label>
                                    {formData.sujeito_iva && (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                name="taxa_iva"
                                                value={formData.taxa_iva}
                                                onChange={handleChange}
                                                min="0" max="100"
                                                className="w-12 px-1 py-0.5 border text-xs outline-none"
                                                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }} />
                                            <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
                                        </div>
                                    )}
                                    <span className="text-xs" style={{ color: colors.border }}>|</span>
                                    <span className="text-xs" style={{ color: colors.textSecondary }}>Retenção:</span>
                                    <div className="flex items-center gap-1">
                                        <input type="number" name="taxa_retencao" value={formData.taxa_retencao} onChange={handleChange}
                                            min="0" max="100" className="w-12 px-1 py-0.5 border text-xs outline-none"
                                            style={{ backgroundColor: colors.card, borderColor: errors.taxa_retencao ? colors.danger : colors.border, color: colors.text }} />
                                        <span className="text-xs" style={{ color: colors.textSecondary }}>%</span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-1 text-xs" style={{ color: colors.textSecondary }}>
                                        <Calculator className="w-3 h-3" />
                                        <span>c/ IVA:</span>
                                        <span className="font-semibold" style={{ color: colors.text }}>{formatarPreco(precoComIva)}</span>
                                        {valorRetencao > 0 && (
                                            <span className="ml-2 font-medium" style={{ color: colors.secondary }}>
                                                Liq: {formatarPreco(parseFloat(formData.preco_venda) - valorRetencao)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Duração e Unidade */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={labelCls} style={{ color: colors.text }}>Duração Estimada</label>
                                    <input type="number" name="duracao_estimada" value={formData.duracao_estimada} onChange={handleChange}
                                        min="1" className={inputCls} style={inputStyle()} />
                                </div>
                                <div>
                                    <label className={labelCls} style={{ color: colors.text }}>Unidade de Medida</label>
                                    <select name="unidade_medida" value={formData.unidade_medida} onChange={handleChange}
                                        className={inputCls} style={inputStyle()}>
                                        <option value="hora">Hora</option>
                                        <option value="dia">Dia</option>
                                        <option value="semana">Semana</option>
                                        <option value="mes">Mês</option>
                                    </select>
                                </div>
                            </div>

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