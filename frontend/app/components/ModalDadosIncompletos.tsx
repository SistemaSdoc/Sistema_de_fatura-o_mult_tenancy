import React from "react";
import { AlertTriangle, Settings } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ModalDadosIncompletosProps {
  isOpen: boolean;
  onClose: () => void;
  camposFaltantes: string[];
  colors?: any;
}

export function ModalDadosIncompletos({ isOpen, onClose, camposFaltantes, colors: propColors }: ModalDadosIncompletosProps) {
  const contextColors = useThemeColors();
  const colors = propColors || contextColors;
  const router = useRouter();

  const handleIrConfiguracoes = () => {
    onClose();
    router.push("/dashboard/configuracoes");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}>
      <DialogContent className="sm:max-w-[400px] p-0" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
          <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: colors.warning }}>
            <AlertTriangle className="w-4 h-4" />
            Dados Incompletos
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
            Para gerar documentos fiscais, é necessário preencher os seguintes campos:
          </p>
          <ul className="list-disc list-inside mb-4 text-xs space-y-1" style={{ color: colors.textSecondary }}>
            {camposFaltantes.map((campo) => (
              <li key={campo}>{campo}</li>
            ))}
          </ul>
          <p className="text-xs mb-4" style={{ color: colors.textSecondary }}>
            Clique no botão abaixo para preencher as informações na área de configurações.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium"
              style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}>
              Fechar
            </button>
            <button
              onClick={handleIrConfiguracoes}
              className="flex-1 px-4 py-2 text-white text-sm font-medium flex items-center justify-center gap-2"
              style={{ backgroundColor: colors.warning }}>
              <Settings className="w-4 h-4" />
              Configurações
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
