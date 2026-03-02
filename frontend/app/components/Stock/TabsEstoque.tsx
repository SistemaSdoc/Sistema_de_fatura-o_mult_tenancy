// src/app/(empresa)/estoque/components/TabsEstoque.tsx
import React from "react";
import { Layers, History, Archive } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

interface TabsEstoqueProps {
    abaAtiva: "itens" | "movimentacoes" | "deletados";
    onAbaChange: (aba: "itens" | "movimentacoes" | "deletados") => void;
    totalItens: number;
    totalDeletados: number;
}

export function TabsEstoque({ abaAtiva, onAbaChange, totalItens, totalDeletados }: TabsEstoqueProps) {
    const colors = useThemeColors();

    return (
        <div className="border-b" style={{ borderColor: colors.border }}>
            <nav className="flex gap-1 px-4" aria-label="Tabs">
                <button
                    onClick={() => onAbaChange("itens")}
                    className="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
                    style={{
                        borderColor: abaAtiva === "itens" ? colors.primary : 'transparent',
                        color: abaAtiva === "itens" ? colors.primary : colors.textSecondary
                    }}
                >
                    <Layers className="w-4 h-4" />
                    Todos os Itens
                    <span 
                        className="ml-1 px-2 py-0.5 rounded-full text-xs"
                        style={{ 
                            backgroundColor: colors.hover, 
                            color: colors.textSecondary 
                        }}
                    >
                        {totalItens}
                    </span>
                </button>
                
                <button
                    onClick={() => onAbaChange("movimentacoes")}
                    className="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
                    style={{
                        borderColor: abaAtiva === "movimentacoes" ? colors.primary : 'transparent',
                        color: abaAtiva === "movimentacoes" ? colors.primary : colors.textSecondary
                    }}
                >
                    <History className="w-4 h-4" />
                    Movimentações
                </button>
                
                <button
                    onClick={() => onAbaChange("deletados")}
                    className="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
                    style={{
                        borderColor: abaAtiva === "deletados" ? colors.primary : 'transparent',
                        color: abaAtiva === "deletados" ? colors.primary : colors.textSecondary
                    }}
                >
                    <Archive className="w-4 h-4" />
                    Lixeira
                    {totalDeletados > 0 && (
                        <span 
                            className="px-2 py-0.5 rounded-full text-xs"
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