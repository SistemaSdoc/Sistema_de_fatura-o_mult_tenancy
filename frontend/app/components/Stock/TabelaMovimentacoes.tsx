// src/app/(empresa)/estoque/components/TabelaMovimentacoes.tsx
import React from "react";
import { ArrowUpCircle, ArrowDownCircle, History } from "lucide-react";
import { MovimentoStock, formatarData } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface TabelaMovimentacoesProps {
    movimentacoes: MovimentoStock[];
    colors?: any;
}

export function TabelaMovimentacoes({ movimentacoes, colors: propColors }: TabelaMovimentacoesProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

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
            <div className="text-center py-10 sm:py-12">
                <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>Nenhuma movimentação registrada</p>
            </div>
        );
    }

    const lista = movimentacoes.slice(0, 10);

    return (
        <>
            {/* ===== Tabela (telas médias/grandes) ===== */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                            <th className="py-2.5 px-3 text-left font-medium" style={{ color: colors.text }}>Data</th>
                            <th className="py-2.5 px-3 text-left font-medium" style={{ color: colors.text }}>Produto</th>
                            <th className="py-2.5 px-3 text-center font-medium" style={{ color: colors.text }}>Tipo</th>
                            <th className="py-2.5 px-3 text-center font-medium" style={{ color: colors.text }}>Quantidade</th>
                            <th className="py-2.5 px-3 text-left font-medium" style={{ color: colors.text }}>Motivo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                        {lista.map((mov) => {
                            const movimentoStyle = getCorMovimento(mov.tipo);

                            return (
                                <tr
                                    key={mov.id}
                                    className="transition-colors hover:bg-opacity-50"
                                    style={{ backgroundColor: 'transparent' }}
                                >
                                    <td className="py-2.5 px-3 whitespace-nowrap text-xs" style={{ color: colors.textSecondary }}>
                                        {formatarData(mov.created_at)}
                                    </td>
                                    <td className="py-2.5 px-3 font-medium max-w-[200px] truncate" style={{ color: colors.text }}>
                                        {mov.produto?.nome || "-"}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded whitespace-nowrap"
                                            style={{ backgroundColor: movimentoStyle.bg, color: movimentoStyle.text }}
                                        >
                                            {mov.tipo === "entrada" ?
                                                <ArrowUpCircle className="w-3 h-3" /> :
                                                <ArrowDownCircle className="w-3 h-3" />
                                            }
                                            {mov.tipo}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-medium whitespace-nowrap">
                                        <span style={{ color: mov.quantidade > 0 ? colors.success : colors.warning }}>
                                            {mov.quantidade > 0 ? `+${mov.quantidade}` : mov.quantidade}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-xs max-w-[220px] truncate" style={{ color: colors.textSecondary }}>
                                        {mov.observacao || "-"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== Cards (mobile) ===== */}
            <div className="md:hidden space-y-2.5">
                {lista.map((mov) => {
                    const movimentoStyle = getCorMovimento(mov.tipo);

                    return (
                        <div key={mov.id} className="border p-3 rounded-lg" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs shrink-0" style={{ color: colors.textSecondary }}>
                                    {formatarData(mov.created_at)}
                                </span>
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded shrink-0"
                                    style={{ backgroundColor: movimentoStyle.bg, color: movimentoStyle.text }}
                                >
                                    {mov.tipo === "entrada" ?
                                        <ArrowUpCircle className="w-3 h-3" /> :
                                        <ArrowDownCircle className="w-3 h-3" />
                                    }
                                    {mov.tipo}
                                </span>
                            </div>
                            <p className="text-sm font-medium mt-1.5 truncate" style={{ color: colors.text }}>
                                {mov.produto?.nome || "-"}
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t" style={{ borderColor: colors.border }}>
                                <span className="text-xs truncate min-w-0" style={{ color: colors.textSecondary }}>
                                    {mov.observacao || "-"}
                                </span>
                                <span
                                    className="text-sm font-semibold shrink-0"
                                    style={{ color: mov.quantidade > 0 ? colors.success : colors.warning }}
                                >
                                    {mov.quantidade > 0 ? `+${mov.quantidade}` : mov.quantidade}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}