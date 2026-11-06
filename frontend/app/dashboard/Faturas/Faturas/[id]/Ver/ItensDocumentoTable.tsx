"use client";

import type { ItemDocumento } from "@/services/DocumentoFiscal";
import type { LIGHT_COLORS } from "@/context/ThemeContext";

interface ItensDocumentoTableProps {
  itens: ItemDocumento[];
  colors: typeof LIGHT_COLORS;
  isNC?: boolean;
  isND?: boolean;
  formatCurrency: (value?: number | null) => string;
  isService: (item: ItemDocumento) => boolean;
}

export function ItensDocumentoTable({
  itens,
  colors,
  isNC,
  isND,
  formatCurrency,
  isService,
}: ItensDocumentoTableProps) {
  if (itens.length === 0) {
    return (
      <p className="px-4 py-4 text-sm italic text-center" style={{ color: colors.textSecondary }}>
        Sem itens
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ backgroundColor: colors.hover, borderColor: colors.border }}>
            <th className="px-3 py-2 text-left font-semibold" style={{ color: colors.textSecondary }}>
              Descrição
            </th>
            <th className="px-3 py-2 text-center font-semibold w-16" style={{ color: colors.textSecondary }}>
              Qtd
            </th>
            <th className="px-3 py-2 text-right font-semibold w-28" style={{ color: colors.textSecondary }}>
              Preço
            </th>
            <th className="px-3 py-2 text-right font-semibold w-16" style={{ color: colors.textSecondary }}>
              IVA
            </th>
            <th className="px-3 py-2 text-right font-semibold w-20" style={{ color: colors.textSecondary }}>
              Retenção
            </th>
            <th className="px-3 py-2 text-right font-semibold w-28" style={{ color: colors.textSecondary }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: colors.border }}>
          {itens.map((item, index) => (
            <tr
              key={item.id ?? index}
              className="transition-colors"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = colors.hover;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <td className="px-3 py-2">
                <div className="font-medium" style={{ color: colors.text }}>
                  {isNC && <span style={{ color: colors.secondary }}>− </span>}
                  {isND && <span style={{ color: colors.primary }}>+ </span>}
                  {item.descricao}
                </div>
                {item.codigo_produto && (
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    Ref: {item.codigo_produto}
                  </div>
                )}
                {isService(item) && (
                  <span className="text-xs" style={{ color: colors.secondary }}>
                    Serviço
                  </span>
                )}
                {isND && item.produto_id && !isService(item) && (
                  <span className="text-xs" style={{ color: colors.danger }}>
                    Produto (não permitido)
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-center tabular-nums" style={{ color: colors.text }}>
                {Number(item.quantidade ?? 0).toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums" style={{ color: colors.text }}>
                {formatCurrency(item.preco_unitario)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums" style={{ color: colors.textSecondary }}>
                {Number(item.taxa_iva ?? 0).toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right tabular-nums" style={{ color: colors.textSecondary }}>
                {Number(item.taxa_retencao ?? 0) > 0
                  ? `${Number(item.taxa_retencao).toFixed(1)}%`
                  : "—"}
              </td>
              <td
                className="px-3 py-2 text-right font-bold tabular-nums"
                style={{ color: isNC ? colors.danger : isND ? colors.success : colors.text }}
              >
                {isNC ? "−" : isND ? "+" : ""}
                {formatCurrency(item.total_linha)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
