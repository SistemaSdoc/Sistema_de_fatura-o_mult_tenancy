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
          className="text-sm mb-5 ml-52px"
          style={{ color: colors.textSecondary }}
        >
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm transition-colors "
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