import React from "react";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { formatarKwanza } from "@/services/relatorios";

export function KpiCell({ label, value, sub, color, colors, border, last, alerta }: {
  label: string; value: string; sub?: string;
  color: string; colors: any; border: string; last?: boolean; alerta?: boolean;
}) {
  return (
    <div
      className="px-4 py-3"
      style={{
        borderRight: last ? "none" : border,
        borderLeft: `3px solid ${alerta ? "#dc2626" : color}`,
        backgroundColor: colors.card,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: colors.textSecondary }}>
        {label}
      </p>
      <p className="text-sm font-bold leading-tight" style={{ color: alerta ? "#dc2626" : colors.text }}>
        {value}
      </p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>{sub}</p>}
    </div>
  );
}

export function SecaoGrafico({ titulo, children, colors }: { titulo: string; children: React.ReactNode; colors: any }) {
  return (
    <div className="border" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
      <div
        className="px-4 py-2 border-b flex items-center gap-2"
        style={{ borderColor: colors.border, backgroundColor: colors.hover }}
      >
        <span className="w-1.5 h-4 inline-block" style={{ backgroundColor: colors.primary }} />
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>
          {titulo}
        </p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function TabelaDados({ headers, rows, aligns, colors }: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  aligns: ("left" | "right" | "center")[];
  colors: any;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ backgroundColor: colors.hover }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`py-2 px-3 text-${aligns[i]} font-semibold uppercase tracking-widest border-b`}
                style={{ color: colors.textSecondary, fontSize: 10, borderColor: colors.border }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b"
              style={{ borderColor: colors.border, backgroundColor: ri % 2 !== 0 ? colors.hover : "transparent" }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2 px-3 text-${aligns[ci]} truncate max-w-[200px]`}
                  style={{ color: colors.text }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EstadoBadge({ estado, label, colors }: { estado?: string; label?: string; colors: any }) {
  const text = label ?? estado ?? "-";
  const map: Record<string, { bg: string; color: string }> = {
    paga:       { bg: "#dcfce7", color: "#15803d" },
    pendente:   { bg: "#fff7ed", color: "#c2410c" },
    atrasado:   { bg: "#fee2e2", color: "#b91c1c" },
    emitido:    { bg: "#fff7ed", color: "#c2410c" },
    convertido: { bg: "#dcfce7", color: "#15803d" },
    em_dia:     { bg: "#dcfce7", color: "#15803d" },
  };
  const s = map[estado ?? ""] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.color, borderRadius: 2 }}
    >
      {text}
    </span>
  );
}

export function TipoBadge({ tipo }: { tipo: "entrada" | "saida" }) {
  const isEntrada = tipo === "entrada";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        backgroundColor: isEntrada ? "#dcfce7" : "#fee2e2",
        color: isEntrada ? "#15803d" : "#b91c1c",
        borderRadius: 2,
      }}
    >
      {isEntrada
        ? <ArrowUpCircle size={10} />
        : <ArrowDownCircle size={10} />}
      {isEntrada ? "Entrada" : "Saída"}
    </span>
  );
}

export function MovimentoBadge({ tipoMovimento, label, cor }: { 
  tipoMovimento?: string; 
  label?: string; 
  cor?: { bg: string; color: string };
}) {
  const defaultCor = { bg: "#f3f4f6", color: "#6b7280" };
  const s = cor ?? defaultCor;
  const text = label ?? tipoMovimento ?? "-";
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.color, borderRadius: 2 }}
    >
      {text}
    </span>
  );
}

export function CarregandoLinha({ colors }: { colors: any }) {
  return (
    <div className="flex items-center gap-2 py-6" style={{ color: colors.textSecondary }}>
      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: colors.primary, borderTopColor: "transparent" }} />
      <span className="text-xs">A carregar dados…</span>
    </div>
  );
}

export function Vazio({ colors }: { colors: any }) {
  return (
    <div className="py-12 text-center text-xs" style={{ color: colors.textSecondary }}>
      Nenhum dado disponível
    </div>
  );
}

export function SemDados({ colors, message = "Sem dados disponíveis" }: { colors: any; message?: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-xs" style={{ color: colors.textSecondary }}>
      {message}
    </div>
  );
}

export const tooltipStyle = (colors: any) => ({
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  fontSize: 11,
});