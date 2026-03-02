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
}

export function ModalConfirmacao({
    isOpen,
    onClose,
    onConfirm,
    titulo,
    mensagem,
    tipo,
}: ConfirmacaoModalProps) {
    const colors = useThemeColors();
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl shadow-xl max-w-md w-full" style={{ backgroundColor: colors.card }}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.buttonColor}20` }}>
                            <div style={{ color: config.buttonColor }}>
                                {config.icon}
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{titulo}</h3>
                    </div>

                    <p className="mb-6" style={{ color: colors.textSecondary }}>{mensagem}</p>

                    <div className="flex gap-3">
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