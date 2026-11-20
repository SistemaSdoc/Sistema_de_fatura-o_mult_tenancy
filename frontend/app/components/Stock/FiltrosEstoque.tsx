
"use client";

import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Categoria } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface FiltrosEstoqueProps {
    busca: string;
    onBuscaChange: (value: string) => void;
    categoriaFiltro: string;
    onCategoriaFiltroChange: (value: string) => void;
    filtroEstoque: "todos" | "baixo" | "zerado";
    onFiltroEstoqueChange: (value: "todos" | "baixo" | "zerado") => void;
    categorias: Categoria[];
    loading: boolean;
    onAplicarFiltros: () => void;
    showEstoqueFilter: boolean;
    colors?: any;
}

export function FiltrosEstoque({
    busca,
    onBuscaChange,
    categoriaFiltro,
    filtroEstoque,
    categorias,
    onAplicarFiltros,
    colors: propColors
}: FiltrosEstoqueProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

    // Mantém sempre a versão mais recente da função.
    const aplicarFiltrosRef = useRef(onAplicarFiltros);

    useEffect(() => {
        aplicarFiltrosRef.current = onAplicarFiltros;
    }, [onAplicarFiltros]);

    // Guarda os filtros anteriores para não pesquisar na montagem inicial.
    const filtrosAnteriores = useRef({
        busca,
        categoriaFiltro,
        filtroEstoque
    });

    useEffect(() => {
        const houveAlteracao =
            filtrosAnteriores.current.busca !== busca ||
            filtrosAnteriores.current.categoriaFiltro !== categoriaFiltro ||
            filtrosAnteriores.current.filtroEstoque !== filtroEstoque;

        if (!houveAlteracao) return;

        filtrosAnteriores.current = {
            busca,
            categoriaFiltro,
            filtroEstoque
        };

        const timeoutId = window.setTimeout(() => {
            aplicarFiltrosRef.current();
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [busca, categoriaFiltro, filtroEstoque]);

    const limparBusca = () => {
        onBuscaChange("");
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px] gap-3 mb-6">
            <div className="relative w-full sm:col-span-2 lg:col-span-1">
                <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: colors.textSecondary }}
                />

                <input
                    type="text"
                    value={busca}
                    onChange={(e) => onBuscaChange(e.target.value)}
                    placeholder="Buscar por nome ou código..."
                    className="w-full pl-10 pr-8 py-2.5 sm:py-2 text-sm border outline-none transition-all"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text
                    }}
                />

                {busca && (
                    <button
                        type="button"
                        onClick={limparBusca}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: colors.textSecondary }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
