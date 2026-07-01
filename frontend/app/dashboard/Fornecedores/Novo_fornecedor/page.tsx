"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Archive,
  RotateCcw,
  Trash2,
  History,
  X,
  MoreVertical,
} from "lucide-react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  fornecedorService,
  Fornecedor,
  getStatusLabel,
  getTipoLabel,
  formatarNIF,
} from "@/services/fornecedores";
import { useThemeColors, ThemeColors } from "@/context/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Componente de Notificacao Toast ---
interface ToastNotificationProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  colors: ThemeColors;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type, onClose, colors }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} style={{ color: colors.success }} />;
      case 'error':
        return <AlertCircle size={24} style={{ color: colors.danger }} />;
      case 'warning':
        return <AlertCircle size={24} style={{ color: colors.warning }} />;
      case 'info':
        return <CheckCircle size={24} style={{ color: colors.primary }} />;
      default:
        return <CheckCircle size={24} style={{ color: colors.success }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.primary;
      default:
        return colors.success;
    }
  };

  return (
    <div 
      className="fixed top-6 right-6 z-50 max-w-md animate-slide-in-right"
      style={{ 
        backgroundColor: colors.card,
        borderLeft: `4px solid ${getBorderColor()}`,
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
      }}
    >
      <div className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ color: colors.textSecondary }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Funcoes de validacao do NIF/BI ---
type TipoDocumento = 'NIF' | 'BI' | 'INVALIDO';

function identificarDocumento(valor: string): TipoDocumento {
  const clean = valor.replace(/[^a-zA-Z0-9]/g, '');
  
  if (/^[0-9]{10}$/.test(clean)) {
    return 'NIF';
  }
  
  if (/^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/.test(clean)) {
    return 'BI';
  }
  
  return 'INVALIDO';
}

function validarNIF(nif: string): { 
  valido: boolean; 
  tipo?: TipoDocumento;
  mensagem?: string;
  clean?: string;
} {
  if (!nif || nif.trim() === '') {
    return { valido: false, mensagem: 'NIF/BI é obrigatório' };
  }
  
  const clean = nif.replace(/[^a-zA-Z0-9]/g, '');
  const tipo = identificarDocumento(clean);
  
  if (tipo === 'NIF') {
    return { valido: true, tipo: 'NIF', clean };
  }
  
  if (tipo === 'BI') {
    return { valido: true, tipo: 'BI', clean };
  }
  
  return { 
    valido: false, 
    mensagem: 'Formato inválido. Use NIF (10 dígitos) ou BI (9 números + 2 letras + 3 números)',
    tipo: 'INVALIDO'
  };
}

function aplicarMascaraNIF(valor: string): string {
  let clean = valor.replace(/[^a-zA-Z0-9]/g, '');
  
  if (clean.length > 14) {
    clean = clean.slice(0, 14);
  }
  
  if (/^[0-9]+$/.test(clean) && clean.length <= 10) {
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return clean.replace(/(\d{3})(\d+)/, '$1 $2');
    if (clean.length <= 10) return clean.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
  }
  
  if (/[A-Za-z]/.test(clean)) {
    const match = clean.match(/^(\d{0,3})(\d{0,3})(\d{0,3})([A-Za-z]{0,2})(\d{0,3})/);
    if (match) {
      let resultado = '';
      if (match[1]) resultado += match[1];
      if (match[2]) resultado += (resultado ? ' ' : '') + match[2];
      if (match[3]) resultado += (resultado ? ' ' : '') + match[3];
      if (match[4]) resultado += (resultado ? ' ' : '') + match[4].toUpperCase();
      if (match[5]) resultado += (resultado ? ' ' : '') + match[5];
      return resultado;
    }
  }
  
  return clean;
}

/* --- Tipos --- */
interface FormFornecedorData {
  nome: string;
  nif: string;
  telefone: string;
  email: string;
  endereco: string;
  tipo: "nacional" | "internacional";
  status: "ativo" | "inativo";
}

const INITIAL_FORM: FormFornecedorData = {
  nome: "",
  nif: "",
  telefone: "",
  email: "",
  endereco: "",
  tipo: "nacional",
  status: "ativo",
};

/* --- Modal generico --- */
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-2xl p-0"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
          <DialogTitle className="text-base" style={{ color: colors.secondary }}>
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-68px)]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --- Modal de confirmacao --- */
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger" | "info";
}) {
  const colors = useThemeColors();
  const btnColor = type === "danger" ? colors.danger : type === "info" ? colors.primary : colors.warning;
  const iconClr = type === "danger" ? colors.danger : type === "info" ? colors.secondary : colors.warning;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-[400px] p-0"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <DialogHeader className="p-4 border-b" style={{ borderColor: colors.border }}>
          <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: iconClr }}>
            <AlertCircle className="w-4 h-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-xs mb-4 leading-relaxed" style={{ color: colors.textSecondary }}>{message}</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ color: colors.textSecondary, border: `1px solid ${colors.border}` }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: btnColor }}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 rounded-full border-white border-t-transparent animate-spin" />Processando…</>
              ) : confirmText}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --- Menu de acoes com tres pontos --- */
function ActionMenu({
  fornecedor,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  abaAtiva,
  colors,
}: {
  fornecedor: Fornecedor;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  abaAtiva: "ativos" | "lixeira";
  colors: ThemeColors;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className=" action-menu-container">
      <button
        onClick={() => setMenuAberto(!menuAberto)}
        className="p-2 transition-colors hover:opacity-70"
        style={{ color: colors.textSecondary }}
        title="Acoes"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {menuAberto && (
        <div
          className="absolute right-0 mt-1 w-48 border shadow-lg z-10 py-1"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
          }}
        >
          {abaAtiva === "ativos" ? (
            <>
              <button
                onClick={() => {
                  setMenuAberto(false);
                  onEdit();
                }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                style={{ color: colors.text }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </button>
              <button
                onClick={() => {
                  setMenuAberto(false);
                  onArchive();
                }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                style={{ color: colors.warning }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Mover para lixeira
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setMenuAberto(false);
                  onRestore();
                }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                style={{ color: colors.secondary }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar
              </button>
              <button
                onClick={() => {
                  setMenuAberto(false);
                  onDelete();
                }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                style={{ color: colors.danger }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir permanentemente
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* --- Loading States --- */
function LoadingStats({ colors }: { colors: ThemeColors }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="p-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10"
              style={{ backgroundColor: colors.border }}
            />
            <div className="space-y-1.5">
              <div
                className="h-5 w-10"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="h-3.5 w-14"
                style={{ backgroundColor: colors.border }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingTabela({ colors }: { colors: ThemeColors }) {
  return (
    <div
      className="border overflow-hidden"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="h-11" style={{ backgroundColor: colors.primary }} />
      <div className="divide-y" style={{ borderColor: colors.border }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div
              className="w-9 h-9"
              style={{ backgroundColor: colors.border }}
            />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3.5 w-36"
                style={{ backgroundColor: colors.border }}
              />
              <div
                className="h-3 w-28"
                style={{ backgroundColor: colors.border }}
              />
            </div>
            <div
              className="w-20 h-6"
              style={{ backgroundColor: colors.border }}
            />
            <div
              className="w-20 h-6"
              style={{ backgroundColor: colors.border }}
            />
            <div
              className="w-28 h-4"
              style={{ backgroundColor: colors.border }}
            />
            <div className="flex gap-1.5">
              {[...Array(2)].map((_, j) => (
                <div
                  key={j}
                  className="w-8 h-8"
                  style={{ backgroundColor: colors.border }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Formulario de fornecedor --- */
function FormFornecedor({
  fornecedor,
  onSubmit,
  onCancel,
  loading,
}: {
  fornecedor?: Fornecedor | null;
  onSubmit: (d: FormFornecedorData) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const colors = useThemeColors();
  const [form, setForm] = useState<FormFornecedorData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nifTipo, setNifTipo] = useState<TipoDocumento | null>(null);

  useEffect(() => {
    if (fornecedor) {
      setForm({
        nome: fornecedor.nome,
        nif: fornecedor.nif || "",
        tipo: fornecedor.tipo,
        status: fornecedor.status,
        telefone: fornecedor.telefone || "",
        email: fornecedor.email || "",
        endereco: fornecedor.endereco || "",
      });
      if (fornecedor.nif) {
        const validacao = validarNIF(fornecedor.nif);
        if (validacao.valido) {
          setNifTipo(validacao.tipo || null);
        }
      }
    } else {
      setForm(INITIAL_FORM);
      setNifTipo(null);
    }
  }, [fornecedor]);

  const setField = (name: string, value: string) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  const handleNifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const mascara = aplicarMascaraNIF(valor);
    
    setForm((p) => ({ ...p, nif: mascara }));
    if (errors.nif) setErrors((p) => ({ ...p, nif: "" }));
    
    if (mascara.length > 0) {
      const validacao = validarNIF(mascara);
      if (validacao.valido) {
        setNifTipo(validacao.tipo || null);
        setErrors((p) => ({ ...p, nif: "" }));
      } else if (mascara.replace(/[^a-zA-Z0-9]/g, '').length >= 10) {
        setNifTipo(null);
        setErrors((p) => ({ ...p, nif: validacao.mensagem || 'Formato inválido' }));
      } else {
        setNifTipo(null);
        setErrors((p) => ({ ...p, nif: "" }));
      }
    } else {
      setNifTipo(null);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome?.trim()) e.nome = "Nome é obrigatório";
    
    if (!form.nif?.trim()) {
      e.nif = "NIF/BI é obrigatório";
    } else {
      const validacao = validarNIF(form.nif);
      if (!validacao.valido) {
        e.nif = validacao.mensagem || "Formato inválido";
      }
    }
    
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inputCls =
    "w-full px-3 py-2 border outline-none transition-all text-sm";
  const inputStyle = (err?: string) => ({
    backgroundColor: colors.card,
    borderColor: err ? colors.danger : colors.border,
    color: colors.text,
  });
  const labelCls = "block text-xs font-medium mb-1";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (validate()) {
          const dadosLimpos = {
            ...form,
            nif: form.nif.replace(/[^a-zA-Z0-9]/g, '')
          };
          onSubmit(dadosLimpos);
        }
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        {(["nacional", "internacional"] as const).map((t) => {
          const active = form.tipo === t;
          const clr = colors.secondary;
          return (
            <label
              key={t}
              className="flex items-center gap-2 p-2 border cursor-pointer transition-all"
              style={{
                borderColor: active ? clr : colors.border,
                backgroundColor: active ? `${clr}10` : "transparent",
              }}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={active}
                onChange={() => setField("tipo", t)}
                className="hidden"
              />
              {t === "nacional" ? (
                <Building2
                  className="w-4 h-4"
                  style={{ color: active ? clr : colors.textSecondary }}
                />
              ) : (
                <Globe
                  className="w-4 h-4"
                  style={{ color: active ? clr : colors.textSecondary }}
                />
              )}
              <span
                className="text-xs font-medium"
                style={{ color: active ? clr : colors.text }}
              >
                {t}
              </span>
            </label>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            Nome
          </label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Nome do fornecedor"
            className={inputCls}
            style={inputStyle(errors.nome)}
          />
          {errors.nome && (
            <p className="mt-1 text-xs" style={{ color: colors.danger }}>
              {errors.nome}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@exemplo.com"
              className={`${inputCls} pl-7`}
              style={inputStyle(errors.email)}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs" style={{ color: colors.danger }}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["ativo", "inativo"] as const).map((s) => {
              const active = form.status === s;
              const clr = s === "ativo" ? colors.secondary : colors.textSecondary;
              return (
                <label
                  key={s}
                  className="flex items-center gap-1.5 p-2 border cursor-pointer"
                  style={{
                    borderColor: active ? clr : colors.border,
                    backgroundColor: active ? `${clr}10` : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={active}
                    onChange={handleChange}
                    className="hidden"
                  />
                  {s === "ativo" ? (
                    <CheckCircle
                      className="w-3.5 h-3.5"
                      style={{ color: active ? clr : colors.textSecondary }}
                    />
                  ) : (
                    <XCircle
                      className="w-3.5 h-3.5"
                      style={{ color: active ? clr : colors.textSecondary }}
                    />
                  )}
                  <span className="text-xs">
                    {s === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelCls} style={{ color: colors.text }}>
            NIF / BI
          </label>
          <div className="relative">
            <input
              type="text"
              name="nif"
              value={form.nif}
              onChange={handleNifChange}
              placeholder="NIF: 123 456 7890  ou  BI: 123 456 789 AB 123"
              className={`${inputCls} font-mono text-xs`}
              style={{
                ...inputStyle(errors.nif),
                paddingRight: nifTipo ? '40px' : '10px'
              }}
            />
            {nifTipo && (
              <span 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: nifTipo === 'NIF' ? `${colors.primary}20` : `${colors.secondary}20`,
                  color: nifTipo === 'NIF' ? colors.primary : colors.secondary
                }}
              >
                {nifTipo}
              </span>
            )}
          </div>
          {errors.nif && (
            <p className="mt-1 text-xs" style={{ color: colors.danger }}>
              {errors.nif}
            </p>
          )}
          {!errors.nif && form.nif && (
            <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
              {form.nif.replace(/[^a-zA-Z0-9]/g, '').length}/14 caracteres
            </p>
          )}
          <small className="text-xs block mt-1" style={{ color: colors.textSecondary }}>
            NIF: 10 numeros | BI: 9 numeros + 2 letras + 3 numeros
          </small>
        </div>
      </div>

      <div>
        <label className={labelCls} style={{ color: colors.text }}>
          Telefone
        </label>
        <div className="relative">
          <Phone
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: colors.textSecondary }}
          />
          <input
            type="tel"
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            placeholder="900 000 000"
            className={`${inputCls} pl-7`}
            style={inputStyle()}
          />
        </div>
      </div>

      <div>
        <label className={labelCls} style={{ color: colors.text }}>
          Endereco
        </label>
        <div className="relative">
          <MapPin
            className="absolute left-2 top-2.5 w-3.5 h-3.5"
            style={{ color: colors.textSecondary }}
          />
          <textarea
            name="endereco"
            value={form.endereco}
            onChange={handleChange}
            rows={2}
            placeholder="Rua, numero, bairro, cidade…"
            className={`${inputCls} pl-7 resize-none text-xs`}
            style={inputStyle()}
          />
        </div>
      </div>

      <div
        className="flex gap-2 pt-2 border-t"
        style={{ borderColor: colors.border }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
          style={{
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-2 text-white text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-60"
          style={{ backgroundColor: colors.primary }}
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin" />
              Guardar
            </>
          ) : (
            `${fornecedor ? "Atualizar" : "Criar"}`
          )}
        </button>
      </div>
    </form>
  );
}

/* PAGINA PRINCIPAL */
export default function FornecedoresPage() {
  const colors = useThemeColors();

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresDeletados, setFornecedoresDeletados] = useState<Fornecedor[]>([]);
  const [fornecedoresFiltrados, setFornecedoresFiltrados] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "nacional" | "internacional">("todos");
  const [abaAtiva, setAbaAtiva] = useState<"ativos" | "lixeira">("ativos");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const [modalForm, setModalForm] = useState(false);
  const [modalArquivar, setModalArquivar] = useState(false);
  const [modalRestaurar, setModalRestaurar] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [selecao, setSelecao] = useState<Fornecedor | null>(null);
  const [loadingAcao, setLoadingAcao] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const lista = abaAtiva === "ativos" ? fornecedores : fornecedoresDeletados;
    const t = busca.toLowerCase();
    setFornecedoresFiltrados(
      lista.filter((f) => {
        const matchBusca =
          f.nome.toLowerCase().includes(t) ||
          (f.nif && f.nif.toLowerCase().includes(t)) ||
          (f.email && f.email.toLowerCase().includes(t)) ||
          (f.telefone && f.telefone.includes(t));
        const matchStatus =
          filtroStatus === "todos" || f.status === filtroStatus;
        const matchTipo = filtroTipo === "todos" || f.tipo === filtroTipo;
        return matchBusca && matchStatus && matchTipo;
      })
    );
  }, [busca, filtroStatus, filtroTipo, fornecedores, fornecedoresDeletados, abaAtiva]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ativosResponse, deletadosResponse] = await Promise.all([
        fornecedorService.listarFornecedores(),
        fornecedorService.listarFornecedoresDeletados(),
      ]);
      
      setFornecedores(ativosResponse.fornecedores || []);
      setFornecedoresDeletados(deletadosResponse.fornecedores || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      setFornecedores([]);
      setFornecedoresDeletados([]);
      showToast('Erro ao carregar fornecedores', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirCriar = () => { setSelecao(null); setModalForm(true); };
  const abrirEditar = (f: Fornecedor) => { setSelecao(f); setModalForm(true); };
  const abrirArquivar = (f: Fornecedor) => { setSelecao(f); setModalArquivar(true); };
  const abrirRestaurar = (f: Fornecedor) => { setSelecao(f); setModalRestaurar(true); };
  const abrirExcluir = (f: Fornecedor) => { setSelecao(f); setModalExcluir(true); };

  const fecharForm = () => { setModalForm(false); setSelecao(null); };
  const fecharArquivar = () => { setModalArquivar(false); setSelecao(null); };
  const fecharRestaurar = () => { setModalRestaurar(false); setSelecao(null); };
  const fecharExcluir = () => { setModalExcluir(false); setSelecao(null); };

  const handleSubmit = async (dados: FormFornecedorData) => {
    setLoadingAcao(true);
    try {
      const dadosNormalizados = {
        ...dados,
        tipo: dados.tipo,
      };
      if (selecao) {
        await fornecedorService.atualizarFornecedor(selecao.id, dadosNormalizados);
        showToast(`Fornecedor "${dados.nome}" atualizado com sucesso`, 'success');
      } else {
        await fornecedorService.criarFornecedor(dadosNormalizados);
        showToast(`Fornecedor "${dados.nome}" criado com sucesso`, 'success');
      }
      fecharForm();
      await carregar();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro ao guardar fornecedor", 'error');
    } finally {
      setLoadingAcao(false);
    }
  };

  const handleArquivar = async () => {
    if (!selecao) return;
    setLoadingAcao(true);
    try {
      await fornecedorService.deletarFornecedor(selecao.id);
      showToast(`Fornecedor "${selecao.nome}" movido para a lixeira`, 'success');
      fecharArquivar();
      await carregar();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro ao arquivar fornecedor", 'error');
    } finally {
      setLoadingAcao(false);
    }
  };

  const handleRestaurar = async () => {
    if (!selecao) return;
    setLoadingAcao(true);
    try {
      await fornecedorService.restaurarFornecedor(selecao.id);
      showToast(`Fornecedor "${selecao.nome}" restaurado com sucesso`, 'success');
      fecharRestaurar();
      await carregar();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro ao restaurar fornecedor", 'error');
    } finally {
      setLoadingAcao(false);
    }
  };

  const handleExcluir = async () => {
    if (!selecao) return;
    setLoadingAcao(true);
    try {
      await fornecedorService.deletarFornecedorPermanente(selecao.id);
      showToast(`Fornecedor "${selecao.nome}" excluído permanentemente`, 'success');
      fecharExcluir();
      await carregar();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro ao excluir fornecedor", 'error');
    } finally {
      setLoadingAcao(false);
    }
  };

  const stats = [
    {
      icon: Truck,
      label: "Total",
      value: fornecedores.length,
      color: colors.text,
    },
    {
      icon: CheckCircle,
      label: "Ativos",
      value: fornecedores.filter((f) => f.status === "ativo").length,
      color: colors.secondary,
    },
    {
      icon: XCircle,
      label: "Inativos",
      value: fornecedores.filter((f) => f.status !== "ativo").length,
      color: colors.textSecondary,
    },
    {
      icon: Archive,
      label: "Lixeira",
      value: fornecedoresDeletados.length,
      color: colors.secondary,
    },
  ];

  const listaVazia =
    abaAtiva === "ativos" ? fornecedores.length === 0 : fornecedoresDeletados.length === 0;

  return (
    <MainEmpresa>
      <div
        className="space-y-4 max-w-7xl mx-auto pb-6 transition-colors duration-300"
        style={{ backgroundColor: colors.background }}
      >
        {/* Toast Notification */}
        {toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            colors={colors}
          />
        )}

        {/* Cabecalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.secondary }}>
              Fornecedores
            </h1>
            <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              Gerencie os seus fornecedores nacionais e internacionais
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div
              className="flex border"
              style={{ borderColor: colors.border, backgroundColor: colors.card }}
            >
              {(["ativos", "lixeira"] as const).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaAtiva(aba)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: abaAtiva === aba ? colors.primary : "transparent",
                    color: abaAtiva === aba ? "#fff" : colors.textSecondary,
                  }}
                >
                  {aba === "ativos" ? (
                    <Truck className="w-4 h-4" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  {aba === "ativos"
                    ? `Ativos (${fornecedores.length})`
                    : `Lixeira (${fornecedoresDeletados.length})`}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: colors.textSecondary }}
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, NIF, email…"
                className="w-full pl-9 pr-4 py-2 border outline-none text-sm"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="px-3 py-2 border outline-none text-sm"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              }}
            >
              <option value="todos">Todos tipos</option>
              <option value="nacional">Nacional</option>
              <option value="internacional">Internacional</option>
            </select>

            {abaAtiva === "ativos" && (
              <button
                onClick={abrirCriar}
                className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                <Plus className="w-4 h-4" />
                Novo
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <LoadingStats colors={colors} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="p-4 border"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p
                      className="text-xl font-bold leading-none"
                      style={{ color: colors.text }}
                    >
                      {value}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                      {label}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabela */}
        {loading ? (
          <LoadingTabela colors={colors} />
        ) : listaVazia ? (
          <div
            className="border text-center py-14"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Truck
              className="w-14 h-14 mx-auto mb-3"
              style={{ color: colors.border }}
            />
            <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              {abaAtiva === "ativos"
                ? "Nenhum fornecedor encontrado."
                : "Nenhum fornecedor na lixeira."}
            </p>
            {abaAtiva === "ativos" && (
              <button
                onClick={abrirCriar}
                className="px-4 py-2 text-white text-sm"
                style={{ backgroundColor: colors.primary }}
              >
                Cadastrar primeiro fornecedor
              </button>
            )}
          </div>
        ) : (
          <div
            className="border overflow-hidden shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: colors.primary }}>
                    {["Fornecedor", "Tipo", "Status", "Contacto", "NIF/BI", ""].map(
                      (h, i) => (
                        <th
                          key={h}
                          className={`py-3 px-5 font-semibold text-white text-xs uppercase tracking-wider ${
                            i === 5 ? "text-center w-12" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                  {fornecedoresFiltrados.map((f) => {
                    const nifValidacao = f.nif ? validarNIF(f.nif) : null;
                    return (
                      <tr
                        key={f.id}
                        className="transition-colors"
                        style={{
                          backgroundColor:
                            f.status === "inativo"
                              ? `${colors.hover}80`
                              : "transparent",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = colors.hover)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            f.status === "inativo"
                              ? `${colors.hover}80`
                              : "transparent")
                        }
                      >
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor:
                                  f.tipo === "internacional"
                                    ? `${colors.secondary}20`
                                    : colors.hover,
                              }}
                            >
                              {f.tipo === "internacional" ? (
                                <Globe
                                  className="w-4 h-4"
                                  style={{ color: colors.secondary }}
                                />
                              ) : (
                                <Building2
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
                                {f.nome}
                              </div>
                              {f.email && (
                                <div
                                  className="text-xs truncate max-w-[160px]"
                                  style={{ color: colors.textSecondary }}
                                >
                                  {f.email}
                                </div>
                              )}
                              {f.deleted_at && (
                                <div
                                  className="text-xs flex items-center gap-1 mt-0.5"
                                  style={{ color: colors.danger }}
                                >
                                  <History className="w-3 h-3" />
                                  {new Date(f.deleted_at).toLocaleDateString("pt-PT")}
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
                                f.tipo === "internacional"
                                  ? `${colors.secondary}`
                                  : `${colors.primary}`,
                              color:
                                f.tipo === "internacional"
                                  ? colors.text
                                  : colors.text,
                            }}
                          >
                            {f.tipo === "internacional" ? (
                              <Globe className="w-3 h-3" />
                            ) : (
                              <Building2 className="w-3 h-3" />
                            )}
                            {getTipoLabel(f.tipo)}
                          </span>
                        </td>

                        <td className="py-3 px-5">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                            style={{
                              backgroundColor:
                                f.status === "ativo"
                                  ? `${colors.secondary}18`
                                  : `${colors.textSecondary}18`,
                              color:
                                f.status === "ativo"
                                  ? colors.secondary
                                  : colors.textSecondary,
                            }}
                          >
                            {f.status === "ativo" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {getStatusLabel(f.status)}
                          </span>
                        </td>

                        <td className="py-3 px-5">
                          {f.telefone ? (
                            <div
                              className="flex items-center gap-1.5 text-sm"
                              style={{ color: colors.textSecondary }}
                            >
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              {f.telefone}
                            </div>
                          ) : (
                            <span style={{ color: colors.textSecondary }}>—</span>
                          )}
                        </td>

                        <td className="py-3 px-5">
                          {f.nif ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono text-sm"
                                style={{ color: colors.textSecondary }}
                              >
                                {formatarNIF(f.nif)}
                              </span>
                              {nifValidacao?.valido && nifValidacao.tipo && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: nifValidacao.tipo === 'NIF' 
                                      ? `${colors.primary}20` 
                                      : `${colors.secondary}20`,
                                    color: nifValidacao.tipo === 'NIF' 
                                      ? colors.primary 
                                      : colors.secondary
                                  }}
                                >
                                  {nifValidacao.tipo}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: colors.textSecondary }}>—</span>
                          )}
                        </td>

                        <td className="py-3 px-2">
                          <ActionMenu
                            fornecedor={f}
                            onEdit={() => abrirEditar(f)}
                            onArchive={() => abrirArquivar(f)}
                            onRestore={() => abrirRestaurar(f)}
                            onDelete={() => abrirExcluir(f)}
                            abaAtiva={abaAtiva}
                            colors={colors}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {fornecedoresFiltrados.length === 0 && busca && (
                <div className="text-center py-12">
                  <Search
                    className="w-12 h-12 mx-auto mb-3"
                    style={{ color: colors.border }}
                  />
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Nenhum fornecedor encontrado para busca
                  </p>
                  <button
                    onClick={() => setBusca("")}
                    className="mt-2 text-sm underline"
                    style={{ color: colors.primary }}
                  >
                    Limpar pesquisa
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={modalForm}
        onClose={fecharForm}
        title={selecao ? "Editar Fornecedor" : "Novo Fornecedor"}
      >
        <FormFornecedor
          fornecedor={selecao}
          onSubmit={handleSubmit}
          onCancel={fecharForm}
          loading={loadingAcao}
        />
      </Modal>

      <ConfirmModal
        isOpen={modalArquivar}
        onClose={fecharArquivar}
        onConfirm={handleArquivar}
        title="Mover para Lixeira"
        message={`Tem a certeza que deseja mover "${selecao?.nome}" para a lixeira? Poderá restaurar depois.`}
        confirmText="Mover"
        type="warning"
        loading={loadingAcao}
      />

      <ConfirmModal
        isOpen={modalRestaurar}
        onClose={fecharRestaurar}
        onConfirm={handleRestaurar}
        title="Restaurar Fornecedor"
        message={`Tem a certeza que deseja restaurar "${selecao?.nome}"? O fornecedor voltará à lista de ativos.`}
        confirmText="Restaurar"
        type="info"
        loading={loadingAcao}
      />

      <ConfirmModal
        isOpen={modalExcluir}
        onClose={fecharExcluir}
        onConfirm={handleExcluir}
        title="Excluir Permanentemente"
        message={`Tem a certeza que deseja excluir "${selecao?.nome}" permanentemente? Esta acção não pode ser desfeita!`}
        confirmText="Excluir"
        type="danger"
        loading={loadingAcao}
      />
    </MainEmpresa>
  );
}