"use client";

import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  colors: {
    border: string;
    primary: string;
    text: string;
    textSecondary: string;
    card: string;
    hover?: string;
  };
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  colors,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const buttonStyle: CSSProperties & {
    "--pagination-hover": string;
    "--pagination-text": string;
  } = {
    borderColor: colors.border,
    color: colors.textSecondary,
    backgroundColor: "transparent",
    "--pagination-hover": colors.hover ?? colors.card,
    "--pagination-text": colors.text,
  };

  return (
    <nav
      aria-label="Paginação da lista"
      className="flex flex-col gap-2 border-t px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: colors.border, color: colors.textSecondary }}
    >
      <span aria-live="polite" className="text-center sm:text-left">
        A mostrar{" "}
        <span className="font-medium" style={{ color: colors.text }}>
          {firstItem}–{lastItem}
        </span>{" "}
        de {totalItems}
      </span>
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="flex items-center gap-1 border px-2.5 py-1.5 transition-colors hover:enabled:border-transparent hover:enabled:bg-[var(--pagination-hover)] hover:enabled:text-[var(--pagination-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ ...buttonStyle, outlineColor: colors.primary }}
        >
          <ChevronLeft size={14} strokeWidth={1.75} />
          Anterior
        </button>
        <span className="min-w-20 px-2 text-center" style={{ color: colors.textSecondary }}>
          Página <span className="font-medium" style={{ color: colors.text }}>{page}</span> de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
          className="flex items-center gap-1 border px-2.5 py-1.5 transition-colors hover:enabled:border-transparent hover:enabled:bg-[var(--pagination-hover)] hover:enabled:text-[var(--pagination-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ ...buttonStyle, outlineColor: colors.primary }}
        >
          Próxima
          <ChevronRight size={14} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  );
}
