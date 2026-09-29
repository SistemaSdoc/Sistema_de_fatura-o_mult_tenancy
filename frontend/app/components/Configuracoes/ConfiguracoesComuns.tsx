import React from "react";
import { Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */
export interface ThemeColors {
  text: string;
  textSecondary: string;
  background: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  error: string;
  hover: string;
  fp: string;
}

export type RoleType = "admin" | "operador" | "contablista" | "gestor";

export interface ToastState {
  message: string;
  type: "success" | "error" | "warning" | "info";
  description?: string;
}

export type ShowToastFn = (
  message: string,
  type: "success" | "error" | "warning" | "info",
  description?: string,
) => void;

export interface WithToast {
  showToast: ShowToastFn;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-PT") : "—");

function extractLogoFilename(path: string): string {
  const clean = path.replace(/\\/g, "/");
  const match = clean.match(/logos\/([^/]+)$/);
  return match ? match[1] : clean.split("/").pop() || clean;
}

export const getLogoUrl = (logo?: string | null): string | null => {
  if (!logo) return null;
  if (logo.startsWith("http")) return logo;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  // Em produção, a variável é obrigatória. Nunca cair em localhost.
  if (!baseUrl) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[getLogoUrl] NEXT_PUBLIC_API_URL não está definida. Logos não vão carregar corretamente.",
      );
      return null;
    }
    return `http://localhost:8000/storage/logos/${extractLogoFilename(logo)}`;
  }

  return `${baseUrl}/storage/logos/${extractLogoFilename(logo)}`;
};

/* ------------------------------------------------------------------ */
/*  Mensagens de erro amigáveis                                        */
/* ------------------------------------------------------------------ */
type ApiLikeError = {
  response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
  code?: string;
  message?: string;
};

export function friendlyError(
  error: unknown,
  fallback = "Ocorreu um erro. Tente novamente.",
): string {
  const err = error as ApiLikeError;

  if (!err?.response) {
    if (err?.code === "ECONNABORTED") return "O pedido demorou demasiado. Tente novamente.";
    return "Sem ligação ao servidor. Verifique a sua internet.";
  }

  switch (err.response.status) {
    case 400:
      return "Dados inválidos. Verifique os campos e tente novamente.";
    case 401:
      return "A sua sessão expirou. Inicie sessão novamente.";
    case 403:
      return "Não tem permissão para realizar esta ação.";
    case 404:
      return "Informação não encontrada.";
    case 409:
      return "Os dados foram alterados por outro utilizador. Recarregue a página.";
    case 422: {
      const errors = err.response.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0]?.[0];
        if (first) return first;
      }
      return "Alguns campos não estão corretos. Verifique e tente novamente.";
    }
    case 429:
      return "Demasiados pedidos. Aguarde um momento.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Serviço temporariamente indisponível. Tente novamente dentro de instantes.";
    default:
      return fallback;
  }
}

/* ------------------------------------------------------------------ */
/*  Componentes                                                        */
/* ------------------------------------------------------------------ */
export const RoleBadge = ({ role, colors }: { role: string; colors: ThemeColors }) => {
  const map: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: colors.danger },
    admin: { label: "Admin", color: colors.secondary },
    operador: { label: "Operador", color: colors.secondary },
    contablista: { label: "Contabilista", color: colors.success },
    gestor: { label: "Gestor de Stock", color: colors.success },
    admin_empresa: { label: "Admin Empresa", color: colors.secondary },
  };

  const c = map[role] ?? { label: role, color: colors.textSecondary };

  return (
    <Badge
      style={{
        backgroundColor: `${c.color}20`,
        color: c.color,
        border: `1px solid ${c.color}40`,
      }}>
      {c.label}
    </Badge>
  );
};

export const FormInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  colors,
  disabled,
  placeholder,
  icon: Icon,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  colors: ThemeColors;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ElementType;
  maxLength?: number;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name} style={{ color: colors.text }} className="flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: colors.textSecondary }} />}
      {label}
    </Label>
    <Input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        backgroundColor: disabled ? colors.hover : colors.card,
        borderColor: colors.border,
        color: colors.text,
      }}
    />
  </div>
);

export const ReadonlyField = ({
  label,
  value,
  colors,
  icon: Icon,
  children,
}: {
  label: string;
  value?: string | null;
  colors: ThemeColors;
  icon?: React.ElementType;
  children?: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label style={{ color: colors.text }} className="flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: colors.textSecondary }} />}
      {label}
    </Label>
    <div
      className="flex items-center min-h-10 px-3 py-2 border"
      style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
      {children ?? (
        <span className="text-sm" style={{ color: colors.textSecondary }}>
          {value ?? "—"}
        </span>
      )}
    </div>
  </div>
);

export const PasswordInput = ({
  label,
  name,
  value,
  onChange,
  show,
  setShow,
  colors,
  disabled,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  colors: ThemeColors;
  disabled?: boolean;
  placeholder?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={name} style={{ color: colors.text }}>
      {label}
    </Label>
    <div className="relative">
      <Input
        id={name}
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          backgroundColor: disabled ? colors.hover : colors.card,
          borderColor: colors.border,
          color: colors.text,
        }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 disabled:opacity-50"
        style={{ color: colors.textSecondary }}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

export const SaveButton = ({
  onClick,
  loading,
  colors,
  children = "Guardar alterações",
  loadingText = "A guardar...",
  disabled,
  icon: Icon = Save,
}: {
  onClick: () => void | Promise<void>;
  loading: boolean;
  colors: ThemeColors;
  children?: string;
  loadingText?: string;
  disabled?: boolean;
  icon?: React.ElementType;
}) => (
  <Button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className="gap-2 text-white"
    style={{ backgroundColor: colors.primary }}>
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    {loading ? loadingText : children}
  </Button>
);

/* ── Re-export do Toast centralizado ── */
export { ToastNotification } from "@/components/ToastNotification";
export type { ToastNotificationProps } from "@/components/ToastNotification";