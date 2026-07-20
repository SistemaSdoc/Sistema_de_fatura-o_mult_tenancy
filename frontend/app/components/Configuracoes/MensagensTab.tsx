"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, MessageSquare, CheckCheck, Clock3, Trash2 } from "lucide-react";
import type { ThemeColors } from "@/context/ThemeContext";
import { mensagensEmpresaApi, MensagemEmpresa } from "@/services/mensagensEmpresa";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "../Clientes/ConfirmModal";

interface MensagensTabProps {
  colors: ThemeColors;
  showToast: (message: string, type?: "success" | "error" | "warning" | "info", description?: string) => void;
}

export function MensagensTab({ colors, showToast }: MensagensTabProps) {
  const [mensagens, setMensagens] = useState<MensagemEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarMensagens = useCallback(async (force = false) => {
    if (!force) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await mensagensEmpresaApi.listar();
      setMensagens(response.data.mensagens || []);
    } catch (error) {
      console.error("[MensagensTab] Erro ao carregar mensagens:", error);
      showToast("Erro ao carregar mensagens do landlord", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarMensagens();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [carregarMensagens]);

  const marcarComoLida = async (id: string) => {
    try {
      await mensagensEmpresaApi.marcarComoLida(id);
      setMensagens((prev) => prev.map((mensagem) => (mensagem.id === id ? { ...mensagem, lida: true } : mensagem)));
      showToast("Mensagem marcada como lida", "success");
    } catch (error) {
      console.error("[MensagensTab] Erro ao marcar mensagem:", error);
      showToast("Erro ao marcar mensagem como lida", "error");
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
      setMensagens((prev) => prev.filter((mensagem) => mensagem.id !== mensagemParaEliminar));
      showToast("Mensagem eliminada com sucesso", "success");
    } catch (error) {
      console.error("[MensagensTab] Erro ao eliminar mensagem:", error);
      showToast("Erro ao eliminar mensagem", "error");
    } finally {
      setDeletingId(null);
      setMensagemParaEliminar(null);
      setModalOpen(false);
    }
  };

  const naoLidas = mensagens.filter((mensagem) => !mensagem.lida).length;

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
            disabled={refreshing}
            style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}>
            {refreshing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <MessageSquare size={16} className="mr-2" />}
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
                        style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>
                        Nova
                      </span>
                    )}
                    {mensagem.lida && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${colors.success}18`, color: colors.success }}>
                        Lida
                      </span>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6" style={{ color: colors.text }}>
                    {mensagem.mensagem}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: colors.textSecondary }}>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {mensagem.created_at ? new Date(mensagem.created_at).toLocaleString("pt-PT") : "Sem data"}
                    </span>
                    {mensagem.remetente_email && <span>{mensagem.remetente_email}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!mensagem.lida ? (
                    <Button
                      onClick={() => void marcarComoLida(mensagem.id)}
                      variant="outline"
                      style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}>
                      <CheckCheck size={16} className="mr-2" />
                      Marcar lida
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => void eliminarMensagem(mensagem.id)}
                    variant="outline"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    style={{ borderColor: colors.border }}>
                    <Trash2 size={16} className="mr-2" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
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
        message="Tem certeza que deseja eliminar esta mensagem? Esta ação não poderá ser desfeita e removerá a mensagem do seu painel."
        loading={deletingId !== null}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        colors={colors as any}
      />
    </div>
  );
}
