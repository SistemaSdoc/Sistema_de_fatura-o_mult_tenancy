// src/app/(empresa)/estoque/components/TabelaItens.tsx
import React from "react";
import { Package, Wrench, ArrowUpCircle, Trash2, Layers, Plus, Edit2, Percent } from "lucide-react";
import { Produto, formatarPreco, getTipoBadge, isServico, } from "@/services/produtos";
import { getTaxaIVALabel } from "@/services/categorias";
import { StatusEstoqueBadge } from "./StatusEstoqueBadge";
import { useThemeColors } from "@/context/ThemeContext";

interface TabelaItensProps {
    itens: Produto[];
    onRegistrarEntrada: (item: Produto) => void;
    onMoverParaLixeira: (item: Produto) => void;
    onEditar: (item: Produto) => void;
    colors?: any;
}

export function TabelaItens({ itens, onRegistrarEntrada, onMoverParaLixeira, onEditar, colors: propColors }: TabelaItensProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

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
                        {/* ✅ NOVA COLUNA: IVA */}
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

                        // Cores para o tipo badge baseadas no tema
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

                        const badgeStyle = item.tipo === "produto" ? tipoBadgeStyle.produto : tipoBadgeStyle.servico;

                        // ✅ NOVO: Determinar IVA a mostrar
                        const getIVADisplay = () => {
                            if (isServicoItem) {
                                // Serviço: usa próprio IVA
                                return {
                                    label: getTaxaIVALabel(item.taxa_iva || 0, item.sujeito_iva ?? true),
                                    cor: item.sujeito_iva ? colors.primary : colors.textSecondary,
                                    isento: !item.sujeito_iva
                                };
                            } else {
                                // Produto: IVA vem da categoria
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
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs "
                                        style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                                    >
                                        {tipoBadge.texto}
                                    </span>
                                </td>

                                {/* ✅ NOVA CÉLULA: IVA */}
                                <td className="py-3 px-4 text-center">
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs "
                                        style={{ 
                                            backgroundColor: ivaDisplay.isento ? `${colors.textSecondary}15` : `${colors.primary}15`,
                                            color: ivaDisplay.cor
                                        }}
                                        title={isServicoItem ? "IVA do serviço" : `IVA da categoria: ${item.categoria?.nome || "N/A"}`}
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
                                <td className="py-3 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                        {/* Botão Editar - aparece para produtos e serviços */}
                                        <button
                                            onClick={() => onEditar(item)}
                                            className="p-1.5 transition-colors  hover:bg-opacity-10 hover:bg-gray-500"
                                            style={{ color: colors.textSecondary }}
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>

                                        {!isServicoItem && (
                                            <button
                                                onClick={() => onRegistrarEntrada(item)}
                                                className="p-1.5 transition-colors  hover:bg-opacity-10 hover:bg-gray-500"
                                                style={{ color: colors.textSecondary }}
                                                title="Registrar Entrada"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                        
                                        <button
                                            onClick={() => onMoverParaLixeira(item)}
                                            className="p-1.5 transition-colors  hover:bg-opacity-10 hover:bg-orange-500"
                                            style={{ color: colors.secondary }}
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