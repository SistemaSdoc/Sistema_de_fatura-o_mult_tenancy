// src/app/(empresa)/estoque/components/ModalEntrada.tsx
import React, { useState } from "react";
import { ArrowUpCircle, AlertCircle, RefreshCcw } from "lucide-react";
import { Produto } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface ModalEntradaProps {
    isOpen: boolean;
    onClose: () => void;
    produto: Produto | null;
    onConfirm: (quantidade: number, motivo: string) => Promise<void>;
}

export function ModalEntrada({
    isOpen,
    onClose,
    produto,
    onConfirm,
}: ModalEntradaProps) {
    const colors = useThemeColors();
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl shadow-xl max-w-md w-full" style={{ backgroundColor: colors.card }}>
                <div className="p-6 border-b" style={{ borderColor: colors.border }}>
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                        <ArrowUpCircle className="w-5 h-5" style={{ color: colors.secondary }} />
                        Registrar Entrada
                    </h3>
                </div>

                <div className="p-6">
                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.hover }}>
                        <p className="font-medium" style={{ color: colors.text }}>{produto.nome}</p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Stock atual: <span className="font-semibold" style={{ color: colors.primary }}>{produto.estoque_atual}</span> unidades
                        </p>
                    </div>

                    {erro && (
                        <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ 
                            backgroundColor: `${colors.danger}20`, 
                            color: colors.danger 
                        }}>
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                                className="w-full px-4 py-2 rounded-lg border outline-none disabled:opacity-50"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                                Motivo
                            </label>
                            <textarea
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={3}
                                disabled={loading}
                                className="w-full px-4 py-2 rounded-lg border outline-none resize-none disabled:opacity-50"
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                                placeholder="Ex: Compra ao fornecedor X"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex gap-3" style={{ borderColor: colors.border }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        style={{ color: colors.textSecondary }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: colors.primary }}
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