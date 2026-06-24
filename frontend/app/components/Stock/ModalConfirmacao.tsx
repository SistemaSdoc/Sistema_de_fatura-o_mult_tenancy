// src/app/(empresa)/estoque/components/ModalConfirmacao.tsx
import React, { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, RefreshCcw } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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
    colors: propColors,
}: ConfirmacaoModalProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;
    const [loading, setLoading] = useState(false);

    const getConfig = () => {
        switch (tipo) {
            case "delete": return { buttonColor: colors.secondary, icon: <Trash2 className="w-4 h-4" />, buttonText: "Deletar" };
            case "restore": return { buttonColor: colors.primary, icon: <RotateCcw className="w-4 h-4" />, buttonText: "Restaurar" };
            case "warning": return { buttonColor: colors.danger, icon: <AlertTriangle className="w-4 h-4" />, buttonText: "Confirmar" };
            default: return { buttonColor: colors.primary, icon: <AlertTriangle className="w-4 h-4" />, buttonText: "Confirmar" };
        }
    };

    const config = getConfig();

    const handleConfirm = async () => {
        setLoading(true);
        try { await onConfirm(); } finally { setLoading(false); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent
                className="sm:max-w-[400px] p-0"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <DialogHeader
                    className="p-4 border-b"
                    style={{ borderColor: colors.border }}
                >
                    <DialogTitle
                        className="flex items-center gap-2 text-sm"
                        style={{ color: config.buttonColor }}
                    >
                        {config.icon}
                        {titulo}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4">
                    <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>{mensagem}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 text-sm font-medium disabled:opacity-50"
                            style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: config.buttonColor }}
                        >
                            {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : config.icon}
                            {config.buttonText}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
