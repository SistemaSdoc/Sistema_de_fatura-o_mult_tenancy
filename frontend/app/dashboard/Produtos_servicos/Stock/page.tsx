"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../../components/MainEmpresa";
import { Plus, Package, AlertTriangle, Wrench, XCircle, ArrowLeft } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import { FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
// Componentes
import { StatCard } from "@/app/components/Stock/StatCard";
import { ModalEntrada } from "@/app/components/Stock/ModalEntrada";
import { ModalConfirmacao } from "@/app/components/Stock/ModalConfirmacao";
import { FiltrosEstoque } from "@/app/components/Stock/FiltrosEstoque";
import { TabelaItens } from "@/app/components/Stock/TabelaItens";
import { TabelaMovimentacoes } from "@/app/components/Stock/TabelaMovimentacoes";
import { TabelaLixeira } from "@/app/components/Stock/TabelaLixeira";
import { TabsEstoque } from "@/app/components/Stock/TabsEstoque";

// Hooks
import { useEstoque } from "@/hooks/useEstoque";

const ModalImportacao = dynamic(() => import("@/app/components/Stock/ModalImportacao").then((mod) => mod.ModalImportacao), { ssr: false });

const NovoProdutoForm = dynamic(() => import("@/app/components/Stock/NovoProdutoForm").then((mod) => mod.NovoProdutoForm), {
  ssr: false,
  loading: () => <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">Carregando formulário...</div>,
});

const ModalEdicao = dynamic(() => import("@/app/components/Stock/ModalEdicao").then((mod) => mod.ModalEdicao), { ssr: false });

export default function EstoquePage() {
  const router = useRouter();
  const colors = useThemeColors();

  // Estado para controlar o modal de novo produto
  const [modalNovoProdutoAberto, setModalNovoProdutoAberto] = useState(false);
  const [modalImportacaoAberto, setModalImportacaoAberto] = useState(false);
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
    filtroEstoque,
    abaAtiva,
    modalEntradaAberto,
    modalEdicaoAberto,
    itemSelecionado,
    modalConfirmacao,
    produtos,
    // Setters
    setBusca,
    setCategoriaFiltro,
    setFiltroEstoque,
    setAbaAtiva,

    // Actions
    carregarDados,
    carregarMovimentacoes,
    carregarDeletados,
    aplicarFiltros,
    abrirModalEntrada,
    abrirModalEditar,
    abrirModalDeletar,
    abrirModalRestaurar,
    abrirModalForceDelete,
    fecharModais,
    handleEntrada,
    handleEditarItem,
    handleDeletarItem,
    handleRestaurarItem,
    handleForceDelete,
  } = useEstoque();

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (abaAtiva === "movimentacoes") {
      carregarMovimentacoes();
    }
  }, [abaAtiva, carregarMovimentacoes]);

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
        <div className="flex items-center justify-center min-h-[400px] " style={{ backgroundColor: colors.background }}>
          <div
            className="animate-spin w-10 h-10 border-3 rounded-full"
            style={{
              borderColor: `${colors.primary}30`,
              borderTopColor: colors.primary,
            }}
          />
        </div>
      </MainEmpresa>
    );
  }

  return (
    <MainEmpresa>
      <div
        className="space-y-4 sm:space-y-6 max-w-7xl mx-auto p-3 sm:p-4 md:p-6 transition-colors duration-300"
        style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <button
              className="flex items-center gap-1.5 sm:gap-2 py-1 sm:p-1.5 transition-colors hover:opacity-70"
              style={{ color: colors.primary }}
              onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate" style={{ color: colors.secondary }}>
                Seu Estoque
              </h1>
            </button>

            <p className="text-xs sm:text-sm mt-1" style={{ color: colors.textSecondary }}>
              Gerencie e controle de estoque
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalImportacaoAberto(true)}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 text-white  px-3 sm:px-4 py-2  transition-colors text-xs sm:text-sm font-medium hover:opacity-80 whitespace-nowrap"
              style={{ backgroundColor: colors.primary }}>
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span className="sm:inline">Importar Excel</span>
            </button>
            <button
              onClick={abrirModalNovoProduto}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-white transition-colors text-xs sm:text-sm font-medium hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: colors.secondary }}>
              <Plus className="w-4 h-4 shrink-0" />
              <span className="sm:inline">Novo Item</span>
            </button>

            <button
              onClick={() => router.push("/dashboard/Produtos_servicos/categorias")}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-white transition-colors text-xs sm:text-sm font-medium hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: colors.primary }}>
              <Plus className="w-4 h-4 shrink-0" />
              <span className="sm:inline">Nova Categoria</span>
            </button>
          </div>
        </div>

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <StatCard icon={<Package className="w-5 h-5" />} label="Total de Produtos" value={produtos.length} colors={colors} />
            <StatCard icon={<Package className="w-5 h-5" />}  label="Valor do Stock" value={`${resumo.valorTotalEstoque || 0} Kz`} colors={colors} />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Stock Baixo"
              value={resumo.produtosEstoqueBaixo || 0}
              colors={colors}
            />
            <StatCard icon={<XCircle className="w-5 h-5" />} label="Sem stock" value={resumo.produtosSemEstoque || 0} colors={colors} />
          </div>
        )}

        {/* Tabs e Conteúdo */}
        <div
          className="shadow-sm border overflow-hidden"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <TabsEstoque
            abaAtiva={abaAtiva}
            onAbaChange={setAbaAtiva}
            totalItens={itens.length}
            totalDeletados={itensDeletados.length}
            colors={colors}
          />

          <div className="p-3 sm:p-4 md:p-6">
            {abaAtiva === "itens" && (
              <>
                <FiltrosEstoque
                  busca={busca}
                  onBuscaChange={setBusca}
                  categoriaFiltro={categoriaFiltro}
                  onCategoriaFiltroChange={setCategoriaFiltro}
                  filtroEstoque={filtroEstoque}
                  onFiltroEstoqueChange={setFiltroEstoque}
                  categorias={categorias}
                  loading={loading}
                  onAplicarFiltros={aplicarFiltros}
                  showEstoqueFilter={true}
                  colors={colors}
                />

                <TabelaItens
                  itens={itens}
                  onEditar={abrirModalEditar}
                  onRegistrarEntrada={abrirModalEntrada}
                  onMoverParaLixeira={abrirModalDeletar}
                  colors={colors}
                />
              </>
            )}

            {abaAtiva === "movimentacoes" && <TabelaMovimentacoes movimentacoes={movimentacoes} colors={colors} />}

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

      {/* Modal de Novo Produto */}
      <Dialog open={modalNovoProdutoAberto} onOpenChange={(open) => { if (!open) fecharModalNovoProduto(); }}>
        <DialogContent
          className="sm:max-w-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          showCloseButton={false}
        >
          <NovoProdutoForm onSuccess={handleProdutoCriado} onCancel={fecharModalNovoProduto} />
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <ModalEdicao
        isOpen={modalEdicaoAberto}
        item={itemSelecionado}
        onSave={handleEditarItem}
        onClose={fecharModais}
        categorias={categorias}
      />

      {/* Modal de Entrada de Estoque */}
      <ModalEntrada
        isOpen={modalEntradaAberto}
        onClose={fecharModais}
        produto={itemSelecionado}
        onConfirm={handleEntrada}
        colors={colors}
      />

      {/* Modal de Confirmação - Delete (Mover para Lixeira) */}
      <ModalConfirmacao
        isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "delete"}
        onClose={fecharModais}
        onConfirm={handleDeletarItem}
        titulo="Lixeira"
        mensagem={`Tem certeza que deseja mover "${modalConfirmacao.produto?.nome}" para a lixeira?`}
        tipo="delete"
        colors={colors}
      />

      {/* Modal de Confirmação - Restaurar */}
      <ModalConfirmacao
        isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "restore"}
        onClose={fecharModais}
        onConfirm={handleRestaurarItem}
        titulo="Restaurar Item"
        mensagem={`Deseja restaurar "${modalConfirmacao.produto?.nome}"?`}
        tipo="restore"
        colors={colors}
      />

      {/* Modal de Confirmação - Delete Permanente */}
      <ModalConfirmacao
        isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "warning"}
        onClose={fecharModais}
        onConfirm={handleForceDelete}
        titulo="Deletar Permanentemente"
        mensagem={`Esta ação não pode ser desfeita. Deletar "${modalConfirmacao.produto?.nome}" permanentemente?`}
        tipo="warning"
        colors={colors}
      />

      {/* Modal de importacao do exel */}
      <ModalImportacao
        isOpen={modalImportacaoAberto}
        onClose={() => setModalImportacaoAberto(false)}
        onSuccess={carregarDados}
        colors={colors}
      />
    </MainEmpresa>
  );
}
