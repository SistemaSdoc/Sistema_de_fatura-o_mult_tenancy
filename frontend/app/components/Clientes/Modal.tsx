import React from "react";
import { X } from "lucide-react";
import { ThemeColors } from "./ClientesComuns";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  colors,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200">
      <div
        className="shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in-0 duration-300"
        style={{ backgroundColor: colors.card }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <h3
            className="text-base font-semibold"
            style={{ color: colors.primary }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 transition-colors hover:opacity-70"
            style={{ color: colors.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-68px)]">
          {children}
        </div>
      </div>
    </div>
  );
}