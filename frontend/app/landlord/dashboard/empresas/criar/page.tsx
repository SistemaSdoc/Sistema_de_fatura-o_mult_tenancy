'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLandlordAuth } from '@/context/LandlordAuthContext';
import { useThemeColors } from '@/context/ThemeContext';
import { api } from '@/services/axios';
import { 
  Building2, 
  FileText, 
  Mail, 
  Briefcase, 
  User, 
  Lock, 
  ArrowLeft, 
  Save, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function CriarEmpresaPage() {
  const { user } = useLandlordAuth();
  const router = useRouter();
  const colors = useThemeColors();
  
  const [form, setForm] = useState({
    nome: '',
    nif: '',
    email: '',
    regime_fiscal: 'geral',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center p-8 rounded-xl" style={{ backgroundColor: colors.card, color: colors.danger }}>
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p className="text-xl font-semibold">Acesso negado</p>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>Apenas super administradores podem criar empresas.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/api/landlord/empresas', form);
      setSuccess(true);
      setTimeout(() => {
        router.push('/landlord/dashboard/empresas');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: colors.background }}>
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full transition-all hover:scale-105"
            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Nova Empresa</h1>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Preencha os dados para criar um novo tenant</p>
          </div>
        </div>

        {/* Card do formulário */}
        <div
          className="rounded-2xl shadow-xl overflow-hidden border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Mensagens de status */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl border-l-4" style={{ backgroundColor: `${colors.danger}15`, borderColor: colors.danger }}>
                <AlertCircle size={20} style={{ color: colors.danger }} />
                <span style={{ color: colors.danger }}>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 p-4 rounded-xl border-l-4" style={{ backgroundColor: `${colors.primary}15`, borderColor: colors.primary }}>
                <CheckCircle size={20} style={{ color: colors.primary }} />
                <span style={{ color: colors.primary }}>Empresa criada com sucesso! Redirecionando...</span>
              </div>
            )}

            {/* Seção: Dados da Empresa */}
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: colors.secondary }}>
                <Building2 size={20} /> Informações da Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  name="nome"
                  icon={Building2}
                  placeholder="Nome da empresa *"
                  value={form.nome}
                  onChange={handleChange}
                  colors={colors}
                  required
                />
                <InputField
                  name="nif"
                  icon={FileText}
                  placeholder="NIF *"
                  value={form.nif}
                  onChange={handleChange}
                  colors={colors}
                  required
                />
                <InputField
                  name="email"
                  icon={Mail}
                  type="email"
                  placeholder="Email da empresa *"
                  value={form.email}
                  onChange={handleChange}
                  colors={colors}
                  required
                />
                <div className="relative">
                  <Briefcase size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    name="regime_fiscal"
                    value={form.regime_fiscal}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-300 appearance-none"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    required
                  >
                    <option value="simplificado">Simplificado</option>
                    <option value="geral">Geral</option>
                  </select>
                </div>
              </div>
            </div>

            <hr className="my-2" style={{ borderColor: colors.border }} />

            {/* Seção: Dados do Administrador */}
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: colors.secondary }}>
                <User size={20} /> Administrador do Tenant
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  name="admin_name"
                  icon={User}
                  placeholder="Nome completo *"
                  value={form.admin_name}
                  onChange={handleChange}
                  colors={colors}
                  required
                />
                <InputField
                  name="admin_email"
                  icon={Mail}
                  type="email"
                  placeholder="Email *"
                  value={form.admin_email}
                  onChange={handleChange}
                  colors={colors}
                  required
                />
                <InputField
                  name="admin_password"
                  icon={Lock}
                  type="password"
                  placeholder="Senha * (mínimo 8 caracteres)"
                  value={form.admin_password}
                  onChange={handleChange}
                  colors={colors}
                  required
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 rounded-xl font-medium transition-all hover:scale-105"
                style={{ backgroundColor: `${colors.danger}20`, color: colors.danger }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
                style={{ backgroundColor: colors.primary }}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {loading ? 'Criando...' : 'Criar Empresa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente de input reutilizável
function InputField({ name, icon: Icon, type = 'text', placeholder, value, onChange, colors, required = false }: any) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="relative">
      <Icon size={20} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: isFocused ? colors.secondary : colors.textSecondary }} />
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-300"
        style={{
          backgroundColor: colors.card,
          borderColor: isFocused ? colors.secondary : colors.border,
          color: colors.text,
          boxShadow: isFocused ? `0 0 0 3px ${colors.secondary}30` : 'none',
        }}
      />
    </div>
  );
}