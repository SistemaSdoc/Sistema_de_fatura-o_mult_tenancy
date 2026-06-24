// src/app/(empresa)/estoque/components/ModalEntrada.tsx
import React, { useState } from "react";
import { ArrowUpCircle, AlertCircle, RefreshCcw, Plus } from "lucide-react";
import { Produto } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ModalEntradaProps {
    isOpen: boolean;
    onClose: () => void;
    produto: Produto | null;
    onConfirm: (quantidade: number, motivo: string) => Promise<void>;
    colors?: any;
}

export function ModalEntrada({ isOpen, onClose, produto, onConfirm, colors: propColors }: ModalEntradaProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;
    const [quantidade, setQuantidade] = useState("");
    const [motivo, setMotivo] = useState("");
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        const qtd = parseInt(quantidade);
        if (!qtd || qtd <= 0) { setErro("Quantidade deve ser maior que zero"); return; }
        if (!motivo.trim()) { setErro("Motivo é obrigatório"); return; }
        setLoading(true);
        setErro("");
        try {
            await onConfirm(qtd, motivo);
            setQuantidade("");
            setMotivo("");
        } catch (error) {
            if (error instanceof Error) setErro(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen && !!produto} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent
                className="sm:max-w-[450px] p-0"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
                <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
                    <DialogTitle className="flex items-center gap-2 text-base" style={{ color: colors.secondary }}>
                        <Plus className="w-4 h-4" />
                        Registrar Entrada
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4 space-y-3">
                    {produto && (
                        <div className="p-3" style={{ backgroundColor: colors.hover }}>
                            <p className="font-medium text-sm" style={{ color: colors.text }}>{produto.nome}</p>
                            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                Stock atual: <span className="font-semibold" style={{ color: colors.primary }}>{produto.estoque_atual}</span> unidades
                            </p>
                        </div>
                    )}

                    {erro && (
                        <div className="p-3 text-xs flex items-center gap-2" style={{ backgroundColor: `${colors.danger}20`, color: colors.danger }}>
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{erro}</span>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium" style={{ color: colors.text }}>Quantidade</label>
                        <input
                            type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
                            min="1" disabled={loading} autoFocus placeholder="0"
                            className="w-full px-3 py-2 border text-sm outline-none disabled:opacity-50"
                            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium" style={{ color: colors.text }}>Descrição</label>
                        <textarea
                            value={motivo} onChange={(e) => setMotivo(e.target.value)}
                            rows={3} disabled={loading} placeholder="Ex: Compra ao fornecedor X"
                            className="w-full px-3 py-2 border text-sm outline-none resize-none disabled:opacity-50"
                            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                        />
                    </div>

                    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
                        <button
                            onClick={onClose} disabled={loading}
                            className="flex-1 px-4 py-2 text-sm font-medium disabled:opacity-50"
                            style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm} disabled={loading}
                            className="flex-1 px-4 py-2 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: colors.secondary }}
                        >
                            {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <><ArrowUpCircle className="w-4 h-4" />Confirmar</>}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
