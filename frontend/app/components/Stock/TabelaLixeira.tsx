// src/app/(empresa)/estoque/components/TabelaLixeira.tsx
import React from "react";
import { Package, Wrench, RotateCcw, Trash2, Archive } from "lucide-react";
import { Produto, getTipoBadge } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface TabelaLixeiraProps {
    itens: Produto[];
    onRestaurar: (item: Produto) => void;
    onDeletarPermanentemente: (item: Produto) => void;
}

export function TabelaLixeira({ itens, onRestaurar, onDeletarPermanentemente }: TabelaLixeiraProps) {
    const colors = useThemeColors();

    if (itens.length === 0) {
        return (
            <div className="text-center py-12">
                <Archive className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>Lixeira vazia</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                        <th className="py-3 px-4 text-left font-medium" style={{ color: colors.text }}>Item</th>
                        <th className="py-3 px-4 text-left font-medium" style={{ color: colors.text }}>Tipo</th>
                        <th className="py-3 px-4 text-left font-medium" style={{ color: colors.textSecondary }}>Categoria</th>
                        <th className="py-3 px-4 text-center font-medium" style={{ color: colors.textSecondary }}>Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                    {itens.map((item) => {
                        const tipoBadge = getTipoBadge(item.tipo);

                        // Cores para o tipo badge baseadas no tema
                        const badgeStyle = {
                            produto: {
                                bg: `${colors.primary}20`,
                                text: colors.primary
                            },
                            servico: {
                                bg: `${colors.secondary}20`,
                                text: colors.secondary
                            }
                        };

                        const style = item.tipo === "produto" ? badgeStyle.produto : badgeStyle.servico;

                        return (
                            <tr
                                key={item.id}
                                className="transition-colors"
                                style={{
                                    backgroundColor: `${colors.warning}08`, // Fundo laranja bem suave (8% opacidade)
                                }}
                            >
                                <td className="py-3 px-4">
                                    <span style={{ color: colors.textSecondary }} className="line-through">
                                        {item.nome}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                        style={{
                                            backgroundColor: style.bg,
                                            color: style.text,
                                            opacity: 0.75
                                        }}
                                    >
                                        {item.tipo === "servico" ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                        {tipoBadge.texto}
                                    </span>
                                </td>
                                <td className="py-3 px-4" style={{ color: colors.textSecondary }}>
                                    {item.categoria?.nome || "-"}
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onRestaurar(item)}
                                            className="p-1.5 rounded-lg transition-colors"
                                            style={{ color: colors.success }}
                                            title="Restaurar"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDeletarPermanentemente(item)}
                                            className="p-1.5 rounded-lg transition-colors"
                                            style={{ color: colors.danger }}
                                            title="Deletar permanentemente"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}