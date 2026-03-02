// src/app/(empresa)/estoque/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import { Plus, Package, AlertTriangle, Wrench, XCircle } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

// Componentes
import { StatCard } from "@/app/components/Stock/StatCard";
import { ModalEntrada } from "@/app/components/Stock/ModalEntrada";
import { ModalConfirmacao } from "@/app/components/Stock/ModalConfirmacao";
import { FiltrosEstoque } from "@/app/components/Stock/FiltrosEstoque";
import { TabelaItens } from "@/app/components/Stock/TabelaItens";
import { TabelaMovimentacoes } from "@/app/components/Stock/TabelaMovimentacoes";
import { TabelaLixeira } from "@/app/components/Stock/TabelaLixeira";
import { TabsEstoque } from "@/app/components/Stock/TabsEstoque";
import { NovoProdutoForm } from "@/app/components/Stock/NovoProdutoForm";

// Hooks
import { useEstoque } from "@/hooks/useEstoque";

export default function EstoquePage() {
    const router = useRouter();
    const colors = useThemeColors();
    
    // Estado para controlar o modal de novo produto
    const [modalNovoProdutoAberto, setModalNovoProdutoAberto] = useState(false);

    const {
        // Estados
        loading,
        resumo,
        itens,
        itensDeletados,
        categorias,
        movimentacoes,
        busca,
        categoriaFiltro,
        tipoFiltro,
        filtroEstoque,
        abaAtiva,
        modalEntradaAberto,
        itemSelecionado,
        modalConfirmacao,
        produtos,
        servicos,

        // Setters
        setBusca,
        setCategoriaFiltro,
        setTipoFiltro,
        setFiltroEstoque,
        setAbaAtiva,

        // Actions
        carregarDados,
        carregarDeletados,
        aplicarFiltros,
        abrirModalEntrada,
        abrirModalDeletar,
        abrirModalRestaurar,
        abrirModalForceDelete,
        fecharModais,
        handleEntrada,
        handleDeletarItem,
        handleRestaurarItem,
        handleForceDelete,
    } = useEstoque();

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    useEffect(() => {
        if (abaAtiva === "deletados") {
            carregarDeletados();
        }
    }, [abaAtiva, carregarDeletados]);

    const abrirModalNovoProduto = () => {
        setModalNovoProdutoAberto(true);
    };

    const fecharModalNovoProduto = () => {
        setModalNovoProdutoAberto(false);
    };

    const handleProdutoCriado = () => {
        // Recarregar a lista de produtos após criar um novo
        carregarDados();
        fecharModalNovoProduto();
    };

    if (loading && !resumo) {
        return (
            <MainEmpresa>
                <div className="flex items-center justify-center min-h-[400px]" style={{ backgroundColor: colors.background }}>
                    <div 
                        className="animate-spin w-10 h-10 border-3 rounded-full"
                        style={{ 
                            borderColor: `${colors.primary}30`, 
                            borderTopColor: colors.primary 
                        }} 
                    />
                </div>
            </MainEmpresa>
        );
    }

    return (
        <MainEmpresa>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 transition-colors duration-300" style={{ backgroundColor: colors.background }}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: colors.primary }}>Seu Stock</h1>
                        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Gerencie seu catálogo e controle de estoque</p>
                    </div>
                    <button
                        onClick={abrirModalNovoProduto}
                        className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium hover:opacity-90"
                        style={{ backgroundColor: colors.secondary }}
                    >
                        <Plus className="w-4 h-4" />
                        Novo Item
                    </button>
                </div>

                {/* Cards de Resumo */}
                {resumo && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={<Package className="w-5 h-5" />}
                            label="Total de Produtos"
                            value={produtos.length}
                            colors={colors}
                        />
                        <StatCard
                            icon={<Wrench className="w-5 h-5" />}
                            label="Total de Serviços"
                            value={servicos.length}
                            colors={colors}
                        />
                        <StatCard
                            icon={<AlertTriangle className="w-5 h-5" />}
                            label="Estoque Baixo"
                            value={resumo.produtosEstoqueBaixo || 0}
                            colors={colors}
                        />
                        <StatCard
                            icon={<XCircle className="w-5 h-5" />}
                            label="Sem Estoque"
                            value={resumo.produtosSemEstoque || 0}
                            colors={colors}
                        />
                    </div>
                )}

                {/* Tabs e Conteúdo */}
                <div className="rounded-xl shadow-sm border overflow-hidden" style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border
                }}>
                    <TabsEstoque
                        abaAtiva={abaAtiva}
                        onAbaChange={setAbaAtiva}
                        totalItens={itens.length}
                        totalDeletados={itensDeletados.length}
                        colors={colors}
                    />

                    <div className="p-4 md:p-6">
                        {abaAtiva === "itens" && (
                            <>
                                <FiltrosEstoque
                                    busca={busca}
                                    onBuscaChange={setBusca}
                                    tipoFiltro={tipoFiltro}
                                    onTipoFiltroChange={setTipoFiltro}
                                    categoriaFiltro={categoriaFiltro}
                                    onCategoriaFiltroChange={setCategoriaFiltro}
                                    filtroEstoque={filtroEstoque}
                                    onFiltroEstoqueChange={setFiltroEstoque}
                                    categorias={categorias}
                                    loading={loading}
                                    onAplicarFiltros={aplicarFiltros}
                                    showEstoqueFilter={tipoFiltro !== "servico"}
                                    colors={colors}
                                />

                                <TabelaItens
                                    itens={itens}
                                    onRegistrarEntrada={abrirModalEntrada}
                                    onMoverParaLixeira={abrirModalDeletar}
                                    colors={colors}
                                />
                            </>
                        )}

                        {abaAtiva === "movimentacoes" && (
                            <TabelaMovimentacoes
                                movimentacoes={movimentacoes}
                                colors={colors}
                            />
                        )}

                        {abaAtiva === "deletados" && (
                            <TabelaLixeira
                                itens={itensDeletados}
                                onRestaurar={abrirModalRestaurar}
                                onDeletarPermanentemente={abrirModalForceDelete}
                                colors={colors}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Novo Produto - Usando NovoProdutoForm diretamente */}
            {modalNovoProdutoAberto && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div 
                        className="rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                        style={{ backgroundColor: colors.card }}
                    >
                        <div className="p-6 overflow-y-auto max-h-[90vh]">
                            <NovoProdutoForm 
                                onSuccess={handleProdutoCriado}
                                onCancel={fecharModalNovoProduto}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Outros Modais */}
            <ModalEntrada
                isOpen={modalEntradaAberto}
                onClose={fecharModais}
                produto={itemSelecionado}
                onConfirm={handleEntrada}
                colors={colors}
            />

            <ModalConfirmacao
                isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "delete"}
                onClose={fecharModais}
                onConfirm={handleDeletarItem}
                titulo="Mover para Lixeira"
                mensagem={`Tem certeza que deseja mover "${modalConfirmacao.produto?.nome}" para a lixeira?`}
                tipo="delete"
                colors={colors}
            />

            <ModalConfirmacao
                isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "restore"}
                onClose={fecharModais}
                onConfirm={handleRestaurarItem}
                titulo="Restaurar Item"
                mensagem={`Deseja restaurar "${modalConfirmacao.produto?.nome}"?`}
                tipo="restore"
                colors={colors}
            />

            <ModalConfirmacao
                isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "warning"}
                onClose={fecharModais}
                onConfirm={handleForceDelete}
                titulo="Deletar Permanentemente"
                mensagem={`Esta ação não pode ser desfeita. Deletar "${modalConfirmacao.produto?.nome}" permanentemente?`}
                tipo="warning"
                colors={colors}
            />
        </MainEmpresa>
    );
}