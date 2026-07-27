import React from "react";
import { Wrench, RotateCcw, Archive } from "lucide-react";
import { Produto } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface TabelaLixeiraServicosProps {
    itens: Produto[];
    onRestaurar: (item: Produto) => void;
    onDeletarPermanentemente: (item: Produto) => void;
    colors?: any;
}

export function TabelaLixeiraServicos({ itens, onRestaurar, colors: propColors }: TabelaLixeiraServicosProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

    if (itens.length === 0) {
        return (
            <div className="text-center py-10 sm:py-12">
                <Archive className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>Lixeira vazia</p>
            </div>
        );
    }

    const badgeStyle = {
        bg: `${colors.secondary}20`,
        text: colors.secondary
    };

    return (
        <>
            {/* ===== Tabela (telas médias/grandes) ===== */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                            <th className="py-2.5 px-3 text-left font-medium" style={{ color: colors.text }}>Serviço</th>
                            <th className="py-2.5 px-3 text-left font-medium" style={{ color: colors.text }}>Tipo</th>
                            <th className="py-2.5 px-3 text-center font-medium" style={{ color: colors.textSecondary }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                        {itens.map((item) => {
                            return (
                                <tr
                                    key={item.id}
                                    className="transition-colors"
                                    style={{
                                        backgroundColor: `${colors.warning}08`, 
                                    }}
                                >
                                    <td className="py-2.5 px-3 max-w-[220px]">
                                        <span style={{ color: colors.textSecondary }} className="line-through truncate block">
                                            {item.nome}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded whitespace-nowrap"
                                            style={{
                                                backgroundColor: badgeStyle.bg,
                                                color: badgeStyle.text,
                                                opacity: 0.75
                                            }}
                                        >
                                            <Wrench className="w-3 h-3" />
                                            Serviço
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onRestaurar(item)}
                                                className="p-1.5 hover:opacity-70 transition-colors rounded"
                                                style={{ color: colors.blue }}
                                                title="Restaurar"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== Cards (mobile) ===== */}
            <div className="md:hidden space-y-2.5">
                {itens.map((item) => {
                    return (
                        <div
                            key={item.id}
                            className="border p-3 rounded-lg"
                            style={{ backgroundColor: `${colors.warning}08`, borderColor: colors.border }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate line-through" style={{ color: colors.textSecondary }}>
                                        {item.nome}
                                    </p>
                                </div>
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded shrink-0"
                                    style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, opacity: 0.75 }}
                                >
                                    <Wrench className="w-3 h-3" />
                                    Serviço
                                </span>
                            </div>
                            <div className="flex justify-end mt-2.5 pt-2 border-t" style={{ borderColor: colors.border }}>
                                <button
                                    onClick={() => onRestaurar(item)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-opacity hover:opacity-80"
                                    style={{ color: colors.blue, backgroundColor: `${colors.blue}18` }}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Restaurar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
