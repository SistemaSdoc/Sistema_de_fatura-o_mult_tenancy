"use client";

import React, { useEffect, useState } from "react";
import MainEmpresa from "../../../components/MainEmpresa";
import {
  clienteService,
  Cliente,
  CriarClienteInput,
  AtualizarClienteInput,
  formatarNIF,
  getTipoClienteLabel,
  getStatusClienteLabel,
  getStatusClienteBadge,
} from "@/services/clientes";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Eye,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Power,
  Globe
} from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

// ===== COMPONENTES AUXILIARES =====

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const colors = useThemeColors();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" style={{ backgroundColor: colors.card }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
          <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: colors.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = 'warning'
}: ConfirmModalProps) {
  const colors = useThemeColors();

  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'warning':
        return {
          bg: `${colors.warning}20`,
          text: colors.warning,
          button: colors.warning
        };
      case 'danger':
        return {
          bg: `${colors.danger}20`,
          text: colors.danger,
          button: colors.danger
        };
      case 'info':
        return {
          bg: `${colors.secondary}20`,
          text: colors.secondary,
          button: colors.primary
        };
      default:
        return {
          bg: `${colors.warning}20`,
          text: colors.warning,
          button: colors.warning
        };
    }
  };

  const modalColors = getColors();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: colors.card }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full" style={{ backgroundColor: modalColors.bg }}>
            <AlertCircle className="w-6 h-6" style={{ color: modalColors.text }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{title}</h3>
        </div>
        <p className="mb-6" style={{ color: colors.textSecondary }}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg transition-colors"
            style={{ color: colors.textSecondary }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: modalColors.button }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Processando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== SKELETON LOADING COMPONENT =====

function SkeletonCard({ colors }: { colors: any }) {
  return (
    <div className="p-5 rounded-xl shadow-sm border animate-pulse" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg" style={{ backgroundColor: colors.border, width: '48px', height: '48px' }}></div>
        <div className="flex-1">
          <div className="h-6 rounded w-16 mb-2" style={{ backgroundColor: colors.border }}></div>
          <div className="h-4 rounded w-12" style={{ backgroundColor: colors.border }}></div>
        </div>
      </div>
    </div>
  );
}

function SkeletonTableRow({ colors }: { colors: any }) {
  return (
    <tr className="animate-pulse">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full" style={{ backgroundColor: colors.border }}></div>
          <div className="flex-1">
            <div className="h-4 rounded w-32 mb-2" style={{ backgroundColor: colors.border }}></div>
            <div className="h-3 rounded w-24" style={{ backgroundColor: colors.border }}></div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="h-6 rounded w-20" style={{ backgroundColor: colors.border }}></div>
      </td>
      <td className="py-4 px-6">
        <div className="h-6 rounded w-16" style={{ backgroundColor: colors.border }}></div>
      </td>
      <td className="py-4 px-6">
        <div className="h-4 rounded w-24" style={{ backgroundColor: colors.border }}></div>
      </td>
      <td className="py-4 px-6">
        <div className="h-4 rounded w-20" style={{ backgroundColor: colors.border }}></div>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: colors.border }}></div>
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: colors.border }}></div>
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: colors.border }}></div>
        </div>
      </td>
    </tr>
  );
}

function SkeletonStats({ colors }: { colors: unknown }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} colors={colors} />
      ))}
    </div>
  );
}

function SkeletonTable({ colors }: { colors: any }) {
  return (
    <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: colors.primary }}>
            <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">Cliente</th>
            <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">Tipo</th>
            <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">Status</th>
            <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">Contacto</th>
            <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">NIF</th>
            <th className="py-4 px-6 text-center font-semibold text-white uppercase text-xs">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: colors.border }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonTableRow key={i} colors={colors} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== FORMULÁRIO DE CLIENTE =====

interface FormClienteProps {
  cliente?: Cliente | null;
  onSubmit: (dados: CriarClienteInput | AtualizarClienteInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Lista de códigos de país comuns
const CODIGOS_PAIS = [
  { codigo: '+244', pais: 'Angola', bandeira: '🇦🇴' },
  { codigo: '+351', pais: 'Portugal', bandeira: '🇵🇹' },
  { codigo: '+55', pais: 'Brasil', bandeira: '🇧🇷' },
  { codigo: '+258', pais: 'Moçambique', bandeira: '🇲🇿' },
  { codigo: '+238', pais: 'Cabo Verde', bandeira: '🇨🇻' },
  { codigo: '+245', pais: 'Guiné-Bissau', bandeira: '🇬🇼' },
  { codigo: '+239', pais: 'São Tomé e Príncipe', bandeira: '🇸🇹' },
  { codigo: '+1', pais: 'EUA/Canadá', bandeira: '🇺🇸' },
  { codigo: '+44', pais: 'Reino Unido', bandeira: '🇬🇧' },
  { codigo: '+33', pais: 'França', bandeira: '🇫🇷' },
  { codigo: '+49', pais: 'Alemanha', bandeira: '🇩🇪' },
  { codigo: '+34', pais: 'Espanha', bandeira: '🇪🇸' },
];

function FormCliente({ cliente, onSubmit, onCancel, loading }: FormClienteProps) {
  const colors = useThemeColors();

  const [formData, setFormData] = useState<CriarClienteInput>({
    nome: "",
    nif: "",
    tipo: "consumidor_final",
    status: "ativo",
    telefone: "",
    email: "",
    endereco: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codigoPais, setCodigoPais] = useState('+244');
  const [numeroTelefone, setNumeroTelefone] = useState('');

  useEffect(() => {
    if (cliente) {
      const novaFormData = {
        nome: cliente.nome,
        nif: cliente.nif || "",
        tipo: cliente.tipo,
        status: cliente.status,
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        endereco: cliente.endereco || "",
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(novaFormData);

      // Extrair código do país e número do telefone se existir
      if (cliente.telefone) {
        const codigoEncontrado = CODIGOS_PAIS.find(c => cliente.telefone?.startsWith(c.codigo));
        if (codigoEncontrado) {
          setCodigoPais(codigoEncontrado.codigo);
          setNumeroTelefone(cliente.telefone.replace(codigoEncontrado.codigo, '').trim());
        } else {
          setNumeroTelefone(cliente.telefone);
        }
      }
    } else {
      const formaPadrao = {
        nome: "",
        nif: "",
        tipo: "consumidor_final" as const,
        status: "ativo" as const,
        telefone: "",
        email: "",
        endereco: "",
      };
      setFormData(formaPadrao);
      setCodigoPais('+244');
      setNumeroTelefone('');
    }
  }, [cliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Validação especial para NIF
    if (name === 'nif') {
      if (formData.tipo === 'empresa') {
        // Empresa: apenas números, máximo 10 dígitos
        const apenasNumeros = value.replace(/\D/g, '').slice(0, 10);
        setFormData((prev) => ({ ...prev, [name]: apenasNumeros }));
      } else {
        // Consumidor final: letras e números, máximo 14 caracteres (padrão Angola)
        const valorLimpo = value.slice(0, 14);
        setFormData((prev) => ({ ...prev, [name]: valorLimpo }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleTipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoTipo = e.target.value as 'consumidor_final' | 'empresa';
    setFormData((prev) => ({
      ...prev,
      tipo: novoTipo,
      // Limpa NIF ao mudar de tipo para evitar conflitos de validação
      nif: ""
    }));
    if (errors.nif) {
      setErrors((prev) => ({ ...prev, nif: "" }));
    }
  };

  const handleNumeroTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 9);
    setNumeroTelefone(valor);

    // Atualiza o telefone completo no formData
    const telefoneCompleto = valor ? `${codigoPais} ${valor}` : '';
    setFormData((prev) => ({ ...prev, telefone: telefoneCompleto }));

    if (errors.telefone) {
      setErrors((prev) => ({ ...prev, telefone: "" }));
    }
  };

  const handleCodigoPaisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoCodigo = e.target.value;
    setCodigoPais(novoCodigo);

    // Atualiza o telefone completo no formData
    const telefoneCompleto = numeroTelefone ? `${novoCodigo} ${numeroTelefone}` : '';
    setFormData((prev) => ({ ...prev, telefone: telefoneCompleto }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const ehEmpresa = formData.tipo === 'empresa';

    // Nome é obrigatório para todos
    if (!formData.nome?.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }

    // Validações específicas para empresa
    if (ehEmpresa) {
      // Todos os campos são obrigatórios para empresa
      if (!formData.nif?.trim()) {
        newErrors.nif = "NIF é obrigatório para empresas";
      } else if (formData.nif.length !== 10) {
        newErrors.nif = "NIF deve ter exatamente 10 dígitos";
      }

      if (!formData.telefone?.trim()) {
        newErrors.telefone = "Telefone é obrigatório para empresas";
      } else if (numeroTelefone.length !== 9) {
        newErrors.telefone = "Telefone deve ter 9 dígitos após o código do país";
      }

      if (!formData.email?.trim()) {
        newErrors.email = "Email é obrigatório para empresas";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Email inválido";
      }

      if (!formData.endereco?.trim()) {
        newErrors.endereco = "Endereço é obrigatório para empresas";
      }
    } else {
      // Consumidor final: validações opcionais mas com formato correto se preenchido
      if (formData.nif && formData.nif.length > 14) {
        newErrors.nif = "NIF não pode ter mais de 14 caracteres";
      }

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Email inválido";
      }

      if (formData.telefone && numeroTelefone.length > 0 && numeroTelefone.length !== 9) {
        newErrors.telefone = "Telefone deve ter 9 dígitos após o código do país";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const ehEmpresa = formData.tipo === 'empresa';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Cliente */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
          Tipo de Cliente
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all`}
            style={{
              borderColor: formData.tipo === "consumidor_final" ? colors.primary : colors.border,
              backgroundColor: formData.tipo === "consumidor_final" ? `${colors.primary}10` : 'transparent'
            }}
          >
            <input
              type="radio"
              name="tipo"
              value="consumidor_final"
              checked={formData.tipo === "consumidor_final"}
              onChange={handleTipoChange}
              className="hidden"
            />
            <User className="w-5 h-5" style={{ color: formData.tipo === "consumidor_final" ? colors.primary : colors.textSecondary }} />
            <div>
              <div className="font-medium" style={{ color: formData.tipo === "consumidor_final" ? colors.primary : colors.text }}>
                Consumidor Final
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>Particular</div>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all`}
            style={{
              borderColor: formData.tipo === "empresa" ? colors.secondary : colors.border,
              backgroundColor: formData.tipo === "empresa" ? `${colors.secondary}10` : 'transparent'
            }}
          >
            <input
              type="radio"
              name="tipo"
              value="empresa"
              checked={formData.tipo === "empresa"}
              onChange={handleTipoChange}
              className="hidden"
            />
            <Building2 className="w-5 h-5" style={{ color: formData.tipo === "empresa" ? colors.secondary : colors.textSecondary }} />
            <div>
              <div className="font-medium" style={{ color: formData.tipo === "empresa" ? colors.secondary : colors.text }}>
                Empresa
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>Pessoa jurídica</div>
            </div>
          </label>
        </div>
      </div>

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
          Nome {ehEmpresa ? "da Empresa" : "Completo"}
        </label>
        <input
          type="text"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          placeholder={ehEmpresa ? "Ex: Empresa XYZ, Lda" : "Ex: João Silva"}
          className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all"
          style={{
            backgroundColor: colors.card,
            borderColor: errors.nome ? colors.danger : colors.border,
            color: colors.text
          }}
        />
        {errors.nome && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.nome}</p>}
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
          Status do Cliente
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all`}
            style={{
              borderColor: formData.status === "ativo" ? colors.success : colors.border,
              backgroundColor: formData.status === "ativo" ? `${colors.success}10` : 'transparent'
            }}
          >
            <input
              type="radio"
              name="status"
              value="ativo"
              checked={formData.status === "ativo"}
              onChange={handleChange}
              className="hidden"
            />
            <CheckCircle className="w-5 h-5" style={{ color: formData.status === "ativo" ? colors.success : colors.textSecondary }} />
            <div>
              <div className="font-medium" style={{ color: formData.status === "ativo" ? colors.success : colors.text }}>
                Ativo
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>Cliente pode realizar compras</div>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all`}
            style={{
              borderColor: formData.status === "inativo" ? colors.textSecondary : colors.border,
              backgroundColor: formData.status === "inativo" ? `${colors.textSecondary}10` : 'transparent'
            }}
          >
            <input
              type="radio"
              name="status"
              value="inativo"
              checked={formData.status === "inativo"}
              onChange={handleChange}
              className="hidden"
            />
            <XCircle className="w-5 h-5" style={{ color: formData.status === "inativo" ? colors.textSecondary : colors.textSecondary }} />
            <div>
              <div className="font-medium" style={{ color: formData.status === "inativo" ? colors.textSecondary : colors.text }}>
                Inativo
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>Cliente não pode realizar compras</div>
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NIF */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
            NIF {ehEmpresa ? "da Empresa" : "do Cliente"}
            <span className="text-xs ml-2 font-normal" style={{ color: colors.textSecondary }}>
              {ehEmpresa ? "(apenas números, 10 dígitos)" : "(letras e números, máx. 14)"}
            </span>
          </label>
          <input
            type="text"
            name="nif"
            value={formData.nif}
            onChange={handleChange}
            placeholder={ehEmpresa ? "0000000000" : "000000000LA000"}
            maxLength={ehEmpresa ? 10 : 14}
            className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all font-mono"
            style={{
              backgroundColor: colors.card,
              borderColor: errors.nif ? colors.danger : colors.border,
              color: colors.text
            }}
          />
          {errors.nif && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.nif}</p>}
          {ehEmpresa && formData.nif && (
            <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
              {formData.nif.length}/10 dígitos
            </p>
          )}
        </div>

        {/* Telefone com código do país */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
            Telefone {ehEmpresa }
            <span className="text-xs ml-2 font-normal" style={{ color: colors.textSecondary }}>
              (9 dígitos)
            </span>
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-[140px]">
              <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
              <select
                value={codigoPais}
                onChange={handleCodigoPaisChange}
                className="w-full pl-8 pr-2 py-2.5 rounded-lg border outline-none transition-all appearance-none"
                style={{
                  backgroundColor: colors.card,
                  borderColor: errors.telefone ? colors.danger : colors.border,
                  color: colors.text
                }}
              >
                {CODIGOS_PAIS.map((pais) => (
                  <option key={pais.codigo} value={pais.codigo}>
                    {pais.bandeira} {pais.codigo}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.textSecondary }} />
              <input
                type="tel"
                value={numeroTelefone}
                onChange={handleNumeroTelefoneChange}
                placeholder="900 000 000"
                maxLength={9}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all"
                style={{
                  backgroundColor: colors.card,
                  borderColor: errors.telefone ? colors.danger : colors.border,
                  color: colors.text
                }}
              />
            </div>
          </div>
          {errors.telefone && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.telefone}</p>}
          {numeroTelefone && (
            <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
              {numeroTelefone.length}/9 dígitos
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
          Email {ehEmpresa}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.textSecondary }} />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@exemplo.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all"
            style={{
              backgroundColor: colors.card,
              borderColor: errors.email ? colors.danger : colors.border,
              color: colors.text
            }}
          />
        </div>
        {errors.email && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.email}</p>}
      </div>

      {/* Endereço */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
          Endereço {ehEmpresa}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textSecondary }} />
          <textarea
            name="endereco"
            value={formData.endereco}
            onChange={handleChange}
            rows={3}
            placeholder="Rua, número, bairro, cidade..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all resize-none"
            style={{
              backgroundColor: colors.card,
              borderColor: errors.endereco ? colors.danger : colors.border,
              color: colors.text
            }}
          />
        </div>
        {errors.endereco && <p className="mt-1 text-sm" style={{ color: colors.danger }}>{errors.endereco}</p>}
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium"
          style={{ color: colors.textSecondary }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          style={{ backgroundColor: colors.primary }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {cliente ? "Atualizar" : "Criar"} Cliente
        </button>
      </div>
    </form>
  );
}

// ===== PÁGINA PRINCIPAL =====

export default function ClientesPage() {
  const colors = useThemeColors();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("ativos");

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalStatusAberto, setModalStatusAberto] = useState(false);

  // Cliente selecionado
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  // Loading de ações
  const [loadingAcao, setLoadingAcao] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, [filtroStatus]);

  useEffect(() => {
    const termo = busca.toLowerCase();
    const filtrados = clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.nif && c.nif.toLowerCase().includes(termo)) ||
        (c.email && c.email.toLowerCase().includes(termo)) ||
        (c.telefone && c.telefone.includes(termo))
    );
    setClientesFiltrados(filtrados);
  }, [busca, clientes]);

  async function carregarClientes() {
    setLoading(true);
    try {
      console.log('[PAGE] Carregando clientes...');
      let data;

      if (filtroStatus === "todos") {
        data = await clienteService.listarClientes(true); // incluir inativos
      } else if (filtroStatus === "ativos") {
        data = await clienteService.listarClientesAtivos();
      } else {
        data = await clienteService.listarClientesInativos();
      }

      console.log('[PAGE] Clientes recebidos:', data.length);
      setClientes(data);
      setClientesFiltrados(data);
    } catch (error) {
      console.error('[PAGE] Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }

  function abrirCriar() {
    setClienteSelecionado(null);
    setModalFormAberto(true);
  }

  function abrirEditar(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setModalFormAberto(true);
  }

  function abrirDetalhes(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setModalDetalhesAberto(true);
  }

  function abrirAlterarStatus(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setModalStatusAberto(true);
  }

  async function handleSubmit(dados: CriarClienteInput | AtualizarClienteInput) {
    setLoadingAcao(true);
    try {
      if (clienteSelecionado) {
        console.log('[PAGE] Atualizando cliente:', clienteSelecionado.id, dados);
        await clienteService.atualizarCliente(clienteSelecionado.id, dados as AtualizarClienteInput);
      } else {
        console.log('[PAGE] Criando novo cliente:', dados);
        await clienteService.criarCliente(dados as CriarClienteInput);
      }
      setModalFormAberto(false);
      setClienteSelecionado(null);
      await carregarClientes();
    } catch (error: any) {
      console.error('[PAGE] Erro ao salvar:', error);
      alert(error.response?.data?.message || "Erro ao salvar cliente");
    } finally {
      setLoadingAcao(false);
    }
  }

  async function handleAtivar() {
    if (!clienteSelecionado) return;

    setLoadingAcao(true);
    try {
      console.log('[PAGE] Ativando cliente:', clienteSelecionado.id);
      await clienteService.ativarCliente(clienteSelecionado.id);

      setModalStatusAberto(false);
      setClienteSelecionado(null);
      await carregarClientes();
    } catch (error: any) {
      console.error('[PAGE] Erro ao ativar:', error);
      alert(error.response?.data?.message || "Erro ao ativar cliente");
    } finally {
      setLoadingAcao(false);
    }
  }

  async function handleInativar() {
    if (!clienteSelecionado) return;

    setLoadingAcao(true);
    try {
      console.log('[PAGE] Inativando cliente:', clienteSelecionado.id);
      await clienteService.inativarCliente(clienteSelecionado.id);

      setModalStatusAberto(false);
      setClienteSelecionado(null);
      await carregarClientes();
    } catch (error: any) {
      console.error('[PAGE] Erro ao inativar:', error);
      alert(error.response?.data?.message || "Erro ao inativar cliente");
    } finally {
      setLoadingAcao(false);
    }
  }

  return (
    <MainEmpresa>
      <div className="space-y-6 max-w-7xl mx-auto transition-colors duration-300" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>Clientes</h1>
            <p className="mt-1" style={{ color: colors.textSecondary }}>
              Gerencie seus clientes e empresas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Busca */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.textSecondary }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, NIF, email ou telefone..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none transition-all"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text
                }}
              />
            </div>

            {/* Filtro de Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="px-4 py-2.5 rounded-lg border outline-none transition-all"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text
              }}
            >
              <option value="ativos">Apenas Ativos</option>
              <option value="inativos">Apenas Inativos</option>
              <option value="todos">Todos</option>
            </select>
            <button
              onClick={abrirCriar}
              className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-colors font-medium"
              style={{ backgroundColor: colors.secondary }}
            >
              <Plus className="w-5 h-5" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        {loading ? (
          <SkeletonStats colors={colors} />
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl shadow-sm border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
                  <Users className="w-6 h-6" style={{ color: colors.primary }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>{clientes.length}</p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>Total</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl shadow-sm border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.success}20` }}>
                  <CheckCircle className="w-6 h-6" style={{ color: colors.success }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>
                    {clientes.filter((c) => c.status === "ativo").length}
                  </p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>Ativos</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl shadow-sm border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.textSecondary}20` }}>
                  <XCircle className="w-6 h-6" style={{ color: colors.textSecondary }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>
                    {clientes.filter((c) => c.status === "inativo").length}
                  </p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>Inativos</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl shadow-sm border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.secondary}20` }}>
                  <Building2 className="w-6 h-6" style={{ color: colors.secondary }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>
                    {clientes.filter((c) => c.tipo === "empresa").length}
                  </p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>Empresas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Clientes */}
        {loading ? (
          <SkeletonTable colors={colors} />
        ) : clientes.length === 0 ? (
          <div className="rounded-xl shadow-sm border text-center py-16" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Users className="w-16 h-16 mx-auto mb-4" style={{ color: colors.border }} />
            <p className="mb-4" style={{ color: colors.textSecondary }}>
              {filtroStatus === "ativos" && "Nenhum cliente ativo encontrado."}
              {filtroStatus === "inativos" && "Nenhum cliente inativo encontrado."}
              {filtroStatus === "todos" && "Nenhum cliente encontrado."}
            </p>
            <button
              onClick={abrirCriar}
              className="px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: colors.primary }}
            >
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: colors.primary }}>
                    <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">
                      Cliente
                    </th>
                    <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">
                      Tipo
                    </th>
                    <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">
                      Status
                    </th>
                    <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">
                      Contacto
                    </th>
                    <th className="py-4 px-6 text-left font-semibold text-white uppercase text-xs">
                      NIF
                    </th>
                    <th className="py-4 px-6 text-center font-semibold text-white uppercase text-xs">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                  {clientesFiltrados.map((cliente) => {
                    const statusBadge = getStatusClienteBadge(cliente.status);

                    return (
                      <tr
                        key={cliente.id}
                        className="transition-colors hover:bg-opacity-50"
                        style={{
                          backgroundColor: cliente.status === "inativo" ? `${colors.hover}80` : 'transparent'
                        }}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: cliente.tipo === "empresa" ? `${colors.secondary}20` : colors.hover }}>
                              {cliente.tipo === "empresa" ? (
                                <Building2 className="w-5 h-5" style={{ color: colors.secondary }} />
                              ) : (
                                <User className="w-5 h-5" style={{ color: colors.textSecondary }} />
                              )}
                            </div>
                            <div>
                              <div className="font-medium" style={{ color: colors.text }}>
                                {cliente.nome}
                              </div>
                              {cliente.email && (
                                <div className="text-xs" style={{ color: colors.textSecondary }}>{cliente.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                            {getTipoClienteLabel(cliente.tipo)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium`}
                            style={{
                              backgroundColor: cliente.status === "ativo" ? `${colors.success}20` : `${colors.textSecondary}20`,
                              color: cliente.status === "ativo" ? colors.success : colors.textSecondary
                            }}>
                            {cliente.status === "ativo" ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {statusBadge.texto}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {cliente.telefone ? (
                            <div className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                              <Phone className="w-3.5 h-3.5" />
                              {cliente.telefone}
                            </div>
                          ) : (
                            <span style={{ color: colors.textSecondary }}>-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-mono" style={{ color: colors.textSecondary }}>
                          {formatarNIF(cliente.nif)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => abrirDetalhes(cliente)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: colors.primary }}
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => abrirEditar(cliente)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: colors.secondary }}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => abrirAlterarStatus(cliente)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: cliente.status === "ativo" ? colors.warning : colors.success }}
                              title={cliente.status === "ativo" ? "Inativar cliente" : "Ativar cliente"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {clientesFiltrados.length === 0 && busca && (
                <div className="text-center py-16">
                  <Search className="w-16 h-16 mx-auto mb-4" style={{ color: colors.border }} />
                  <p style={{ color: colors.textSecondary }}>Nenhum cliente encontrado para "{busca}"</p>
                  <button
                    onClick={() => setBusca("")}
                    className="mt-2 underline"
                    style={{ color: colors.primary }}
                  >
                    Limpar busca
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Formulário (Criar/Editar) */}
      <Modal
        isOpen={modalFormAberto}
        onClose={() => {
          setModalFormAberto(false);
          setClienteSelecionado(null);
        }}
        title={clienteSelecionado ? "Editar Cliente" : "Novo Cliente"}
      >
        <FormCliente
          cliente={clienteSelecionado}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalFormAberto(false);
            setClienteSelecionado(null);
          }}
          loading={loadingAcao}
        />
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={modalDetalhesAberto}
        onClose={() => {
          setModalDetalhesAberto(false);
          setClienteSelecionado(null);
        }}
        title="Detalhes do Cliente"
      >
        {clienteSelecionado && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b" style={{ borderColor: colors.border }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.secondary}20` }}>
                {clienteSelecionado.tipo === "empresa" ? (
                  <Building2 className="w-8 h-8" style={{ color: colors.secondary }} />
                ) : (
                  <User className="w-8 h-8" style={{ color: colors.text }} />
                )}
              </div>
              <div>
                <h4 className="text-xl font-semibold" style={{ color: colors.text }}>{clienteSelecionado.nome}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                    {getTipoClienteLabel(clienteSelecionado.tipo)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: clienteSelecionado.status === "ativo" ? `${colors.success}20` : `${colors.textSecondary}20`,
                      color: clienteSelecionado.status === "ativo" ? colors.success : colors.textSecondary
                    }}>
                    {clienteSelecionado.status === "ativo" ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {getStatusClienteLabel(clienteSelecionado.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3" style={{ color: colors.textSecondary }}>
                  <Phone className="w-5 h-5" style={{ color: colors.textSecondary }} />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Telefone</p>
                    <p className="font-medium" style={{ color: colors.text }}>{clienteSelecionado.telefone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3" style={{ color: colors.textSecondary }}>
                  <Mail className="w-5 h-5" style={{ color: colors.textSecondary }} />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Email</p>
                    <p className="font-medium" style={{ color: colors.text }}>{clienteSelecionado.email || "-"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3" style={{ color: colors.textSecondary }}>
                  <Calendar className="w-5 h-5" style={{ color: colors.textSecondary }} />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Data de Registro</p>
                    <p className="font-medium" style={{ color: colors.text }}>
                      {new Date(clienteSelecionado.data_registro).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3" style={{ color: colors.textSecondary }}>
                  <Building2 className="w-5 h-5" style={{ color: colors.textSecondary }} />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>NIF</p>
                    <p className="font-medium font-mono" style={{ color: colors.text }}>{formatarNIF(clienteSelecionado.nif)}</p>
                  </div>
                </div>
              </div>
            </div>

            {clienteSelecionado.endereco && (
              <div className="flex items-start gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
                <MapPin className="w-5 h-5 mt-0.5" style={{ color: colors.textSecondary }} />
                <div>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>Endereço</p>
                  <p className="font-medium" style={{ color: colors.text }}>{clienteSelecionado.endereco}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => {
                  setModalDetalhesAberto(false);
                  abrirEditar(clienteSelecionado);
                }}
                className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.primary }}
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Alterar Status */}
      <ConfirmModal
        isOpen={modalStatusAberto}
        onClose={() => {
          setModalStatusAberto(false);
          setClienteSelecionado(null);
        }}
        onConfirm={clienteSelecionado?.status === "ativo" ? handleInativar : handleAtivar}
        title={clienteSelecionado?.status === "ativo" ? "Inativar Cliente" : "Ativar Cliente"}
        message={clienteSelecionado?.status === "ativo"
          ? `Tem certeza que deseja inativar o cliente "${clienteSelecionado?.nome}"? Clientes inativos não podem realizar novas compras.`
          : `Tem certeza que deseja ativar o cliente "${clienteSelecionado?.nome}"? Clientes ativos podem realizar compras normalmente.`
        }
        confirmText={clienteSelecionado?.status === "ativo" ? "Inativar" : "Ativar"}
        type={clienteSelecionado?.status === "ativo" ? "warning" : "info"}
        loading={loadingAcao}
      />
    </MainEmpresa>
  );
}