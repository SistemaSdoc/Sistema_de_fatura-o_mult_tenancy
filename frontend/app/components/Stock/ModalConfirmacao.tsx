// src/app/(empresa)/estoque/components/ModalConfirmacao.tsx
import React, { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, RefreshCcw } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

interface ConfirmacaoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    titulo: string;
    mensagem: string;
    tipo: "delete" | "restore" | "warning";
    colors?: any;
}

export function ModalConfirmacao({
    isOpen,
    onClose,
    onConfirm,
    titulo,
    mensagem,
    tipo,
    colors: propColors
}: ConfirmacaoModalProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const getConfig = () => {
        switch (tipo) {
            case "delete":
                return {
                    buttonColor: colors.secondary,
                    icon: <Trash2 className="w-5 h-5" />,
                    buttonText: "Deletar",
                };
            case "restore":
                return {
                    buttonColor: colors.primary,
                    icon: <RotateCcw className="w-5 h-5" />,
                    buttonText: "Restaurar",
                };
            case "warning":
                return {
                    buttonColor: colors.danger,
                    icon: <AlertTriangle className="w-5 h-5" />,
                    buttonText: "Confirmar",
                };
            default:
                return {
                    buttonColor: colors.primary,
                    icon: <AlertTriangle className="w-5 h-5" />,
                    buttonText: "Confirmar",
                };
        }
    };

    const config = getConfig();

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200">
            <div className="w-full max-w-md animate-in zoom-in-95 fade-in-0 duration-300" style={{ backgroundColor: colors.card }}>
                <div className="rounded-lg shadow-2xl overflow-hidden border" style={{ borderColor: colors.border }}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.buttonColor}20` }}>
                                <div style={{ color: config.buttonColor }}>
                                    {config.icon}
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{titulo}</h3>
                        </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="px-6 py-4">
                        <p className="text-sm" style={{ color: colors.textSecondary }}>{mensagem}</p>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-medium text-sm"
                            style={{ 
                                color: colors.text,
                                backgroundColor: colors.background,
                                border: `1px solid ${colors.border}`
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm hover:shadow-lg"
                            style={{ backgroundColor: config.buttonColor }}
                        >
                            {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
                            {config.buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}