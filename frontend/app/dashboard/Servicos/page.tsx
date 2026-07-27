"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import MainEmpresa from "../../components/MainEmpresa";
import { Plus, ArrowLeft } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Componentes
import { ModalConfirmacaoServicos } from "@/app/components/Servicos/ModalConfirmacaoServicos";
import { TabelaLixeiraServicos } from "@/app/components/Servicos/TabelaLixeiraServicos";
import { TabsServicos } from "@/app/components/Servicos/TabsServicos";
import { TabelaServicos } from "@/app/components/Servicos/TabelaServicos";
import { FiltrosServicos } from "@/app/components/Servicos/FiltrosServicos";
import { NovoServicoForm } from "@/app/components/Servicos/NovoServicoForm";

import { useServicos } from "@/hooks/useServicos";

const ModalEdicaoServico = dynamic(() => import("@/app/components/Servicos/ModalEdicaoServico").then((mod) => mod.ModalEdicaoServico), {
  ssr: false,
});

export default function ServicosPage() {
  const router = useRouter();
  const colors = useThemeColors();

  // Estado para controlar o modal de novo serviço
  const [modalNovoServicoAberto, setModalNovoServicoAberto] = useState(false);

  const {
    // Estados
    isInitialLoad,
    itens,
    itensDeletados,
    busca,
    abaAtiva,
    modalEdicaoAberto,
    itemSelecionado,
    modalConfirmacao,

    // Setters
    setBusca,
    setAbaAtiva,

    // Actions
    carregarDados,
    carregarDeletados,
    aplicarFiltros,
    abrirModalEditar,
    abrirModalDeletar,
    abrirModalRestaurar,
    abrirModalForceDelete,
    fecharModais,
    handleEditarItem,
    handleDeletarItem,
    handleRestaurarItem,
    handleForceDelete,
  } = useServicos();

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (abaAtiva === "deletados") {
      carregarDeletados();
    }
  }, [abaAtiva, carregarDeletados]);

  const abrirModalNovoServico = () => {
    setModalNovoServicoAberto(true);
  };

  const fecharModalNovoServico = () => {
    setModalNovoServicoAberto(false);
  };

  const handleServicoCriado = () => {
    // Recarregar a lista de serviços após criar um novo
    carregarDados();
    fecharModalNovoServico();
  };

  if (isInitialLoad) {
    return (
      <MainEmpresa>
        <div className="flex items-center justify-center min-h-[400px]" style={{ backgroundColor: colors.background }}>
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
                Seus Serviços
              </h1>
            </button>

            <p className="text-xs sm:text-sm mt-1" style={{ color: colors.textSecondary }}>
              Gerencie seus serviços e catálogo
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={abrirModalNovoServico}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-white transition-colors text-xs sm:text-sm font-medium hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: colors.secondary }}>
              <Plus className="w-4 h-4 shrink-0" />
              <span className="sm:inline">Novo Serviço</span>
            </button>
          </div>
        </div>

        {/* Tabs e Conteúdo */}
        <div
          className="shadow-sm border overflow-hidden"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}>
          <TabsServicos
            abaAtiva={abaAtiva}
            onAbaChange={setAbaAtiva}
            totalItens={itens.length}
            totalDeletados={itensDeletados.length}
            colors={colors}
          />

          <div className="p-3 sm:p-4 md:p-6">
            {abaAtiva === "itens" && (
              <>
                <FiltrosServicos busca={busca} onBuscaChange={setBusca} onAplicarFiltros={aplicarFiltros} colors={colors} />

                <TabelaServicos itens={itens} onEditar={abrirModalEditar} onMoverParaLixeira={abrirModalDeletar} colors={colors} />
              </>
            )}

            {abaAtiva === "deletados" && (
              <TabelaLixeiraServicos
                itens={itensDeletados}
                onRestaurar={abrirModalRestaurar}
                onDeletarPermanentemente={abrirModalForceDelete}
                colors={colors}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de Novo Serviço */}
      <Dialog
        open={modalNovoServicoAberto}
        onOpenChange={(open) => {
          if (!open) fecharModalNovoServico();
        }}>
        <DialogContent
          className="sm:max-w-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          showCloseButton={false}>
          <NovoServicoForm onSuccess={handleServicoCriado} onCancel={fecharModalNovoServico} />
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <ModalEdicaoServico isOpen={modalEdicaoAberto} item={itemSelecionado} onSave={handleEditarItem} onClose={fecharModais} />

      {/* Modal de Confirmação - Delete (Mover para Lixeira) */}
      <ModalConfirmacaoServicos
        isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "delete"}
        onClose={fecharModais}
        onConfirm={handleDeletarItem}
        titulo="Lixeira"
        mensagem={`Tem certeza que deseja mover "${modalConfirmacao.produto?.nome}" para a lixeira?`}
        tipo="delete"
        colors={colors}
      />

      {/* Modal de Confirmação - Restaurar */}
      <ModalConfirmacaoServicos
        isOpen={modalConfirmacao.isOpen && modalConfirmacao.tipo === "restore"}
        onClose={fecharModais}
        onConfirm={handleRestaurarItem}
        titulo="Restaurar Item"
        mensagem={`Deseja restaurar "${modalConfirmacao.produto?.nome}"?`}
        tipo="restore"
        colors={colors}
      />

      {/* Modal de Confirmação - Delete Permanente */}
      <ModalConfirmacaoServicos
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
