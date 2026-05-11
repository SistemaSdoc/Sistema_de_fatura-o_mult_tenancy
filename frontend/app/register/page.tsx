'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useThemeColors } from '@/context/ThemeContext';
import { api } from '@/services/axios';
import { 
  Building2, FileText, Mail, Briefcase, User, Lock, 
  ArrowLeft, Rocket, AlertCircle, CheckCircle, Loader2,
  ChevronRight
} from 'lucide-react';

export default function RegisterCompanyPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/api/empresas', form);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar empresa. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: colors.background }}>
      <div className="max-w-5xl mx-auto">
        {/* Header com seta animada */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="group p-2 rounded-full transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
          >
            <ArrowLeft size={24} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <div>
            <h1 className="text-4xl font-extrabold" style={{ color: colors.text }}>
              Comece agora <span style={{ color: colors.secondary }}>gratuitamente</span>
            </h1>
            <p className="text-md mt-2" style={{ color: colors.textSecondary }}>
              Preencha os dados abaixo e crie a sua empresa no FaturaJá. Leva menos de 2 minutos.
            </p>
          </div>
        </div>

        {/* Card principal */}
        <div
          className="rounded-3xl shadow-2xl overflow-hidden border transition-all duration-500 hover:shadow-3xl"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
            {/* Mensagens de feedback animadas */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl border-l-4 animate-in slide-in-from-top-2 fade-in duration-300" style={{ backgroundColor: `${colors.danger}10`, borderColor: colors.danger }}>
                <AlertCircle size={22} style={{ color: colors.danger }} />
                <span style={{ color: colors.danger }} className="text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 p-4 rounded-xl border-l-4 animate-in slide-in-from-top-2 fade-in duration-300" style={{ backgroundColor: `${colors.primary}10`, borderColor: colors.primary }}>
                <CheckCircle size={22} style={{ color: colors.primary }} />
                <span style={{ color: colors.primary }} className="text-sm">Empresa criada com sucesso! Redirecionando para o login...</span>
              </div>
            )}

            {/* Secção Empresa */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-5 pb-2 border-b" style={{ color: colors.secondary, borderColor: colors.border }}>
                <Building2 size={22} /> Dados da Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField name="nome" icon={Building2} placeholder="Nome da empresa *" value={form.nome} onChange={handleChange} colors={colors} required />
                <InputField name="nif" icon={FileText} placeholder="NIF *" value={form.nif} onChange={handleChange} colors={colors} required />
                <InputField name="email" icon={Mail} type="email" placeholder="Email da empresa *" value={form.email} onChange={handleChange} colors={colors} required />
                <div className="relative group">
                  <Briefcase size={20} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 group-focus-within:text-primary" style={{ color: colors.textSecondary }} />
                  <select
                    name="regime_fiscal"
                    value={form.regime_fiscal}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 focus:border-secondary"
                    style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
                    required
                  >
                    <option value="simplificado">Regime Simplificado</option>
                    <option value="geral">Regime Geral</option>
                  </select>
                </div>
              </div>
            </div>

            <hr className="my-2" style={{ borderColor: colors.border }} />

            {/* Secção Administrador */}
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-5 pb-2 border-b" style={{ color: colors.secondary, borderColor: colors.border }}>
                <User size={22} /> Administrador da Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField name="admin_name" icon={User} placeholder="Nome completo *" value={form.admin_name} onChange={handleChange} colors={colors} required />
                <InputField name="admin_email" icon={Mail} type="email" placeholder="Email *" value={form.admin_email} onChange={handleChange} colors={colors} required />
                <InputField name="admin_password" icon={Lock} type="password" placeholder="Senha * (mínimo 8 caracteres)" value={form.admin_password} onChange={handleChange} colors={colors} required />
              </div>
            </div>

            {/* Botões de acção */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                style={{ backgroundColor: `${colors.danger}15`, color: colors.danger }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="group px-8 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 disabled:opacity-50 shadow-md hover:shadow-xl"
                style={{ backgroundColor: colors.primary }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Criando empresa...
                  </>
                ) : (
                  <>
                    <Rocket size={20} />
                    Criar empresa
                    <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer informativo */}
        <p className="text-center text-xs mt-8" style={{ color: colors.textSecondary }}>
          Ao criar uma conta, concorda com os <a href="#" className="underline hover:opacity-80">Termos de Serviço</a> e a <a href="#" className="underline hover:opacity-80">Política de Privacidade</a>.
        </p>
      </div>
    </div>
  );
}

// Componente InputField reutilizável com animação
function InputField({ name, icon: Icon, type = 'text', placeholder, value, onChange, colors, required }: any) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="relative group">
      <Icon
        size={20}
        className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${isFocused ? 'scale-110' : ''}`}
        style={{ color: isFocused ? colors.secondary : colors.textSecondary }}
      />
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 focus:shadow-md"
        style={{
          backgroundColor: colors.card,
          borderColor: isFocused ? colors.secondary : colors.border,
          color: colors.text,
        }}
      />
    </div>
  );
}