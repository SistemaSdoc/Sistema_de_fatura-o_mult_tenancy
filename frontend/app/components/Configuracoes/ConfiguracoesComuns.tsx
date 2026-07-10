import React from "react";
import { Eye, EyeOff, Save, Loader2, XCircle, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-PT") : "—");

export const getLogoUrl = (logo?: string | null): string | null => {
  if (!logo) return null;
  if (logo.startsWith("http")) return logo;
  return `${process.env.NEXT_PUBLIC_API_URL}/storage/${logo}`;
};

export const RoleBadge = ({ role, colors }: { role: string; colors: ThemeColors }) => {
  const map: Record<string, { label: string; color: string }> = {
    admin: { label: "Admin", color: colors.secondary },
    operador: { label: "Operador", color: colors.secondary },
    contablista: { label: "Contabilista", color: colors.success },
    gestor: { label: "Gestor de Stock", color: colors.success },
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
    <div className="flex items-center min-h-10 px-3 py-2 border " style={{ borderColor: colors.border, backgroundColor: colors.hover }}>
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
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  colors: ThemeColors;
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
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          color: colors.text,
        }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
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
  children = "Salvar alterações",
  disabled,
}: {
  onClick: () => void | Promise<void>;
  loading: boolean;
  colors: ThemeColors;
  children?: string;
  disabled?: boolean;
}) => (
  <Button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className="gap-2 text-white"
    style={{ backgroundColor: colors.primary }}>
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
    {loading ? "Salvando..." : children}
  </Button>
);

/* ── Componente de Notificação Toast com Animação ── */
export interface ToastNotificationProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  colors: ThemeColors;
  description?: string;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type, onClose, colors, description }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle size={24} style={{ color: colors.success }} />;
      case "error":
        return <AlertCircle size={24} style={{ color: colors.danger }} />;
      case "warning":
        return <AlertCircle size={24} style={{ color: colors.warning }} />;
      case "info":
        return <CheckCircle size={24} style={{ color: colors.primary }} />;
      default:
        return <CheckCircle size={24} style={{ color: colors.success }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return colors.success;
      case "error":
        return colors.danger;
      case "warning":
        return colors.warning;
      case "info":
        return colors.primary;
      default:
        return colors.success;
    }
  };

  return (
    <div
      className="fixed top-6 right-6 z-[9999] max-w-md"
      style={{
        backgroundColor: colors.card,
        borderLeft: `4px solid ${getBorderColor()}`,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        animation: "slideInRight 0.3s ease-out forwards",
      }}>
      <div className="flex items-start gap-4 p-4">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {message}
          </p>
          {description && (
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {description}
            </p>
          )}
        </div>
        <button onClick={onClose} className="flex-shrink-0 transition-opacity hover:opacity-70" style={{ color: colors.textSecondary }}>
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
};

/* ── Hook para gerenciar Toast ── */
export interface ToastState {
  message: string;
  type: "success" | "error" | "warning" | "info";
  description?: string;
}

export type ShowToastFn = (message: string, type: "success" | "error" | "warning" | "info", description?: string) => void;

/* ── Tipo para componentes que recebem showToast como prop ── */
export interface WithToast {
  showToast: ShowToastFn;
}