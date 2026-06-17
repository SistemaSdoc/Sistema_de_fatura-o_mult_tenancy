import React, { useState } from "react";
import {
  Building2,
  User,
  Phone,
  Eye,
  Edit2,
  Power,
  CheckCircle,
  XCircle,
  Search,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  Info,
} from "lucide-react";
import type { Cliente } from "@/services/clientes";
import {
  formatarNIF,
  identificarTipoDocumento,
  getTipoClienteLabel,
  getClienteBadgeStatus
} from "@/services/clientes";
import { ThemeColors } from "./ClientesComuns";

// ─── Modal de Confirmação ──────────────────────────────────────────
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  loading,
  colors,
  type = "warning" as const,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  loading?: boolean;
  colors: ThemeColors;
  type?: "warning" | "danger" | "info";
}) {
  if (!isOpen) return null;

  const btnColor =
    type === "danger"
      ? colors.danger
      : type === "info"
      ? colors.primary
      : colors.warning;
  const iconBg =
    type === "danger"
      ? `${colors.danger}20`
      : type === "info"
      ? `${colors.secondary}20`
      : `${colors.warning}20`;
  const iconClr =
    type === "danger"
      ? colors.danger
      : type === "info"
      ? colors.secondary
      : colors.warning;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="shadow-xl max-w-md w-full p-5"
        style={{ backgroundColor: colors.card }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5" style={{ backgroundColor: iconBg }}>
            <AlertCircle className="w-5 h-5" style={{ color: iconClr }} />
          </div>
          <h3
            className="text-base font-semibold"
            style={{ color: colors.text }}
          >
            {title}
          </h3>
        </div>
        <p
          className="text-sm mb-5 ml-[52px]"
          style={{ color: colors.textSecondary }}
        >
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm transition-colors"
            style={{
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: btnColor }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 rounded-full border-white border-t-transparent animate-spin" />
                Processando…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────
interface TabelaClientesProps {
  clientes: Cliente[];
  busca: string;
  colors: ThemeColors;
  loading?: boolean;
  onVerDetalhes: (cliente: Cliente) => void;
  onEditar: (cliente: Cliente) => void;
  onStatus: (cliente: Cliente) => void;
  onArquivar?: (cliente: Cliente) => void;
  onRestaurar?: (cliente: Cliente) => void;
  onExcluirPermanente?: (cliente: Cliente) => void;
  onLimparBusca: () => void;
  mostrarLixeira?: boolean;
}

export function TabelaClientes({
  clientes,
  busca,
  colors,
  loading = false,
  onVerDetalhes,
  onEditar,
  onStatus,
  onArquivar,
  onRestaurar,
  onExcluirPermanente,
  onLimparBusca,
  mostrarLixeira = false,
}: TabelaClientesProps) {
  // ── Estado para modais de confirmação ──
  const [modalConfirm, setModalConfirm] = useState<{
    isOpen: boolean;
    cliente: Cliente | null;
    action: "status" | "arquivar" | "restaurar" | "excluir";
  }>({
    isOpen: false,
    cliente: null,
    action: "status",
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ── Handlers dos modais ──
  const handleStatusClick = (cliente: Cliente) => {
    setModalConfirm({
      isOpen: true,
      cliente,
      action: "status",
    });
  };

  const handleArquivarClick = (cliente: Cliente) => {
    if (onArquivar) {
      setModalConfirm({
        isOpen: true,
        cliente,
        action: "arquivar",
      });
    }
  };

  const handleRestaurarClick = (cliente: Cliente) => {
    if (onRestaurar) {
      setModalConfirm({
        isOpen: true,
        cliente,
        action: "restaurar",
      });
    }
  };

  const handleExcluirClick = (cliente: Cliente) => {
    if (onExcluirPermanente) {
      setModalConfirm({
        isOpen: true,
        cliente,
        action: "excluir",
      });
    }
  };

  const closeModal = () => {
    setModalConfirm({ isOpen: false, cliente: null, action: "status" });
  };

  const handleConfirm = async () => {
    if (!modalConfirm.cliente) return;

    setConfirmLoading(true);
    try {
      const cliente = modalConfirm.cliente;
      switch (modalConfirm.action) {
        case "status":
          await onStatus(cliente);
          break;
        case "arquivar":
          if (onArquivar) await onArquivar(cliente);
          break;
        case "restaurar":
          if (onRestaurar) await onRestaurar(cliente);
          break;
        case "excluir":
          if (onExcluirPermanente) await onExcluirPermanente(cliente);
          break;
      }
      closeModal();
    } catch (error) {
      console.error("Erro na ação:", error);
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Configuração do modal ──
  const getModalConfig = () => {
    const cliente = modalConfirm.cliente;
    if (!cliente) return null;

    switch (modalConfirm.action) {
      case "status": {
        const isAtivando = cliente.status === "inativo";
        return {
          title: isAtivando ? "Ativar Cliente" : "Inativar Cliente",
          message: `Tem certeza que deseja ${isAtivando ? "ativar" : "inativar"} "${cliente.nome}"?`,
          confirmText: isAtivando ? "Ativar" : "Inativar",
          cancelText: "Cancelar",
          type: isAtivando ? "info" : ("warning" as const),
        };
      }
      case "arquivar":
        return {
          title: "Arquivar Cliente",
          message: `Tem certeza que deseja arquivar "${cliente.nome}"? O cliente será movido para a lixeira.`,
          confirmText: "Arquivar",
          cancelText: "Cancelar",
          type: "warning" as const,
        };
      case "restaurar":
        return {
          title: "Restaurar Cliente",
          message: `Tem certeza que deseja restaurar "${cliente.nome}"? O cliente voltará à lista de ativos.`,
          confirmText: "Restaurar",
          cancelText: "Cancelar",
          type: "info" as const,
        };
      case "excluir":
        return {
          title: "Excluir Permanentemente",
          message: `Tem certeza que deseja excluir permanentemente "${cliente.nome}"? Esta ação não pode ser desfeita!`,
          confirmText: "Excluir",
          cancelText: "Cancelar",
          type: "danger" as const,
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  // ── Loading State ──
  if (loading) {
    return (
      <div
        className="border overflow-hidden shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="h-11" style={{ backgroundColor: colors.primary }} />
        <div className="divide-y" style={{ borderColor: colors.border }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 animate-pulse"
            >
              <div
                className="w-9 h-9 rounded"
                style={{ backgroundColor: colors.border }}
              />
              <div className="flex-1 space-y-1.5">
                <div
                  className="h-3.5 w-36 rounded"
                  style={{ backgroundColor: colors.border }}
                />
                <div
                  className="h-3 w-28 rounded"
                  style={{ backgroundColor: colors.border }}
                />
              </div>
              <div
                className="w-20 h-6 rounded"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="w-20 h-6 rounded"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="w-28 h-4 rounded"
                style={{ backgroundColor: colors.border }}
              />
              <div className="flex gap-1.5">
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: colors.border }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (clientes.length === 0) {
    return (
      <div
        className="border overflow-hidden shadow-sm text-center py-12"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <Search
          className="w-12 h-12 mx-auto mb-3"
          style={{ color: colors.border }}
        />
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          {busca
            ? `Nenhum cliente encontrado para "${busca}"`
            : mostrarLixeira
            ? "Nenhum cliente na lixeira"
            : "Nenhum cliente cadastrado"}
        </p>
        {busca && (
          <button
            onClick={onLimparBusca}
            className="mt-2 text-sm underline"
            style={{ color: colors.primary }}
          >
            Limpar pesquisa
          </button>
        )}
      </div>
    );
  }

  // ── Renderização da Tabela ──
  return (
    <>
      <div
        className="border overflow-hidden shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: colors.primary }}>
                {["Cliente", "Tipo", "Status", "Contacto", "NIF/BI", "Ações"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-3 px-5 font-semibold text-white text-xs uppercase tracking-wider ${
                        i === 5 ? "text-center" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: colors.border }}>
              {clientes.map((c) => {
                const statusBadge = getClienteBadgeStatus(c);
                const tipoDoc = identificarTipoDocumento(c.nif);
                const nifFormatado = formatarNIF(c.nif);
                const isDeleted = !!c.deleted_at;

                return (
                  <tr
                    key={c.id}
                    className="transition-colors"
                    style={{
                      backgroundColor:
                        c.status === "inativo" || isDeleted
                          ? `${colors.hover}80`
                          : "transparent",
                      opacity: isDeleted ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = colors.hover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        c.status === "inativo" || isDeleted
                          ? `${colors.hover}80`
                          : "transparent")
                    }
                  >
                    {/* Cliente */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor:
                              c.tipo === "empresa"
                                ? `${colors.secondary}20`
                                : colors.hover,
                          }}
                        >
                          {c.tipo === "empresa" ? (
                            <Building2
                              className="w-4 h-4"
                              style={{ color: colors.secondary }}
                            />
                          ) : (
                            <User
                              className="w-4 h-4"
                              style={{ color: colors.textSecondary }}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-medium text-sm truncate"
                            style={{ color: colors.text }}
                          >
                            {c.nome}
                            {isDeleted && (
                              <span
                                className="ml-2 text-[10px] font-normal"
                                style={{ color: colors.danger }}
                              >
                                (Arquivado)
                              </span>
                            )}
                          </div>
                          {c.email && (
                            <div
                              className="text-xs truncate max-w-160"
                              style={{ color: colors.textSecondary }}
                            >
                              {c.email}
                            </div>
                          )}
                          {isDeleted && c.deleted_at && (
                            <div
                              className="text-xs flex items-center gap-1 mt-0.5"
                              style={{ color: colors.textSecondary }}
                            >
                              <span>🗑️</span>
                              {new Date(c.deleted_at).toLocaleDateString(
                                "pt-PT"
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-5">
                      <span
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor:
                            c.tipo === "empresa"
                              ? `${colors.secondary}20`
                              : `${colors.primary}18`,
                          color: colors.textSecondary,
                        }}
                      >
                        {getTipoClienteLabel(c.tipo)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-5">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor:
                            c.status === "ativo"
                              ? `${colors.success}18`
                              : `${colors.textSecondary}18`,
                          color:
                            c.status === "ativo"
                              ? colors.success
                              : colors.textSecondary,
                        }}
                      >
                        {c.status === "ativo" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {statusBadge.texto}
                      </span>
                    </td>

                    {/* Contacto */}
                    <td className="py-3 px-5">
                      {c.telefone ? (
                        <div
                          className="flex items-center gap-1.5 text-sm"
                          style={{ color: colors.textSecondary }}
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          {c.telefone}
                        </div>
                      ) : (
                        <span style={{ color: colors.textSecondary }}>—</span>
                      )}
                    </td>

                    {/* NIF/BI com badge do tipo */}
                    <td className="py-3 px-5">
                      {c.nif ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-sm"
                            style={{ color: colors.textSecondary }}
                          >
                            {nifFormatado}
                          </span>
                          {tipoDoc !== "DESCONHECIDO" && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor:
                                  tipoDoc === "NIF"
                                    ? `${colors.primary}20`
                                    : `${colors.secondary}20`,
                                color:
                                  tipoDoc === "NIF"
                                    ? colors.primary
                                    : colors.secondary,
                              }}
                            >
                              {tipoDoc}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: colors.textSecondary }}>—</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-center gap-1">
                        {mostrarLixeira ? (
                          // Ações da lixeira
                          <>
                            {onRestaurar && (
                              <button
                                onClick={() => handleRestaurarClick(c)}
                                className="p-2 transition-colors hover:opacity-70"
                                style={{ color: colors.success }}
                                title="Restaurar"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {onExcluirPermanente && (
                              <button
                                onClick={() => handleExcluirClick(c)}
                                className="p-2 transition-colors hover:opacity-70"
                                style={{ color: colors.danger }}
                                title="Excluir permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          // Ações normais
                          <>
                            <button
                              onClick={() => onVerDetalhes(c)}
                              className="p-2 transition-colors hover:opacity-70"
                              style={{ color: colors.text }}
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEditar(c)}
                              className="p-2 transition-colors hover:opacity-70"
                              style={{ color: colors.secondary }}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusClick(c)}
                              className="p-2 transition-colors hover:opacity-70"
                              style={{
                                color:
                                  c.status === "ativo"
                                    ? colors.warning
                                    : colors.success,
                              }}
                              title={c.status === "ativo" ? "Inativar" : "Ativar"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            {onArquivar && (
                              <button
                                onClick={() => handleArquivarClick(c)}
                                className="p-2 transition-colors hover:opacity-70"
                                style={{ color: colors.textSecondary }}
                                title="Arquivar"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal de Confirmação ── */}
      {modalConfig && modalConfirm.isOpen && (
        <ConfirmModal
          isOpen={modalConfirm.isOpen}
          onClose={closeModal}
          onConfirm={handleConfirm}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          loading={confirmLoading}
          colors={colors}
          type={modalConfig.type}
        />
      )}
    </>
  );
}