import React from "react";
import { ThemeColors } from "./ClientesComuns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-2xl p-0"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <DialogHeader
          className="p-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <DialogTitle className="text-base" style={{ color: colors.secondary }}>
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-68px)]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}