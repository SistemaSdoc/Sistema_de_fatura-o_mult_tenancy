// src/app/(empresa)/estoque/components/FiltrosEstoque.tsx
import React, { useEffect } from "react";
import { Search, X } from "lucide-react";
import { Categoria } from "@/services/produtos";
import { useThemeColors } from "@/context/ThemeContext";

interface FiltrosEstoqueProps {
    busca: string;
    onBuscaChange: (value: string) => void;
    tipoFiltro: "todos" | "produto" | "servico";
    onTipoFiltroChange: (value: "todos" | "produto" | "servico") => void;
    categoriaFiltro: string;
    onCategoriaFiltroChange: (value: string) => void;
    filtroEstoque: "todos" | "baixo" | "zerado";
    onFiltroEstoqueChange: (value: "todos" | "baixo" | "zerado") => void;
    categorias: Categoria[];
    loading: boolean;
    onAplicarFiltros: () => void;
    showEstoqueFilter: boolean;
}

export function FiltrosEstoque({
    busca,
    onBuscaChange,
    tipoFiltro,
    onTipoFiltroChange,
    categoriaFiltro,
    onCategoriaFiltroChange,
    filtroEstoque,
    onFiltroEstoqueChange,
    categorias,
    onAplicarFiltros,
    showEstoqueFilter,
}: FiltrosEstoqueProps) {
    const colors = useThemeColors();

    // Aplica filtros automaticamente quando qualquer filtro mudar
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            onAplicarFiltros();
        }, 300); // Debounce de 300ms para busca

        return () => clearTimeout(timeoutId);
    }, [busca, tipoFiltro, categoriaFiltro, filtroEstoque, onAplicarFiltros]);

    const limparBusca = () => {
        onBuscaChange("");
    };

    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
            {/* Busca */}
            <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
                <input
                    type="text"
                    value={busca}
                    onChange={(e) => onBuscaChange(e.target.value)}
                    placeholder="Buscar por nome ou código..."
                    className="w-full pl-10 pr-8 py-2 text-sm rounded-lg border outline-none transition-all"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text
                    }}
                />
                {busca && (
                    <button
                        onClick={limparBusca}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: colors.textSecondary }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Tipo */}
            <select
                value={tipoFiltro}
                onChange={(e) => onTipoFiltroChange(e.target.value as unknown as "todos" | "produto" | "servico")}
                className="px-3 py-2 text-sm rounded-lg border outline-none min-w-[130px]"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text
                }}
            >
                <option value="todos">Todos os tipos</option>
                <option value="produto">Apenas Produtos</option>
                <option value="servico">Apenas Serviços</option>
            </select>

            {/* Categoria */}
            <select
                value={categoriaFiltro}
                onChange={(e) => onCategoriaFiltroChange(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border outline-none min-w-[140px]"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text
                }}
            >
                <option value="">Todas categorias</option>
                {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
            </select>

            {/* Estoque */}
            {showEstoqueFilter && (
                <select
                    value={filtroEstoque}
                    onChange={(e) => onFiltroEstoqueChange(e.target.value as unknown as "todos" | "baixo" | "zerado")}
                    className="px-3 py-2 text-sm rounded-lg border outline-none min-w-[130px]"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text
                    }}
                >
                    <option value="todos">Todos níveis</option>
                    <option value="baixo">Estoque baixo</option>
                    <option value="zerado">Sem estoque</option>
                </select>
            )}

        </div>
    );
}