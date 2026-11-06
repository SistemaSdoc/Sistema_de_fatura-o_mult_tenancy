"use client";

import { Building2, Crown, Mail, Power, RefreshCw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ThemeColors } from "@/context/ThemeContext";

export interface Empresa {
  id: string;
  nome: string;
  subdomain?: string;
}

export interface LandlordUserItem {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin_empresa";
  ativo: boolean;
  empresa_id: string | null;
  empresa?: Empresa | null;
  created_at: string;
  tipo?: "landlord";
}

export interface TenantUserItem {
  id: number;
  name: string;
  email: string;
  empresa_id: string;
  empresa_nome: string;
  role?: string;
  modo?: "singular" | "colectivo";
  ativo?: boolean;
  created_at?: string;
  tipo: "tenant";
}

export interface SharedUserItem {
  id: number;
  name: string;
  email: string;
  empresa_id: string;
  empresa_nome: string;
  role: string;
  ativo?: boolean;
  created_at?: string;
  tipo: "shared";
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_empresa: "Admin de Empresa",
  admin: "Admin",
  operador: "Operador",
  contablista: "Contabilista",
  contabilista: "Contabilista",
  gestor: "Gestor de Stock",
  user: "Utilizador",
};

// ============================================================
// TABELA LANDLORD (Super Admin + Admin Empresa)
// ============================================================
export function UserTable({
  users,
  colors,
  currentUserId,
  actionLoading,
  onToggleStatus,
}: {
  users: LandlordUserItem[];
  colors: ThemeColors;
  currentUserId?: string;
  actionLoading: string | null;
  onToggleStatus: (u: LandlordUserItem) => void;
}) {
  const roleBadgeStyle = (role: string) => {
    if (role === "super_admin") {
      return {
        backgroundColor: `${colors.secondary}15`,
        color: colors.secondary,
        border: `1px solid ${colors.secondary}30`,
      };
    }
    return {
      backgroundColor: `${colors.warning}15`,
      color: colors.warning,
      border: `1px solid ${colors.warning}30`,
    };
  };

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden lg:block overflow-x-auto border shadow-sm rounded-xl"
        style={{ borderColor: colors.border }}>
        <table className="min-w-full divide-y" style={{ borderColor: colors.border }}>
          <thead style={{ backgroundColor: colors.primary }}>
            <tr>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#fff" }}>
                Utilizador
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#fff" }}>
                Role
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#fff" }}>
                Empresa
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#fff" }}>
                Criado em
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#fff" }}>
                Status
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#fff" }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: colors.border }}>
            {users.map((u) => (
              <tr key={u.id} style={{ backgroundColor: colors.card }}>
                <td className="px-6 py-4">
                  <p className="font-semibold" style={{ color: colors.text }}>
                    {u.name}
                  </p>
                  <div
                    className="flex items-center gap-1 text-xs mt-0.5"
                    style={{ color: colors.textSecondary }}>
                    <Mail size={11} />
                    {u.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge style={roleBadgeStyle(u.role)} className="font-medium">
                    {u.role === "super_admin" ? (
                      <>
                        <Crown size={12} className="mr-1" />
                        Super Admin
                      </>
                    ) : (
                      <>
                        <Shield size={12} className="mr-1" />
                        Admin Empresa
                      </>
                    )}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {u.empresa ? (
                    <Badge
                      style={{
                        backgroundColor: `${colors.primary}15`,
                        color: colors.primary,
                        border: `1px solid ${colors.primary}30`,
                      }}>
                      <Building2 size={12} className="mr-1" />
                      {u.empresa.nome}
                    </Badge>
                  ) : (
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      —
                    </span>
                  )}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm"
                  style={{ color: colors.textSecondary }}>
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    style={{
                      backgroundColor: u.ativo ? `${colors.success}15` : `${colors.danger}15`,
                      color: u.ativo ? colors.success : colors.danger,
                      border: `1px solid ${u.ativo ? colors.success : colors.danger}30`,
                    }}
                    className="font-medium">
                    {u.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    size="sm"
                    onClick={() => onToggleStatus(u)}
                    disabled={actionLoading === u.id || u.id === currentUserId}
                    className="rounded-lg"
                    style={{
                      backgroundColor: u.ativo ? colors.danger : colors.success,
                      color: "#fff",
                    }}
                    title={
                      u.id === currentUserId ? "Não podes alterar o teu próprio status" : ""
                    }>
                    {actionLoading === u.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Power size={14} />
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
        {users.map((u) => (
          <Card
            key={u.id}
            className="rounded-xl shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate" style={{ color: colors.text }}>
                    {u.name}
                  </p>
                  <p
                    className="text-xs truncate flex items-center gap-1"
                    style={{ color: colors.textSecondary }}>
                    <Mail size={11} className="shrink-0" />
                    {u.email}
                  </p>
                </div>
                <Badge
                  style={{
                    backgroundColor: u.ativo ? `${colors.success}15` : `${colors.danger}15`,
                    color: u.ativo ? colors.success : colors.danger,
                    border: `1px solid ${u.ativo ? colors.success : colors.danger}30`,
                  }}
                  className="font-medium shrink-0">
                  {u.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <Badge style={roleBadgeStyle(u.role)} className="font-medium">
                {u.role === "super_admin" ? "Super Admin" : "Admin Empresa"}
              </Badge>

              <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: colors.textSecondary }}>
                <div>
                  <span className="font-medium" style={{ color: colors.text }}>
                    Empresa:
                  </span>{" "}
                  {u.empresa?.nome || "—"}
                </div>
                <div>
                  <span className="font-medium" style={{ color: colors.text }}>
                    Criado:
                  </span>{" "}
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => onToggleStatus(u)}
                disabled={actionLoading === u.id || u.id === currentUserId}
                className="w-full rounded-lg"
                style={{
                  backgroundColor: u.ativo ? colors.danger : colors.success,
                  color: "#fff",
                }}>
                {actionLoading === u.id ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <Power size={14} className="mr-1" />
                    {u.ativo ? "Desativar" : "Ativar"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ============================================================
// TABELA TENANT (Base Dedicada)
// ============================================================
export function TenantTable({ users, colors }: { users: TenantUserItem[]; colors: ThemeColors }) {
  return (
    <div
      className="overflow-x-auto rounded-xl border shadow-sm"
      style={{ borderColor: colors.border }}>
      <table className="min-w-full divide-y" style={{ borderColor: colors.border }}>
        <thead style={{ backgroundColor: colors.primary }}>
          <tr>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Utilizador
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Empresa
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Status
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Criado em
            </th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: colors.border }}>
          {users.map((u) => (
            <tr key={u.id} style={{ backgroundColor: colors.card }}>
              <td className="px-6 py-4">
                <p className="font-semibold" style={{ color: colors.text }}>
                  {u.name}
                </p>
                <div
                  className="flex items-center gap-1 text-xs mt-0.5"
                  style={{ color: colors.textSecondary }}>
                  <Mail size={11} />
                  {u.email}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  style={{
                    backgroundColor: `${colors.primary}15`,
                    color: colors.primary,
                    border: `1px solid ${colors.primary}30`,
                  }}>
                  <Building2 size={12} className="mr-1" />
                  {u.empresa_nome || "N/A"}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  style={{
                    backgroundColor:
                      u.ativo !== false ? `${colors.success}15` : `${colors.danger}15`,
                    color: u.ativo !== false ? colors.success : colors.danger,
                    border: `1px solid ${u.ativo !== false ? colors.success : colors.danger}30`,
                  }}
                  className="font-medium">
                  {u.ativo !== false ? "Ativo" : "Inativo"}
                </Badge>
              </td>
              <td
                className="px-6 py-4 whitespace-nowrap text-sm"
                style={{ color: colors.textSecondary }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// TABELA SHARED (Base Compartilhada)
// ============================================================
export function SharedTable({ users, colors }: { users: SharedUserItem[]; colors: ThemeColors }) {
  return (
    <div
      className="overflow-x-auto rounded-xl border shadow-sm"
      style={{ borderColor: colors.border }}>
      <table className="min-w-full divide-y" style={{ borderColor: colors.border }}>
        <thead style={{ backgroundColor: colors.secondary }}>
          <tr>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Utilizador
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Role
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Empresa
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Status
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#fff" }}>
              Criado em
            </th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: colors.border }}>
          {users.map((u) => (
            <tr key={u.id} style={{ backgroundColor: colors.card }}>
              <td className="px-6 py-4">
                <p className="font-semibold" style={{ color: colors.text }}>
                  {u.name}
                </p>
                <div
                  className="flex items-center gap-1 text-xs mt-0.5"
                  style={{ color: colors.textSecondary }}>
                  <Mail size={11} />
                  {u.email}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  className="font-medium"
                  style={{
                    backgroundColor: `${colors.secondary}15`,
                    color: colors.secondary,
                    border: `1px solid ${colors.secondary}30`,
                  }}>
                  {ROLE_LABELS[u.role] || u.role || "Utilizador"}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  style={{
                    backgroundColor: `${colors.primary}15`,
                    color: colors.primary,
                    border: `1px solid ${colors.primary}30`,
                  }}>
                  <Building2 size={12} className="mr-1" />
                  {u.empresa_nome || "N/A"}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge
                  style={{
                    backgroundColor:
                      u.ativo !== false ? `${colors.success}15` : `${colors.danger}15`,
                    color: u.ativo !== false ? colors.success : colors.danger,
                    border: `1px solid ${u.ativo !== false ? colors.success : colors.danger}30`,
                  }}
                  className="font-medium">
                  {u.ativo !== false ? "Ativo" : "Inativo"}
                </Badge>
              </td>
              <td
                className="px-6 py-4 whitespace-nowrap text-sm"
                style={{ color: colors.textSecondary }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}