import React from "react";
import { AlertCircle } from "lucide-react";
import { ThemeColors } from "./ClientesComuns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    loading,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = "warning",
    colors,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
    type?: "warning" | "danger" | "info";
    colors: ThemeColors;
}) {
    const btnColor = type === "danger" ? colors.danger : type === "info" ? colors.primary : colors.warning;
    const iconClr = type === "danger" ? colors.danger : type === "info" ? colors.secondary : colors.warning;

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent
                className="sm:max-w-[400px] p-0"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
                    <DialogTitle
                        className="flex items-center gap-2 text-sm"
                        style={{ color: iconClr }}
                    >
                        <AlertCircle className="w-4 h-4" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4">
                    <p className="text-xs mb-4 leading-relaxed" style={{ color: colors.textSecondary }}>{message}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose} disabled={loading}
                            className="flex-1 px-4 py-2 text-sm font-medium disabled:opacity-50"
                            style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm} disabled={loading}
                            className="flex-1 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: btnColor }}
                        >
                            {loading ? (
                                <><div className="w-4 h-4 border-2 rounded-full border-white border-t-transparent animate-spin" />Processando…</>
                            ) : confirmText}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
