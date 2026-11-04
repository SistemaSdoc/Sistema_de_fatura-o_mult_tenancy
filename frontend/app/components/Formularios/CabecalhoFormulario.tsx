import type { ReactNode } from "react";
import type { ThemeColors } from "@/context/ThemeContext";

interface CabecalhoFormularioProps {
  titulo: ReactNode;
  icone: ReactNode;
  colors: ThemeColors;
  acao?: ReactNode;
}

export function CabecalhoFormulario({ titulo, icone, colors, acao }: CabecalhoFormularioProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-1.5"
      style={{ backgroundColor: colors.primary }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icone}
        <span className="truncate text-xs font-medium uppercase tracking-wider text-white">{titulo}</span>
      </div>
      {acao}
    </div>
  );
}
