import type { ReactNode } from "react";
import type { ThemeColors } from "@/context/ThemeContext";

interface LinhaCampoFormularioProps {
  label: string;
  colors: ThemeColors;
  children: ReactNode;
  larguraLabel?: string;
  htmlFor?: string;
}

export function LinhaCampoFormulario({
  label,
  colors,
  children,
  larguraLabel = "sm:w-40",
  htmlFor,
}: LinhaCampoFormularioProps) {
  const labelClassName = `flex w-full shrink-0 items-center px-3 py-2.5 text-sm font-semibold ${larguraLabel}`;
  const labelStyle = { backgroundColor: colors.hover, color: colors.blue ?? colors.primary };

  return (
    <div className="flex min-h-[44px] flex-col sm:flex-row">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClassName} style={labelStyle}>{label}</label>
      ) : (
        <div className={labelClassName} style={labelStyle}>{label}</div>
      )}
      <div className="min-w-0 flex-1 px-3 py-2.5">{children}</div>
    </div>
  );
}
