// src/app/(empresa)/estoque/components/TabelaMovimentacoes.tsx
import React from "react";
import { ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { MovimentoStock, formatarData } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface TabelaMovimentacoesProps {
    movimentacoes: MovimentoStock[];
}

export function TabelaMovimentacoes({ movimentacoes }: TabelaMovimentacoesProps) {
    const colors = useThemeColors();

    const getCorMovimento = (tipo: string): { bg: string; text: string } => {
        switch (tipo) {
            case "entrada": 
                return { 
                    bg: `${colors.success}20`, 
                    text: colors.success 
                };
            case "saida": 
                return { 
                    bg: `${colors.warning}20`, 
                    text: colors.warning 
                };
            default: 
                return { 
                    bg: colors.hover, 
                    text: colors.textSecondary 
                };
        }
    };

    if (movimentacoes.length === 0) {
        return (
            <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>Nenhuma movimentação registrada</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                        <th className="py-3 px-4 text-left font-medium" style={{ color: colors.text }}>Data</th>
                        <th className="py-3 px-4 text-left font-medium" style={{ color: colors.text }}>Produto</th>
                        <th className="py-3 px-4 text-center font-medium" style={{ color: colors.text }}>Tipo</th>
                        <th className="py-3 px-4 text-center font-medium" style={{ color: colors.text }}>Quantidade</th>
                        <th className="py-3 px-4 text-left font-medium" style={{ color: colors.text }}>Motivo</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                    {movimentacoes.slice(0, 10).map((mov) => {
                        const movimentoStyle = getCorMovimento(mov.tipo);
                        
                        return (
                            <tr 
                                key={mov.id} 
                                className="transition-colors hover:bg-opacity-50"
                                style={{ backgroundColor: 'transparent' }}
                            >
                                <td className="py-3 px-4 whitespace-nowrap text-xs" style={{ color: colors.textSecondary }}>
                                    {formatarData(mov.created_at)}
                                </td>
                                <td className="py-3 px-4 font-medium" style={{ color: colors.text }}>
                                    {mov.produto?.nome || "-"}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span 
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                        style={{ backgroundColor: movimentoStyle.bg, color: movimentoStyle.text }}
                                    >
                                        {mov.tipo === "entrada" ? 
                                            <ArrowUpCircle className="w-3 h-3" /> : 
                                            <ArrowDownCircle className="w-3 h-3" />
                                        }
                                        {mov.tipo}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center font-medium">
                                    <span style={{ color: mov.quantidade > 0 ? colors.success : colors.warning }}>
                                        {mov.quantidade > 0 ? `+${mov.quantidade}` : mov.quantidade}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-xs" style={{ color: colors.textSecondary }}>
                                    {mov.observacao || "-"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}