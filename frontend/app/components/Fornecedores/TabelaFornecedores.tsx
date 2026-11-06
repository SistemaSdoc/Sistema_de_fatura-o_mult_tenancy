"use client";

import type { ReactNode } from "react";
import {
  Building2,
  CheckCircle,
  Globe,
  History,
  Phone,
  XCircle,
} from "lucide-react";
import type { Fornecedor } from "@/services/fornecedores";
import { formatarNIF, getStatusLabel, getTipoLabel } from "@/services/fornecedores";
import type { ThemeColors } from "@/context/ThemeContext";

interface TabelaFornecedoresProps {
  fornecedores: Fornecedor[];
  colors: ThemeColors;
  validarNIF: (nif: string) => { valido: boolean; tipo?: string };
  renderAcoes: (fornecedor: Fornecedor) => ReactNode;
}

export function TabelaFornecedores({
  fornecedores,
  colors,
  validarNIF,
  renderAcoes,
}: TabelaFornecedoresProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr style={{ backgroundColor: colors.primary }}>
          {["Fornecedor", "Tipo", "Status", "Contacto", "NIF/BI", ""].map((heading, index) => (
            <th
              key={heading}
              className={`py-3 px-5 font-semibold text-white text-xs uppercase tracking-wider ${
                index === 5 ? "text-center w-12" : "text-left"
              }`}
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y" style={{ borderColor: colors.border }}>
        {fornecedores.map((fornecedor) => {
          const validacao = fornecedor.nif ? validarNIF(fornecedor.nif) : null;
          const inactiveBackground = `${colors.hover}80`;

          return (
            <tr
              key={fornecedor.id}
              className="transition-colors"
              style={{
                backgroundColor: fornecedor.status === "inativo" ? inactiveBackground : "transparent",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = colors.hover;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                  fornecedor.status === "inativo" ? inactiveBackground : "transparent";
              }}
            >
              <td className="py-3 px-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        fornecedor.tipo === "internacional" ? `${colors.secondary}20` : colors.hover,
                    }}
                  >
                    {fornecedor.tipo === "internacional" ? (
                      <Globe className="w-4 h-4" style={{ color: colors.secondary }} />
                    ) : (
                      <Building2 className="w-4 h-4" style={{ color: colors.textSecondary }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: colors.text }}>
                      {fornecedor.nome}
                    </div>
                    {fornecedor.email && (
                      <div className="text-xs truncate max-w-[160px]" style={{ color: colors.textSecondary }}>
                        {fornecedor.email}
                      </div>
                    )}
                    {fornecedor.deleted_at && (
                      <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: colors.danger }}>
                        <History className="w-3 h-3" />
                        {new Date(fornecedor.deleted_at).toLocaleDateString("pt-PT")}
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
                      fornecedor.tipo === "internacional" ? colors.secondary : colors.primary,
                    color: colors.text,
                  }}
                >
                  {fornecedor.tipo === "internacional" ? (
                    <Globe className="w-3 h-3" />
                  ) : (
                    <Building2 className="w-3 h-3" />
                  )}
                  {getTipoLabel(fornecedor.tipo)}
                </span>
              </td>
              <td className="py-3 px-5">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor:
                      fornecedor.status === "ativo"
                        ? `${colors.secondary}18`
                        : `${colors.textSecondary}18`,
                    color:
                      fornecedor.status === "ativo"
                        ? colors.secondary
                        : colors.textSecondary,
                  }}
                >
                  {fornecedor.status === "ativo" ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {getStatusLabel(fornecedor.status)}
                </span>
              </td>
              <td className="py-3 px-5">
                {fornecedor.telefone ? (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: colors.textSecondary }}>
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {fornecedor.telefone}
                  </div>
                ) : (
                  <span style={{ color: colors.textSecondary }}>—</span>
                )}
              </td>
              <td className="py-3 px-5">
                {fornecedor.nif ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>
                      {formatarNIF(fornecedor.nif)}
                    </span>
                    {validacao?.valido && validacao.tipo && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor:
                            validacao.tipo === "NIF" ? colors.primary : colors.secondary,
                          color: colors.textSecondary,
                        }}
                      >
                        {validacao.tipo}
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: colors.textSecondary }}>—</span>
                )}
              </td>
              <td className="py-3 px-2">{renderAcoes(fornecedor)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
