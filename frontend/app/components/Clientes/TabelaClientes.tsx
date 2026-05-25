import React from "react";
import {
  Building2,
  User,
  Phone,
  Eye,
  Edit2,
  Power,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import type { Cliente } from "@/services/clientes";
import {
  formatarNIF,
  getTipoClienteLabel,
  getStatusClienteBadge,
} from "@/services/clientes";
import { ThemeColors } from "./ClientesComuns";

interface TabelaClientesProps {
  clientes: Cliente[];
  busca: string;
  colors: ThemeColors;
  onVerDetalhes: (cliente: Cliente) => void;
  onEditar: (cliente: Cliente) => void;
  onStatus: (cliente: Cliente) => void;
  onLimparBusca: () => void;
}

export function TabelaClientes({
  clientes,
  busca,
  colors,
  onVerDetalhes,
  onEditar,
  onStatus,
  onLimparBusca,
}: TabelaClientesProps) {
  if (clientes.length === 0 && busca) {
    return (
      <div
        className="border overflow-hidden shadow-sm text-center py-12"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <Search
          className="w-12 h-12 mx-auto mb-3"
          style={{ color: colors.border }}
        />
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          Nenhum cliente encontrado para busca.
        </p>
        <button
          onClick={onLimparBusca}
          className="mt-2 text-sm underline"
          style={{ color: colors.primary }}
        >
          Limpar pesquisa
        </button>
      </div>
    );
  }

  return (
    <div
      className="border overflow-hidden shadow-sm"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: colors.primary }}>
              {["Cliente", "Tipo", "Status", "Contacto", "NIF", "Ações"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`py-3 px-5 font-semibold text-white text-xs uppercase tracking-wider ${
                      i === 5 ? "text-center" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: colors.border }}>
            {clientes.map((c) => {
              const statusBadge = getStatusClienteBadge(c.status);
              return (
                <tr
                  key={c.id}
                  className="transition-colors"
                  style={{
                    backgroundColor:
                      c.status === "inativo"
                        ? `${colors.hover}80`
                        : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.hover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      c.status === "inativo"
                        ? `${colors.hover}80`
                        : "transparent")
                  }
                >
                  {/* Cliente */}
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor:
                            c.tipo === "empresa"
                              ? `${colors.secondary}20`
                              : colors.hover,
                        }}
                      >
                        {c.tipo === "empresa" ? (
                          <Building2
                            className="w-4 h-4"
                            style={{ color: colors.secondary }}
                          />
                        ) : (
                          <User
                            className="w-4 h-4"
                            style={{ color: colors.textSecondary }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-medium text-sm truncate"
                          style={{ color: colors.text }}
                        >
                          {c.nome}
                        </div>
                        {c.email && (
                          <div
                            className="text-xs truncate max-w-160"
                            style={{ color: colors.textSecondary }}
                          >
                            {c.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="py-3 px-5">
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${colors.primary}18`,
                        color: colors.textSecondary,
                      }}
                    >
                      {getTipoClienteLabel(c.tipo)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-5">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor:
                          c.status === "ativo"
                            ? `${colors.success}18`
                            : `${colors.textSecondary}18`,
                        color:
                          c.status === "ativo"
                            ? colors.success
                            : colors.textSecondary,
                      }}
                    >
                      {c.status === "ativo" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {statusBadge.texto}
                    </span>
                  </td>

                  {/* Contacto */}
                  <td className="py-3 px-5">
                    {c.telefone ? (
                      <div
                        className="flex items-center gap-1.5 text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        {c.telefone}
                      </div>
                    ) : (
                      <span style={{ color: colors.textSecondary }}>—</span>
                    )}
                  </td>

                  {/* NIF */}
                  <td
                    className="py-3 px-5 font-mono text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    {formatarNIF(c.nif) || "—"}
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-5">
                    <div className="flex items-center justify-center gap-1">
                      {[
                        {
                          Icon: Eye,
                          title: "Ver detalhes",
                          fn: () => onVerDetalhes(c),
                          color: colors.text,
                        },
                        {
                          Icon: Edit2,
                          title: "Editar",
                          fn: () => onEditar(c),
                          color: colors.secondary,
                        },
                        {
                          Icon: Power,
                          title: c.status === "ativo" ? "Inativar" : "Ativar",
                          fn: () => onStatus(c),
                          color: colors.secondary,
                        },
                      ].map(({ Icon, title, fn, color }) => (
                        <button
                          key={title}
                          onClick={fn}
                          className="p-2 transition-colors hover:opacity-70"
                          style={{ color }}
                          title={title}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}