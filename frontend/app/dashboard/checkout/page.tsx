'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Crown,
  CreditCard,
  Calendar,
  Banknote,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/authprovider';
import { planosService } from '@/services/planos';
import { subscricaoService } from '@/services/subscricoes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const CheckIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4 mr-1 shrink-0 mt-0.5"
    style={{ color }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planoId = searchParams.get('plano_id');
  const colors = useThemeColors();
  const { user, loading: authLoading } = useAuth();

  const [plano, setPlano] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [pagamento, setPagamento] = useState({
    metodo: 'transferencia',
    parcelas: 1,
    data_vencimento: '',
  });

  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const redirectPath = planoId ? `/checkout?plano_id=${planoId}` : '/planos';
  const isRenovacao = searchParams.get('renovacao') === 'true';

  // Verificar autenticação – iniciar contagem se não autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      setRedirecting(true);
      setCountdown(30);
    }
  }, [user, authLoading]);

  // Contagem regressiva e redirecionamento
  useEffect(() => {
    if (!redirecting) return;
    if (countdown <= 0) {
      router.push(`/register?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [redirecting, countdown, router, redirectPath]);

  // Verificar se utilizador já tem subscrição
  useEffect(() => {
    if (authLoading || !user) return;

    const verificarSubscricao = async () => {
      try {
        const response = await subscricaoService.minhaAssinatura();
        const sub = response?.subscricao ?? response;

        if (sub && sub.status === 'ativa') {
          if (isRenovacao) {
            toast.info('🔄 A renovar a sua subscrição existente.');
          } else {
            toast.info('Já possui uma subscrição ativa. A ser redirecionado para o dashboard...');
            setTimeout(() => router.push('/dashboard'), 1500);
          }
        }
      } catch (error) {
        console.log('Nenhuma subscrição ativa encontrada.');
      }
    };

    verificarSubscricao();
  }, [user, authLoading, router, isRenovacao]);

  // Buscar plano
  useEffect(() => {
    if (!planoId) {
      setError('Plano não selecionado');
      setLoading(false);
      return;
    }

    const fetchPlano = async () => {
      try {
        const data = await planosService.buscarPorId(planoId);
        setPlano(data);
        const hoje = new Date();
        hoje.setDate(hoje.getDate() + 5);
        setPagamento((prev) => ({
          ...prev,
          data_vencimento: hoje.toISOString().split('T')[0],
        }));
      } catch (err: any) {
        console.error('Erro ao buscar plano:', err);
        setError(err.response?.data?.message || 'Erro ao carregar plano');
      } finally {
        setLoading(false);
      }
    };
    fetchPlano();
  }, [planoId]);

  const handleAssinar = async () => {
    if (!planoId) return;
    setSubmitting(true);
    setError(null);

    try {
      const pedido = await subscricaoService.criar({
        plano_id: planoId,
        forma_pagamento: pagamento.metodo,
        data_vencimento: pagamento.data_vencimento,
        renovacao: isRenovacao,
      });

      const query = new URLSearchParams({
        pagamento: pedido.pagamento_id,
        referencia: pedido.referencia,
        valor: String(pedido.valor),
        metodo: pedido.metodo,
      }).toString();

      router.push(`/aguardando-pagamento?${query}`);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push(`/register?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }
      setError(err.response?.data?.message || 'Erro ao criar pedido de assinatura');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading inicial
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        <span className="ml-2" style={{ color: colors.textSecondary }}>
          A carregar...
        </span>
      </div>
    );
  }

  // Tela de redirecionamento (apenas para register)
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.background }}>
        <div
          className="relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-400 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-400 blur-3xl" />
          </div>

          <div className="relative z-10 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="flex justify-center mb-6"
            >
              <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 shadow-lg ring-2 ring-yellow-200 dark:ring-yellow-800">
                <Sparkles className="w-12 h-12 text-yellow-500" />
              </div>
            </motion.div>

            <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
              Para continuar, crie sua conta
            </h2>
            <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              Você será redirecionado para o registo em
            </p>

            <div className="flex justify-center mb-6">
              <div
                className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-yellow-400 shadow-lg"
                style={{ borderColor: colors.primary }}
              >
                <span className="text-5xl font-bold" style={{ color: colors.primary }}>
                  {countdown}
                </span>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 text-xs font-medium rounded-full shadow" style={{ color: colors.textSecondary }}>
                  segundos
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push(`/register?redirect=${encodeURIComponent(redirectPath)}`)}
              style={{ backgroundColor: colors.primary, color: 'white' }}
            >
              Criar conta agora
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Erro ao carregar plano
  if (error && !plano) {
    return (
      <div className="max-w-2xl mx-auto p-8 mt-10">
        <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>
                {error}
              </h1>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                Não foi possível carregar as informações do plano.
              </p>
              <div className="flex gap-4 justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Link href="/planos">
                  <Button style={{ backgroundColor: colors.primary, color: 'white' }}>
                    Ver planos
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Plano não encontrado
  if (!plano) {
    return (
      <div className="max-w-2xl mx-auto p-8 mt-10">
        <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: colors.primary }} />
            <h1 className="text-xl font-bold" style={{ color: colors.text }}>
              Plano não encontrado
            </h1>
            <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
              O plano selecionado não está disponível.
            </p>
            <Link href="/">
              <Button className="mt-6" style={{ backgroundColor: colors.primary, color: 'white' }}>
                Ver planos disponíveis
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Utilizador autenticado – checkout com pagamento
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 mt-4 sm:mt-10">
      <Card
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="shadow-xl"
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6" style={{ color: colors.primary }} />
            <CardTitle style={{ color: colors.text }}>Finalizar Assinatura</CardTitle>
          </div>
          <CardDescription style={{ color: colors.textSecondary }}>
            Confirme os detalhes do plano e preencha os dados de pagamento
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                Assinatura criada com sucesso! 
              </h2>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                A sua empresa agora está com o plano <strong>{plano.nome}</strong>.
                Redirecionando para o dashboard...
              </p>
              <div className="mt-6">
                <div className="w-48 h-1 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-full bg-green-500 animate-pulse rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-3 space-y-4">
                  <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: colors.border }}>
                    <span style={{ color: colors.textSecondary }}>Plano</span>
                    <span className="font-bold text-lg" style={{ color: colors.text }}>
                      {plano.nome}
                    </span>
                  </div>
                  {plano.descricao && (
                    <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: colors.border }}>
                      <span style={{ color: colors.textSecondary }}>Descrição</span>
                      <span className="text-sm" style={{ color: colors.text }}>
                        {plano.descricao}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: colors.border }}>
                    <span style={{ color: colors.textSecondary }}>Valor mensal</span>
                    <span className="font-bold text-xl" style={{ color: colors.primary }}>
                      {Number(plano.valor_mensal).toLocaleString('pt-AO')} KZ
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: colors.border }}>
                    <span style={{ color: colors.textSecondary }}>Renovação automática</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Ativa
                    </span>
                  </div>
                  {plano.features && plano.features.length > 0 && (
                    <div className="pt-3">
                      <p className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                        Recursos incluídos
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {plano.features.map((feature: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm"
                            style={{ color: colors.text }}
                          >
                            <CheckIcon color={colors.secondary} />
                            <span>
                              {feature.pivot?.quantidade > 0
                                ? `${feature.pivot.quantidade} ${feature.pivot.unidade || ''} `
                                : ''}
                              {feature.nome}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="md:col-span-2 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5" style={{ color: colors.primary }} />
                    <h3 className="font-semibold" style={{ color: colors.text }}>
                      Dados de pagamento
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="metodo" style={{ color: colors.textSecondary }}>
                        Método de pagamento
                      </Label>
                      <Select
                        value={pagamento.metodo}
                        onValueChange={(value) =>
                          setPagamento((prev) => ({ ...prev, metodo: value }))
                        }
                      >
                        <SelectTrigger
                          id="metodo"
                          style={{
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            color: colors.text,
                          }}
                        >
                          <SelectValue placeholder="Selecione o método" />
                        </SelectTrigger>
                        <SelectContent
                          style={{ backgroundColor: colors.card, borderColor: colors.border }}
                        >
                          <SelectItem value="transferencia">
                            <div className="flex items-center gap-2">
                              <Banknote className="w-4 h-4" /> Transferência bancária
                            </div>
                          </SelectItem>
                          <SelectItem value="multicaixa">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4" /> Multicaixa
                            </div>
                          </SelectItem>
                          <SelectItem value="cartao_credito">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" /> Cartão de crédito
                            </div>
                          </SelectItem>
                          <SelectItem value="pix">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4" /> PIX
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="parcelas" style={{ color: colors.textSecondary }}>
                        Número de parcelas
                      </Label>
                      <Select
                        value={String(pagamento.parcelas)}
                        onValueChange={(value) =>
                          setPagamento((prev) => ({ ...prev, parcelas: parseInt(value) }))
                        }
                      >
                        <SelectTrigger
                          id="parcelas"
                          style={{
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            color: colors.text,
                          }}
                        >
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent
                          style={{ backgroundColor: colors.card, borderColor: colors.border }}
                        >
                          <SelectItem value="1">1x sem juros</SelectItem>
                          <SelectItem value="2">2x sem juros</SelectItem>
                          <SelectItem value="3">3x sem juros</SelectItem>
                          <SelectItem value="4">4x sem juros</SelectItem>
                          <SelectItem value="5">5x sem juros</SelectItem>
                          <SelectItem value="6">6x sem juros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vencimento" style={{ color: colors.textSecondary }}>
                        <Calendar className="w-3.5 h-3.5 inline mr-1" style={{ color: colors.textSecondary }} />
                        Data de vencimento
                      </Label>
                      <Input
                        id="vencimento"
                        type="date"
                        value={pagamento.data_vencimento}
                        onChange={(e) =>
                          setPagamento((prev) => ({ ...prev, data_vencimento: e.target.value }))
                        }
                        style={{
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                      />
                    </div>

                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.hover }}>
                      <div className="flex justify-between items-center">
                        <span style={{ color: colors.textSecondary }}>Total a pagar:</span>
                        <span className="text-xl font-bold" style={{ color: colors.primary }}>
                          {Number(plano.valor_mensal).toLocaleString('pt-AO')} KZ
                        </span>
                      </div>
                      {pagamento.parcelas > 1 && (
                        <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                          {pagamento.parcelas}x de{' '}
                          {(Number(plano.valor_mensal) / pagamento.parcelas).toLocaleString(
                            'pt-AO',
                            { minimumFractionDigits: 2 }
                          )}{' '}
                          KZ
                        </div>
                      )}
                      <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        Vence em{' '}
                        {new Date(pagamento.data_vencimento).toLocaleDateString('pt-PT')}
                      </div>
                    </div>

                    {isRenovacao && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          🔄 Esta é uma <strong>renovação</strong> do seu plano. O pagamento irá
                          estender a sua assinatura por mais um período.
                        </p>
                      </div>
                    )}
                    {error && (
                      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter
          className="flex flex-col sm:flex-row gap-3 border-t pt-6"
          style={{ borderColor: colors.border }}
        >
          {!success && (
            <>
              <Button
                variant="outline"
                className="w-full sm:w-auto order-2 sm:order-1"
                onClick={() => router.back()}
                disabled={submitting}
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                className="w-full sm:w-auto order-1 sm:order-2 flex-1"
                onClick={handleAssinar}
                disabled={submitting}
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  'Confirmar Assinatura e Pagar'
                )}
              </Button>
            </>
          )}
          {success && (
            <Button
              className="w-full"
              onClick={() => router.push('/dashboard')}
              style={{ backgroundColor: colors.primary, color: 'white' }}
            >
              Ir para o Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}