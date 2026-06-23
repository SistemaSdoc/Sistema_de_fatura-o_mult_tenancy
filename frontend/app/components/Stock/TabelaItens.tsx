// src/app/(empresa)/estoque/components/TabelaItens.tsx
import React, { useState } from "react";
import { Trash2, Layers, Plus, Percent, PencilLine, MoreVertical } from "lucide-react";
import { Produto, formatarPreco, getTipoBadge, isServico } from "@/services/produtos";
import { getTaxaIVALabel } from "@/services/categorias";
import { StatusEstoqueBadge } from "./StatusEstoqueBadge";
import { useThemeColors, LIGHT_COLORS } from "@/context/ThemeContext";

interface TabelaItensProps {
    itens: Produto[];
    onRegistrarEntrada: (item: Produto) => void;
    onMoverParaLixeira: (item: Produto) => void;
    onEditar: (item: Produto) => void;
    colors?: typeof LIGHT_COLORS;
}

export function TabelaItens({ itens, onRegistrarEntrada, onMoverParaLixeira, onEditar, colors: propColors }: TabelaItensProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
                        <th className="py-3 px-4 text-center font-medium" style={{ color: colors.text }}>IVA</th>
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

                        const tipoBadgeStyle = {
                            produto: {
                                bg: `${colors.primary}10`,
                                text: colors.secondary,
                            },
                            servico: {
                                bg: `${colors.secondary}10`,
                                text: colors.text,
                            }
                        };

                        const badgeStyle = item.tipo === "produto"
                            ? tipoBadgeStyle.produto
                            : tipoBadgeStyle.servico;

                        const getIVADisplay = () => {
                            if (isServicoItem) {
                                return {
                                    label: getTaxaIVALabel(item.taxa_iva || 0, item.sujeito_iva ?? true),
                                    cor: item.sujeito_iva ? colors.primary : colors.textSecondary,
                                    isento: !item.sujeito_iva
                                };
                            } else {
                                const categoria = item.categoria;
                                if (categoria) {
                                    return {
                                        label: getTaxaIVALabel(categoria.taxa_iva || 0, categoria.sujeito_iva ?? true),
                                        cor: categoria.sujeito_iva ? colors.primary : colors.textSecondary,
                                        isento: !categoria.sujeito_iva
                                    };
                                }
                                return {
                                    label: "—",
                                    cor: colors.textSecondary,
                                    isento: false
                                };
                            }
                        };

                        const ivaDisplay = getIVADisplay();

                        return (
                            <tr key={item.id} className="transition-colors hover:bg-opacity-50">

                                <td className="py-3 px-4">
                                    <div className="font-medium" style={{ color: colors.text }}>{item.nome}</div>
                                    {item.codigo && (
                                        <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{item.codigo}</div>
                                    )}
                                </td>

                                <td className="py-3 px-4">
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs"
                                        style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                                    >
                                        {tipoBadge.texto}
                                    </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs"
                                        style={{
                                            backgroundColor: ivaDisplay.isento
                                                ? `${colors.textSecondary}15`
                                                : `${colors.primary}15`,
                                            color: ivaDisplay.cor
                                        }}
                                    >
                                        <Percent className="w-3 h-3" />
                                        {ivaDisplay.label}
                                    </span>
                                </td>

                                <td className="py-3 px-4 text-center font-medium">
                                    {isServicoItem ? (
                                        <span style={{ color: colors.textSecondary }}>—</span>
                                    ) : (
                                        <span style={{ color: colors.text }}>{item.estoque_atual}</span>
                                    )}
                                </td>

                                <td className="py-3 px-4 text-right font-medium" style={{ color: colors.text }}>
                                    {formatarPreco(item.preco_venda)}
                                </td>

                                <td className="py-3 px-4 text-center">
                                    <StatusEstoqueBadge item={item} />
                                </td>

                                {/* AÇÕES 3 PONTOS */}
                                <td className="py-3 px-4 text-center relative">

                                    <button
                                        onClick={() =>
                                            setOpenMenuId(openMenuId === item.id ? null : item.id)
                                        }
                                        className="p-1.5"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {openMenuId === item.id && (
                                        <div
                                            className="absolute right-4 mt-2 w-40 rounded shadow-lg border z-50"
                                            style={{
                                                backgroundColor: colors.hover,
                                                borderColor: colors.border
                                            }}
                                        >
                                            <button
                                                onClick={() => {
                                                    onEditar(item);
                                                    setOpenMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm"
                                                style={{ color: colors.text }}
                                            >
                                                <PencilLine className="w-4 h-4 inline mr-2" />
                                                Editar
                                            </button>

                                            {!isServicoItem && (
                                                <button
                                                    onClick={() => {
                                                        onRegistrarEntrada(item);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm"
                                                    style={{ color: colors.text }}
                                                >
                                                    <Plus className="w-4 h-4 inline mr-2" />
                                                    Entrada
                                                </button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    onMoverParaLixeira(item);
                                                    setOpenMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm"
                                                style={{ color: colors.secondary }}
                                            >
                                                <Trash2 className="w-4 h-4 inline mr-2" />
                                                Lixeira
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}