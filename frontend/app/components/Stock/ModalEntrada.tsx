// src/app/(empresa)/estoque/components/ModalEntrada.tsx
import React, { useState } from "react";
import { ArrowUpCircle, AlertCircle, RefreshCcw, Plus } from "lucide-react";
import { Produto } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface ModalEntradaProps {
    isOpen: boolean;
    onClose: () => void;
    produto: Produto | null;
    onConfirm: (quantidade: number, motivo: string) => Promise<void>;
    colors?: any;
}

export function ModalEntrada({
    isOpen,
    onClose,
    produto,
    onConfirm,
    colors: propColors
}: ModalEntradaProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;
    const [quantidade, setQuantidade] = useState("");
    const [motivo, setMotivo] = useState("");
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen || !produto) return null;

    const handleConfirm = async () => {
        const qtd = parseInt(quantidade);
        if (!qtd || qtd <= 0) {
            setErro("Quantidade deve ser maior que zero");
            return;
        }
        if (!motivo.trim()) {
            setErro("Motivo é obrigatório");
            return;
        }

        setLoading(true);
        setErro("");
        try {
            await onConfirm(qtd, motivo);
            setQuantidade("");
            setMotivo("");
            setErro("");
        } catch (error) {
            if (error instanceof Error) {
                setErro(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200">
            <div
                className="w-full max-w-md animate-in zoom-in-95 fade-in-0 duration-300 rounded-lg shadow-2xl overflow-hidden border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                {/* Header */}
                <div
                    className="px-6 py-4 border-b"
                    style={{ borderColor: colors.border, backgroundColor: colors.hover }}
                >
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                        <Plus className="w-5 h-5" style={{ color: colors.secondary }} />
                        Registrar Entrada
                    </h3>
                </div>

                {/* Conteúdo */}
                <div className="px-6 py-4">
                    <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: colors.hover }}>
                        <p className="font-medium text-sm" style={{ color: colors.text }}>{produto.nome}</p>
                        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                            Stock atual: <span className="font-semibold" style={{ color: colors.primary }}>{produto.estoque_atual}</span> unidades
                        </p>
                    </div>

                    {erro && (
                        <div
                            className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
                            style={{
                                backgroundColor: `${colors.danger}20`,
                                color: colors.danger,
                            }}
                        >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{erro}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                                Quantidade
                            </label>
                            <input
                                type="number"
                                value={quantidade}
                                onChange={(e) => setQuantidade(e.target.value)}
                                min="1"
                                disabled={loading}
                                className="w-full px-4 py-2 border outline-none disabled:opacity-50"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                                Descrição
                            </label>
                            <textarea
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={3}
                                disabled={loading}
                                className="w-full px-4 py-2 border outline-none resize-none disabled:opacity-50"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                                placeholder="Ex: Compra ao fornecedor X"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-6 py-4 border-t flex gap-3"
                    style={{ borderColor: colors.border, backgroundColor: colors.hover }}
                >
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-medium text-sm"
                        style={{
                            color: colors.text,
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.border}`,
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm hover:shadow-lg"
                        style={{ backgroundColor: colors.secondary }}
                    >
                        {loading ? (
                            <RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <ArrowUpCircle className="w-4 h-4" />
                                Confirmar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}