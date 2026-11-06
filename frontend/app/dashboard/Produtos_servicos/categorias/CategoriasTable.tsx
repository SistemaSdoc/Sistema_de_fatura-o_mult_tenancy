"use client";

import type { CSSProperties } from "react";
import {
  CheckCircle,
  History,
  MoreVertical,
  Package,
  PencilLine,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ThemeColors } from "@/context/ThemeContext";
import {
  type Categoria,
  getCodigoIsencaoLabel,
  getStatusLabel,
  getTaxaIVALabel,
  type TaxaIVA,
} from "@/services/categorias";

interface CategoriasTableProps {
  categorias: Categoria[];
  abaAtiva: "ativos" | "lixeira";
  colors: ThemeColors;
  getTaxaIVABadgeStyle: (taxa: TaxaIVA, sujeitoIva: boolean) => CSSProperties;
  onEditar: (categoria: Categoria) => void;
  onDelete: (categoria: Categoria) => void;
  onRestore: (categoria: Categoria) => void;
  onForceDelete: (categoria: Categoria) => void;
}

export function CategoriasTable({
  categorias,
  abaAtiva,
  colors,
  getTaxaIVABadgeStyle,
  onEditar,
  onDelete,
  onRestore,
  onForceDelete,
}: CategoriasTableProps) {
  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: colors.primary }}>
            {["Categoria", "Status", "IVA", "Descrição", "Ações"].map((heading, index) => (
              <th
                key={heading}
                className={`py-3 px-5 font-semibold text-white text-xs uppercase tracking-wider ${
                  index === 4 ? "text-center" : "text-left"
                }`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: colors.border }}>
          {categorias.map((categoria) => (
            <tr
              key={categoria.id}
              className="transition-colors"
              style={{
                backgroundColor: categoria.status === "inativo" ? `${colors.hover}80` : "transparent",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = colors.hover;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                  categoria.status === "inativo" ? `${colors.hover}80` : "transparent";
              }}
            >
              <td className="py-3 px-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.primary}10` }}
                  >
                    <Package className="w-4 h-4" style={{ color: colors.secondary }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: colors.text }}>
                      {categoria.nome}
                    </div>
                    {categoria.deleted_at && (
                      <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: colors.danger }}>
                        <History className="w-3 h-3" />
                        {new Date(categoria.deleted_at).toLocaleDateString("pt-PT")}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-5">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor:
                      categoria.status === "ativo" ? `${colors.secondary}18` : `${colors.textSecondary}18`,
                    color: categoria.status === "ativo" ? colors.secondary : colors.textSecondary,
                  }}
                >
                  {categoria.status === "ativo" ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {getStatusLabel(categoria.status)}
                </span>
              </td>
              <td className="py-3 px-5">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                  style={getTaxaIVABadgeStyle(categoria.taxa_iva as TaxaIVA, categoria.sujeito_iva)}
                  title={
                    categoria.codigo_isencao
                      ? getCodigoIsencaoLabel(categoria.codigo_isencao) || ""
                      : ""
                  }
                >
                  {getTaxaIVALabel(categoria.taxa_iva, categoria.sujeito_iva)}
                </span>
              </td>
              <td className="py-3 px-5">
                <span className="text-sm line-clamp-1 max-w-[200px]" style={{ color: colors.textSecondary }}>
                  {categoria.descricao || <span className="italic">—</span>}
                </span>
              </td>
              <td className="py-3 px-5">
                <div className="flex items-center justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-2 transition-colors hover:opacity-70"
                        style={{ color: colors.textSecondary }}
                        title="Ações"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-36"
                      style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    >
                      {abaAtiva === "ativos" ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => onEditar(categoria)}
                            className="gap-2 cursor-pointer text-xs py-2"
                            style={{ color: colors.blue }}
                          >
                            <PencilLine className="h-3.5 w-3.5" style={{ color: colors.blue }} />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(categoria)}
                            className="gap-2 cursor-pointer text-xs py-2"
                            style={{ color: colors.secondary }}
                          >
                            <Trash2 className="h-3.5 w-3.5" style={{ color: colors.secondary }} />
                            Mover para lixeira
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => onRestore(categoria)}
                            className="gap-2 cursor-pointer text-xs py-2"
                            style={{ color: colors.secondary }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onForceDelete(categoria)}
                            className="gap-2 cursor-pointer text-xs py-2"
                            style={{ color: colors.secondary }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir permanentemente
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
