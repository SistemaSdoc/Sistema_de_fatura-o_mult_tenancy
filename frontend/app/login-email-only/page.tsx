'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeColors } from '@/context/ThemeContext';
import { Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { landlordApi } from '@/services/axios';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginEmailOnlyPage() {
  const router = useRouter();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Usamos a instância tenantApi (pois pode não ter tenant definido, mas o controller não exige)
      const response = await landlordApi.post('/login/email-only', { email });
      if (response.data.success) {
        // Redireciona para o dashboard após login bem-sucedido
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: colors.background }}
    >
      <div
        className="w-full max-w-md p-8 border rounded-2xl shadow-xl"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="flex justify-center mb-6">
          <Image src="/images/3.png" alt="Logo" width={72} height={72} className="rounded-2xl" priority />
        </div>

        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: colors.secondary }}>
          Login sem senha
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: colors.textSecondary }}>
          Digite seu email para acessar instantaneamente.
        </p>

        {error && (
          <div
            className="mb-4 border-l-4 p-4 rounded-r-xl flex items-center gap-3 shadow-sm"
            style={{ backgroundColor: `${colors.danger}20`, borderColor: colors.danger }}
          >
            <AlertCircle size={20} style={{ color: colors.danger }} />
            <span className="text-sm font-medium" style={{ color: colors.danger }}>
              {error}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 border-2 rounded-xl outline-none transition-all duration-300"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 font-semibold text-white flex items-center justify-center gap-2 rounded-xl transition-all duration-300"
            style={{ backgroundColor: loading ? `${colors.primary}B3` : colors.primary }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar sem senha'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
            style={{ color: colors.secondary }}
          >
            <ArrowLeft size={16} />
            Voltar ao login com senha
          </Link>
        </div>
      </div>
    </div>
  );
}