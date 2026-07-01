// src/app/(empresa)/estoque/components/TabelaItens.tsx
import React, { useEffect, useRef, useState } from "react";
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

interface MenuPos {
    id: string;
    top: number;
    left: number;
}

const MENU_WIDTH = 176; // w-44

export function TabelaItens({ itens, onRegistrarEntrada, onMoverParaLixeira, onEditar, colors: propColors }: TabelaItensProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

    const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Fecha o menu ao clicar fora, rolar ou redimensionar - evita ficar "preso" na tela
    useEffect(() => {
        if (!menuPos) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuPos(null);
            }
        };
        const fechar = () => setMenuPos(null);

        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", fechar, true);
        window.addEventListener("resize", fechar);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", fechar, true);
            window.removeEventListener("resize", fechar);
        };
    }, [menuPos]);

    const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        e.stopPropagation();
        if (menuPos?.id === id) {
            setMenuPos(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        let left = rect.right - MENU_WIDTH;
        if (left < 8) left = 8;
        if (left + MENU_WIDTH > window.innerWidth - 8) left = window.innerWidth - MENU_WIDTH - 8;
        setMenuPos({ id, top: rect.bottom + 6, left });
    };

    if (itens.length === 0) {
        return (
            <div className="text-center py-12">
                <Layers className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>Nenhum item encontrado</p>
            </div>
        );
    }

    const getIVADisplay = (item: Produto) => {
        const isServicoItem = isServico(item);
        if (isServicoItem) {
            return {
                label: getTaxaIVALabel(item.taxa_iva || 0, item.sujeito_iva ?? true),
                cor: item.sujeito_iva ? colors.primary : colors.textSecondary,
                isento: !item.sujeito_iva
            };
        }
        const categoria = item.categoria;
        if (categoria) {
            return {
                label: getTaxaIVALabel(categoria.taxa_iva || 0, categoria.sujeito_iva ?? true),
                cor: categoria.sujeito_iva ? colors.primary : colors.textSecondary,
                isento: !categoria.sujeito_iva
            };
        }
        return { label: "—", cor: colors.textSecondary, isento: false };
    };

    const menuItem = menuPos ? itens.find((i) => i.id === menuPos.id) : null;

    return (
        <>
            {/* ===== Tabela (telas médias/grandes) ===== */}
            <div className="hidden md:block overflow-x-auto">
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
                                produto: { bg: `${colors.primary}10`, text: colors.secondary },
                                servico: { bg: `${colors.secondary}10`, text: colors.text }
                            };
                            const badgeStyle = item.tipo === "produto" ? tipoBadgeStyle.produto : tipoBadgeStyle.servico;
                            const ivaDisplay = getIVADisplay(item);

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
                                                backgroundColor: ivaDisplay.isento ? `${colors.textSecondary}15` : `${colors.primary}15`,
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

                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={(e) => toggleMenu(e, item.id)}
                                            className="p-1.5"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== Cards (mobile) ===== */}
            <div className="md:hidden space-y-3">
                {itens.map((item) => {
                    const tipoBadge = getTipoBadge(item.tipo);
                    const isServicoItem = isServico(item);
                    const tipoBadgeStyle = {
                        produto: { bg: `${colors.primary}10`, text: colors.secondary },
                        servico: { bg: `${colors.secondary}10`, text: colors.text }
                    };
                    const badgeStyle = item.tipo === "produto" ? tipoBadgeStyle.produto : tipoBadgeStyle.servico;
                    const ivaDisplay = getIVADisplay(item);

                    return (
                        <div
                            key={item.id}
                            className="border p-3"
                            style={{ backgroundColor: colors.card, borderColor: colors.border }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate" style={{ color: colors.text }}>{item.nome}</p>
                                    {item.codigo && (
                                        <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>{item.codigo}</p>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => toggleMenu(e, item.id)}
                                    className="p-1.5 shrink-0"
                                    style={{ color: colors.textSecondary }}
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs"
                                    style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                                >
                                    {tipoBadge.texto}
                                </span>
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs"
                                    style={{
                                        backgroundColor: ivaDisplay.isento ? `${colors.textSecondary}15` : `${colors.primary}15`,
                                        color: ivaDisplay.cor
                                    }}
                                >
                                    <Percent className="w-3 h-3" />
                                    {ivaDisplay.label}
                                </span>
                                <StatusEstoqueBadge item={item} />
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: colors.border }}>
                                <div className="text-xs" style={{ color: colors.textSecondary }}>
                                    Stock:{" "}
                                    <span className="font-medium" style={{ color: colors.text }}>
                                        {isServicoItem ? "—" : item.estoque_atual}
                                    </span>
                                </div>
                                <div className="text-sm font-semibold" style={{ color: colors.text }}>
                                    {formatarPreco(item.preco_venda)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== Menu de ações (posição fixa, não fica cortado por overflow do container) ===== */}
            {menuPos && menuItem && (
                <div
                    ref={menuRef}
                    className="fixed w-44 rounded shadow-lg border z-[100]"
                    style={{ top: menuPos.top, left: menuPos.left, backgroundColor: colors.hover, borderColor: colors.border }}
                >
                    <button
                        onClick={() => { onEditar(menuItem); setMenuPos(null); }}
                        className="w-full text-left px-3 py-2.5 sm:py-2 text-sm flex items-center"
                        style={{ color: colors.text }}
                    >
                        <PencilLine className="w-4 h-4 mr-2" />
                        Editar
                    </button>

                    {!isServico(menuItem) && (
                        <button
                            onClick={() => { onRegistrarEntrada(menuItem); setMenuPos(null); }}
                            className="w-full text-left px-3 py-2.5 sm:py-2 text-sm flex items-center"
                            style={{ color: colors.text }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Entrada
                        </button>
                    )}

                    <button
                        onClick={() => { onMoverParaLixeira(menuItem); setMenuPos(null); }}
                        className="w-full text-left px-3 py-2.5 sm:py-2 text-sm flex items-center"
                        style={{ color: colors.secondary }}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Lixeira
                    </button>
                </div>
            )}
        </>
    );
}