"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Loader2, Mail, MessageSquare, CheckCheck, Clock3, Trash2 } from "lucide-react";
import type { ThemeColors } from "@/context/ThemeContext";
import { mensagensEmpresaApi, MensagemEmpresa } from "@/services/mensagensEmpresa";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "../Clientes/ConfirmModal";
import { friendlyError, WithToast } from "./ConfiguracoesComuns";

export interface MensagensTabProps extends WithToast {
  colors: ThemeColors;
}

export function MensagensTab({ colors, showToast }: MensagensTabProps) {
  const [mensagens, setMensagens] = useState<MensagemEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  //   FIX #1: ref para evitar loop quando showToast muda a cada render
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const carregarMensagens = useCallback(async (force = false) => {
    if (!force) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await mensagensEmpresaApi.listar();
      setMensagens(response.data.mensagens || []);
    } catch (error) {
      console.error("[MensagensTab] erro ao carregar:", error);
      showToastRef.current(
        "Erro",
        "error",
        friendlyError(error, "Não foi possível carregar as mensagens."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); //   dependências vazias — estável

  useEffect(() => {
    void carregarMensagens();
  }, [carregarMensagens]);

  const marcarComoLida = async (id: string) => {
    setUpdatingId(id);
    try {
      await mensagensEmpresaApi.marcarComoLida(id);
      setMensagens((prev) =>
        prev.map((m) => (m.id === id ? { ...m, lida: true } : m)),
      );
      showToast("Sucesso", "success", "Mensagem marcada como lida.");
    } catch (error) {
      console.error("[MensagensTab] erro ao marcar:", error);
      showToast("Erro", "error", friendlyError(error, "Não foi possível marcar a mensagem como lida."));
    } finally {
      setUpdatingId(null);
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [mensagemParaEliminar, setMensagemParaEliminar] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const eliminarMensagem = (id: string) => {
    setMensagemParaEliminar(id);
    setModalOpen(true);
  };

  const confirmarEliminacao = async () => {
    if (!mensagemParaEliminar) return;
    setDeletingId(mensagemParaEliminar);
    try {
      await mensagensEmpresaApi.eliminar(mensagemParaEliminar);
      setMensagens((prev) => prev.filter((m) => m.id !== mensagemParaEliminar));
      showToast("Sucesso", "success", "Mensagem eliminada com sucesso.");
    } catch (error) {
      console.error("[MensagensTab] erro ao eliminar:", error);
      showToast("Erro", "error", friendlyError(error, "Não foi possível eliminar a mensagem."));
    } finally {
      setDeletingId(null);
      setMensagemParaEliminar(null);
      setModalOpen(false);
    }
  };

  const naoLidas = mensagens.filter((m) => !m.lida).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: colors.secondary }}>
            Mensagens do Landlord
          </h2>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Histórico de comunicações enviadas pela administração
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}>
            {naoLidas} não lidas
          </span>
          <Button
            variant="outline"
            onClick={() => void carregarMensagens(true)}
            disabled={refreshing || loading}
            style={{
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.card,
            }}>
            {refreshing ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <MessageSquare size={16} className="mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : mensagens.length > 0 ? (
        <div className="space-y-4">
          {mensagens.map((mensagem) => (
            <div
              key={mensagem.id}
              className="rounded-xl border p-4 transition-all duration-200"
              style={{
                backgroundColor: colors.card,
                borderColor: mensagem.lida ? colors.border : colors.primary,
              }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Mail size={14} style={{ color: colors.textSecondary }} />
                    <span className="font-semibold" style={{ color: colors.text }}>
                      {mensagem.remetente_nome || "Landlord"}
                    </span>
                    {!mensagem.lida && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${colors.primary}18`,
                          color: colors.primary,
                        }}>
                        Nova
                      </span>
                    )}
                    {mensagem.lida && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${colors.success}18`,
                          color: colors.success,
                        }}>
                        Lida
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-3 whitespace-pre-wrap text-sm leading-6"
                    style={{ color: colors.text }}>
                    {mensagem.mensagem}
                  </p>
                  <div
                    className="mt-3 flex flex-wrap items-center gap-3 text-xs"
                    style={{ color: colors.textSecondary }}>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {mensagem.created_at
                        ? new Date(mensagem.created_at).toLocaleString("pt-PT")
                        : "Sem data"}
                    </span>
                    {mensagem.remetente_email && <span>{mensagem.remetente_email}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!mensagem.lida && (
                    <Button
                      onClick={() => void marcarComoLida(mensagem.id)}
                      disabled={updatingId === mensagem.id || deletingId === mensagem.id}
                      variant="outline"
                      style={{
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: colors.card,
                      }}>
                      {updatingId === mensagem.id ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <CheckCheck size={16} className="mr-2" />
                      )}
                      {updatingId === mensagem.id ? "A marcar..." : "Marcar lida"}
                    </Button>
                  )}
                  <Button
                    onClick={() => eliminarMensagem(mensagem.id)}
                    disabled={deletingId === mensagem.id || updatingId === mensagem.id}
                    variant="outline"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    style={{ borderColor: colors.border }}>
                    {deletingId === mensagem.id ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Trash2 size={16} className="mr-2" />
                    )}
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed p-8 text-center"
          style={{ borderColor: colors.border, backgroundColor: colors.card }}>
          <MessageSquare className="mx-auto mb-3" style={{ color: colors.textSecondary }} />
          <p style={{ color: colors.textSecondary }}>Ainda não há mensagens do landlord.</p>
        </div>
      )}

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => {
          if (deletingId) return;
          setModalOpen(false);
          setMensagemParaEliminar(null);
        }}
        onConfirm={() => void confirmarEliminacao()}
        title="Eliminar Mensagem"
        message="Tem certeza que deseja eliminar esta mensagem? Esta ação não poderá ser desfeita."
        loading={deletingId !== null}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        colors={colors}
      />
    </div>
  );
}