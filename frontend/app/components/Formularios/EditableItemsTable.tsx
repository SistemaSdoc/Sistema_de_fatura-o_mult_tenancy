"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import type { ThemeColors } from "@/context/ThemeContext";
import { formatarPreco, isServico, type Produto } from "@/services/vendas";

export interface EditableTableItem {
  id: string;
  produtoId: string;
  descricao: string;
  quantidade: number;
  desconto?: number;
  precoUnitario: number;
  baseTributavel: number;
  valorIva: number;
  valorRetencao: number;
  subtotal: number;
}

interface EditableItemsTableProps {
  items: EditableTableItem[];
  products: Produto[];
  colors: ThemeColors;
  showDiscount?: boolean;
  notaDebito?: boolean;
  descriptionLabel?: string;
  descriptionClassName?: string;
  priceLabel?: string;
  onQuantityChange: (id: string, quantity: number) => void;
  onDiscountChange?: (id: string, discount: number) => void;
  onDiscountBlur?: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}

export function EditableItemsTable({
  items,
  products,
  colors,
  showDiscount = false,
  notaDebito = false,
  descriptionLabel = "Produto/Serviço",
  descriptionClassName = "max-w-[100px] sm:max-w-[160px]",
  priceLabel = "Preço unit.",
  onQuantityChange,
  onDiscountChange,
  onDiscountBlur,
  onRemove,
}: EditableItemsTableProps) {
  return (
    <table className="w-full text-sm">
      <thead style={{ backgroundColor: colors.hover }}>
        <tr className="border-b" style={{ borderColor: colors.border }}>
          <th className="py-2.5 px-3 text-left font-semibold text-xs" style={{ color: colors.textSecondary }}>
            {descriptionLabel}
          </th>
          <th className="py-2.5 px-3 text-center font-semibold text-xs" style={{ color: colors.textSecondary }}>
            Qtd.
          </th>
          {showDiscount && (
            <th className="py-2.5 px-3 text-center font-semibold text-xs" style={{ color: colors.textSecondary }}>
              Desconto
            </th>
          )}
          <th className="py-2.5 px-3 text-right font-semibold text-xs hidden sm:table-cell" style={{ color: colors.textSecondary }}>
            {priceLabel}
          </th>
          <th className="py-2.5 px-3 text-right font-semibold text-xs hidden md:table-cell" style={{ color: colors.textSecondary }}>
            IVA
          </th>
          <th className="py-2.5 px-3 text-right font-semibold text-xs hidden lg:table-cell" style={{ color: colors.textSecondary }}>
            Ret.
          </th>
          <th className="py-2.5 px-3 text-right font-semibold text-xs" style={{ color: colors.textSecondary }}>
            Subtotal
          </th>
          <th className="py-2.5 px-2 w-8" />
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const product = products.find((candidate) => candidate.id === item.produtoId);
          const maxStock = product && !isServico(product) ? product.estoque_atual : 9999;

          return (
            <tr
              key={item.id}
              className="border-b last:border-0"
              style={{
                borderColor: colors.border,
                backgroundColor: index % 2 !== 0 ? `${colors.hover}60` : "transparent",
              }}
            >
              <td className="px-3 py-2.5">
                <span className={`font-medium truncate ${descriptionClassName} block`} style={{ color: colors.blue }}>
                  {item.descricao}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => onQuantityChange(item.id, item.quantidade - 1)}
                    className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                    style={{ backgroundColor: colors.hover }}
                    disabled={item.quantidade <= 1}
                  >
                    <Minus size={11} style={{ color: colors.blue }} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxStock}
                    value={item.quantidade}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(value) || value < 1 || !product) return;

                      const maxQuantity = isServico(product) ? 9999 : product.estoque_atual;
                      onQuantityChange(item.id, Math.min(value, maxQuantity));
                    }}
                    onBlur={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(value) || value < 1) onQuantityChange(item.id, 1);
                    }}
                    className="w-12 text-center text-sm font-medium outline-none border rounded"
                    style={{ backgroundColor: colors.card, color: colors.blue, borderColor: colors.border }}
                  />
                  <button
                    onClick={() => onQuantityChange(item.id, item.quantidade + 1)}
                    className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                    style={{ backgroundColor: colors.hover }}
                    disabled={item.quantidade >= maxStock}
                  >
                    <Plus size={11} style={{ color: colors.blue }} />
                  </button>
                </div>
              </td>
              {showDiscount && (
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={item.desconto ?? 0}
                      onChange={(event) => {
                        const value = Number.parseFloat(event.target.value);
                        if (!Number.isNaN(value) && value >= 0) onDiscountChange?.(item.id, value);
                      }}
                      onBlur={(event) => onDiscountBlur?.(item.id, event.target.value)}
                      className="w-20 text-center text-sm font-medium outline-none border rounded px-2"
                      style={{ backgroundColor: colors.card, color: colors.blue, borderColor: colors.border }}
                      placeholder="0"
                    />
                  </div>
                </td>
              )}
              <td className="px-3 py-2.5 text-right hidden sm:table-cell" style={{ color: colors.textSecondary }}>
                {formatarPreco(item.precoUnitario)}
              </td>
              <td className="px-3 py-2.5 text-right hidden md:table-cell" style={{ color: colors.blue }}>
                {formatarPreco(notaDebito ? 0 : item.valorIva)}
              </td>
              <td
                className="px-3 py-2.5 text-right hidden lg:table-cell"
                style={{ color: item.valorRetencao > 0 ? colors.secondary : colors.textSecondary }}
              >
                {item.valorRetencao > 0 ? `−${formatarPreco(item.valorRetencao)}` : "—"}
              </td>
              <td className="px-3 py-2.5 text-right font-bold" style={{ color: colors.secondary }}>
                {formatarPreco(notaDebito ? item.baseTributavel - item.valorRetencao : item.subtotal)}
              </td>
              <td className="px-2 py-2.5 text-center">
                <button
                  onClick={() => onRemove(item.id)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
                  style={{ color: colors.secondary }}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
