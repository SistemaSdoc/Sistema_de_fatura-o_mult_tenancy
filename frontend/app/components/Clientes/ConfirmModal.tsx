import React from "react";
import { AlertCircle } from "lucide-react";
import { ThemeColors } from "./ClientesComuns";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning",
  colors,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger" | "info";
  colors: ThemeColors;
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200">
      <div
        className="shadow-2xl max-w-md w-full p-5 animate-in zoom-in-95 fade-in-0 duration-300"
        style={{ backgroundColor: colors.card }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${iconBg}20` }}>
              <AlertCircle className="w-5 h-5" style={{ color: iconClr }} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{title}</h3>
          </div>
        </div>
        {/* Conteúdo */}
        <div className="px-6 py-4">
          <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{message}</p>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-medium text-sm"
            style={{ color: colors.text, backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm hover:shadow-lg"
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