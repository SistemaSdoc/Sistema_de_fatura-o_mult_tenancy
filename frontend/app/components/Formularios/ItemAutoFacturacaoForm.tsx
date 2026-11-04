import { Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { ThemeColors } from "@/context/ThemeContext";

export interface ItemAutoFacturacao {
  descricao: string;
  quantidade: string;
  preco: string;
  taxaIva: "0" | "5" | "14";
}

interface ItemAutoFacturacaoFormProps {
  item: ItemAutoFacturacao;
  colors: ThemeColors;
  inputStyle: CSSProperties;
  podeRemover: boolean;
  onChange: (patch: Partial<ItemAutoFacturacao>) => void;
  onRemover: () => void;
}

export function ItemAutoFacturacaoForm({
  item,
  colors,
  inputStyle,
  podeRemover,
  onChange,
  onRemover,
}: ItemAutoFacturacaoFormProps) {
  return (
    <div
      className="grid gap-3 border p-3 sm:grid-cols-[minmax(0,1fr)_90px_140px_110px_40px] sm:items-end sm:p-4"
      style={{ borderColor: colors.border, backgroundColor: colors.background }}
    >
      <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
        Descrição
        <input
          required
          maxLength={255}
          aria-label="Descrição do item"
          placeholder="Ex.: Matéria-prima"
          value={item.descricao}
          onChange={(event) => onChange({ descricao: event.target.value })}
          className="w-full border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
        Quantidade
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          aria-label="Quantidade"
          placeholder="1"
          value={item.quantidade}
          onChange={(event) => onChange({ quantidade: event.target.value })}
          className="w-full border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
        Preço unitário
        <input
          required
          type="number"
          min="0"
          step="0.01"
          aria-label="Preço unitário"
          placeholder="0,00"
          value={item.preco}
          onChange={(event) => onChange({ preco: event.target.value })}
          className="w-full border px-3 py-2 text-sm"
          style={inputStyle}
        />
      </label>
      <label className="space-y-1 text-xs font-medium" style={{ color: colors.textSecondary }}>
        Taxa de IVA
        <select
          aria-label="Taxa de IVA"
          value={item.taxaIva}
          onChange={(event) => onChange({ taxaIva: event.target.value as ItemAutoFacturacao["taxaIva"] })}
          className="w-full border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="0">IVA 0%</option>
          <option value="5">IVA 5%</option>
          <option value="14">IVA 14%</option>
        </select>
      </label>
      <button
        type="button"
        aria-label="Remover item"
        disabled={!podeRemover}
        onClick={onRemover}
        className="flex h-9 items-center justify-center transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
        style={{ color: colors.danger }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
