'use client';

import React, { useEffect, useState, useCallback } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    X,
    CreditCard,
    Sparkles,
} from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import { planosCrudApi, featuresApi } from "@/services/axios";
import { toast } from "sonner";

interface Feature {
    id: string;
    nome: string;
    descricao: string | null;
    icone: string | null;
    ativo: boolean;
}

interface PlanoFeature extends Feature {
    pivot: {
        quantidade: number;
        unidade: string | null;
    };
}

interface Plano {
    id: string;
    nome: string;
    descricao: string | null;
    valor_mensal: number;
    valor_anual: number | null;
    duracao_meses: number;
    ativo: boolean;
    features: PlanoFeature[];
}

interface FeatureSelecionada {
    selecionada: boolean;
    quantidade: string;
    unidade: string;
}

interface PlanoForm {
    nome: string;
    descricao: string;
    valor_mensal: string;
    valor_anual: string;
    duracao_meses: string;
    ativo: boolean;
}

const FORM_VAZIO: PlanoForm = {
    nome: "",
    descricao: "",
    valor_mensal: "",
    valor_anual: "",
    duracao_meses: "1",
    ativo: true,
};

function formatarKz(valor: number) {
    return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(valor);
}

export default function PlanosPage() {
    const colors = useThemeColors();
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editando, setEditando] = useState<Plano | null>(null);
    const [form, setForm] = useState<PlanoForm>(FORM_VAZIO);
    const [featuresSelecionadas, setFeaturesSelecionadas] = useState<Record<string, FeatureSelecionada>>({});
    const [salvando, setSalvando] = useState(false);

    const [confirmarRemocao, setConfirmarRemocao] = useState<Plano | null>(null);
    const [removendo, setRemovendo] = useState(false);

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            const [resPlanos, resFeatures] = await Promise.all([
                planosCrudApi.listar(),
                featuresApi.listar(),
            ]);
            setPlanos(resPlanos.data || []);
            setFeatures(resFeatures.data || []);
        } catch {
            toast.error("Erro ao carregar planos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const featuresVaziasSelecionadas = (): Record<string, FeatureSelecionada> => {
        const base: Record<string, FeatureSelecionada> = {};
        features.forEach((f) => {
            base[f.id] = { selecionada: false, quantidade: "", unidade: "" };
        });
        return base;
    };

    const abrirCriar = () => {
        setEditando(null);
        setForm(FORM_VAZIO);
        setFeaturesSelecionadas(featuresVaziasSelecionadas());
        setModalOpen(true);
    };

    const abrirEditar = (plano: Plano) => {
        setEditando(plano);
        setForm({
            nome: plano.nome,
            descricao: plano.descricao || "",
            valor_mensal: String(plano.valor_mensal),
            valor_anual: plano.valor_anual != null ? String(plano.valor_anual) : "",
            duracao_meses: String(plano.duracao_meses),
            ativo: plano.ativo,
        });

        const base = featuresVaziasSelecionadas();
        plano.features.forEach((pf) => {
            base[pf.id] = {
                selecionada: true,
                quantidade: String(pf.pivot.quantidade),
                unidade: pf.pivot.unidade || "",
            };
        });
        setFeaturesSelecionadas(base);
        setModalOpen(true);
    };

    const fecharModal = () => {
        setModalOpen(false);
        setEditando(null);
        setForm(FORM_VAZIO);
        setFeaturesSelecionadas({});
    };

    const toggleFeature = (featureId: string) => {
        setFeaturesSelecionadas((prev) => ({
            ...prev,
            [featureId]: { ...prev[featureId], selecionada: !prev[featureId].selecionada },
        }));
    };

    const atualizarFeature = (featureId: string, campo: "quantidade" | "unidade", valor: string) => {
        setFeaturesSelecionadas((prev) => ({
            ...prev,
            [featureId]: { ...prev[featureId], [campo]: valor },
        }));
    };

    const sincronizarFeatures = async (planoId: string, planoAnterior?: Plano) => {
        // Em edição: desassocia tudo o que estava antes, para evitar conflito de pivot duplicado
        if (planoAnterior) {
            for (const pf of planoAnterior.features) {
                try {
                    await planosCrudApi.detachFeature(planoId, pf.id);
                } catch {
                    // segue mesmo se já não existir a associação
                }
            }
        }

        const selecionadas = Object.entries(featuresSelecionadas).filter(([, v]) => v.selecionada);
        for (const [featureId, dados] of selecionadas) {
            await planosCrudApi.attachFeature(planoId, {
                feature_id: featureId,
                quantidade: parseInt(dados.quantidade) || 0,
                unidade: dados.unidade || undefined,
            });
        }
    };

    const salvar = async () => {
        if (!form.nome.trim() || !form.valor_mensal) {
            toast.error("Preenche nome e valor mensal");
            return;
        }

        const algumaFeatureIncompleta = Object.values(featuresSelecionadas).some(
            (f) => f.selecionada && !f.quantidade
        );
        if (algumaFeatureIncompleta) {
            toast.error("Define a quantidade para todas as features selecionadas");
            return;
        }

        setSalvando(true);
        const payload = {
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            valor_mensal: parseFloat(form.valor_mensal),
            valor_anual: form.valor_anual ? parseFloat(form.valor_anual) : null,
            duracao_meses: parseInt(form.duracao_meses) || 1,
            ativo: form.ativo,
        };

        try {
            if (editando) {
                await planosCrudApi.atualizar(editando.id, payload);
                await sincronizarFeatures(editando.id, editando);
                toast.success("Plano atualizado");
            } else {
                const response = await planosCrudApi.criar(payload);
                const novoPlano = response.data;
                await sincronizarFeatures(novoPlano.id);
                toast.success("Plano criado");
            }
            fecharModal();
            carregar();
        } catch (err: any) {
            const mensagens = err?.response?.data?.errors;
            const primeiraMsg = mensagens ? (Object.values(mensagens)[0] as string[])[0] : null;
            toast.error(primeiraMsg || err?.response?.data?.message || "Erro ao salvar plano");
        } finally {
            setSalvando(false);
        }
    };

    const remover = async () => {
        if (!confirmarRemocao) return;
        setRemovendo(true);
        try {
            await planosCrudApi.remover(confirmarRemocao.id);
            toast.success("Plano removido");
            setConfirmarRemocao(null);
            carregar();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao remover plano");
        } finally {
            setRemovendo(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold md:text-xl" style={{ color: colors.text }}>Planos</h2>
                    <p className="text-xs md:text-sm" style={{ color: colors.textSecondary }}>
                        Gerir os planos e as features associadas
                    </p>
                </div>
                <button
                    onClick={abrirCriar}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: colors.primary }}
                >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Novo Plano</span>
                </button>
            </div>

            {planos.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-16 rounded-xl border"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    <CreditCard size={32} style={{ color: colors.textSecondary }} />
                    <p className="mt-3 text-sm" style={{ color: colors.textSecondary }}>Nenhum plano cadastrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {planos.map((plano) => (
                        <div
                            key={plano.id}
                            className="p-4 rounded-xl border flex flex-col"
                            style={{ backgroundColor: colors.card, borderColor: colors.border, opacity: plano.ativo ? 1 : 0.6 }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold" style={{ color: colors.text }}>{plano.nome}</h3>
                                    <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                        {plano.descricao || "Sem descrição"}
                                    </p>
                                </div>
                                <span
                                    className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
                                    style={{
                                        backgroundColor: plano.ativo ? "#22c55e15" : `${colors.textSecondary}15`,
                                        color: plano.ativo ? "#22c55e" : colors.textSecondary,
                                    }}
                                >
                                    {plano.ativo ? "Ativo" : "Inativo"}
                                </span>
                            </div>

                            <div className="mt-3">
                                <span className="text-xl font-bold" style={{ color: colors.primary }}>
                                    {formatarKz(plano.valor_mensal)}
                                </span>
                                <span className="text-xs" style={{ color: colors.textSecondary }}> /mês</span>
                                {plano.valor_anual != null && (
                                    <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                                        ou {formatarKz(plano.valor_anual)}/ano
                                    </p>
                                )}
                                <p className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                                    Duração: {plano.duracao_meses} {plano.duracao_meses === 1 ? "mês" : "meses"}
                                </p>
                            </div>

                            {plano.features && plano.features.length > 0 && (
                                <ul className="mt-3 space-y-1.5 flex-1">
                                    {plano.features.map((f) => (
                                        <li key={f.id} className="flex items-center gap-2 text-xs" style={{ color: colors.text }}>
                                            <Sparkles size={13} style={{ color: colors.secondary, flexShrink: 0 }} />
                                            <span className="truncate">
                                                {f.nome}
                                                {f.pivot && (
                                                    <span style={{ color: colors.textSecondary }}>
                                                        {" "}— {f.pivot.quantidade}{f.pivot.unidade ? ` ${f.pivot.unidade}` : ""}
                                                    </span>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: colors.border }}>
                                <button
                                    onClick={() => abrirEditar(plano)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                                    style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
                                >
                                    <Pencil size={13} /> Editar
                                </button>
                                <button
                                    onClick={() => setConfirmarRemocao(plano)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                                    style={{ backgroundColor: "#ef444415", color: "#ef4444" }}
                                >
                                    <Trash2 size={13} /> Remover
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal criar/editar */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    onClick={fecharModal}
                >
                    <div
                        className="w-full max-w-2xl rounded-xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: colors.card }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b sticky top-0" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <h3 className="text-sm font-bold" style={{ color: colors.text }}>
                                {editando ? "Editar Plano" : "Novo Plano"}
                            </h3>
                            <button onClick={fecharModal} className="p-1.5 rounded-lg hover:scale-110 transition-transform">
                                <X size={18} style={{ color: colors.textSecondary }} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium" style={{ color: colors.text }}>Nome</label>
                                    <input
                                        type="text"
                                        value={form.nome}
                                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                        style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                                        placeholder="Ex: Profissional"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium" style={{ color: colors.text }}>Descrição</label>
                                    <input
                                        type="text"
                                        value={form.descricao}
                                        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                        style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium" style={{ color: colors.text }}>Valor mensal (Kz)</label>
                                        <input
                                            type="number"
                                            value={form.valor_mensal}
                                            onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                                            className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                            style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium" style={{ color: colors.text }}>Valor anual (Kz)</label>
                                        <input
                                            type="number"
                                            value={form.valor_anual}
                                            onChange={(e) => setForm({ ...form, valor_anual: e.target.value })}
                                            className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                            style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium" style={{ color: colors.text }}>Duração (meses)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={form.duracao_meses}
                                            onChange={(e) => setForm({ ...form, duracao_meses: e.target.value })}
                                            className="w-full mt-1 px-3 py-2 rounded-lg text-sm border outline-none"
                                            style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.ativo}
                                        onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-xs font-medium" style={{ color: colors.text }}>Plano ativo</span>
                                </label>
                            </div>

                            <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
                                <h4 className="text-xs font-semibold mb-2" style={{ color: colors.text }}>Features do plano</h4>
                                {features.length === 0 ? (
                                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                                        Nenhuma feature cadastrada ainda.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {features.map((feature) => {
                                            const sel = featuresSelecionadas[feature.id] || { selecionada: false, quantidade: "", unidade: "" };
                                            return (
                                                <div
                                                    key={feature.id}
                                                    className="p-2.5 rounded-lg border"
                                                    style={{ borderColor: colors.border, backgroundColor: sel.selecionada ? `${colors.primary}08` : "transparent" }}
                                                >
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={sel.selecionada}
                                                            onChange={() => toggleFeature(feature.id)}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-xs font-medium flex-1" style={{ color: colors.text }}>
                                                            {feature.nome}
                                                        </span>
                                                    </label>
                                                    {sel.selecionada && (
                                                        <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
                                                            <input
                                                                type="number"
                                                                value={sel.quantidade}
                                                                onChange={(e) => atualizarFeature(feature.id, "quantidade", e.target.value)}
                                                                placeholder="Quantidade"
                                                                className="px-2 py-1.5 rounded-md text-xs border outline-none"
                                                                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                                                            />
                                                            <input
                                                                type="text"
                                                                value={sel.unidade}
                                                                onChange={(e) => atualizarFeature(feature.id, "unidade", e.target.value)}
                                                                placeholder="Unidade (ex: usuários)"
                                                                className="px-2 py-1.5 rounded-md text-xs border outline-none"
                                                                style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 p-4 border-t sticky bottom-0" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <button
                                onClick={fecharModal}
                                className="flex-1 py-2 rounded-lg text-xs font-medium"
                                style={{ backgroundColor: `${colors.textSecondary}15`, color: colors.text }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvar}
                                disabled={salvando}
                                className="flex-1 py-2 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                                style={{ backgroundColor: colors.primary }}
                            >
                                {salvando && <Loader2 size={13} className="animate-spin" />}
                                {editando ? "Guardar" : "Criar Plano"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar remoção */}
            {confirmarRemocao && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    onClick={() => setConfirmarRemocao(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-xl overflow-hidden shadow-xl"
                        style={{ backgroundColor: colors.card }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4">
                            <h3 className="text-sm font-bold" style={{ color: colors.text }}>Remover plano?</h3>
                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                Tens a certeza que queres remover <strong>{confirmarRemocao.nome}</strong>? Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className="flex gap-2 p-4 pt-0">
                            <button
                                onClick={() => setConfirmarRemocao(null)}
                                className="flex-1 py-2 rounded-lg text-xs font-medium"
                                style={{ backgroundColor: `${colors.textSecondary}15`, color: colors.text }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={remover}
                                disabled={removendo}
                                className="flex-1 py-2 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                                style={{ backgroundColor: "#ef4444" }}
                            >
                                {removendo && <Loader2 size={13} className="animate-spin" />}
                                Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}