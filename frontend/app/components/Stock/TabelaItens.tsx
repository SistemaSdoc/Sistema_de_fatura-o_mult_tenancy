// src/app/(empresa)/estoque/components/TabelaItens.tsx
import React from "react";
import { Package, Wrench, ArrowUpCircle, Trash2, Layers } from "lucide-react";
import { Produto, formatarPreco, getTipoBadge, isServico, } from "@/services/produtos";
import { StatusEstoqueBadge } from "./StatusEstoqueBadge";
import { useThemeColors } from "@/context/ThemeContext";

interface TabelaItensProps {
    itens: Produto[];
    onRegistrarEntrada: (item: Produto) => void;
    onMoverParaLixeira: (item: Produto) => void;
}

export function TabelaItens({ itens, onRegistrarEntrada, onMoverParaLixeira }: TabelaItensProps) {
    const colors = useThemeColors();

    if (itens.length === 0) {
        return (
            <div className="text-center py-12">
                <Layers className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>Nenhum item encontrado</p>
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
                        <th className="py-3 px-4 text-center font-medium" style={{ color: colors.text }}>Stock</th>
                        <th className="py-3 px-4 text-right font-medium" style={{ color: colors.text }}>Preço</th>
                        <th className="py-3 px-4 text-center font-medium" style={{ color: colors.text }}>Status</th>
                        <th className="py-3 px-4 text-center font-medium" style={{ color: colors.text }}>Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                    {itens.map((item) => {
                        const tipoBadge = getTipoBadge(item.tipo);
                        const isServicoItem = isServico(item);

                        // Cores para o tipo badge baseadas no tema
                        const tipoBadgeStyle = {
                            produto: {
                                bg: `${colors.primary}20`,
                                text: colors.primary,
                                icon: colors.primary
                            },
                            servico: {
                                bg: `${colors.secondary}20`,
                                text: colors.secondary,
                                icon: colors.secondary
                            }
                        };

                        const badgeStyle = item.tipo === "produto" ? tipoBadgeStyle.produto : tipoBadgeStyle.servico;

                        return (
                            <tr
                                key={item.id}
                                className="transition-colors hover:bg-opacity-50"
                                style={{ backgroundColor: 'transparent' }}
                            >
                                <td className="py-3 px-4">
                                    <div className="font-medium" style={{ color: colors.text }}>{item.nome}</div>
                                    {item.codigo && (
                                        <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{item.codigo}</div>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                        style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                                    >
                                        {isServicoItem ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                        {tipoBadge.texto}
                                    </span>
                                </td>

                                <td className="py-3 px-4 text-center font-medium">
                                    {isServicoItem ? (
                                        <span style={{ color: colors.textSecondary }}>—</span>
                                    ) : (
                                        <span style={{ color: colors.primary }}>{item.estoque_atual}</span>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-right font-medium" style={{ color: colors.text }}>
                                    {formatarPreco(item.preco_venda)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <StatusEstoqueBadge item={item} />
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                        {!isServicoItem && (
                                            <button
                                                onClick={() => onRegistrarEntrada(item)}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ color: colors.success }}
                                                title="Registrar Entrada"
                                            >
                                                <ArrowUpCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onMoverParaLixeira(item)}
                                            className="p-1.5 rounded-lg transition-colors"
                                            style={{ color: colors.warning }}
                                            title="Mover para Lixeira"
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