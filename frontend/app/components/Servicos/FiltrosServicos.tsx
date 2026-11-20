
"use client";

import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

interface FiltrosServicosProps {
    busca: string;
    onBuscaChange: (value: string) => void;
    onAplicarFiltros: () => void;
    colors?: any;
}

export function FiltrosServicos({
    busca,
    onBuscaChange,
    onAplicarFiltros,
    colors: propColors
}: FiltrosServicosProps) {
    const contextColors = useThemeColors();
    const colors = propColors || contextColors;

    const primeiraMontagem = useRef(true);
    const aplicarFiltrosRef = useRef(onAplicarFiltros);

    // Mantém a referência da função actualizada sem reiniciar o efeito.
    useEffect(() => {
        aplicarFiltrosRef.current = onAplicarFiltros;
    }, [onAplicarFiltros]);

    // Pesquisa automática apenas quando o texto muda.
    useEffect(() => {
        if (primeiraMontagem.current) {
            primeiraMontagem.current = false;
            return;
        }

        const timeoutId = window.setTimeout(() => {
            aplicarFiltrosRef.current();
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [busca]);

    const limparBusca = () => {
        onBuscaChange("");
    };

    return (
        <div className="w-full mb-6">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />

                <input
                    type="text"
                    value={busca}
                    onChange={(e) => onBuscaChange(e.target.value)}
                    placeholder="Buscar serviço por nome ou descrição..."
                    className="w-full pl-10 pr-8 py-2 text-sm border outline-none transition-all"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="Limpar pesquisa"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
