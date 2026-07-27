import React from "react";
import { Layers, Trash2 } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

interface TabsServicosProps {
    abaAtiva: "itens" | "deletados";
    onAbaChange: (aba: "itens" | "deletados") => void;
    totalItens: number;
    totalDeletados: number;
    colors?: any;
}

export function TabsServicos({ abaAtiva, onAbaChange, totalItens, totalDeletados, colors: propColors }: TabsServicosProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

    return (
        <div className="border-b" style={{ borderColor: colors.border }}>
            <nav
                className="flex gap-1 px-2 sm:px-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Tabs"
            >
                <button
                    onClick={() => onAbaChange("itens")}
                    className="shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2"
                    style={{
                        borderColor: abaAtiva === "itens" ? colors.primary : 'transparent',
                        color: abaAtiva === "itens" ? colors.text : colors.textSecondary
                    }}
                >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>Todos os Serviços</span>
                    <span
                        className="ml-1 px-2 py-0.5 text-xs"
                        style={{
                            backgroundColor: colors.hover,
                            color: colors.textSecondary
                        }}
                    >
                        {totalItens}
                    </span>
                </button>

                <button
                    onClick={() => onAbaChange("deletados")}
                    className="shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2"
                    style={{
                        borderColor: abaAtiva === "deletados" ? colors.primary : 'transparent',
                        color: abaAtiva === "deletados" ? colors.text : colors.textSecondary
                    }}
                >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>Lixeira</span>
                    {totalDeletados > 0 && (
                        <span
                            className="px-2 py-0.5 text-xs"
                            style={{
                                backgroundColor: `${colors.warning}20`,
                                color: colors.warning
                            }}
                        >
                            {totalDeletados}
                        </span>
                    )}
                </button>
            </nav>
        </div>
    );
}
