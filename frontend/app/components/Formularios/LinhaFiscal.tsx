import type { ThemeColors } from "@/context/ThemeContext";

interface LinhaFiscalProps {
  label: string;
  valor: string;
  colors: ThemeColors;
  cor?: string;
  negrito?: boolean;
}

export function LinhaFiscal({ label, valor, colors, cor, negrito }: LinhaFiscalProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={`text-sm ${negrito ? "font-semibold" : ""}`} style={{ color: negrito ? colors.text : colors.textSecondary }}>
        {label}
      </span>
      <span
        className={`text-sm tabular-nums ${negrito ? "font-bold" : "font-medium"}`}
        style={{ color: cor || (negrito ? colors.text : colors.textSecondary) }}
      >
        {valor}
      </span>
    </div>
  );
}
