// src/app/(empresa)/estoque/components/TabelaItens.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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

export function TabelaItens({
    itens,
    onRegistrarEntrada,
    onMoverParaLixeira,
    onEditar,
    colors: propColors
}: TabelaItensProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

    const [menuId, setMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    useEffect(() => {
        if (!menuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current && !menuRef.current.contains(target)) {
                const button = buttonRefs.current.get(menuId || '');
                const isButtonClick = button?.contains(target);
                if (!isButtonClick) {
                    setMenuId(null);
                    setMenuPosition(null);
                    setMenuOpen(false);
                }
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuId(null);
                setMenuPosition(null);
                setMenuOpen(false);
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [menuOpen, menuId]);

    const toggleMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (menuId === id && menuOpen) {
            setMenuId(null);
            setMenuPosition(null);
            setMenuOpen(false);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const menuWidth = 176;
        const menuHeight = 150;

        // ✅ Posicionar o menu abaixo do botão, alinhado à esquerda
        let left = rect.left;

        // Se o menu ultrapassar a borda direita, alinhar à direita do botão
        if (left + menuWidth > windowWidth - 10) {
            left = rect.right - menuWidth;
        }

        // Se ultrapassar a borda esquerda, ajustar
        if (left < 10) {
            left = 10;
        }

        // Tentar abrir para baixo primeiro
        let top = rect.bottom + 6;

        // Se não houver espaço abaixo, abrir para cima
        if (top + menuHeight > windowHeight - 10) {
            top = rect.top - menuHeight - 6;
        }

        // Se ainda assim não houver espaço, centralizar na tela
        if (top < 10) {
            top = (windowHeight - menuHeight) / 2;
        }

        // Garantir que o menu não saia da tela
        top = Math.max(10, Math.min(top, windowHeight - menuHeight - 10));
        left = Math.max(10, Math.min(left, windowWidth - menuWidth - 10));

        setMenuId(id);
        setMenuPosition({ top, left });
        setMenuOpen(true);
    }, [menuId, menuOpen]);

    const handleMenuItemClick = useCallback((callback: (item: Produto) => void, item: Produto) => {
        setMenuId(null);
        setMenuPosition(null);
        setMenuOpen(false);
        setTimeout(() => {
            callback(item);
        }, 50);
    }, []);

    if (itens.length === 0) {
        return (
            <div className="text-center py-10 sm:py-12">
                <Layers className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3" style={{ color: colors.border }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>Nenhum item encontrado</p>
            </div>
        );
    }

    const getIVADisplay = (item: Produto) => {
        const isServicoItem = isServico(item);
        if (isServicoItem) {
            return {
                label: getTaxaIVALabel(item.taxa_iva || 0, item.sujeito_iva ?? true),
                cor: item.sujeito_iva ? colors.secondary : colors.textSecondary,
                isento: !item.sujeito_iva
            };
        }
        const categoria = item.categoria;
        if (categoria) {
            return {
                label: getTaxaIVALabel(categoria.taxa_iva || 0, categoria.sujeito_iva ?? true),
                cor: categoria.sujeito_iva ? colors.secondary : colors.textSecondary,
                isento: !categoria.sujeito_iva
            };
        }
        return { label: "—", cor: colors.textSecondary, isento: false };
    };

    const menuItem = menuId ? itens.find((i) => i.id === menuId) : null;

    return (
        <>
            {/* ===== Tabela (telas médias/grandes) ===== */}
            <div className="hidden md:block overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
                            <th className="py-2.5 px-3 text-left font-medium" style={{ color: colors.text }}>Item</th>
                            <th className="py-2.5 px-3 text-left font-medium" style={{ color: colors.text }}>Tipo</th>
                            <th className="py-2.5 px-3 text-center font-medium" style={{ color: colors.text }}>IVA</th>
                            <th className="py-2.5 px-3 text-center font-medium" style={{ color: colors.text }}>Stock</th>
                            <th className="py-2.5 px-3 text-right font-medium" style={{ color: colors.text }}>Preço</th>
                            <th className="py-2.5 px-3 text-center font-medium" style={{ color: colors.text }}>Status</th>
                            <th className="py-2.5 px-3 text-center font-medium" style={{ color: colors.text }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: colors.border }}>
                        {itens.map((item) => {
                            const tipoBadge = getTipoBadge(item.tipo);
                            const isServicoItem = isServico(item);
                            const ivaDisplay = getIVADisplay(item);

                            return (
                                <tr key={item.id} className="transition-colors hover:bg-opacity-50">
                                    <td className="py-2.5 px-3 max-w-[220px]">
                                        <div className="font-medium truncate" style={{ color: colors.text }}>{item.nome}</div>
                                        {item.codigo && (
                                            <div className="text-xs mt-0.5 truncate" style={{ color: colors.textSecondary }}>{item.codigo}</div>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs whitespace-nowrap" style={{ background: `${colors.border}50`, color: colors.secondary }}>
                                            {tipoBadge.texto}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs whitespace-nowrap" style={{ color: ivaDisplay.cor, backgroundColor: `${ivaDisplay.isento ? colors.textSecondary : colors.primary}20` }}>
                                            {ivaDisplay.label}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-medium">
                                        {isServicoItem ? (
                                            <span style={{ color: colors.textSecondary }}>—</span>
                                        ) : (
                                            <span style={{ color: colors.text }}>{item.estoque_atual}</span>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap" style={{ color: colors.text }}>
                                        {formatarPreco(item.preco_venda)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                        <StatusEstoqueBadge item={item} />
                                    </td>
                                    <td className="py-2.5 px-3 text-center relative">
                                        <button
                                            ref={(el) => {
                                                if (el) {
                                                    buttonRefs.current.set(item.id, el);
                                                }
                                            }}
                                            onClick={(e) => toggleMenu(e, item.id)}
                                            className="p-1.5 hover:opacity-70 transition-opacity"
                                            style={{
                                                color: colors.textSecondary,
                                                backgroundColor: menuId === item.id && menuOpen ? `${colors.primary}20` : 'transparent'
                                            }}
                                            aria-label="Ações"
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
            <div className="md:hidden space-y-2.5">
                {itens.map((item) => {
                    const tipoBadge = getTipoBadge(item.tipo);
                    const isServicoItem = isServico(item);
                    const ivaDisplay = getIVADisplay(item);

                    return (
                        <div key={item.id} className="border p-3 " style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate" style={{ color: colors.text }}>{item.nome}</p>
                                    {item.codigo && (
                                        <p className="text-xs mt-0.5 truncate" style={{ color: colors.textSecondary }}>{item.codigo}</p>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => toggleMenu(e, item.id)}
                                    className="p-1.5 shrink-0 hover:opacity-70 transition-opacity "
                                    style={{ color: colors.textSecondary }}
                                    aria-label="Ações"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs " style={{ backgroundColor: `${colors.border}50`, color: colors.secondary }}>
                                    {tipoBadge.texto}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs " style={{ color: ivaDisplay.cor, backgroundColor: `${ivaDisplay.isento ? colors.textSecondary : colors.primary}20` }}>
                                    <Percent className="w-3 h-3" />
                                    {ivaDisplay.label}
                                </span>
                                <StatusEstoqueBadge item={item} />
                            </div>
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t" style={{ borderColor: colors.border }}>
                                <div className="text-xs" style={{ color: colors.textSecondary }}>
                                    Stock: <span className="font-medium" style={{ color: colors.text }}>
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

            {/* ===== Menu flutuante (renderizado via Portal para evitar clipping/transform de ancestrais) ===== */}
            {menuOpen && menuPosition && menuItem && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                        backgroundColor: colors.card,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
                        minWidth: '176px',
                        overflow: 'hidden',
                        zIndex: 99999,
                        padding: '4px 0'
                    }}
                >
                    <button
                        onClick={() => handleMenuItemClick(onEditar, menuItem)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontSize: '14px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: colors.text,
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <PencilLine className="w-4 h-4" />
                        Editar
                    </button>

                    {!isServico(menuItem) && (
                        <button
                            onClick={() => handleMenuItemClick(onRegistrarEntrada, menuItem)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '10px 16px',
                                textAlign: 'left',
                                fontSize: '14px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: colors.text,
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <Plus className="w-4 h-4" />
                            Entrada
                        </button>
                    )}

                    <button
                        onClick={() => handleMenuItemClick(onMoverParaLixeira, menuItem)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontSize: '14px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: colors.danger,
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.danger}20`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Trash2 className="w-4 h-4" />
                        Lixeira
                    </button>
                </div>,
                document.body
            )}
        </>
    );
}